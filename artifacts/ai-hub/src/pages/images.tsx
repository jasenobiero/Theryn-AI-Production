import { useState } from "react";
import { useGenerateOpenaiImage } from "@workspace/api-client-react";
import { Image as ImageIcon, Wand2, Download, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

export default function ImagesPage() {
  const [prompt, setPrompt] = useState("");
  const [size, setSize] = useState<"1024x1024" | "512x512" | "256x256">("1024x1024");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  
  const generate = useGenerateOpenaiImage();
  const { toast } = useToast();

  const handleGenerate = async () => {
    if (!prompt) return;
    try {
      setImageUrl(null);
      const res = await generate.mutateAsync({ data: { prompt, size } });
      setImageUrl(`data:image/png;base64,${res.b64_json}`);
    } catch (err: any) {
      toast({
        title: "Generation Failed",
        description: err.message || "Something went wrong",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="min-h-full p-6 lg:p-12 relative">
      <div className="max-w-5xl mx-auto space-y-12">
        <div className="flex items-center gap-4 border-b border-white/10 pb-8">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center shadow-lg box-glow">
            <ImageIcon className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-display font-bold text-white">Neural Image Synthesis</h1>
            <p className="text-muted-foreground mt-1">Powered by DALL-E 3 architecture</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 space-y-6">
            <div className="glass p-6 rounded-3xl space-y-6 border-white/5">
              <div className="space-y-3">
                <label className="text-sm font-medium text-white uppercase tracking-wider">Prompt</label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="A futuristic cyber-city in the rain, neon lights, highly detailed, 8k resolution..."
                  className="w-full h-32 bg-black/40 border border-white/10 rounded-xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-white resize-none"
                />
              </div>

              <div className="space-y-3">
                <label className="text-sm font-medium text-white uppercase tracking-wider">Resolution</label>
                <Select value={size} onValueChange={(v: any) => setSize(v)}>
                  <SelectTrigger className="w-full bg-black/40 border-white/10 h-12 rounded-xl">
                    <SelectValue placeholder="Select size" />
                  </SelectTrigger>
                  <SelectContent className="bg-secondary border-white/10">
                    <SelectItem value="1024x1024">1024 x 1024 (HD)</SelectItem>
                    <SelectItem value="512x512">512 x 512 (Standard)</SelectItem>
                    <SelectItem value="256x256">256 x 256 (Fast)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <button
                onClick={handleGenerate}
                disabled={generate.isPending || !prompt}
                className="w-full h-14 rounded-xl font-bold text-white bg-gradient-to-r from-primary to-purple-600 hover:opacity-90 flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed box-glow"
              >
                {generate.isPending ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Synthesizing...
                  </>
                ) : (
                  <>
                    <Wand2 className="w-5 h-5" />
                    Generate Image
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="glass rounded-3xl border-white/5 p-2 h-full min-h-[400px] flex items-center justify-center overflow-hidden relative group">
              {generate.isPending ? (
                <div className="flex flex-col items-center justify-center text-primary">
                  <div className="w-20 h-20 border-4 border-primary/30 border-t-primary rounded-full animate-spin mb-4" />
                  <p className="font-mono animate-pulse uppercase tracking-widest text-sm">Processing Neural Layers...</p>
                </div>
              ) : imageUrl ? (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="relative w-full h-full rounded-2xl overflow-hidden"
                >
                  <img src={imageUrl} alt="Generated" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                    <a 
                      href={imageUrl} 
                      download="generated-image.png"
                      className="px-6 py-3 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white font-medium flex items-center gap-2 backdrop-blur-md transition-colors"
                    >
                      <Download className="w-5 h-5" />
                      Download High-Res
                    </a>
                  </div>
                </motion.div>
              ) : (
                <div className="text-center text-muted-foreground flex flex-col items-center">
                  <ImageIcon className="w-16 h-16 opacity-20 mb-4" />
                  <p>Generated visual will appear here</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
