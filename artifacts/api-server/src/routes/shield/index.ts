import { Router, type IRouter } from "express";
import { db, socialAccounts, securityAlerts } from "@workspace/db";
import { clerkRequireAuth } from "../../middlewares/clerkRequireAuth";
import { eq, and, desc } from "drizzle-orm";
import { getOpenAIClientForRequest } from "../../lib/provider-clients";

const router: IRouter = Router();
const SUPPORTED_PLATFORMS = new Set([
  "tiktok", "instagram", "youtube", "twitter", "discord", "discord_server",
  "reddit", "facebook", "linkedin", "twitch", "snapchat", "github", "telegram", "spotify",
]);
const RISK_LEVELS = new Set(["safe", "low", "medium", "high", "critical"]);
const SEVERITIES = new Set(["info", "low", "medium", "high", "critical"]);

interface ReviewAnalysis {
  riskScore: number;
  riskLevel: string;
  summary: string;
  threats: Array<{ type: string; severity: string; title: string; description: string }>;
  recommendations: string[];
}

function parseReviewAnalysis(value: unknown): ReviewAnalysis {
  if (!value || typeof value !== "object") throw new Error("AI response must be an object");
  const data = value as Record<string, unknown>;
  const riskScore = data.riskScore;
  const riskLevel = data.riskLevel;
  const summary = data.summary;
  if (typeof riskScore !== "number" || !Number.isInteger(riskScore) || riskScore < 0 || riskScore > 100) {
    throw new Error("AI response has an invalid risk estimate");
  }
  if (typeof riskLevel !== "string" || !RISK_LEVELS.has(riskLevel)) {
    throw new Error("AI response has an invalid risk level");
  }
  if (typeof summary !== "string" || !summary.trim() || summary.length > 2000) {
    throw new Error("AI response has an invalid summary");
  }
  if (!Array.isArray(data.threats) || data.threats.length > 20 || !Array.isArray(data.recommendations) || data.recommendations.length > 20) {
    throw new Error("AI response has invalid guidance lists");
  }

  const threats = data.threats.map((item) => {
    if (!item || typeof item !== "object") throw new Error("AI response contains an invalid guidance item");
    const threat = item as Record<string, unknown>;
    if (
      typeof threat.type !== "string" || threat.type.length > 80 ||
      typeof threat.severity !== "string" || !SEVERITIES.has(threat.severity) ||
      typeof threat.title !== "string" || !threat.title.trim() || threat.title.length > 160 ||
      typeof threat.description !== "string" || !threat.description.trim() || threat.description.length > 1000
    ) {
      throw new Error("AI response contains an invalid guidance item");
    }
    return {
      type: threat.type,
      severity: threat.severity,
      title: threat.title,
      description: threat.description,
    };
  });
  const recommendations = data.recommendations.map((item) => {
    if (typeof item !== "string" || !item.trim() || item.length > 500) {
      throw new Error("AI response contains an invalid recommendation");
    }
    return item;
  });

  return {
    riskScore,
    riskLevel,
    summary,
    threats,
    recommendations,
  };
}

router.use(clerkRequireAuth);

router.get("/accounts", async (req, res) => {
  const userId = (req as any).userId as string;
  const rows = await db
    .select()
    .from(socialAccounts)
    .where(and(eq(socialAccounts.userId, userId), eq(socialAccounts.isActive, true)))
    .orderBy(desc(socialAccounts.createdAt));
  res.json(rows);
});

router.post("/accounts", async (req, res) => {
  const userId = (req as any).userId as string;
  const { platform: rawPlatform, handle: rawHandle, displayName: rawDisplayName } = req.body ?? {};
  const platform = typeof rawPlatform === "string" ? rawPlatform.trim().toLowerCase() : "";
  const handle = typeof rawHandle === "string" ? rawHandle.trim().replace(/^@/, "") : "";
  const displayName = typeof rawDisplayName === "string" ? rawDisplayName.trim() : "";
  if (rawDisplayName != null && typeof rawDisplayName !== "string") {
    res.status(400).json({ error: "Display name must be text" });
    return;
  }
  if (!SUPPORTED_PLATFORMS.has(platform)) {
    res.status(400).json({ error: "A supported social platform is required" });
    return;
  }
  if (!handle || handle.length > 200 || /[\u0000-\u001f\u007f]/.test(handle)) {
    res.status(400).json({ error: "Handle must be 1-200 characters without control characters" });
    return;
  }
  if (displayName.length > 100 || /[\u0000-\u001f\u007f]/.test(displayName)) {
    res.status(400).json({ error: "Display name must be at most 100 characters without control characters" });
    return;
  }
  const [existingAccount] = await db.select({ id: socialAccounts.id })
    .from(socialAccounts)
    .where(and(
      eq(socialAccounts.userId, userId),
      eq(socialAccounts.platform, platform),
      eq(socialAccounts.handle, handle),
      eq(socialAccounts.isActive, true),
    ))
    .limit(1);
  if (existingAccount) {
    res.status(409).json({ error: "This handle is already saved" });
    return;
  }
  const [account] = await db
    .insert(socialAccounts)
    .values({ userId, platform, handle, displayName: displayName || null })
    .returning();
  res.status(201).json(account);
});

