import { Router, type IRouter } from "express";
import { clerkRequireAuth } from "../middlewares/clerkRequireAuth";
import { requireFeatureAccess } from "../subscriptions/entitlements";
import { finalizeGeneration, reserveDailyGeneration } from "../subscriptions/usage";

const router: IRouter = Router();

function runwayKey(): string | undefined {
  return [process.env.RUNWAY_API_KEY, process.env.RUNWAYML_API_SECRET]
    .map(value => value?.trim())
    .find((value): value is string => Boolean(value && !/^(your-|replace-with-)/i.test(value)));
}

router.post("/video/generate", clerkRequireAuth, requireFeatureAccess("videoGen"), async (req, res) => {
  const promptText = typeof req.body?.prompt === "string" ? req.body.prompt.trim() : "";
  const ratio = req.body?.ratio === "720:1280" ? "720:1280" : "1280:720";
  const duration = Number(req.body?.duration ?? 5);
  if (!promptText || promptText.length > 1000 || !Number.isInteger(duration) || duration < 2 || duration > 10) {
    res.status(400).json({ error: "Enter a prompt up to 1,000 characters and a duration from 2 to 10 seconds." });
    return;
  }
  const apiKey = runwayKey();
  if (!apiKey) {
    res.status(503).json({ error: "Video generation is not configured. Add RUNWAY_API_KEY in Render." });
    return;
  }
  const reservation = await reserveDailyGeneration(req, "videoGen");
  if (!reservation.reservationId) {
    res.status(429).json({ error: "Daily media generation limit reached.", limit: 5, resetAt: reservation.resetAt });
    return;
  }
  try {
    const upstream = await fetch("https://api.dev.runwayml.com/v1/text_to_video", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "X-Runway-Version": "2024-11-06",
      },
      body: JSON.stringify({ model: "gen4.5", promptText, ratio, duration }),
    });
    const payload = await upstream.json() as { id?: string; error?: string; message?: string };
    if (!upstream.ok || !payload.id) {
      throw new Error(payload.message || payload.error || `Runway rejected the video request (${upstream.status}).`);
    }
    // Count the provider task when accepted; it may incur provider charges after this point.
    await finalizeGeneration(reservation.reservationId, "committed");
    res.status(202).json({ taskId: payload.id, status: "PENDING", generationsRemainingToday: reservation.remaining });
  } catch (error) {
    await finalizeGeneration(reservation.reservationId, "failed");
    req.log?.error({ err: error }, "Video generation task creation failed");
    res.status(502).json({ error: error instanceof Error ? error.message : "Could not start video generation." });
  }
});

router.get("/video/tasks/:id", clerkRequireAuth, requireFeatureAccess("videoGen"), async (req, res) => {
  const taskId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  if (!/^[a-zA-Z0-9_-]{8,128}$/.test(taskId)) {
    res.status(400).json({ error: "Invalid video task ID." });
    return;
  }
  const apiKey = runwayKey();
  if (!apiKey) {
    res.status(503).json({ error: "Video generation is not configured. Add RUNWAY_API_KEY in Render." });
    return;
  }
  try {
    const upstream = await fetch(`https://api.dev.runwayml.com/v1/tasks/${encodeURIComponent(taskId)}`, {
      headers: { Authorization: `Bearer ${apiKey}`, "X-Runway-Version": "2024-11-06" },
    });
    const payload = await upstream.json() as { id?: string; status?: string; output?: unknown; failure?: string; error?: string };
    if (!upstream.ok) {
      res.status(502).json({ error: payload.error || `Runway task lookup failed (${upstream.status}).` });
      return;
    }
    const output = Array.isArray(payload.output) ? payload.output : [];
    const videoUrl = typeof output[0] === "string" ? output[0] : undefined;
    res.json({ taskId: payload.id ?? taskId, status: payload.status, videoUrl, error: payload.failure });
  } catch (error) {
    req.log?.error({ err: error }, "Video task lookup failed");
    res.status(502).json({ error: "Could not check video generation status. Please retry." });
  }
});

export default router;
