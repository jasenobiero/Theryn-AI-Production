import { useState } from "react";
import { Clapperboard, Download, Film, Loader2, Wand2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type MediaKind = "gif" | "video";

export default function MediaPage() {
  const [kind, setKind] = useState<MediaKind>("gif");
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const { toast } = useToast();

  const generate = async () => {
    const cleanPrompt = prompt.trim();
    if (!cleanPrompt) return;
    setBusy(true);
    setMediaUrl(null);
    try {
      if (kind === "gif") {
        const response = await fetch("/api/openai/generate-gif", {
          method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
          body: JSON.stringify({ prompt: cleanPrompt }),
        });
        const result = await response.json() as { b64_json?: string; error?: string };
        if (!response.ok || !result.b64_json) throw new Error(result.error ?? "GIF generation failed.");
        setMediaUrl(`data:image/gif;base64,${result.b64_json}`);
        return;
      }

      const response = await fetch("/api/video/generate", {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ prompt: cleanPrompt, duration: 5, ratio: "1280:720" }),
      });
      const task = await response.json() as { taskId?: string; error?: string };
      if (!response.ok || !task.taskId) throw new Error(task.error ?? "Could not start video generation.");
      const deadline = Date.now() + 10 * 60 * 1000;
      while (Date.now() < deadline) {
        await new Promise(resolve => window.setTimeout(resolve, 4000));
        const statusResponse = await fetch(`/api/video/tasks/${encodeURIComponent(task.taskId!)}`, { credentials: "include" });
        const status = await statusResponse.json() as { status?: string; videoUrl?: string; error?: string };
        if (!statusResponse.ok) throw new Error(status.error ?? "Could not check video status.");
        if (status.status === "SUCCEEDED" && status.videoUrl) { setMediaUrl(status.videoUrl); return; }
        if (status.status === "FAILED" || status.status === "CANCELED") throw new Error(status.error ?? "The provider could not complete this video.");
      }
      throw new Error("This video is taking longer than expected. Check back shortly.");
    } catch (error) {
      toast({ title: `${kind === "gif" ? "GIF" : "Video"} generation failed`, description: error instanceof Error ? error.message : "Check provider settings and try again.", variant: "destructive" });
    } finally { setBusy(false); }
  };

  return <div className="min-h-full p-6 lg:p-12 text-white">
    <div className="max-w-5xl mx-auto space-y-8">
      <header className="flex items-center gap-4 border-b border-white/10 pb-6">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-400 to-violet-600 flex items-center justify-center"><Clapperboard className="w-6 h-6" /></div>
        <div><h1 className="text-3xl font-bold">Media Studio</h1><p className="text-white/50 mt-1">Create animated GIFs and short videos from a prompt.</p></div>
      </header>
      <div className="grid lg:grid-cols-[360px_1fr] gap-6">
        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 space-y-5 h-fit">
          <div className="grid grid-cols-2 gap-2">
            {(["gif", "video"] as const).map(value => <button key={value} type="button" onClick={() => { setKind(value); setMediaUrl(null); }} className={`rounded-xl border p-3 text-sm font-semibold flex justify-center items-center gap-2 ${kind === value ? "border-cyan-200/50 bg-cyan-200/10 text-cyan-100" : "border-white/10 text-white/60"}`}>
              {value === "gif" ? <Film className="w-4 h-4" /> : <Clapperboard className="w-4 h-4" />}{value.toUpperCase()}
            </button>)}
          </div>
          <label className="block text-sm font-medium">Describe what to create
            <textarea value={prompt} onChange={event => setPrompt(event.target.value)} maxLength={1000} rows={7} placeholder={kind === "gif" ? "A tiny astronaut waving from the moon, looping seamlessly…" : "A cinematic sunrise over a misty mountain range…"} className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 p-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-cyan-300/30" />
          </label>
          <p className="text-xs text-white/40">{kind === "gif" ? "OpenAI image generation · animated GIF" : "Runway Gen-4.5 · 5 seconds · landscape"}</p>
          <button type="button" onClick={generate} disabled={busy || !prompt.trim()} className="w-full rounded-xl bg-white text-black font-semibold py-3 flex justify-center items-center gap-2 disabled:opacity-40">
            {busy ? <><Loader2 className="w-4 h-4 animate-spin" />Generating…</> : <><Wand2 className="w-4 h-4" />Generate {kind.toUpperCase()}</>}
          </button>
        </section>
        <section className="min-h-[400px] rounded-2xl border border-white/10 bg-black/20 flex items-center justify-center p-4">
          {busy ? <div className="text-center text-white/60"><Loader2 className="w-8 h-8 animate-spin mx-auto mb-3" />Your {kind} is being created…</div> : mediaUrl ? <div className="w-full space-y-3">
            {kind === "gif" ? <img src={mediaUrl} alt="Generated animated GIF" className="max-h-[70vh] max-w-full mx-auto rounded-xl" /> : <video src={mediaUrl} controls playsInline className="max-h-[70vh] max-w-full mx-auto rounded-xl" />}
            <a href={mediaUrl} download={kind === "gif" ? "theryn-animation.gif" : "theryn-video.mp4"} className="mx-auto w-fit rounded-lg border border-white/15 px-4 py-2 text-sm flex items-center gap-2"><Download className="w-4 h-4" />Download {kind.toUpperCase()}</a>
          </div> : <div className="text-center text-white/30"><Film className="w-12 h-12 mx-auto mb-3" /><p>Your generated media will appear here.</p></div>}
        </section>
      </div>
    </div>
  </div>;
}
