import { Router, type IRouter } from "express";
import { db, conversations, messages } from "@workspace/db";
import { generateImageBuffer } from "@workspace/integrations-openai-ai-server/image";
import {
  CreateOpenaiConversationBody,
  GenerateOpenaiImageBody,
} from "@workspace/api-zod";
import { eq, asc } from "drizzle-orm";
import { getOpenAIClientForRequest, getProviderKey } from "../../lib/provider-clients";

const router: IRouter = Router();

interface PastedImage { dataUrl: string; mimeType: string; }

router.get("/conversations", async (_req, res) => {
  const rows = await db.select().from(conversations).orderBy(asc(conversations.createdAt));
  res.json(rows);
});

router.post("/conversations", async (req, res) => {
  const body = CreateOpenaiConversationBody.parse(req.body);
  const [conv] = await db.insert(conversations).values({ title: body.title }).returning();
  res.status(201).json(conv);
});

router.get("/conversations/:id", async (req, res) => {
  const id = Number(req.params.id);
  const [conv] = await db.select().from(conversations).where(eq(conversations.id, id));
  if (!conv) { res.status(404).json({ error: "Conversation not found" }); return; }
  const msgs = await db.select().from(messages).where(eq(messages.conversationId, id)).orderBy(asc(messages.createdAt));
  res.json({ ...conv, messages: msgs });
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
  const imgs: PastedImage[] = Array.isArray(req.body.images) ? req.body.images : [];

  // Store text content in DB (images are transient)
  await db.insert(messages).values({ conversationId: id, role: "user", content });

  const allMessages = await db.select().from(messages)
    .where(eq(messages.conversationId, id))
    .orderBy(asc(messages.createdAt));

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  let fullResponse = "";

  // Build multimodal content for the last user message if images were pasted
  type OAIContent =
    | string
    | Array<{ type: "text"; text: string } | { type: "image_url"; image_url: { url: string } }>;

  const apiMessages = allMessages.map((m, idx) => {
    const isLast = idx === allMessages.length - 1 && m.role === "user";
    const content: OAIContent = (isLast && imgs.length > 0)
      ? [
          ...imgs.map(img => ({ type: "image_url" as const, image_url: { url: img.dataUrl } })),
          { type: "text" as const, text: m.content },
        ]
      : m.content;
    return { role: m.role as "user" | "assistant" | "system", content };
  });

  const client = await getOpenAIClientForRequest(req);
  const stream = await client.chat.completions.create({
    model: "gpt-5.2",
    max_completion_tokens: 8192,
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

router.post("/generate-image", async (req, res) => {
  const body = GenerateOpenaiImageBody.parse(req.body);
  const buffer = await generateImageBuffer(
    body.prompt,
    (body.size as "1024x1024" | "512x512" | "256x256") ?? "1024x1024",
    await getProviderKey(req, "openaiApiKey"),
  );
  res.json({ b64_json: buffer.toString("base64") });
});

export default router;
