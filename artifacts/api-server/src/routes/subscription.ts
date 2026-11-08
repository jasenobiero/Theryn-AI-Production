import { Router, type IRouter } from "express";
import { and, desc, eq, gte, inArray, lt, sql } from "drizzle-orm";
import {
  billingWebhookEvents,
  billingRecords,
  db,
  subscriptionPlanOverrides,
  usageRecords,
  userSubscriptions,
} from "@workspace/db";
import { clerkRequireAuth } from "../middlewares/clerkRequireAuth";
import { SUBSCRIPTION_FEATURES, SUBSCRIPTION_PLANS, type PlanId } from "../subscriptions/config";
import { getConfiguredAccess, getEffectivePlan, isPlanId } from "../subscriptions/entitlements";
import {
  cancelPayPalSubscription,
  createPayPalSubscription,
  getPayPalPlanId,
  getPayPalSubscription,
  getPlanIdFromPayPalPlan,
  isPayPalConfigured,
  normalizePayPalStatus,
  verifyPayPalWebhook,
  type PayPalSubscription,
} from "../subscriptions/paypal";

const router: IRouter = Router();

router.get("/subscription/plans", async (_req, res) => {
  const overrides = await db.select().from(subscriptionPlanOverrides);
  const overrideByPlan = new Map(overrides.map(override => [override.planId, override]));

  const plans = await Promise.all((Object.keys(SUBSCRIPTION_PLANS) as PlanId[]).map(async planId => {
    const plan = SUBSCRIPTION_PLANS[planId];
    const override = overrideByPlan.get(planId);
    const features = Object.fromEntries(await Promise.all(
      SUBSCRIPTION_FEATURES.map(async feature => [feature, await getConfiguredAccess(planId, feature)] as const),
    ));
    return {
      ...plan,
      priceMonthlyUsd: override ? override.priceMonthlyUsdCents / 100 : plan.priceMonthlyUsd,
      features,
      usageAllowances: readUsageAllowances(override?.usageAllowances),
      paypalEnabled: planId !== "free"
        && isPayPalConfigured()
        && Boolean(getPayPalPlanId(planId))
        && (!override || override.priceMonthlyUsdCents === plan.priceMonthlyUsd * 100),
    };
  }));

  res.json({ plans });
});

router.get("/subscription", clerkRequireAuth, async (req, res) => {
  const userId = (req as typeof req & { userId: string }).userId;
  const effective = await getEffectivePlan(userId);
  const [stored] = await db
    .select({ cancelAtPeriodEnd: userSubscriptions.cancelAtPeriodEnd, provider: userSubscriptions.provider })
    .from(userSubscriptions)
    .where(eq(userSubscriptions.userId, userId))
    .limit(1);

  res.json({
    ...effective,
    cancelAtPeriodEnd: effective.planId === "free" ? false : stored?.cancelAtPeriodEnd ?? false,
    provider: effective.planId === "free" ? null : stored?.provider ?? null,
    founderNumber: effective.founderNumber ?? null,
  });
});

