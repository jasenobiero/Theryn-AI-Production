import { Router, type IRouter } from "express";
import { db, conversations, messages } from "@workspace/db";
import { CreateOpenrouterConversationBody } from "@workspace/api-zod";
import { and, eq, asc, desc } from "drizzle-orm";
import { getOpenRouterClientForRequest } from "../../lib/provider-clients";
import { OPENROUTER_MODELS, isVisionCapableOpenRouterModel, normalizeOpenRouterModel } from "../../lib/openrouter-models";
import { clerkRequireAuth } from "../../middlewares/clerkRequireAuth";
import { requireFeatureAccess } from "../../subscriptions/entitlements";
import { recordUsage } from "../../subscriptions/usage";
import { sendChatProviderError, writeChatEvent } from "../../lib/chat-provider-errors";

const router: IRouter = Router();
router.use(clerkRequireAuth);

interface PastedImage { dataUrl: string; mimeType: string; }

const DEFAULT_MODEL = OPENROUTER_MODELS[0];

router.get("/conversations", async (req, res) => {
  const rows = await db.select().from(conversations)
    .where(and(eq(conversations.userId, (req as any).userId), eq(conversations.provider, "openrouter")))
    .orderBy(asc(conversations.createdAt));
  res.json(rows.map(r => ({ ...r, model: normalizeOpenRouterModel(r.model ?? DEFAULT_MODEL) })));
});

router.post("/conversations", async (req, res) => {
  const body = CreateOpenrouterConversationBody.parse(req.body);
  const [conv] = await db.insert(conversations).values({
    userId: (req as any).userId,
    provider: "openrouter",
    model: normalizeOpenRouterModel(body.model ?? DEFAULT_MODEL),
    title: body.title,
  }).returning();
  res.status(201).json({ ...conv, model: normalizeOpenRouterModel(body.model ?? DEFAULT_MODEL) });
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
    eq(conversations.provider, "openrouter"),
  )).returning();
  if (!conv) { res.status(404).json({ error: "Conversation not found" }); return; }
  res.json({ ...conv, model: normalizeOpenRouterModel(conv.model ?? DEFAULT_MODEL) });
});

router.get("/conversations/:id", async (req, res) => {
  const id = Number(req.params.id);
  const [conv] = await db.select().from(conversations).where(and(
    eq(conversations.id, id),
    eq(conversations.userId, (req as any).userId),
    eq(conversations.provider, "openrouter"),
  ));
  if (!conv) { res.status(404).json({ error: "Conversation not found" }); return; }
  const msgs = await db.select().from(messages).where(eq(messages.conversationId, id)).orderBy(asc(messages.createdAt));
  res.json({ ...conv, model: normalizeOpenRouterModel(conv.model ?? DEFAULT_MODEL), messages: msgs });
});

router.delete("/conversations/:id", async (req, res) => {
  const id = Number(req.params.id);
  const [conv] = await db.select().from(conversations).where(and(
    eq(conversations.id, id),
    eq(conversations.userId, (req as any).userId),
    eq(conversations.provider, "openrouter"),
  ));
  if (!conv) { res.status(404).json({ error: "Conversation not found" }); return; }
  await db.delete(conversations).where(and(
    eq(conversations.id, id),
    eq(conversations.userId, (req as any).userId),
    eq(conversations.provider, "openrouter"),
  ));
  res.status(204).send();
});

router.get("/conversations/:id/messages", async (req, res) => {
  const id = Number(req.params.id);
  const [conv] = await db.select({ id: conversations.id }).from(conversations).where(and(
    eq(conversations.id, id),
    eq(conversations.userId, (req as any).userId),
    eq(conversations.provider, "openrouter"),
  ));
  if (!conv) { res.status(404).json({ error: "Conversation not found" }); return; }
  const msgs = await db.select().from(messages).where(eq(messages.conversationId, id)).orderBy(asc(messages.createdAt));
  res.json(msgs);
});

router.post("/conversations/:id/messages", requireFeatureAccess("aiChat"), async (req, res) => {
  const id = Number(req.params.id);
  const [conv] = await db.select({ id: conversations.id, model: conversations.model }).from(conversations).where(and(
    eq(conversations.id, id),
    eq(conversations.userId, (req as any).userId),
    eq(conversations.provider, "openrouter"),
  ));
  if (!conv) { res.status(404).json({ error: "Conversation not found" }); return; }
  const content: string = typeof req.body.content === "string" ? req.body.content : "";
  const requestedModel = req.body.model;
  const model = normalizeOpenRouterModel(typeof requestedModel === "string" && requestedModel.trim()
    ? requestedModel
    : conv.model ?? DEFAULT_MODEL);
  if (model.length > 200) {
    res.status(400).json({ error: "Model ID must be 200 characters or fewer" });
    return;
  }
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
    await db.insert(messages).values({ conversationId: id, role: "user", content });
  }

  const storedMessages = await db.select().from(messages)
    .where(eq(messages.conversationId, id))
    .orderBy(asc(messages.createdAt));
  const allMessages = replacedAssistantId === null
    ? storedMessages
    : storedMessages.filter(message => message.id !== replacedAssistantId);

  let fullResponse = "";

  type OAIContent =
    | string
    | Array<{ type: "text"; text: string } | { type: "image_url"; image_url: { url: string } }>;

  const supportsVision = isVisionCapableOpenRouterModel(model);

  const apiMessages = allMessages.map((m, idx) => {
    const isLast = idx === allMessages.length - 1 && m.role === "user";
    const content: OAIContent = (isLast && imgs.length > 0 && supportsVision)
      ? [
          ...imgs.map(img => ({ type: "image_url" as const, image_url: { url: img.dataUrl } })),
          { type: "text" as const, text: m.content },
        ]
      : m.content;
    if (m.role === "user") return { role: "user" as const, content };
    if (m.role === "assistant") return { role: "assistant" as const, content: m.content };
    return { role: "system" as const, content: m.content };
  });

  try {
    const client = await getOpenRouterClientForRequest(req);
    const stream = await client.chat.completions.create({
      model,
      max_tokens: 2048,
      messages: apiMessages,
      stream: true,
    });

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) {
        fullResponse += delta;
        writeChatEvent(res, { content: delta });
      }
    }
  } catch (error) {
    sendChatProviderError(res, "OpenRouter", error);
    return;
  }

  await recordUsage(req, "aiChat", { provider: "openrouter", operation: "chat" });
  await db.insert(messages).values({ conversationId: id, role: "assistant", content: fullResponse });
  await db.update(conversations).set({ model }).where(and(
    eq(conversations.id, id),
    eq(conversations.userId, (req as any).userId),
    eq(conversations.provider, "openrouter"),
  ));
  if (replacedAssistantId !== null) {
    await db.delete(messages).where(and(
      eq(messages.id, replacedAssistantId),
      eq(messages.conversationId, id),
    ));
  }
  writeChatEvent(res, { done: true });
  res.end();
});

export default router;
