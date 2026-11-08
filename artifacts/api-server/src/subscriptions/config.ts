export const SUBSCRIPTION_FEATURES = [
  "aiChat",
  "arena",
  "studio",
  "imageGen",
  "videoGen",
  "gifGen",
  "mediaConversion",
  "voiceTts",
  "agentStudio",
  "promptLibrary",
  "socialShield",
  "botHub",
  "pwa",
  "settings",
] as const;

export type SubscriptionFeature = (typeof SUBSCRIPTION_FEATURES)[number];
export type PlanId = "free" | "plus" | "pro" | "ultra";
export type FeatureAccess = "none" | "limited" | "expanded" | "high" | "highest" | "basic" | "advanced" | "maximum" | "full" | "all-6" | "one-agent" | "multiple-agents";

type PlanDefinition = {
  id: PlanId;
  name: string;
  priceMonthlyUsd: number;
  billingInterval: "month";
  features: Record<SubscriptionFeature, FeatureAccess>;
};

export const SUBSCRIPTION_PLANS = {
  free: {
    id: "free",
    name: "Free",
    priceMonthlyUsd: 0,
    billingInterval: "month",
    features: {
      aiChat: "limited",
      arena: "limited",
      studio: "basic",
      imageGen: "limited",
      videoGen: "none",
      gifGen: "none",
      mediaConversion: "none",
      voiceTts: "basic",
      agentStudio: "one-agent",
      promptLibrary: "full",
      socialShield: "basic",
      botHub: "limited",
      pwa: "full",
      settings: "full",
    },
  },
  plus: {
    id: "plus",
    name: "Plus",
    priceMonthlyUsd: 9,
    billingInterval: "month",
    features: {
      aiChat: "expanded",
      arena: "expanded",
      studio: "expanded",
      imageGen: "expanded",
      videoGen: "limited",
      gifGen: "limited",
      mediaConversion: "limited",
      voiceTts: "expanded",
      agentStudio: "multiple-agents",
      promptLibrary: "full",
      socialShield: "expanded",
      botHub: "expanded",
      pwa: "full",
      settings: "full",
    },
  },
  pro: {
    id: "pro",
    name: "Pro",
    priceMonthlyUsd: 19,
    billingInterval: "month",
    features: {
      aiChat: "high",
      arena: "all-6",
      studio: "advanced",
      imageGen: "high",
      videoGen: "expanded",
      gifGen: "expanded",
      mediaConversion: "full",
      voiceTts: "advanced",
      agentStudio: "advanced",
      promptLibrary: "full",
      socialShield: "advanced",
      botHub: "advanced",
      pwa: "full",
      settings: "full",
    },
  },
  ultra: {
    id: "ultra",
    name: "Ultra",
    priceMonthlyUsd: 39,
    billingInterval: "month",
    features: {
      aiChat: "highest",
      arena: "all-6",
      studio: "maximum",
      imageGen: "highest",
      videoGen: "highest",
      gifGen: "highest",
      mediaConversion: "full",
      voiceTts: "highest",
      agentStudio: "advanced",
      promptLibrary: "full",
      socialShield: "advanced",
      botHub: "expanded",
      pwa: "full",
      settings: "full",
    },
  },
} as const satisfies Record<PlanId, PlanDefinition>;

export const SUBSCRIPTION_RULES = {
  upgrades: "effective-immediately-after-provider-confirmation",
  downgrades: "effective-at-renewal",
  cancellation: "at-period-end",
  renewal: "monthly-until-cancelled",
  paymentFailure: "retain-access-only-while-provider-status-is-active",
} as const;

export function getPlan(planId: PlanId) {
  return SUBSCRIPTION_PLANS[planId];
}

export function hasFeatureAccess(planId: PlanId, feature: SubscriptionFeature): boolean {
  return SUBSCRIPTION_PLANS[planId].features[feature] !== "none";
}

export function getMinimumPlan(feature: SubscriptionFeature): PlanId | null {
  return (["free", "plus", "pro", "ultra"] as const).find(planId =>
    hasFeatureAccess(planId, feature),
  ) ?? null;
}