router.post("/subscription/paypal/checkout", clerkRequireAuth, async (req, res) => {
  const userId = (req as typeof req & { userId: string }).userId;
  const planId: unknown = req.body?.planId;
  if (typeof planId !== "string" || !isPlanId(planId) || planId === "free") {
    res.status(400).json({ error: "Choose a valid paid plan." });
    return;
  }
  if (!isPayPalConfigured() || !getPayPalPlanId(planId)) {
    res.status(503).json({ error: "PayPal checkout is not configured yet." });
    return;
  }
  const [priceOverride] = await db.select({ priceMonthlyUsdCents: subscriptionPlanOverrides.priceMonthlyUsdCents })
    .from(subscriptionPlanOverrides)
    .where(eq(subscriptionPlanOverrides.planId, planId))
    .limit(1);
  if (priceOverride && priceOverride.priceMonthlyUsdCents !== SUBSCRIPTION_PLANS[planId].priceMonthlyUsd * 100) {
    res.status(409).json({ error: "This plan's displayed price does not match its PayPal billing plan." });
    return;
  }

  const [existing] = await db
    .select({
      providerSubscriptionId: userSubscriptions.providerSubscriptionId,
      status: userSubscriptions.status,
      cancelAtPeriodEnd: userSubscriptions.cancelAtPeriodEnd,
      currentPeriodEnd: userSubscriptions.currentPeriodEnd,
    })
    .from(userSubscriptions)
    .where(eq(userSubscriptions.userId, userId))
    .limit(1);
  const stillPaidThroughPeriod = existing?.status === "canceled"
    && existing.cancelAtPeriodEnd
    && Boolean(existing.currentPeriodEnd && existing.currentPeriodEnd > new Date());
  if (existing?.providerSubscriptionId && (["active", "trialing", "approval_pending", "pending"].includes(existing.status) || stillPaidThroughPeriod)) {
    res.status(409).json({ error: "An existing subscription or checkout is already associated with this account." });
    return;
  }

  try {
    const checkout = await createPayPalSubscription(userId, planId);
    await db.insert(userSubscriptions).values({
      userId,
      planId,
      status: "approval_pending",
      provider: "paypal",
      providerSubscriptionId: checkout.id,
      currentPeriodStart: null,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
    }).onConflictDoUpdate({
      target: userSubscriptions.userId,
      set: {
        planId,
        status: "approval_pending",
        provider: "paypal",
        providerSubscriptionId: checkout.id,
        currentPeriodStart: null,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
        updatedAt: new Date(),
      },
    });
    res.json({ approvalUrl: checkout.approvalUrl });
  } catch (error) {
    req.log?.error({ err: error }, "PayPal checkout creation failed");
    res.status(502).json({ error: "Could not start PayPal checkout. Please try again later." });
  }
});

router.post("/subscription/paypal/confirm", clerkRequireAuth, async (req, res) => {
  const userId = (req as typeof req & { userId: string }).userId;
  const subscriptionId: unknown = req.body?.subscriptionId;
  if (typeof subscriptionId !== "string" || subscriptionId.length === 0 || subscriptionId.length > 255) {
    res.status(400).json({ error: "A valid PayPal subscription ID is required." });
    return;
  }

  try {
    const remote = await getPayPalSubscription(subscriptionId);
    const [existing] = await db
      .select({ providerSubscriptionId: userSubscriptions.providerSubscriptionId, provider: userSubscriptions.provider })
      .from(userSubscriptions)
      .where(eq(userSubscriptions.userId, userId))
      .limit(1);
    if (existing?.provider !== "paypal" || existing.providerSubscriptionId !== subscriptionId || remote.custom_id !== userId) {
      res.status(403).json({ error: "This PayPal subscription does not belong to this account." });
      return;
    }
    if (remote.status !== "ACTIVE") {
      res.status(409).json({ error: "PayPal has not activated this subscription yet." });
      return;
    }
    await savePayPalSubscription(userId, remote);
    res.json({ ok: true });
  } catch (error) {
    req.log?.error({ err: error }, "PayPal subscription confirmation failed");
    res.status(502).json({ error: "Could not confirm the PayPal subscription. Please refresh shortly." });
  }
});

router.post("/subscription/paypal/cancel", clerkRequireAuth, async (req, res) => {
  const userId = (req as typeof req & { userId: string }).userId;
  const [stored] = await db.select()
    .from(userSubscriptions)
    .where(eq(userSubscriptions.userId, userId))
    .limit(1);
  if (stored?.provider !== "paypal" || !stored.providerSubscriptionId || stored.status !== "active") {
    res.status(409).json({ error: "There is no active PayPal subscription to cancel." });
    return;
  }
  if (stored.cancelAtPeriodEnd) {
    res.json({ ok: true, cancelAtPeriodEnd: true, currentPeriodEnd: stored.currentPeriodEnd });
    return;
  }

  try {
    await cancelPayPalSubscription(stored.providerSubscriptionId);
    await db.update(userSubscriptions)
      .set({ status: "canceled", cancelAtPeriodEnd: true, updatedAt: new Date() })
      .where(eq(userSubscriptions.userId, userId));
    res.json({ ok: true, cancelAtPeriodEnd: true, currentPeriodEnd: stored.currentPeriodEnd });
  } catch (error) {
    req.log?.error({ err: error }, "PayPal subscription cancellation failed");
    res.status(502).json({ error: "Could not cancel PayPal billing. Please try again or manage it in PayPal." });
  }
});

