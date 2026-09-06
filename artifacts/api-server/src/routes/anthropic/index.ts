import { Router, type IRouter } from "express";
import { db, conversations, messages } from "@workspace/db";
import { anthropic } from "@workspace/integrations-anthropic-ai";
import { CreateAnthropicConversationBody } from "@workspace/api-zod";
import { eq, asc } from "drizzle-orm";

const router: IRouter = Router();

interface PastedImage { dataUrl: string; mimeType: string; }

router.get("/conversations", async (_req, res) => {
  const rows = await db.select().from(conversations).orderBy(asc(conversations.createdAt));
  res.json(rows);
});

router.post("/conversations", async (req, res) => {
  const body = CreateAnthropicConversationBody.parse(req.body);
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

  await db.insert(messages).values({ conversationId: id, role: "user", content });

  const allMessages = await db.select().from(messages)
    .where(eq(messages.conversationId, id))
    .orderBy(asc(messages.createdAt));

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  let fullResponse = "";

  type AnthropicBlock =
    | { type: "text"; text: string }
    | { type: "image"; source: { type: "base64"; media_type: "image/png" | "image/jpeg" | "image/gif" | "image/webp"; data: string } };

  type AnthropicMsg = {
    role: "user" | "assistant";
    content: string | AnthropicBlock[];
  };

  const apiMessages: AnthropicMsg[] = allMessages.map((m, idx) => {
    const isLast = idx === allMessages.length - 1 && m.role === "user";
    const content: string | AnthropicBlock[] = (isLast && imgs.length > 0)
      ? [
          ...imgs.map(img => ({
            type: "image" as const,
            source: {
              type: "base64" as const,
              media_type: (img.mimeType || "image/png") as "image/png" | "image/jpeg" | "image/gif" | "image/webp",
              data: img.dataUrl.includes(",") ? img.dataUrl.split(",")[1] : img.dataUrl,
            },
          })),
          { type: "text" as const, text: m.content },
        ]
      : m.content;
    return { role: m.role as "user" | "assistant", content };
  });

  const stream = anthropic.messages.stream({
    model: "claude-sonnet-4-6",
    max_tokens: 8192,
    messages: apiMessages,
  });

  for await (const event of stream) {
    if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
      fullResponse += event.delta.text;
      res.write(`data: ${JSON.stringify({ content: event.delta.text })}\n\n`);
    }
  }

  await db.insert(messages).values({ conversationId: id, role: "assistant", content: fullResponse });
  res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
  res.end();
});

export default router;
