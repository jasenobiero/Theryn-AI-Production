import { and, eq, gt } from "drizzle-orm";
import { type NextFunction, type Request, type Response } from "express";
import { db, founderMemberships, subscriptionPlanOverrides, userSubscriptions } from "@workspace/db";
import {
  SUBSCRIPTION_FEATURES,
  SUBSCRIPTION_PLANS,
  type FeatureAccess,
  type PlanId,
  type SubscriptionFeature,
} from "./config";

const PLAN_IDS = Object.keys(SUBSCRIPTION_PLANS) as PlanId[];
const FEATURE_ACCESS_VALUES = new Set<FeatureAccess>([
  "none", "limited", "expanded", "high", "highest", "basic", "advanced", "maximum", "full", "all-6", "one-agent", "multiple-agents",
]);

export type EffectivePlan = {
  planId: PlanId;
  status: string;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  founderNumber?: number;
};

export async function getEffectivePlan(userId: string): Promise<EffectivePlan> {
  const [founder] = await db
    .select({ founderNumber: founderMemberships.founderNumber })
    .from(founderMemberships)
    .where(eq(founderMemberships.userId, userId))
    .limit(1);
  if (founder) {
    return {
      planId: "ultra",
      status: "founder",
      currentPeriodStart: null,
      currentPeriodEnd: null,
      founderNumber: founder.founderNumber,
    };
  }

  const [subscription] = await db
    .select()
    .from(userSubscriptions)
    .where(and(
      eq(userSubscriptions.userId, userId),
      gt(userSubscriptions.currentPeriodEnd, new Date()),
    ))
    .limit(1);

  const isWithinPaidCancellationPeriod = subscription?.status === "canceled"
    && subscription.cancelAtPeriodEnd
    && Boolean(subscription.currentPeriodEnd && subscription.currentPeriodEnd > new Date());
  if (!subscription || (!["active", "trialing"].includes(subscription.status) && !isWithinPaidCancellationPeriod) || !isPlanId(subscription.planId)) {
    return { planId: "free", status: "free", currentPeriodStart: null, currentPeriodEnd: null };
  }

  return {
    planId: subscription.planId,
    status: subscription.status,
    currentPeriodStart: subscription.currentPeriodStart,
    currentPeriodEnd: subscription.currentPeriodEnd,
  };
}

export async function getConfiguredAccess(planId: PlanId, feature: SubscriptionFeature): Promise<FeatureAccess> {
  const [override] = await db
    .select({ featureAccess: subscriptionPlanOverrides.featureAccess })
    .from(subscriptionPlanOverrides)
    .where(eq(subscriptionPlanOverrides.planId, planId))
    .limit(1);

  const featureAccess = override?.featureAccess;
  if (featureAccess && typeof featureAccess === "object" && !Array.isArray(featureAccess)) {
    const configuredValue = (featureAccess as Record<string, unknown>)[feature];
    if (typeof configuredValue === "string" && FEATURE_ACCESS_VALUES.has(configuredValue as FeatureAccess)) {
      return configuredValue as FeatureAccess;
    }
  }

  return SUBSCRIPTION_PLANS[planId].features[feature];
}

export function requireFeatureAccess(feature: SubscriptionFeature) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const userId = (req as Request & { userId?: string }).userId;
    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const { planId } = await getEffectivePlan(userId);
    const access = await getConfiguredAccess(planId, feature);
    if (access === "none") {
      const requiredPlan = await findMinimumPlan(feature);
      res.status(403).json({
        error: "This feature is not included in your current plan.",
        feature,
        currentPlan: planId,
        requiredPlan,
      });
      return;
    }

    next();
  };
}

async function findMinimumPlan(feature: SubscriptionFeature): Promise<PlanId | null> {
  for (const planId of PLAN_IDS) {
    if ((await getConfiguredAccess(planId, feature)) !== "none") return planId;
  }
  return null;
}

export function isPlanId(value: string): value is PlanId {
  return Object.prototype.hasOwnProperty.call(SUBSCRIPTION_PLANS, value);
}

export function isSubscriptionFeature(value: string): value is SubscriptionFeature {
  return (SUBSCRIPTION_FEATURES as readonly string[]).includes(value);
}