router.post("/subscription/paypal/webhook", async (req, res) => {
  const event = req.body as {
    id?: unknown;
    event_type?: unknown;
    resource?: Record<string, unknown>;
  };
  if (!event || typeof event.id !== "string" || typeof event.event_type !== "string" || !event.resource) {
    res.status(400).json({ error: "Invalid PayPal webhook event." });
    return;
  }

  try {
    const verified = await verifyPayPalWebhook({
      "paypal-auth-algo": req.get("paypal-auth-algo") ?? undefined,
      "paypal-cert-url": req.get("paypal-cert-url") ?? undefined,
      "paypal-transmission-id": req.get("paypal-transmission-id") ?? undefined,
      "paypal-transmission-sig": req.get("paypal-transmission-sig") ?? undefined,
      "paypal-transmission-time": req.get("paypal-transmission-time") ?? undefined,
    }, event);
    if (!verified) {
      res.status(400).json({ error: "PayPal webhook signature is invalid." });
      return;
    }

    const [insertedEvent] = await db.insert(billingWebhookEvents).values({
      provider: "paypal",
      eventId: event.id,
      eventType: event.event_type,
    }).onConflictDoNothing().returning({ id: billingWebhookEvents.id });
    if (!insertedEvent) {
      const [storedEvent] = await db.select({ processedAt: billingWebhookEvents.processedAt })
        .from(billingWebhookEvents)
        .where(eq(billingWebhookEvents.eventId, event.id))
        .limit(1);
      if (storedEvent?.processedAt) {
        res.status(204).end();
        return;
      }
    }

    await processPayPalWebhook(event.event_type, event.resource);
    await db.update(billingWebhookEvents)
      .set({ processedAt: new Date(), processingError: null })
      .where(eq(billingWebhookEvents.eventId, event.id));
    res.status(204).end();
  } catch (error) {
    req.log?.error({ err: error, eventId: event.id, eventType: event.event_type }, "PayPal webhook processing failed");
    await db.update(billingWebhookEvents)
      .set({ processingError: "PayPal webhook processing failed" })
      .where(eq(billingWebhookEvents.eventId, event.id))
      .catch(() => undefined);
    res.status(500).json({ error: "PayPal webhook processing failed." });
  }
});

