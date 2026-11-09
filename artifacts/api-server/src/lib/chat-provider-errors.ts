import type { Response } from "express";

type ChatProvider = "OpenAI" | "Anthropic" | "OpenRouter";

function getStatus(error: unknown): number | null {
  if (!error || typeof error !== "object") return null;
  const status = (error as { status?: unknown; statusCode?: unknown }).status
    ?? (error as { statusCode?: unknown }).statusCode;
  return typeof status === "number" && Number.isInteger(status) ? status : null;
}

function getMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return typeof error === "string" ? error : "";
}

function normalizeError(provider: ChatProvider, error: unknown): { status: number; message: string } {
  const status = getStatus(error);
  const rawMessage = getMessage(error);
  const message = rawMessage.toLowerCase();

  if (/credit|balance|payment|billing|can only afford|quota exceeded/.test(message)) {
    return {
      status: 402,
      message: `${provider} does not have enough API credits to answer. Add credits to that provider account or choose another provider.`,
    };
  }

  if (status === 429) {
    return {
      status: 429,
      message: `${provider} is temporarily rate-limiting requests. Wait a moment or choose another provider.`,
    };
  }

  if (status === 401 || status === 403) {
    return {
      status: 502,
      message: `${provider} rejected its configured API key. Check the provider settings.`,
    };
  }

  if (status === 400) {
    return {
      status: 502,
      message: `${provider} rejected this request. Check the selected model and try again.`,
    };
  }

  return {
    status: 502,
    message: `${provider} could not complete the chat request. Try again or check the provider settings.`,
  };
}

export function writeChatEvent(res: Response, payload: Record<string, unknown>): void {
  if (!res.headersSent) {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
  }
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
}

export function sendChatProviderError(res: Response, provider: ChatProvider, error: unknown): void {
  if (res.writableEnded || res.destroyed) return;

  const normalized = normalizeError(provider, error);
  if (res.headersSent) {
    writeChatEvent(res, { error: normalized.message });
    res.end();
    return;
  }

  res.status(normalized.status).json({ error: normalized.message });
}

export function sendChatEmptyResponse(res: Response, provider: ChatProvider): void {
  const message = `${provider} returned an empty reply. Try another model or provider, then retry.`;
  if (res.writableEnded || res.destroyed) return;
  if (res.headersSent) {
    writeChatEvent(res, { error: message });
    res.end();
    return;
  }
  res.status(502).json({ error: message });
}
