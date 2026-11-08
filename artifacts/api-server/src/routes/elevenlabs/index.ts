import { Router, type IRouter } from "express";
import { ElevenLabsTtsBody } from "@workspace/api-zod";
import { getOpenAIClientForRequest, getProviderKey } from "../../lib/provider-clients";
import { clerkRequireAuth } from "../../middlewares/clerkRequireAuth";
import { requireFeatureAccess } from "../../subscriptions/entitlements";
import { recordUsage } from "../../subscriptions/usage";

const router: IRouter = Router();
router.use(clerkRequireAuth);

const DEFAULT_VOICE_ID = "EXAVITQu4vr4xnSDxMaL";
const OPENAI_VOICES = new Set([
  "alloy", "ash", "ballad", "coral", "echo", "fable", "nova", "onyx", "sage", "shimmer", "verse", "marin", "cedar",
]);

router.get("/voices", requireFeatureAccess("voiceTts"), async (req, res) => {
  const apiKey = await getProviderKey(req, "elevenlabsApiKey") ?? process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    res.status(503).json({ error: "Connect an ElevenLabs API key to load voices from your account." });
    return;
  }

  const query = new URLSearchParams({ page_size: "100", voice_type: "personal" });
  const response = await fetch(`https://api.elevenlabs.io/v2/voices?${query}`, {
    headers: { "xi-api-key": apiKey },
  });
  if (!response.ok) {
    res.status(502).json({ error: "Could not load voices from ElevenLabs. Check the connected account and try again." });
    return;
  }

  const data = await response.json() as { voices?: Array<{ voice_id?: string; name?: string; category?: string }> };
  res.json({
    voices: (data.voices ?? []).flatMap(voice =>
      voice.voice_id ? [{ id: voice.voice_id, name: voice.name ?? "Unnamed voice", category: voice.category ?? "custom" }] : [],
    ),
  });
});

router.post("/tts", requireFeatureAccess("voiceTts"), async (req, res) => {
  const body = ElevenLabsTtsBody.parse(req.body);
  const provider = req.body?.provider === "openai" ? "openai" : "elevenlabs";
  const voiceId = typeof req.body?.voiceId === "string" ? req.body.voiceId.trim() : body.voiceId ?? DEFAULT_VOICE_ID;
  if (!voiceId || voiceId.length > 128) {
    res.status(400).json({ error: "Choose a valid voice." });
    return;
  }

  if (provider === "openai") {
    if (!OPENAI_VOICES.has(voiceId)) {
      res.status(400).json({ error: "Choose an available OpenAI voice." });
      return;
    }
    const audio = await getOpenAIClientForRequest(req).then(client => client.audio.speech.create({
      model: "gpt-4o-mini-tts",
      voice: voiceId as "alloy",
      input: body.text,
      response_format: "mp3",
    }));
    const base64 = Buffer.from(await audio.arrayBuffer()).toString("base64");
    await recordUsage(req, "voiceTts", { provider: "openai", operation: "tts" });
    res.json({ audio: base64 });
    return;
  }

  const elevenLabsApiKey = await getProviderKey(req, "elevenlabsApiKey") ?? process.env.ELEVENLABS_API_KEY;
  if (!elevenLabsApiKey) {
    res.status(503).json({ error: "ElevenLabs API key not configured. Please connect ElevenLabs in settings." });
    return;
  }

  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}`, {
    method: "POST",
    headers: {
      "xi-api-key": elevenLabsApiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text: body.text,
      model_id: "eleven_multilingual_v2",
      voice_settings: { stability: 0.5, similarity_boost: 0.75 },
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    res.status(response.status).json({ error: err });
    return;
  }

  const audioBuffer = await response.arrayBuffer();
  const base64 = Buffer.from(audioBuffer).toString("base64");
  await recordUsage(req, "voiceTts", { provider, operation: "tts" });
  res.json({ audio: base64 });
});

export default router;