router.get("/subscription/usage", clerkRequireAuth, async (req, res) => {
  const userId = (req as typeof req & { userId: string }).userId;
  const effective = await getEffectivePlan(userId);
  const [override] = await db
    .select({ usageAllowances: subscriptionPlanOverrides.usageAllowances })
    .from(subscriptionPlanOverrides)
    .where(eq(subscriptionPlanOverrides.planId, effective.planId))
    .limit(1);
  const usageAllowances = readUsageAllowances(override?.usageAllowances);
  const periodStart = effective.currentPeriodStart ?? startOfUtcMonth(new Date());
  const periodEnd = effective.currentPeriodEnd ?? startOfNextUtcMonth(new Date());

  const consumed = await db
    .select({ feature: usageRecords.feature, credits: sql<number>`COALESCE(SUM(${usageRecords.credits}), 0)::int` })
    .from(usageRecords)
    .where(and(
      eq(usageRecords.userId, userId),
      gte(usageRecords.createdAt, periodStart),
      lt(usageRecords.createdAt, periodEnd),
      inArray(usageRecords.status, ["pending", "committed"]),
    ))
    .groupBy(usageRecords.feature);

  const usedByFeature = Object.fromEntries(consumed.map(row => [row.feature, Number(row.credits)]));
  const totalCreditsUsed = Object.values(usedByFeature).reduce((total, credits) => total + credits, 0);
  const totalAllowance = usageAllowances.totalMonthlyCredits;

  res.json({
    planId: effective.planId,
    periodStart,
    resetAt: periodEnd,
    creditsUsed: totalCreditsUsed,
    totalMonthlyAllowance: totalAllowance,
    remainingCredits: totalAllowance === null ? null : Math.max(0, totalAllowance - totalCreditsUsed),
    allowanceConfigured: totalAllowance !== null,
    features: Object.fromEntries(SUBSCRIPTION_FEATURES.map(feature => {
      const allowance = usageAllowances.features[feature] ?? null;
      const used = usedByFeature[feature] ?? 0;
      return [feature, {
        creditsUsed: used,
        allowance,
        remaining: allowance === null ? null : Math.max(0, allowance - used),
        allowanceConfigured: allowance !== null,
      }];
    })),
    history: await db
      .select({ feature: usageRecords.feature, credits: usageRecords.credits, status: usageRecords.status, createdAt: usageRecords.createdAt, finalizedAt: usageRecords.finalizedAt })
      .from(usageRecords)
      .where(and(
        eq(usageRecords.userId, userId),
        gte(usageRecords.createdAt, periodStart),
        lt(usageRecords.createdAt, periodEnd),
      ))
      .orderBy(desc(usageRecords.createdAt))
      .limit(100),
  });
});

router.get("/subscription/history", clerkRequireAuth, async (req, res) => {
  const userId = (req as typeof req & { userId: string }).userId;
  const records = await db
    .select({ kind: billingRecords.kind, amountUsdCents: billingRecords.amountUsdCents, currency: billingRecords.currency, status: billingRecords.status, invoiceUrl: billingRecords.invoiceUrl, createdAt: billingRecords.createdAt })
    .from(billingRecords)
    .where(eq(billingRecords.userId, userId))
    .orderBy(desc(billingRecords.createdAt))
    .limit(100);
  res.json({ records });
});

function readUsageAllowances(value: unknown): { totalMonthlyCredits: number | null; features: Partial<Record<(typeof SUBSCRIPTION_FEATURES)[number], number>> } {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { totalMonthlyCredits: null, features: {} };
  }
  const raw = value as Record<string, unknown>;
  const totalMonthlyCredits = isNonNegativeInteger(raw.totalMonthlyCredits) ? raw.totalMonthlyCredits : null;
  const rawFeatures = raw.features && typeof raw.features === "object" && !Array.isArray(raw.features)
    ? raw.features as Record<string, unknown>
    : {};
  const features = Object.fromEntries(SUBSCRIPTION_FEATURES.flatMap(feature =>
    isNonNegativeInteger(rawFeatures[feature]) ? [[feature, rawFeatures[feature] as number]] : [],
  ));
  return { totalMonthlyCredits, features };
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function startOfUtcMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function startOfNextUtcMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1));
}

