interface Env {
  ASSETS: Fetcher;
  API_ORIGIN: string;
  AI: Ai;
}

type ChatMessage = { role: "system" | "user" | "assistant"; content: string };
const MODEL = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";
const THERYN_PROMPT = "You are Theryn, a helpful, accurate, friendly AI assistant. Answer clearly, admit uncertainty, and ask a focused follow-up question when needed.";
const VESPER_PROMPT = "You are Vesper, a thoughtful, warm, precise AI assistant. Give considered answers with useful context, while staying concise and honest about uncertainty.";

function getApiOrigin(value: string | undefined): URL | null {
  if (!value) return null;
  try {
    const origin = new URL(value);
    const isLocalHttp = origin.protocol === "http:" && ["localhost", "127.0.0.1"].includes(origin.hostname);
    if ((origin.protocol !== "https:" && !isLocalHttp) || origin.pathname !== "/" || origin.search || origin.hash) return null;
    return origin;
  } catch { return null; }
}

function apiNotConfigured(): Response {
  return Response.json({ error: "API_ORIGIN is not configured for this Worker." }, { status: 503, headers: { "Cache-Control": "no-store" } });
}

function upstreamRequest(request: Request, origin: URL, path: string, init?: RequestInit): Request {
  const incoming = new URL(request.url);
  const headers = new Headers(init?.headers ?? request.headers);
  headers.set("X-Forwarded-Host", incoming.host);
  headers.set("X-Forwarded-Proto", incoming.protocol.slice(0, -1));
  if (init?.body !== undefined) headers.set("Content-Type", "application/json");
  return new Request(new URL(path, origin), { ...init, headers, credentials: "include" });
}

async function apiFetch(request: Request, origin: URL, path: string, init?: RequestInit): Promise<Response> {
  return fetch(upstreamRequest(request, origin, path, init));
}

function errorResponse(message: string, status: number): Response {
  return Response.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });
}

async function authorized(request: Request, origin: URL, feature: "aiChat" | "studio"): Promise<Response | null> {
  const response = await apiFetch(request, origin, `/api/ai/authorize?feature=${feature}`, { method: "GET" });
  if (response.ok) return null;
  const body = await response.json().catch(() => ({})) as { error?: string };
  return errorResponse(body.error ?? "Could not authorize this AI request.", response.status);
}

function sseResponse(run: (emit: (payload: unknown) => void, fail: (message: string) => void) => Promise<void>): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const emit = (payload: unknown) => controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
      const fail = (message: string) => emit({ error: message });
      void run(emit, fail).finally(() => controller.close());
    },
  });
  return new Response(stream, { headers: { "Content-Type": "text/event-stream; charset=utf-8", "Cache-Control": "no-cache, no-transform", "X-Accel-Buffering": "no" } });
}

async function collectAiStream(ai: Ai, messages: ChatMessage[], emit: (payload: unknown) => void): Promise<string> {
  const stream = await ai.run(MODEL, { messages, stream: true, max_tokens: 4096 }) as ReadableStream<string | { response?: string }>;
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let output = "";
  const consumeLine = (line: string) => {
    if (!line.startsWith("data:")) return;
    const value = line.slice(5).trim();
    if (!value || value === "[DONE]") return;
    try {
      const parsed = JSON.parse(value) as { response?: string; choices?: Array<{ delta?: { content?: string } }> };
      const content = parsed.response ?? parsed.choices?.[0]?.delta?.content ?? "";
      if (content) { output += content; emit({ content }); }
    } catch { /* ignore model metadata frames */ }
  };
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    if (typeof value === "object") {
      const content = value.response ?? "";
      if (content) { output += content; emit({ content }); }
      continue;
    }
    buffer += typeof value === "string" ? value : decoder.decode(value as BufferSource, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) consumeLine(line.trimEnd());
  }
  if (buffer.trim()) consumeLine(buffer.trimEnd());
  return output;
}

