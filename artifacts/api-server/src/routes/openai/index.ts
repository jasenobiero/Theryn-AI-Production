import { Router, type IRouter } from "express";
import { db, conversations, messages } from "@workspace/db";
import { generateImageBuffer } from "@workspace/integrations-openai-ai-server/image";
import {
  CreateOpenaiConversationBody,
  GenerateOpenaiImageBody,
} from "@workspace/api-zod";
import { and, eq, asc, desc } from "drizzle-orm";
import { getOpenAIClientForRequest, getProviderKey } from "../../lib/provider-clients";
import { clerkRequireAuth } from "../../middlewares/clerkRequireAuth";
import { requireFeatureAccess } from "../../subscriptions/entitlements";
import { finalizeGeneration, reserveDailyGeneration, recordUsage } from "../../subscriptions/usage";

const router: IRouter = Router();
router.use(clerkRequireAuth);

interface PastedImage { dataUrl: string; mimeType: string; }

router.get("/conversations", async (req, res) => {
  const rows = await db.select().from(conversations)
    .where(and(eq(conversations.userId, (req as any).userId), eq(conversations.provider, "openai")))
    .orderBy(asc(conversations.createdAt));
  res.json(rows);
});

router.post("/conversations", async (req, res) => {
  const body = CreateOpenaiConversationBody.parse(req.body);
  const [conv] = await db.insert(conversations).values({
    userId: (req as any).userId, provider: "openai", title: body.title,
  }).returning();
  res.status(201).json(conv);
});

router.patch("/conversations/:id", async (req, res) => {
  const id = Number(req.params.id);
  const title = typeof req.body?.title === "string" ? req.body.title.trim() : "";
  if (!Number.isSafeInteger(id) || id < 1 || !title || title.length > 120) {
    res.status(400).json({ error: "A valid conversation ID and title (1-120 characters) are required" });
    return;
  }
  const [conv] = await db.update(conversations).set({ title }).where(and(
    eq(conversations.id, id),
    eq(conversations.userId, (req as any).userId),
    eq(conversations.provider, "openai"),
  )).returning();
  if (!conv) { res.status(404).json({ error: "Conversation not found" }); return; }
  res.json(conv);
});

router.get("/conversations/:id", async (req, res) => {
  const id = Number(req.params.id);
  const [conv] = await db.select().from(conversations).where(and(
    eq(conversations.id, id),
    eq(conversations.userId, (req as any).userId),
    eq(conversations.provider, "openai"),
  ));
  if (!conv) { res.status(404).json({ error: "Conversation not found" }); return; }
  const msgs = await db.select().from(messages).where(eq(messages.conversationId, id)).orderBy(asc(messages.createdAt));
  res.json({ ...conv, messages: msgs });
});

router.delete("/conversations/:id", async (req, res) => {
  const id = Number(req.params.id);
  const [conv] = await db.select().from(conversations).where(and(
    eq(conversations.id, id),
    eq(conversations.userId, (req as any).userId),
    eq(conversations.provider, "openai"),
  ));
  if (!conv) { res.status(404).json({ error: "Conversation not found" }); return; }
  await db.delete(conversations).where(and(
    eq(conversations.id, id),
    eq(conversations.userId, (req as any).userId),
    eq(conversations.provider, "openai"),
  ));
  res.status(204).send();
});

router.get("/conversations/:id/messages", async (req, res) => {
  const id = Number(req.params.id);
  const [conv] = await db.select({ id: conversations.id }).from(conversations).where(and(
    eq(conversations.id, id),
    eq(conversations.userId, (req as any).userId),
    eq(conversations.provider, "openai"),
  ));
  if (!conv) { res.status(404).json({ error: "Conversation not found" }); return; }
  const msgs = await db.select().from(messages).where(eq(messages.conversationId, id)).orderBy(asc(messages.createdAt));
  res.json(msgs);
});

router.post("/conversations/:id/messages", requireFeatureAccess("aiChat"), async (req, res) => {
  const id = Number(req.params.id);
  const [conv] = await db.select({ id: conversations.id }).from(conversations).where(and(
    eq(conversations.id, id),
    eq(conversations.userId, (req as any).userId),
    eq(conversations.provider, "openai"),
  ));
  if (!conv) { res.status(404).json({ error: "Conversation not found" }); return; }
  const content: string = req.body.content ?? "";
  const imgs: PastedImage[] = Array.isArray(req.body.images) ? req.body.images : [];
  const regenerate = req.body?.regenerate === true;
  let replacedAssistantId: number | null = null;

  if (regenerate) {
    const [lastMessage] = await db.select({ id: messages.id, role: messages.role }).from(messages)
      .where(eq(messages.conversationId, id))
      .orderBy(desc(messages.createdAt), desc(messages.id))
      .limit(1);
    if (lastMessage?.role !== "assistant") {
      res.status(409).json({ error: "The latest assistant response cannot be regenerated" });
      return;
    }
    replacedAssistantId = lastMessage.id;
  } else {
    // Store text content in DB (images are transient)
    await db.insert(messages).values({ conversationId: id, role: "user", content });
  }

  const storedMessages = await db.select().from(messages)
    .where(eq(messages.conversationId, id))
    .orderBy(asc(messages.createdAt));
  const allMessages = replacedAssistantId === null
    ? storedMessages
    : storedMessages.filter(message => message.id !== replacedAssistantId);

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
    if (m.role === "user") return { role: "user" as const, content };
    if (m.role === "assistant") return { role: "assistant" as const, content: m.content };
    return { role: "system" as const, content: m.content };
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

  await recordUsage(req, "aiChat", { provider: "openai", operation: "chat" });
  await db.insert(messages).values({ conversationId: id, role: "assistant", content: fullResponse });
  if (replacedAssistantId !== null) {
    await db.delete(messages).where(and(
      eq(messages.id, replacedAssistantId),
      eq(messages.conversationId, id),
    ));
  }
  res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
  res.end();
});

router.post("/generate-image", requireFeatureAccess("imageGen"), async (req, res) => {
  const body = GenerateOpenaiImageBody.parse(req.body);
  const reservation = await reserveDailyGeneration(req);
  if (!reservation.reservationId) {
    res.status(429).json({
      error: "Daily image generation limit reached.",
      limit: 5,
      resetAt: reservation.resetAt,
    });
    return;
  }

  try {
    const buffer = await generateImageBuffer(
      body.prompt,
      body.size ?? "1024x1024",
      await getProviderKey(req, "openaiApiKey"),
    );
    await finalizeGeneration(reservation.reservationId, "committed");
    res.json({
      b64_json: buffer.toString("base64"),
      generationsRemainingToday: reservation.remaining,
      resetAt: reservation.resetAt,
    });
  } catch {
    await finalizeGeneration(reservation.reservationId, "failed");
    res.status(502).json({ error: "Image generation failed. Check your OpenAI provider settings and try again." });
  }
});

export default router;