router.delete("/accounts/:id", async (req, res) => {
  const userId = (req as any).userId as string;
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id < 1) { res.status(400).json({ error: "Invalid account ID" }); return; }
  const [account] = await db
    .select()
    .from(socialAccounts)
    .where(and(eq(socialAccounts.id, id), eq(socialAccounts.userId, userId)));
  if (!account) { res.status(404).json({ error: "Account not found" }); return; }
  await db.update(socialAccounts).set({ isActive: false }).where(and(
    eq(socialAccounts.id, id),
    eq(socialAccounts.userId, userId),
  ));
  res.status(204).send();
});

router.post("/accounts/:id/scan", async (req, res) => {
  const userId = (req as any).userId as string;
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id < 1) { res.status(400).json({ error: "Invalid account ID" }); return; }
  const [account] = await db
    .select()
    .from(socialAccounts)
    .where(and(
      eq(socialAccounts.id, id),
      eq(socialAccounts.userId, userId),
      eq(socialAccounts.isActive, true),
    ));
  if (!account) { res.status(404).json({ error: "Account not found" }); return; }

  const prompt = `You are an informational cybersecurity assistant. You cannot access the social platform, inspect this profile, or verify its security status. Do not claim that you detected threats or that this account is protected.

Platform: ${account.platform}

Provide general, clearly unverified security guidance for users of ${account.platform}. This is not a review of an individual account. The risk score is only a subjective estimate of general platform risks, not a finding about any account. Return general precautions in the threats array, not detected incidents.

Respond with ONLY valid JSON in this exact format:
{
  "riskScore": <integer 0-100, where 0=no risk, 100=critical>,
  "riskLevel": "<safe|low|medium|high|critical>",
  "summary": "<2-3 sentence executive summary>",
  "threats": [
    { "type": "<threat type>", "severity": "<info|low|medium|high|critical>", "title": "<short title>", "description": "<detail>" }
  ],
  "recommendations": ["<actionable recommendation 1>", "<actionable recommendation 2>", ...]
}`;

  let analysisText: string;
  try {
     const client = await getOpenAIClientForRequest(req);
     const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      max_completion_tokens: 1500,
    });
    const responseContent = completion.choices[0]?.message?.content;
    if (!responseContent) throw new Error("AI provider returned an empty response");
    analysisText = responseContent;
  } catch (error) {
    console.error("[shield] AI guidance request failed", error);
    res.status(502).json({ error: "AI guidance request failed" });
    return;
  }

  let analysis: ReviewAnalysis;
  try {
    analysis = parseReviewAnalysis(JSON.parse(analysisText) as unknown);
  } catch (error) {
    console.error("[shield] AI guidance response was invalid", error);
    res.status(502).json({ error: "AI guidance response was invalid; no review was saved" });
    return;
  }

  await db.update(socialAccounts).set({
    riskScore: analysis.riskScore,
    lastScannedAt: new Date(),
  }).where(and(
    eq(socialAccounts.id, id),
    eq(socialAccounts.userId, userId),
    eq(socialAccounts.isActive, true),
  ));

  await db.insert(securityAlerts).values({
    userId,
    accountId: id,
    type: "review_summary",
    severity: "info",
    title: `Unverified AI guidance — ${account.platform} @${account.handle}`,
    message: `General guidance based on the platform only; this profile was not inspected or monitored. ${analysis.summary}`,
    resolvedAt: new Date(),
  });

  res.json({
    account: { ...account, riskScore: analysis.riskScore, lastScannedAt: new Date().toISOString() },
    analysis,
  });
});

router.get("/alerts", async (req, res) => {
  const userId = (req as any).userId as string;
  const rows = await db
    .select()
    .from(securityAlerts)
    .where(eq(securityAlerts.userId, userId))
    .orderBy(desc(securityAlerts.createdAt))
    .limit(50);
  res.json(rows);
});

router.patch("/alerts/:id/read", async (req, res) => {
  const userId = (req as any).userId as string;
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id < 1) { res.status(400).json({ error: "Invalid review ID" }); return; }
  const [alert] = await db.update(securityAlerts).set({ isRead: true }).where(
    and(eq(securityAlerts.id, id), eq(securityAlerts.userId, userId))
  ).returning({ id: securityAlerts.id });
  if (!alert) { res.status(404).json({ error: "Review not found" }); return; }
  res.json({ ok: true });
});

export default router;
