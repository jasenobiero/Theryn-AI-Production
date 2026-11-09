import { randomUUID } from "node:crypto";
import type { Request } from "express";
import { and, eq, gte, inArray, lt, sql } from "drizzle-orm";
import { db, usageRecords } from "@workspace/db";
import type { SubscriptionFeature } from "./config";

const DAILY_GENERATION_LIMIT = 5;

export async function reserveDailyGeneration(req: Request, feature: "imageGen" | "videoGen" = "imageGen"): Promise<{
  reservationId: string | null;
  remaining: number;
  resetAt: Date;
}> {
  const userId = (req as Request & { userId?: string }).userId;
  if (!userId) throw new Error("Cannot reserve generation without an authenticated user");

  const now = new Date();
  const periodStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const resetAt = new Date(periodStart.getTime() + 24 * 60 * 60 * 1000);

  return db.transaction(async tx => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`${userId}:${periodStart.toISOString()}`}))`);

    const [usage] = await tx
      .select({ count: sql<number>`count(*)::int` })
      .from(usageRecords)
      .where(and(
        eq(usageRecords.userId, userId),
        inArray(usageRecords.feature, ["imageGen", "videoGen"]),
        gte(usageRecords.createdAt, periodStart),
        lt(usageRecords.createdAt, resetAt),
        inArray(usageRecords.status, ["pending", "committed"]),
      ));

    const used = Number(usage?.count ?? 0);
    if (used >= DAILY_GENERATION_LIMIT) {
      return { reservationId: null, remaining: 0, resetAt };
    }

    const [reservation] = await tx.insert(usageRecords).values({
      userId,
      feature,
      credits: 1,
      idempotencyKey: randomUUID(),
      status: "pending",
      metadata: { unit: "generation", limit: DAILY_GENERATION_LIMIT },
    }).returning({ id: usageRecords.id });

    return { reservationId: reservation.id, remaining: DAILY_GENERATION_LIMIT - used - 1, resetAt };
  });
}

export async function finalizeGeneration(reservationId: string, status: "committed" | "failed"): Promise<void> {
  await db.update(usageRecords).set({ status, finalizedAt: new Date() }).where(eq(usageRecords.id, reservationId));
}

export async function recordUsage(
  req: Request,
  feature: SubscriptionFeature,
  metadata: Record<string, string | number | boolean> = {},
): Promise<void> {
  const userId = (req as Request & { userId?: string }).userId;
  if (!userId) throw new Error("Cannot record usage without an authenticated user");

  const suppliedKey = req.get("idempotency-key")?.trim();
  const idempotencyKey = suppliedKey && suppliedKey.length <= 255 ? suppliedKey : randomUUID();

  await db.insert(usageRecords).values({
    userId,
    feature,
    credits: 1,
    idempotencyKey,
    status: "committed",
    metadata: { ...metadata, unit: "request" },
    finalizedAt: new Date(),
  }).onConflictDoNothing({
    target: [usageRecords.userId, usageRecords.idempotencyKey],
  });
}
