import { useState, useRef, useEffect } from "react";
import { Mic, Play, Loader2, RefreshCw, Volume2 } from "lucide-react";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";

const DEFAULT_ELEVENLABS_VOICE_ID = "EXAVITQu4vr4xnSDxMaL";
const OPENAI_VOICES = [
  { name: "Coral · warm", id: "coral" },
  { name: "Sage · measured", id: "sage" },
  { name: "Ash · clear", id: "ash" },
  { name: "Ballad · expressive", id: "ballad" },
  { name: "Nova · bright", id: "nova" },
  { name: "Onyx · deep", id: "onyx" },
  { name: "Shimmer · light", id: "shimmer" },
  { name: "Fable · animated", id: "fable" },
  { name: "Alloy · balanced", id: "alloy" },
  { name: "Echo · resonant", id: "echo" },
  { name: "Verse · versatile", id: "verse" },
  { name: "Marin · natural", id: "marin" },
  { name: "Cedar · grounded", id: "cedar" },
];
const ELEVENLABS_PRESET_VOICES = [
  { id: "EXAVITQu4vr4xnSDxMaL", name: "Bella", category: "premade" },
  { id: "21m00Tcm4TlvDq8ikWAM", name: "Rachel", category: "premade" },
  { id: "AZnzlk1XvdvUeBnXmlld", name: "Domi", category: "premade" },
  { id: "ErXwobaYiN019PkySvjV", name: "Antoni", category: "premade" },
  { id: "MF3mGyEYCl7XYWbV9V6O", name: "Elli", category: "premade" },
  { id: "TxGEqnHWrfWFTfGW9XjX", name: "Josh", category: "premade" },
  { id: "pNInz6obpgDQGcFmaJgB", name: "Adam", category: "premade" },
];

type VoiceSource = "elevenlabs" | "openai";
type AccountVoice = { id: string; name: string; category: string };

