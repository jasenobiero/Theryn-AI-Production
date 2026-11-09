import { Router, type IRouter } from "express";
import { and, desc, eq } from "drizzle-orm";
import { db, conversations, messages } from "@workspace/db";
import { clerkRequireAuth } from "../middlewares/clerkRequireAuth";
import { getConfiguredAccess, getEffectivePlan, isSubscriptionFeature, requireFeatureAccess } from "../subscriptions/entitlements";
import { recordUsage } from "../subscriptions/usage";

const router: IRouter = Router();

router.get("/ai/authorize", clerkRequireAuth, async (req, res) => {
  const feature = typeof req.query.feature === "string" ? req.query.feature : "";
  if (!isSubscriptionFeature(feature) || (feature !== "aiChat" && feature !== "studio")) {
    res.status(400).json({ error: "Unsupported AI feature." });
    return;
  }
  const { planId } = await getEffectivePlan((req as typeof req & { userId: string }).userId);
  if ((await getConfiguredAccess(planId, feature)) === "none") {
    res.status(403).json({ error: `The ${feature === "aiChat" ? "AI chat" : "Studio"} feature is not included in your current plan.`, currentPlan: planId });
    return;
  }
  res.json({ authorized: true, feature });
});

router.post("/ai/persist-chat", clerkRequireAuth, requireFeatureAccess("aiChat"), async (req, res) => {
  const conversationId = Number(req.body?.conversationId);
  const provider = req.body?.provider;
  const content = typeof req.body?.content === "string" ? req.body.content : "";
  const response = typeof req.body?.response === "string" ? req.body.response : "";
  const regenerate = req.body?.regenerate === true;
  if (!Number.isSafeInteger(conversationId) || conversationId < 1
    || (provider !== "openai" && provider !== "anthropic" && provider !== "openrouter")
    || response.length === 0 || response.length > 300_000
    || (!regenerate && (!content.trim() || content.length > 20_000))) {
    res.status(400).json({ error: "Invalid chat response data." });
    return;
  }

  const userId = (req as typeof req & { userId: string }).userId;
  const [conversation] = await db.select({ id: conversations.id }).from(conversations).where(and(
    eq(conversations.id, conversationId),
    eq(conversations.userId, userId),
    eq(conversations.provider, provider),
  ));
  if (!conversation) { res.status(404).json({ error: "Conversation not found." }); return; }

  if (regenerate) {
    const [lastMessage] = await db.select({ id: messages.id, role: messages.role }).from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(desc(messages.createdAt), desc(messages.id))
      .limit(1);
    if (lastMessage?.role !== "assistant") {
      res.status(409).json({ error: "The latest assistant response cannot be regenerated." });
      return;
    }
    await db.delete(messages).where(and(eq(messages.id, lastMessage.id), eq(messages.conversationId, conversationId)));
  } else {
    await db.insert(messages).values({ conversationId, role: "user", content });
  }
  await db.insert(messages).values({ conversationId, role: "assistant", content: response });
  await recordUsage(req, "aiChat", { provider: "cloudflare-workers-ai", operation: regenerate ? "regenerate" : "chat" });
  res.json({ success: true });
});

router.post("/ai/record-studio-usage", clerkRequireAuth, async (req, res) => {
  await recordUsage(req, "studio", { provider: "cloudflare-workers-ai", operation: "studio_chat" });
  res.json({ success: true });
});

export default router;
