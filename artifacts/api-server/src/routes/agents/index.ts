import { Router, type IRouter } from "express";
import { db, agents, agentConversations, agentMessages } from "@workspace/db";
import {
  CreateAgentBody,
  UpdateAgentBody,
  ChatWithAgentBody,
} from "@workspace/api-zod";
import { eq, asc } from "drizzle-orm";
import {
  getAnthropicClientForRequest,
  getOpenAIClientForRequest,
  getOpenRouterClientForRequest,
} from "../../lib/provider-clients";

const router: IRouter = Router();

router.get("/", async (_req, res) => {
  const rows = await db.select().from(agents).orderBy(asc(agents.createdAt));
  res.json(rows);
});

router.post("/", async (req, res) => {
  const body = CreateAgentBody.parse(req.body);
  const [agent] = await db.insert(agents).values({
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
  const [agent] = await db.select().from(agents).where(eq(agents.id, id));
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
  }).where(eq(agents.id, id)).returning();
  if (!agent) {
    res.status(404).json({ error: "Agent not found" });
    return;
  }
  res.json(agent);
});

router.delete("/:id", async (req, res) => {
  const id = Number(req.params.id);
  const [agent] = await db.select().from(agents).where(eq(agents.id, id));
  if (!agent) {
    res.status(404).json({ error: "Agent not found" });
    return;
  }
  await db.delete(agents).where(eq(agents.id, id));
  res.status(204).send();
});

router.get("/:id/conversations", async (req, res) => {
  const id = Number(req.params.id);
  const convs = await db.select().from(agentConversations).where(eq(agentConversations.agentId, id)).orderBy(asc(agentConversations.createdAt));
  res.json(convs);
});

router.post("/:id/chat", async (req, res) => {
  const id = Number(req.params.id);
  const body = ChatWithAgentBody.parse(req.body);

  const [agent] = await db.select().from(agents).where(eq(agents.id, id));
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

  await db.insert(agentMessages).values({ conversationId: convId, role: "assistant", content: fullResponse });
  res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
  res.end();
});

export default router;
