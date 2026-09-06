import { Router, type IRouter } from "express";
import { ElevenLabsTtsBody } from "@workspace/api-zod";

const router: IRouter = Router();

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const DEFAULT_VOICE_ID = "EXAVITQu4vr4xnSDxMaL";

router.post("/tts", async (req, res) => {
  const body = ElevenLabsTtsBody.parse(req.body);
  const voiceId = body.voiceId ?? DEFAULT_VOICE_ID;

  if (!ELEVENLABS_API_KEY) {
    res.status(503).json({ error: "ElevenLabs API key not configured. Please connect ElevenLabs in settings." });
    return;
  }

  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: "POST",
    headers: {
      "xi-api-key": ELEVENLABS_API_KEY,
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
  res.json({ audio: base64 });
});

export default router;
