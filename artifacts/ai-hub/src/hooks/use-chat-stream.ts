import { useState, useRef, useCallback } from "react";

export interface StreamMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  images?: string[]; // data URLs — display only, never persisted
}

interface UseChatStreamOptions {
  onFinish?: () => void;
  onError?: (err: Error) => void;
  onConversationId?: (id: number) => void;
}

function fallbackErrorMessage(status: number): string {
  if (status === 401) return "Your sign-in session expired. Refresh the page and sign in again.";
  if (status === 402) return "The selected AI provider does not have enough credits. Add provider credits or choose a provider with an available balance.";
  if (status === 429) return "The selected AI provider is rate-limiting requests. Wait a moment or choose another provider.";
  if (status >= 500) return "The chat service is temporarily unavailable. Please try again.";
  return `The chat request failed (HTTP ${status}). Please try again or check the provider settings.`;
}

async function readErrorMessage(response: Response): Promise<string> {
  let body = "";
  try {
    body = await response.text();
  } catch {
    return fallbackErrorMessage(response.status);
  }

  if (body.trim()) {
    try {
      const payload: unknown = JSON.parse(body);
      if (payload && typeof payload === "object") {
        const record = payload as Record<string, unknown>;
        if (typeof record.error === "string" && record.error.trim()) return record.error;
        if (typeof record.message === "string" && record.message.trim()) return record.message;
        if (record.error && typeof record.error === "object") {
          const error = record.error as Record<string, unknown>;
          if (typeof error.message === "string" && error.message.trim()) return error.message;
        }
      }
    } catch {
      // The server may return HTML or plain text; use a safe status message below.
    }
  }

  return fallbackErrorMessage(response.status);
}

export function useChatStream({ onFinish, onError, onConversationId }: UseChatStreamOptions = {}) {
  const [messages, setMessages] = useState<StreamMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const streamIntoMessage = useCallback(async (
    url: string,
    body: Record<string, unknown>,
    assistantMsgId: string,
  ) => {
    abortControllerRef.current = new AbortController();
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: abortControllerRef.current.signal,
      credentials: "include",
    });

    if (!res.ok) throw new Error(await readErrorMessage(res));
    if (!res.body) throw new Error("No response body");

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let done = false;
    let buffer = "";
    const processLine = (line: string) => {
      if (!line.startsWith("data: ")) return false;
      const dataStr = line.slice(6).trim();
      if (!dataStr || dataStr === "[DONE]") return false;
      let data: Record<string, unknown>;
      try {
        const parsed: unknown = JSON.parse(dataStr);
        if (!parsed || typeof parsed !== "object") return false;
        data = parsed as Record<string, unknown>;
      } catch {
        // Ignore malformed SSE events.
        return false;
      }

      if (typeof data.error === "string" && data.error.trim()) {
        throw new Error(data.error);
      }

      if (typeof data.conversationId === "number") onConversationId?.(data.conversationId);
      if (data.done === true) return true;
      const content = data.content;
      if (typeof content === "string" && content) {
        setMessages(prev => prev.map(msg =>
          msg.id === assistantMsgId
            ? { ...msg, content: msg.content + content }
            : msg
        ));
      }
      return false;
    };

    while (!done) {
      const { value, done: readerDone } = await reader.read();
      done = readerDone;
      buffer += decoder.decode(value, { stream: !readerDone });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (processLine(line)) {
          done = true;
          break;
        }
      }
      if (readerDone && buffer) {
        done = processLine(buffer) || done;
        buffer = "";
      }
    }
  }, [onConversationId]);

  // url and userImages are passed per-call — no stale closures
  const sendMessage = useCallback(async (
    url: string,
    body: Record<string, unknown>,
    userContent: string,
    userImages?: string[],
  ) => {
    if (!url) return;
    const assistantMsgId = (Date.now() + 1).toString();

    try {
      setIsStreaming(true);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: "user",
        content: userContent,
        images: userImages,
      }]);
      setMessages(prev => [...prev, { id: assistantMsgId, role: "assistant", content: "" }]);
      await streamIntoMessage(url, body, assistantMsgId);
      onFinish?.();
    } catch (err: unknown) {
      setMessages(prev => prev.filter(message => message.id !== assistantMsgId || message.content.length > 0));
      if (err instanceof Error && err.name === "AbortError") return;
      console.error("Stream error:", err);
      onError?.(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  }, [onError, onFinish, streamIntoMessage]);

  const regenerateLastMessage = useCallback(async (url: string, body: Record<string, unknown>) => {
    const lastMessage = messages[messages.length - 1];
    if (!url || isStreaming || lastMessage?.role !== "assistant") return;

    const assistantMsgId = lastMessage.id;
    const previousContent = lastMessage.content;
    setMessages(prev => prev.map(message =>
      message.id === assistantMsgId ? { ...message, content: "" } : message
    ));

    try {
      setIsStreaming(true);
      await streamIntoMessage(url, body, assistantMsgId);
      onFinish?.();
    } catch (err: unknown) {
      setMessages(prev => prev.map(message =>
        message.id === assistantMsgId ? { ...message, content: previousContent } : message
      ));
      if (err instanceof Error && err.name === "AbortError") return;
      console.error("Regeneration error:", err);
      onError?.(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  }, [isStreaming, messages, onError, onFinish, streamIntoMessage]);

  const stopStream = useCallback(() => {
    abortControllerRef.current?.abort();
  }, []);

  const resetMessages = useCallback((initial: StreamMessage[] = []) => {
    setMessages(initial);
  }, []);

  const appendExchange = useCallback((
    userContent: string,
    assistantContent: string,
    userImages?: string[],
    assistantImages?: string[],
  ) => {
    setMessages(prev => [...prev,
      { id: crypto.randomUUID(), role: "user", content: userContent, images: userImages },
      { id: crypto.randomUUID(), role: "assistant", content: assistantContent, images: assistantImages },
    ]);
  }, []);

  return { messages, isStreaming, sendMessage, regenerateLastMessage, stopStream, resetMessages, appendExchange };
}
