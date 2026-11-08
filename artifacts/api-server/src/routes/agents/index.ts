import { Router, type IRouter } from "express";
import { db, agents, agentConversations, agentMessages } from "@workspace/db";
import {
  CreateAgentBody,
  UpdateAgentBody,
  ChatWithAgentBody,
} from "@workspace/api-zod";
import { and, eq, asc, desc } from "drizzle-orm";
import { clerkRequireAuth } from "../../middlewares/clerkRequireAuth";
import { requireFeatureAccess } from "../../subscriptions/entitlements";
import { recordUsage } from "../../subscriptions/usage";
import {
  getAnthropicClientForRequest,
  getOpenAIClientForRequest,
  getOpenRouterClientForRequest,
} from "../../lib/provider-clients";

const router: IRouter = Router();
router.use(clerkRequireAuth);

router.get("/", async (req, res) => {
  const rows = await db.select().from(agents)
    .where(eq(agents.userId, (req as any).userId))
    .orderBy(asc(agents.createdAt));
  res.json(rows);
});

router.post("/", requireFeatureAccess("agentStudio"), async (req, res) => {
  const body = CreateAgentBody.parse(req.body);
  const [agent] = await db.insert(agents).values({
    userId: (req as any).userId,
    name: body.name,
    description: body.description,
    systemPrompt: body.systemPrompt,
    model: body.model,
    provider: body.provider,
    emoji: body.emoji,
  }).returning();
  res.status(201).json(agent);
});

router.get("/:id", async (req, res) => {
  const id = Number(req.params.id);
  const [agent] = await db.select().from(agents).where(and(
    eq(agents.id, id),
    eq(agents.userId, (req as any).userId),
  ));
  if (!agent) {
    res.status(404).json({ error: "Agent not found" });
    return;
  }
  res.json(agent);
});

router.put("/:id", async (req, res) => {
  const id = Number(req.params.id);
  const body = UpdateAgentBody.parse(req.body);
  const [agent] = await db.update(agents).set({
    name: body.name,
    description: body.description,
    systemPrompt: body.systemPrompt,
    model: body.model,
    provider: body.provider,
    emoji: body.emoji,
    updatedAt: new Date(),
  }).where(and(
    eq(agents.id, id),
    eq(agents.userId, (req as any).userId),
  )).returning();
  if (!agent) {
    res.status(404).json({ error: "Agent not found" });
    return;
  }
  res.json(agent);
});

router.delete("/:id", async (req, res) => {
  const id = Number(req.params.id);
  const [agent] = await db.select().from(agents).where(and(
    eq(agents.id, id),
    eq(agents.userId, (req as any).userId),
  ));
  if (!agent) {
    res.status(404).json({ error: "Agent not found" });
    return;
  }
  await db.delete(agents).where(and(
    eq(agents.id, id),
    eq(agents.userId, (req as any).userId),
  ));
  res.status(204).send();
});

router.get("/:id/conversations", async (req, res) => {
  const id = Number(req.params.id);
  const [agent] = await db.select({ id: agents.id }).from(agents).where(and(
    eq(agents.id, id),
    eq(agents.userId, (req as any).userId),
  ));
  if (!agent) {
    res.status(404).json({ error: "Agent not found" });
    return;
  }
  const convs = await db.select().from(agentConversations).where(eq(agentConversations.agentId, id)).orderBy(desc(agentConversations.createdAt));
  res.json(convs);
});

router.get("/:id/conversations/:conversationId", async (req, res) => {
  const agentId = Number(req.params.id);
  const conversationId = Number(req.params.conversationId);
  if (!Number.isSafeInteger(agentId) || agentId < 1 || !Number.isSafeInteger(conversationId) || conversationId < 1) {
    res.status(400).json({ error: "Invalid agent or conversation ID" });
    return;
  }
  const [agent] = await db.select({ id: agents.id }).from(agents).where(and(
    eq(agents.id, agentId),
    eq(agents.userId, (req as any).userId),
  ));
  if (!agent) {
    res.status(404).json({ error: "Agent not found" });
    return;
  }
  const [conversation] = await db.select().from(agentConversations).where(and(
    eq(agentConversations.id, conversationId),
    eq(agentConversations.agentId, agentId),
  ));
  if (!conversation) {
    res.status(404).json({ error: "Agent conversation not found" });
    return;
  }
  const conversationHistory = await db.select().from(agentMessages)
    .where(eq(agentMessages.conversationId, conversationId))
    .orderBy(asc(agentMessages.createdAt));
  res.json({ ...conversation, messages: conversationHistory });
});

router.post("/:id/chat", requireFeatureAccess("agentStudio"), async (req, res) => {
  const id = Number(req.params.id);
  const body = ChatWithAgentBody.parse(req.body);

  const [agent] = await db.select().from(agents).where(and(
    eq(agents.id, id),
    eq(agents.userId, (req as any).userId),
  ));
  if (!agent) {
    res.status(404).json({ error: "Agent not found" });
    return;
  }

  let convId = body.conversationId;
  if (!convId) {
    const [conv] = await db.insert(agentConversations).values({
      agentId: id,
      title: body.content.slice(0, 60),
    }).returning();
    convId = conv.id;
  } else {
    const [conversation] = await db.select({ id: agentConversations.id })
      .from(agentConversations)
      .where(and(
        eq(agentConversations.id, convId),
        eq(agentConversations.agentId, id),
      ));
    if (!conversation) {
      res.status(404).json({ error: "Agent conversation not found" });
      return;
    }
  }

  await db.insert(agentMessages).values({ conversationId: convId, role: "user", content: body.content });

  const history = await db.select().from(agentMessages).where(eq(agentMessages.conversationId, convId)).orderBy(asc(agentMessages.createdAt));

  const chatMessages = [
    { role: "system" as const, content: agent.systemPrompt },
    ...history.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
  ];

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  res.write(`data: ${JSON.stringify({ conversationId: convId })}\n\n`);

  let fullResponse = "";

  if (agent.provider === "anthropic") {
    const client = await getAnthropicClientForRequest(req);
    const stream = client.messages.stream({
      model: agent.model,
      max_tokens: 8192,
      system: agent.systemPrompt,
      messages: history.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
    });
    for await (const event of stream) {
      if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
        fullResponse += event.delta.text;
        res.write(`data: ${JSON.stringify({ content: event.delta.text })}\n\n`);
      }
    }
  } else if (agent.provider === "openrouter") {
    const client = await getOpenRouterClientForRequest(req);
    const stream = await client.chat.completions.create({
      model: agent.model,
      max_tokens: 8192,
      messages: chatMessages,
      stream: true,
    });
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        fullResponse += content;
        res.write(`data: ${JSON.stringify({ content })}\n\n`);
      }
    }
  } else {
    const client = await getOpenAIClientForRequest(req);
    const stream = await client.chat.completions.create({
      model: agent.model,
      max_completion_tokens: 8192,
      messages: chatMessages,
      stream: true,
    });
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        fullResponse += content;
        res.write(`data: ${JSON.stringify({ content })}\n\n`);
      }
    }
  }

  await recordUsage(req, "agentStudio", { provider: agent.provider, operation: "agent-chat" });
  await db.insert(agentMessages).values({ conversationId: convId, role: "assistant", content: fullResponse });
  res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
  res.end();
});

export default router;