async function savePayPalSubscription(userId: string, remote: PayPalSubscription, status = normalizePayPalStatus(remote.status)) {
  const planId = getPlanIdFromPayPalPlan(remote.plan_id);
  if (!planId) throw new Error("PayPal subscription references an unconfigured plan.");
  const [stored] = await db.select({ currentPeriodEnd: userSubscriptions.currentPeriodEnd })
    .from(userSubscriptions)
    .where(eq(userSubscriptions.userId, userId))
    .limit(1);
  const start = remote.start_time ? new Date(remote.start_time) : new Date();
  const remoteEnd = remote.billing_info?.next_billing_time ? new Date(remote.billing_info.next_billing_time) : null;
  const end = remoteEnd && !Number.isNaN(remoteEnd.getTime())
    ? remoteEnd
    : status === "canceled" ? stored?.currentPeriodEnd ?? null : null;
  await db.insert(userSubscriptions).values({
    userId,
    planId,
    status,
    provider: "paypal",
    providerCustomerId: remote.subscriber?.payer_id ?? null,
    providerSubscriptionId: remote.id,
    currentPeriodStart: Number.isNaN(start.getTime()) ? new Date() : start,
    currentPeriodEnd: end,
    cancelAtPeriodEnd: status === "canceled",
  }).onConflictDoUpdate({
    target: userSubscriptions.userId,
    set: {
      planId,
      status,
      provider: "paypal",
      providerCustomerId: remote.subscriber?.payer_id ?? null,
      providerSubscriptionId: remote.id,
      currentPeriodStart: Number.isNaN(start.getTime()) ? new Date() : start,
      currentPeriodEnd: end,
      cancelAtPeriodEnd: status === "canceled",
      updatedAt: new Date(),
    },
  });
}

async function processPayPalWebhook(eventType: string, resource: Record<string, unknown>) {
  if (eventType.startsWith("BILLING.SUBSCRIPTION.")) {
    const subscriptionId = typeof resource.id === "string" ? resource.id : null;
    if (!subscriptionId) throw new Error("PayPal subscription event is missing its subscription ID.");
    const remote = await getPayPalSubscription(subscriptionId);
    const [stored] = await db.select({ userId: userSubscriptions.userId })
      .from(userSubscriptions)
      .where(and(eq(userSubscriptions.provider, "paypal"), eq(userSubscriptions.providerSubscriptionId, subscriptionId)))
      .limit(1);
    const userId = remote.custom_id ?? stored?.userId;
    if (!userId) throw new Error("PayPal subscription is not associated with a local user.");
    const status = eventType.endsWith("PAYMENT.FAILED") ? "past_due" : normalizePayPalStatus(remote.status);
    await savePayPalSubscription(userId, remote, status);
    return;
  }

  if (eventType === "PAYMENT.SALE.COMPLETED" || eventType === "PAYMENT.SALE.DENIED" || eventType === "PAYMENT.SALE.REFUNDED") {
    const subscriptionId = typeof resource.billing_agreement_id === "string" ? resource.billing_agreement_id : null;
    const [stored] = subscriptionId
      ? await db.select({ userId: userSubscriptions.userId })
        .from(userSubscriptions)
        .where(and(eq(userSubscriptions.provider, "paypal"), eq(userSubscriptions.providerSubscriptionId, subscriptionId)))
        .limit(1)
      : [];
    if (!stored) throw new Error("PayPal sale is not associated with a local subscription.");

    if (eventType === "PAYMENT.SALE.DENIED") {
      await db.update(userSubscriptions)
        .set({ status: "past_due", updatedAt: new Date() })
        .where(eq(userSubscriptions.userId, stored.userId));
      return;
    }

    const amount = resource.amount && typeof resource.amount === "object"
      ? resource.amount as Record<string, unknown>
      : {};
    const amountValue = Number(amount.total ?? amount.value);
    const currency = typeof amount.currency === "string"
      ? amount.currency.toLowerCase()
      : typeof amount.currency_code === "string" ? amount.currency_code.toLowerCase() : "usd";
    if (!Number.isFinite(amountValue) || amountValue < 0 || typeof resource.id !== "string") {
      throw new Error("PayPal sale has invalid transaction details.");
    }
    await db.insert(billingRecords).values({
      userId: stored.userId,
      providerObjectId: resource.id,
      kind: eventType === "PAYMENT.SALE.REFUNDED" ? "refund" : "subscription_payment",
      amountUsdCents: Math.round(amountValue * 100),
      currency,
      status: eventType === "PAYMENT.SALE.REFUNDED" ? "refunded" : "completed",
      createdAt: typeof resource.create_time === "string" ? new Date(resource.create_time) : new Date(),
    }).onConflictDoNothing();
  }
}

export default router;