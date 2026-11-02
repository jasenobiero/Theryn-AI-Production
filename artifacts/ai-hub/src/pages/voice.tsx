import { useState, useRef } from "react";
import { useElevenLabsTts } from "@workspace/api-client-react";
import { Mic, Play, Loader2, Volume2 } from "lucide-react";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";

export default function VoicePage() {
  const [text, setText] = useState("");
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  
  const generate = useElevenLabsTts();
  const { toast } = useToast();

  const handleGenerate = async () => {
    if (!text) return;
    try {
      setAudioUrl(null);
      const res = await generate.mutateAsync({ data: { text } });
      const url = `data:audio/mp3;base64,${res.audio}`;
      setAudioUrl(url);
      
      // Auto-play when ready
      setTimeout(() => {
        if (audioRef.current) audioRef.current.play();
      }, 100);
      
    } catch (err: any) {
      toast({
        title: "Synthesis Failed",
        description: err.message || "Something went wrong",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="min-h-full p-6 lg:p-12 relative">
      <div className="max-w-4xl mx-auto space-y-12">
        <div className="flex items-center gap-4 border-b border-white/10 pb-8">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-300 to-sky-700 flex items-center justify-center shadow-lg box-glow">
            <Mic className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-display font-bold text-white">Neural Voice Synthesis</h1>
            <p className="text-muted-foreground mt-1">Hyper-realistic text-to-speech by ElevenLabs</p>
          </div>
        </div>

        <div className="glass p-8 rounded-3xl border-white/5 space-y-8">
          <div className="space-y-4">
            <label className="text-sm font-medium text-white uppercase tracking-wider flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-accent" />
              Text Input
            </label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Enter text to synthesize into speech..."
              className="w-full h-48 bg-black/40 border border-white/10 rounded-2xl p-6 text-lg focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/50 text-white resize-none leading-relaxed"
            />
            <div className="flex justify-between items-center text-xs text-muted-foreground px-2">
              <span>Supports up to 500 characters for demo</span>
              <span>{text.length} / 500</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-6 pt-4 border-t border-white/5">
            <button
              onClick={handleGenerate}
              disabled={generate.isPending || !text}
              className="w-full sm:w-auto px-8 h-14 rounded-full font-bold text-black bg-gradient-to-r from-white to-neutral-400 hover:brightness-110 flex items-center justify-center gap-3 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_24px_-10px_rgba(255,255,255,0.2)]"
            >
              {generate.isPending ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Synthesizing Audio...
                </>
              ) : (
                <>
                  <Play className="w-5 h-5 fill-current" />
                  Generate Audio
                </>
              )}
            </button>

            {audioUrl && (
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex-1 w-full bg-black/40 rounded-full border border-white/10 p-2 pr-6 flex items-center gap-4"
              >
                <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center shrink-0">
                  <Volume2 className="w-5 h-5 text-accent" />
                </div>
                <audio ref={audioRef} controls src={audioUrl} className="w-full h-10 outline-none" />
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
