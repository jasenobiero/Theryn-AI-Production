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
}

export function useChatStream({ onFinish, onError }: UseChatStreamOptions = {}) {
  const [messages, setMessages] = useState<StreamMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // url and userImages are passed per-call — no stale closures
  const sendMessage = useCallback(async (
    url: string,
    body: Record<string, unknown>,
    userContent: string,
    userImages?: string[],
  ) => {
    if (!url) return;

    try {
      setIsStreaming(true);

      const userMsgId = Date.now().toString();
      setMessages(prev => [...prev, {
        id: userMsgId,
        role: "user",
        content: userContent,
        images: userImages,
      }]);

      const assistantMsgId = (Date.now() + 1).toString();
      setMessages(prev => [...prev, { id: assistantMsgId, role: "assistant", content: "" }]);

      abortControllerRef.current = new AbortController();

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: abortControllerRef.current.signal,
        credentials: "include",
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      if (!res.body) throw new Error("No response body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let done = false;

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) {
          const chunk = decoder.decode(value, { stream: true });
          for (const line of chunk.split("\n")) {
            if (!line.startsWith("data: ")) continue;
            const dataStr = line.slice(6).trim();
            if (dataStr === "[DONE]") continue;
            try {
              const data = JSON.parse(dataStr);
              if (data.done) { done = true; break; }
              if (data.content) {
                setMessages(prev => prev.map(msg =>
                  msg.id === assistantMsgId
                    ? { ...msg, content: msg.content + data.content }
                    : msg
                ));
              }
            } catch {
              // ignore malformed SSE
            }
          }
        }
      }

      onFinish?.();
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") return;
      console.error("Stream error:", err);
      onError?.(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  }, [onFinish, onError]);

  const stopStream = useCallback(() => {
    abortControllerRef.current?.abort();
  }, []);

  const resetMessages = useCallback((initial: StreamMessage[] = []) => {
    setMessages(initial);
  }, []);

  return { messages, isStreaming, sendMessage, stopStream, resetMessages };
}