async function chat(request: Request, env: Env, origin: URL, provider: "openai" | "anthropic" | "openrouter", conversationId: string): Promise<Response> {
  const authError = await authorized(request, origin, "aiChat");
  if (authError) return authError;
  const rawBody = await request.json().catch(() => null) as { content?: unknown; regenerate?: unknown; images?: unknown } | null;
  const content = typeof rawBody?.content === "string" ? rawBody.content : "";
  const regenerate = rawBody?.regenerate === true;
  if (!rawBody || (!regenerate && !content.trim()) || content.length > 20_000) return errorResponse("A chat message is required and must be under 20,000 characters.", 400);
  if (Array.isArray(rawBody.images) && rawBody.images.length) return errorResponse("Image questions are not supported by the current text model. Remove the image and try a text prompt.", 400);
  const historyResponse = await apiFetch(request, origin, `/api/${provider}/conversations/${conversationId}`);
  if (!historyResponse.ok) return new Response(historyResponse.body, { status: historyResponse.status, headers: historyResponse.headers });
  const conversation = await historyResponse.json() as { messages?: Array<{ role: string; content: string }> };
  const history = (conversation.messages ?? []).filter(message => message.role === "user" || message.role === "assistant");
  if (regenerate && history.at(-1)?.role === "assistant") history.pop();
  const system = provider === "anthropic" ? VESPER_PROMPT : THERYN_PROMPT;
  const messages: ChatMessage[] = [{ role: "system", content: system }, ...history.map(message => ({ role: message.role as "user" | "assistant", content: message.content }))];
  if (!regenerate) messages.push({ role: "user", content });

  return sseResponse(async (emit, fail) => {
    try {
      const response = await collectAiStream(env.AI, messages, emit);
      if (!response.trim()) { fail("The model returned an empty response. Please try again."); return; }
      const persisted = await apiFetch(request, origin, "/api/ai/persist-chat", { method: "POST", body: JSON.stringify({ conversationId: Number(conversationId), provider, content, response, regenerate }) });
      if (!persisted.ok) { const error = await persisted.json().catch(() => ({})) as { error?: string }; fail(error.error ?? "The response could not be saved."); return; }
      emit({ done: true });
    } catch (error) { fail(error instanceof Error ? error.message : "Cloudflare Workers AI could not complete this request."); }
  });
}

async function studio(request: Request, env: Env, origin: URL): Promise<Response> {
  const authError = await authorized(request, origin, "studio");
  if (authError) return authError;
  const body = await request.json().catch(() => null) as { messages?: unknown } | null;
  if (!Array.isArray(body?.messages) || body.messages.length === 0 || body.messages.length > 40) return errorResponse("A valid Studio message history is required.", 400);
  const promptResponse = await apiFetch(request, origin, "/api/studio/system-prompt");
  if (!promptResponse.ok) return new Response(promptResponse.body, { status: promptResponse.status, headers: promptResponse.headers });
  const { systemPrompt } = await promptResponse.json() as { systemPrompt: string };
  const messages: ChatMessage[] = [{ role: "system", content: systemPrompt }, ...(body.messages as ChatMessage[]).filter(message => ["user", "assistant"].includes(message.role) && typeof message.content === "string")];
  if (messages.length < 2 || messages.some(message => message.content.length > 100_000)) return errorResponse("Studio messages are invalid or too large.", 400);
  return sseResponse(async (emit, fail) => {
    try {
      const output = await collectAiStream(env.AI, messages, emit);
      if (!output.trim()) { fail("The model returned an empty response. Please try again."); return; }
      const recorded = await apiFetch(request, origin, "/api/ai/record-studio-usage", { method: "POST", body: JSON.stringify({}) });
      if (!recorded.ok) { fail("Studio usage could not be recorded. Please try again."); return; }
      emit({ done: true });
    } catch (error) { fail(error instanceof Error ? error.message : "Cloudflare Workers AI could not complete this Studio request."); }
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const incoming = new URL(request.url);
    if (incoming.pathname === "/api" || incoming.pathname.startsWith("/api/")) {
      const origin = getApiOrigin(env.API_ORIGIN);
      if (!origin) return apiNotConfigured();
      if (request.method === "POST" && incoming.pathname === "/api/studio/chat") return studio(request, env, origin);
      const match = incoming.pathname.match(/^\/api\/(openai|anthropic|openrouter)\/conversations\/([^/]+)\/messages$/);
      if (request.method === "POST" && match) return chat(request, env, origin, match[1] as "openai" | "anthropic" | "openrouter", match[2]);
      const apiPath = `${incoming.pathname}${incoming.search}`;
      return fetch(upstreamRequest(request, origin, apiPath, { method: request.method, body: request.method === "GET" || request.method === "HEAD" ? undefined : request.body, redirect: request.redirect }));
    }
    return env.ASSETS.fetch(request);
  },
};