export default function VoicePage() {
  const [text, setText] = useState("");
  const [voiceSource, setVoiceSource] = useState<VoiceSource>("elevenlabs");
  const [voiceId, setVoiceId] = useState(DEFAULT_ELEVENLABS_VOICE_ID);
  const [accountVoices, setAccountVoices] = useState<AccountVoice[]>([]);
  const [loadingVoices, setLoadingVoices] = useState(false);
  const [voiceLoadError, setVoiceLoadError] = useState<string | null>(null);
  const [voiceReloadVersion, setVoiceReloadVersion] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (voiceSource !== "elevenlabs") return;
    let active = true;
    setLoadingVoices(true);
    setVoiceLoadError(null);
    fetch("/api/elevenlabs/voices", { credentials: "include" })
      .then(async response => {
        const data = await response.json() as { voices?: AccountVoice[]; error?: string };
        if (!response.ok) throw new Error(data.error ?? "Could not load your ElevenLabs voices.");
        return data.voices ?? [];
      })
      .then(voices => {
        if (!active) return;
        setAccountVoices(voices);
        setVoiceId(current => [...ELEVENLABS_PRESET_VOICES, ...voices].some(voice => voice.id === current)
          ? current
          : ELEVENLABS_PRESET_VOICES[0].id);
      })
      .catch(error => {
        if (active) setVoiceLoadError(error instanceof Error ? error.message : "Could not load your voices.");
      })
      .finally(() => {
        if (active) setLoadingVoices(false);
      });
    return () => { active = false; };
  }, [voiceSource, voiceReloadVersion]);

  const elevenLabsVoices = [
    ...ELEVENLABS_PRESET_VOICES,
    ...accountVoices.filter(accountVoice => !ELEVENLABS_PRESET_VOICES.some(preset => preset.id === accountVoice.id)),
  ];

  const handleGenerate = async () => {
    const trimmedText = text.trim();
    if (!trimmedText) return;
    try {
      setIsGenerating(true);
      const response = await fetch("/api/elevenlabs/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ text: trimmedText, voiceId, provider: voiceSource }),
      });
      const result = await response.json() as { audio?: string; error?: string };
      if (!response.ok || !result.audio) throw new Error(result.error ?? "Speech generation failed.");
      const url = `data:audio/mp3;base64,${result.audio}`;
      setAudioUrl(url);
      
      // Auto-play when ready
      setTimeout(() => {
        if (audioRef.current) audioRef.current.play();
      }, 100);
      
    } catch (err: unknown) {
      toast({
        title: "Synthesis Failed",
        description: err instanceof Error ? err.message : "Something went wrong",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
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
            <p className="text-muted-foreground mt-1">Choose a voice from OpenAI presets or your connected ElevenLabs account.</p>
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
              maxLength={500}
              placeholder="Enter text to synthesize into speech..."
              className="w-full h-48 bg-black/40 border border-white/10 rounded-2xl p-6 text-lg focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/50 text-white resize-none leading-relaxed"
            />
            <div className="flex justify-between items-center text-xs text-muted-foreground px-2">
              <span>Supports up to 500 characters for demo</span>
              <span>{text.length} / 500</span>
            </div>
            <div className="space-y-2">
              <label htmlFor="voice-selection" className="text-xs font-medium text-white uppercase tracking-wider">Voice</label>
              <div className="flex w-full max-w-sm border border-white/10 bg-black/30 p-1" role="group" aria-label="Voice provider">
                {(["elevenlabs", "openai"] as VoiceSource[]).map(source => (
                  <button
                    key={source}
                    type="button"
                    aria-pressed={voiceSource === source}
                    onClick={() => {
                      setVoiceSource(source);
                      setVoiceId(source === "openai" ? "coral" : accountVoices[0]?.id ?? DEFAULT_ELEVENLABS_VOICE_ID);
                    }}
                    className={`flex-1 px-3 py-2 text-xs font-medium capitalize ${voiceSource === source ? "bg-white/10 text-white" : "text-white/45 hover:text-white/80"}`}
                  >
                    {source === "elevenlabs" ? "ElevenLabs" : "OpenAI"}
                  </button>
                ))}
              </div>
              <select
                id="voice-selection"
                value={voiceId}
                onChange={event => setVoiceId(event.target.value)}
                className="mt-2 w-full max-w-sm bg-black/40 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-accent/50 disabled:opacity-50"
              >
                {(voiceSource === "openai" ? OPENAI_VOICES : elevenLabsVoices).map(voice => (
                  <option key={voice.id} value={voice.id} className="bg-neutral-900">
                    {voice.name}{"category" in voice ? ` · ${voice.category}` : ""}
                  </option>
                ))}
              </select>
              <p className="text-xs text-white/40">
                {loadingVoices ? "Loading voices from your ElevenLabs account…" : voiceLoadError ?? (voiceSource === "elevenlabs"
                  ? "Choose a preset or a personal/cloned voice available to your connected account. Only use voices you own or are authorized to use."
                  : "OpenAI preset voices. Connect an OpenAI API key in Settings to use them.")}
              </p>
              {voiceSource === "elevenlabs" && (
                <div className="flex items-center gap-4 text-xs">
                  <button type="button" onClick={() => setVoiceReloadVersion(version => version + 1)} className="inline-flex items-center gap-1.5 text-white/55 hover:text-white" disabled={loadingVoices}>
                    <RefreshCw className={`h-3.5 w-3.5 ${loadingVoices ? "animate-spin" : ""}`} /> Refresh account voices
                  </button>
                  <a href="https://elevenlabs.io/app/voice-lab" target="_blank" rel="noreferrer" className="text-white/40 underline underline-offset-2 hover:text-white/70">
                    Add your voice in ElevenLabs
                  </a>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-6 pt-4 border-t border-white/5">
            <button
              onClick={handleGenerate}
              disabled={isGenerating || !text.trim()}
              className="w-full sm:w-auto px-8 h-14 rounded-full font-bold text-black bg-gradient-to-r from-white to-neutral-400 hover:brightness-110 flex items-center justify-center gap-3 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_24px_-10px_rgba(255,255,255,0.2)]"
            >
              {isGenerating ? (
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
