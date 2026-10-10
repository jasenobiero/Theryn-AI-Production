import { Router, type IRouter } from "express";
import { db, conversations, messages } from "@workspace/db";
import { CreateOpenrouterConversationBody } from "@workspace/api-zod";
import { eq, asc } from "drizzle-orm";
import { getOpenRouterClientForRequest } from "../../lib/provider-clients";

const router: IRouter = Router();

interface PastedImage { dataUrl: string; mimeType: string; }

const DEFAULT_MODEL = "x-ai/grok-4.3";

// Vision-capable models via OpenRouter
const VISION_MODELS = new Set([
  "google/gemini-2.5-pro",
  "openai/gpt-4o",
  "openai/gpt-4-vision-preview",
  "anthropic/claude-3-5-sonnet",
  "anthropic/claude-sonnet-4-6",
]);

router.get("/conversations", async (_req, res) => {
  const rows = await db.select().from(conversations).orderBy(asc(conversations.createdAt));
  res.json(rows.map(r => ({ ...r, model: DEFAULT_MODEL })));
});

router.post("/conversations", async (req, res) => {
  const body = CreateOpenrouterConversationBody.parse(req.body);
  const [conv] = await db.insert(conversations).values({ title: body.title }).returning();
  res.status(201).json({ ...conv, model: body.model ?? DEFAULT_MODEL });
});

router.get("/conversations/:id", async (req, res) => {
  const id = Number(req.params.id);
  const [conv] = await db.select().from(conversations).where(eq(conversations.id, id));
  if (!conv) { res.status(404).json({ error: "Conversation not found" }); return; }
  const msgs = await db.select().from(messages).where(eq(messages.conversationId, id)).orderBy(asc(messages.createdAt));
  res.json({ ...conv, model: DEFAULT_MODEL, messages: msgs });
});

router.delete("/conversations/:id", async (req, res) => {
  const id = Number(req.params.id);
  const [conv] = await db.select().from(conversations).where(eq(conversations.id, id));
  if (!conv) { res.status(404).json({ error: "Conversation not found" }); return; }
  await db.delete(conversations).where(eq(conversations.id, id));
  res.status(204).send();
});

router.get("/conversations/:id/messages", async (req, res) => {
  const id = Number(req.params.id);
  const msgs = await db.select().from(messages).where(eq(messages.conversationId, id)).orderBy(asc(messages.createdAt));
  res.json(msgs);
});

router.post("/conversations/:id/messages", async (req, res) => {
  const id = Number(req.params.id);
  const content: string = req.body.content ?? "";
  const model: string = req.body.model ?? DEFAULT_MODEL;
  const imgs: PastedImage[] = Array.isArray(req.body.images) ? req.body.images : [];

  await db.insert(messages).values({ conversationId: id, role: "user", content });

  const allMessages = await db.select().from(messages)
    .where(eq(messages.conversationId, id))
    .orderBy(asc(messages.createdAt));

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  let fullResponse = "";

  type OAIContent =
    | string
    | Array<{ type: "text"; text: string } | { type: "image_url"; image_url: { url: string } }>;

  const supportsVision = VISION_MODELS.has(model);

  const apiMessages = allMessages.map((m, idx) => {
    const isLast = idx === allMessages.length - 1 && m.role === "user";
    const content: OAIContent = (isLast && imgs.length > 0 && supportsVision)
      ? [
          ...imgs.map(img => ({ type: "image_url" as const, image_url: { url: img.dataUrl } })),
          { type: "text" as const, text: m.content },
        ]
      : m.content;
    return { role: m.role as "user" | "assistant" | "system", content };
  });

  const client = await getOpenRouterClientForRequest(req);
  const stream = await client.chat.completions.create({
    model,
    max_tokens: 8192,
    messages: apiMessages,
    stream: true,
  });

  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content;
    if (delta) {
      fullResponse += delta;
      res.write(`data: ${JSON.stringify({ content: delta })}\n\n`);
    }
  }

  await db.insert(messages).values({ conversationId: id, role: "assistant", content: fullResponse });
  res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
  res.end();
});

export default router;
