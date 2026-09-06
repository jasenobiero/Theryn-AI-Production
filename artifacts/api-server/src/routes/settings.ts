import { Router, type IRouter, type Request, type Response } from "express";
import { db, userSettingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { clerkRequireAuth } from "../middlewares/clerkRequireAuth";

const router: IRouter = Router();

router.get("/settings", clerkRequireAuth, async (req: Request, res: Response) => {
  const userId = (req as any).userId as string;

  let settings = await db
    .select()
    .from(userSettingsTable)
    .where(eq(userSettingsTable.userId, userId))
    .limit(1)
    .then(r => r[0] ?? null);

  if (!settings) {
    const [created] = await db
      .insert(userSettingsTable)
      .values({ userId })
      .returning();
    settings = created;
  }

  res.json({
    ...settings,
    elevenlabsApiKey: settings.elevenlabsApiKey ? maskKey(settings.elevenlabsApiKey) : null,
    openaiApiKey: settings.openaiApiKey ? maskKey(settings.openaiApiKey) : null,
    anthropicApiKey: settings.anthropicApiKey ? maskKey(settings.anthropicApiKey) : null,
    openrouterApiKey: settings.openrouterApiKey ? maskKey(settings.openrouterApiKey) : null,
  });
});

router.patch("/settings", clerkRequireAuth, async (req: Request, res: Response) => {
  const userId = (req as any).userId as string;
  const allowed = [
    "displayName", "bio",
    "elevenlabsApiKey", "openaiApiKey", "anthropicApiKey", "openrouterApiKey",
    "defaultProvider", "defaultModel", "streamingEnabled",
  ];

  const updates: Record<string, any> = {};
  for (const key of allowed) {
    if (key in req.body) {
      const val = req.body[key];
      updates[key] = typeof val === "string" && val.trim() ? val.trim() : null;
    }
  }

  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: "No valid fields to update" });
    return;
  }

  updates.updatedAt = new Date();

  const existing = await db
    .select({ userId: userSettingsTable.userId })
    .from(userSettingsTable)
    .where(eq(userSettingsTable.userId, userId))
    .limit(1)
    .then(r => r[0] ?? null);

  if (!existing) {
    await db.insert(userSettingsTable).values({ userId, ...updates });
  } else {
    await db.update(userSettingsTable).set(updates).where(eq(userSettingsTable.userId, userId));
  }

  res.json({ success: true });
});

function maskKey(key: string): string {
  if (key.length <= 8) return "••••••••";
  return key.slice(0, 4) + "••••••••" + key.slice(-4);
}

export default router;
