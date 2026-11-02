import { useState, useRef, useEffect, useCallback } from "react";
import { Send, StopCircle, X, ImageIcon, Paperclip } from "lucide-react";
import { Markdown } from "./markdown";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare } from "lucide-react";

export interface PastedImage {
  dataUrl: string;
  mimeType: string;
}

interface ChatMessage {
  id: string | number;
  role: string;
  content: string;
  images?: string[]; // data URLs for display
}

interface ChatInterfaceProps {
  messages: ChatMessage[];
  isStreaming: boolean;
  onSendMessage: (content: string, images?: PastedImage[]) => void;
  onStopStream?: () => void;
  placeholder?: string;
}

export function ChatInterface({
  messages,
  isStreaming,
  onSendMessage,
  onStopStream,
  placeholder = "Type your message…",
}: ChatInterfaceProps) {
  const [input, setInput] = useState("");
  const [attachedImages, setAttachedImages] = useState<PastedImage[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isStreaming]);

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 200) + "px";
  }, [input]);

  const addImage = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setAttachedImages(prev => [...prev, { dataUrl, mimeType: file.type }]);
    };
    reader.readAsDataURL(file);
  }, []);

  // Handle paste — images AND text
  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    let hasImage = false;
    for (const item of items) {
      if (item.kind === "file" && item.type.startsWith("image/")) {
        const file = item.getAsFile();
        if (file) { addImage(file); hasImage = true; }
      }
    }
    // If only image was pasted (no text), prevent default to avoid weird chars
    if (hasImage && !e.clipboardData.getData("text")) {
      e.preventDefault();
    }
  }, [addImage]);

  // Drag and drop
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    for (const file of e.dataTransfer.files) {
      if (file.type.startsWith("image/")) addImage(file);
    }
  }, [addImage]);

  const handleSubmit = () => {
    const text = input.trim();
    if ((!text && attachedImages.length === 0) || isStreaming) return;
    onSendMessage(text || "(image)", attachedImages.length > 0 ? attachedImages : undefined);
    setInput("");
    setAttachedImages([]);
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  };

  const removeImage = (i: number) => setAttachedImages(prev => prev.filter((_, idx) => idx !== i));

  const canSend = (input.trim().length > 0 || attachedImages.length > 0) && !isStreaming;

  return (
    <div
      className="flex flex-col h-full relative"
      onDragOver={e => { e.preventDefault(); setIsDragOver(true); }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
    >
      {/* Drop overlay */}
      <AnimatePresence>
        {isDragOver && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-center justify-center rounded-2xl border-2 border-dashed border-cyan-300/50 bg-cyan-300/5 pointer-events-none"
          >
            <div className="flex flex-col items-center gap-2 text-cyan-100">
              <ImageIcon className="w-10 h-10" />
              <p className="text-sm font-medium">Drop image here</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Messages */}
       <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6 space-y-5">
        <AnimatePresence initial={false}>
          {messages.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="h-full flex flex-col items-center justify-center text-white/25 py-20"
            >
              <MessageSquare className="w-10 h-10 mb-3 opacity-30" />
              <p className="text-sm">Start a conversation</p>
              <p className="text-xs mt-1 opacity-60">Paste images with Ctrl+V or drag &amp; drop</p>
            </motion.div>
          ) : (
            messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                 className={cn("flex w-full max-w-3xl mx-auto", msg.role === "user" ? "justify-end" : "justify-start")}
              >
                <div
                  className={cn(
                     "max-w-[88%] rounded-2xl px-4 py-3.5 text-sm",
                    msg.role === "user"
                      ? "bg-white text-black rounded-br-sm shadow-[0_0_18px_-8px_rgba(255,255,255,0.16)]"
                      : "bg-white/[0.05] border border-white/[0.07] text-white/90 rounded-bl-sm"
                  )}
                >
                  {/* Pasted images */}
                  {msg.images && msg.images.length > 0 && (
                    <div className={cn("flex flex-wrap gap-2 mb-2", msg.images.length === 1 ? "" : "")}>
                      {msg.images.map((src, i) => (
                        <img
                          key={i}
                          src={src}
                          alt="pasted"
                          className="rounded-xl max-w-[280px] max-h-[280px] object-contain border border-white/10"
                        />
                      ))}
                    </div>
                  )}
                  {/* Text content */}
                  {msg.content && msg.content !== "(image)" && (
                    msg.role === "assistant"
                      ? <Markdown content={msg.content} />
                      : <div className="whitespace-pre-wrap leading-relaxed">{msg.content}</div>
                  )}
                  {/* Streaming cursor */}
                  {msg.role === "assistant" && isStreaming && !msg.content && (
                    <span className="inline-block w-2 h-4 bg-white/50 rounded-sm animate-pulse" />
                  )}
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
       <div className="px-4 md:px-8 pb-5 pt-3 border-t border-white/[0.05]" style={{ background: "hsl(0 0% 4% / .72)" }}>
         <div className="max-w-3xl mx-auto">
          <div
            className={cn(
               "rounded-[24px] border transition-all duration-200",
              attachedImages.length > 0 || input
                ? "border-white/[0.1] bg-white/[0.03] shadow-[0_0_20px_-8px_rgba(255,255,255,0.08)]"
                : "border-white/[0.07] bg-white/[0.02]",
              "focus-within:border-white/30 focus-within:shadow-[0_0_24px_-10px_rgba(255,255,255,0.12)]"
            )}
          >
            {/* Attached image previews */}
            {attachedImages.length > 0 && (
              <div className="flex flex-wrap gap-2 px-3 pt-3">
                {attachedImages.map((img, i) => (
                  <div key={i} className="relative group">
                    <img
                      src={img.dataUrl}
                      alt="attachment"
                      className="w-16 h-16 rounded-xl object-cover border border-white/10"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(i)}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-600 border border-background flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-2.5 h-2.5 text-white" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-16 h-16 rounded-xl border border-dashed border-white/20 flex items-center justify-center hover:border-white/40 hover:bg-white/[0.04] transition-all"
                >
                  <ImageIcon className="w-5 h-5 text-white/30" />
                </button>
              </div>
            )}

            {/* Textarea */}
            <textarea
              ref={textareaRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onPaste={handlePaste}
              onKeyDown={e => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(); }
              }}
              placeholder={attachedImages.length > 0 ? "Add a caption… (optional)" : placeholder}
              disabled={isStreaming}
              rows={1}
              className="w-full bg-transparent text-white/90 placeholder:text-white/20 px-4 pt-3 pb-2 resize-none focus:outline-none text-sm leading-relaxed disabled:opacity-50"
              style={{ minHeight: "52px" }}
            />

            {/* Toolbar row */}
            <div className="flex items-center justify-between px-3 pb-3 pt-1">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  title="Attach image"
                  className="p-1.5 rounded-lg text-white/25 hover:text-white/60 hover:bg-white/[0.06] transition-all"
                >
                  <Paperclip className="w-4 h-4" />
                </button>
                <span className="text-[10px] text-white/15 ml-1">Ctrl+V to paste</span>
              </div>

              <div className="flex items-center gap-2">
                {isStreaming ? (
                  <button
                    type="button"
                    onClick={onStopStream}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-400/10 text-rose-200 hover:bg-rose-400/20 transition-all text-xs font-medium"
                  >
                    <StopCircle className="w-3.5 h-3.5" />
                    Stop
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={!canSend}
                    className="w-8 h-8 rounded-xl bg-white text-black hover:bg-white/90 disabled:opacity-20 disabled:cursor-not-allowed flex items-center justify-center transition-all shadow-[0_0_18px_-8px_rgba(255,255,255,0.2)]"
                  >
                    <Send className="w-3.5 h-3.5 text-white" />
                  </button>
                )}
              </div>
            </div>
          </div>

          <p className="text-center text-[10px] text-white/15 mt-1.5">
            Enter to send · Shift+Enter for new line · Paste or drag images
          </p>
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={e => {
          for (const file of e.target.files ?? []) addImage(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}
