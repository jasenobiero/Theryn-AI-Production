import { Router, type IRouter } from "express";
import { db, conversations, messages } from "@workspace/db";
import { CreateAnthropicConversationBody } from "@workspace/api-zod";
import { and, eq, asc, desc } from "drizzle-orm";
import { getAnthropicClientForRequest } from "../../lib/provider-clients";
import { clerkRequireAuth } from "../../middlewares/clerkRequireAuth";
import { requireFeatureAccess } from "../../subscriptions/entitlements";
import { recordUsage } from "../../subscriptions/usage";
import { sendChatEmptyResponse, sendChatProviderError, writeChatEvent } from "../../lib/chat-provider-errors";

const router: IRouter = Router();
router.use(clerkRequireAuth);

interface PastedImage { dataUrl: string; mimeType: string; }

router.get("/conversations", async (req, res) => {
  const rows = await db.select().from(conversations)
    .where(and(eq(conversations.userId, (req as any).userId), eq(conversations.provider, "anthropic")))
    .orderBy(asc(conversations.createdAt));
  res.json(rows);
});

router.post("/conversations", async (req, res) => {
  const body = CreateAnthropicConversationBody.parse(req.body);
  const [conv] = await db.insert(conversations).values({
    userId: (req as any).userId, provider: "anthropic", title: body.title,
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
    eq(conversations.provider, "anthropic"),
  )).returning();
  if (!conv) { res.status(404).json({ error: "Conversation not found" }); return; }
  res.json(conv);
});

router.get("/conversations/:id", async (req, res) => {
  const id = Number(req.params.id);
  const [conv] = await db.select().from(conversations).where(and(
    eq(conversations.id, id),
    eq(conversations.userId, (req as any).userId),
    eq(conversations.provider, "anthropic"),
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
    eq(conversations.provider, "anthropic"),
  ));
  if (!conv) { res.status(404).json({ error: "Conversation not found" }); return; }
  await db.delete(conversations).where(and(
    eq(conversations.id, id),
    eq(conversations.userId, (req as any).userId),
    eq(conversations.provider, "anthropic"),
  ));
  res.status(204).send();
});

router.get("/conversations/:id/messages", async (req, res) => {
  const id = Number(req.params.id);
  const [conv] = await db.select({ id: conversations.id }).from(conversations).where(and(
    eq(conversations.id, id),
    eq(conversations.userId, (req as any).userId),
    eq(conversations.provider, "anthropic"),
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
    eq(conversations.provider, "anthropic"),
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
    await db.insert(messages).values({ conversationId: id, role: "user", content });
  }

  const storedMessages = await db.select().from(messages)
    .where(eq(messages.conversationId, id))
    .orderBy(asc(messages.createdAt));
  const allMessages = replacedAssistantId === null
    ? storedMessages
    : storedMessages.filter(message => message.id !== replacedAssistantId);

  let fullResponse = "";
  let sentResponseLength = 0;

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

  try {
    const client = await getAnthropicClientForRequest(req);
    const stream = client.messages.stream({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      messages: apiMessages,
    });

    for await (const event of stream) {
      if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
        fullResponse += event.delta.text;
        if (fullResponse.trim()) {
          const unsentContent = fullResponse.slice(sentResponseLength);
          sentResponseLength = fullResponse.length;
          writeChatEvent(res, { content: unsentContent });
        }
      }
    }
  } catch (error) {
    sendChatProviderError(res, "Anthropic", error);
    return;
  }

  if (!fullResponse.trim()) {
    sendChatEmptyResponse(res, "Anthropic");
    return;
  }

  await recordUsage(req, "aiChat", { provider: "anthropic", operation: "chat" });
  await db.insert(messages).values({ conversationId: id, role: "assistant", content: fullResponse });
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

