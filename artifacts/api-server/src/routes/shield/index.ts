import { Router, type IRouter } from "express";
import { db, socialAccounts, securityAlerts } from "@workspace/db";
import { openai } from "@workspace/integrations-openai-ai-server";
import { clerkRequireAuth } from "../../middlewares/clerkRequireAuth";
import { eq, and, desc } from "drizzle-orm";

const router: IRouter = Router();

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
  const { platform, handle, displayName } = req.body ?? {};
  if (!platform || !handle) { res.status(400).json({ error: "platform and handle are required" }); return; }
  const body = { platform: String(platform), handle: String(handle), displayName: displayName ? String(displayName) : undefined };
  const [account] = await db
    .insert(socialAccounts)
    .values({ userId, platform: body.platform, handle: body.handle, displayName: body.displayName ?? null })
    .returning();
  res.status(201).json(account);
});

router.delete("/accounts/:id", async (req, res) => {
  const userId = (req as any).userId as string;
  const id = Number(req.params.id);
  const [account] = await db
    .select()
    .from(socialAccounts)
    .where(and(eq(socialAccounts.id, id), eq(socialAccounts.userId, userId)));
  if (!account) { res.status(404).json({ error: "Account not found" }); return; }
  await db.update(socialAccounts).set({ isActive: false }).where(eq(socialAccounts.id, id));
  res.status(204).send();
});

router.post("/accounts/:id/scan", async (req, res) => {
  const userId = (req as any).userId as string;
  const id = Number(req.params.id);
  const [account] = await db
    .select()
    .from(socialAccounts)
    .where(and(eq(socialAccounts.id, id), eq(socialAccounts.userId, userId)));
  if (!account) { res.status(404).json({ error: "Account not found" }); return; }

  const prompt = `You are an elite cybersecurity AI protecting social media accounts. Analyze the following account for security threats, vulnerabilities, and risks.

Platform: ${account.platform}
Handle/Username: @${account.handle}

Perform a comprehensive threat assessment covering:
1. Platform-specific attack vectors for ${account.platform} accounts
2. Common threats targeting ${account.platform} users (phishing, credential stuffing, impersonation, social engineering)
3. Public exposure risks for the handle "@${account.handle}"
4. Recommended immediate security actions
5. Overall risk assessment

Respond with ONLY valid JSON in this exact format:
{
  "riskScore": <integer 0-100, where 0=no risk, 100=critical>,
  "riskLevel": "<safe|low|medium|high|critical>",
  "summary": "<2-3 sentence executive summary>",
  "threats": [
    { "type": "<threat type>", "severity": "<info|low|medium|high|critical>", "title": "<short title>", "description": "<detail>" }
  ],
  "recommendations": ["<actionable recommendation 1>", "<actionable recommendation 2>", ...],
  "shieldStatus": "<PROTECTED|AT_RISK|VULNERABLE>"
}`;

  let analysisText = "";
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      max_completion_tokens: 1500,
    });
    analysisText = completion.choices[0]?.message?.content ?? "{}";
  } catch {
    res.status(500).json({ error: "AI scan failed" });
    return;
  }

  let analysis: {
    riskScore: number;
    riskLevel: string;
    summary: string;
    threats: Array<{ type: string; severity: string; title: string; description: string }>;
    recommendations: string[];
    shieldStatus: string;
  };
  try {
    analysis = JSON.parse(analysisText);
  } catch {
    res.status(500).json({ error: "Failed to parse AI response" });
    return;
  }

  await db.update(socialAccounts).set({
    riskScore: Math.min(100, Math.max(0, analysis.riskScore ?? 0)),
    lastScannedAt: new Date(),
  }).where(eq(socialAccounts.id, id));

  for (const threat of (analysis.threats ?? [])) {
    await db.insert(securityAlerts).values({
      userId,
      accountId: id,
      type: "threat_detected",
      severity: threat.severity ?? "low",
      title: threat.title ?? "Security Threat",
      message: `[${account.platform.toUpperCase()} @${account.handle}] ${threat.description}`,
    });
  }

  await db.insert(securityAlerts).values({
    userId,
    accountId: id,
    type: "scan_complete",
    severity: "info",
    title: `Scan complete — ${account.platform} @${account.handle}`,
    message: analysis.summary ?? "Security scan completed.",
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
  await db.update(securityAlerts).set({ isRead: true }).where(
    and(eq(securityAlerts.id, id), eq(securityAlerts.userId, userId))
  );
  res.json({ ok: true });
});

export default router;
