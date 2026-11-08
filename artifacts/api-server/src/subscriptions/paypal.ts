import type { PlanId } from "./config";

type PaidPlanId = Exclude<PlanId, "free">;

export type PayPalSubscription = {
  id: string;
  status: string;
  plan_id: string;
  custom_id?: string;
  start_time?: string;
  billing_info?: { next_billing_time?: string };
  subscriber?: { payer_id?: string };
};

const PAYPAL_PLAN_ENV: Record<PaidPlanId, string> = {
  plus: "PAYPAL_PLAN_ID_PLUS",
  pro: "PAYPAL_PLAN_ID_PRO",
  ultra: "PAYPAL_PLAN_ID_ULTRA",
};

function apiBaseUrl(): string {
  return process.env.PAYPAL_ENV === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";
}

export function getPayPalPlanId(planId: PlanId): string | null {
  if (planId === "free") return null;
  return process.env[PAYPAL_PLAN_ENV[planId]]?.trim() || null;
}

export function isPayPalConfigured(): boolean {
  return Boolean(
    process.env.PAYPAL_CLIENT_ID?.trim()
    && process.env.PAYPAL_CLIENT_SECRET?.trim()
    && process.env.PAYPAL_WEBHOOK_ID?.trim()
    && process.env.APP_BASE_URL?.trim()
    && (Object.keys(PAYPAL_PLAN_ENV) as PaidPlanId[]).every(planId => getPayPalPlanId(planId)),
  );
}

function requiredCredentials() {
  const clientId = process.env.PAYPAL_CLIENT_ID?.trim();
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) throw new Error("PayPal billing is not configured.");
  return { clientId, clientSecret };
}

async function getAccessToken(): Promise<string> {
  const { clientId, clientSecret } = requiredCredentials();
  const response = await fetch(`${apiBaseUrl()}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  const payload = await response.json() as { access_token?: string };
  if (!response.ok || !payload.access_token) {
    throw new Error("Could not authenticate with PayPal.");
  }
  return payload.access_token;
}

async function paypalRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const accessToken = await getAccessToken();
  const response = await fetch(`${apiBaseUrl()}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
  });
  const payload = await response.json().catch(() => ({})) as T;
  if (!response.ok) throw new Error(`PayPal request failed (${response.status}).`);
  return payload;
}

export async function createPayPalSubscription(userId: string, planId: PaidPlanId) {
  const paypalPlanId = getPayPalPlanId(planId);
  const appBaseUrl = process.env.APP_BASE_URL?.trim();
  if (!paypalPlanId || !appBaseUrl) throw new Error("PayPal billing is not configured for this plan.");

  let baseUrl: URL;
  try {
    baseUrl = new URL(appBaseUrl);
  } catch {
    throw new Error("APP_BASE_URL must be a valid absolute URL.");
  }
  if (baseUrl.protocol !== "https:" && process.env.NODE_ENV === "production") {
    throw new Error("APP_BASE_URL must use HTTPS in production.");
  }

  const subscription = await paypalRequest<PayPalSubscription & { links?: Array<{ rel: string; href: string }> }>(
    "/v1/billing/subscriptions",
    {
      method: "POST",
      body: JSON.stringify({
        plan_id: paypalPlanId,
        custom_id: userId,
        application_context: {
          brand_name: "THERYN AI",
          user_action: "SUBSCRIBE_NOW",
          shipping_preference: "NO_SHIPPING",
          return_url: new URL("/subscription?paypal=success", baseUrl).toString(),
          cancel_url: new URL("/subscription?paypal=cancelled", baseUrl).toString(),
        },
      }),
    },
  );

  const approvalUrl = subscription.links?.find(link => link.rel === "approve")?.href;
  if (!subscription.id || !approvalUrl) throw new Error("PayPal did not return an approval link.");
  return { id: subscription.id, approvalUrl };
}

export async function getPayPalSubscription(subscriptionId: string): Promise<PayPalSubscription> {
  return paypalRequest<PayPalSubscription>(`/v1/billing/subscriptions/${encodeURIComponent(subscriptionId)}`);
}

export async function cancelPayPalSubscription(subscriptionId: string): Promise<void> {
  await paypalRequest<unknown>(`/v1/billing/subscriptions/${encodeURIComponent(subscriptionId)}/cancel`, {
    method: "POST",
    body: JSON.stringify({ reason: "Customer requested cancellation" }),
  });
}

export async function verifyPayPalWebhook(
  headers: Record<string, string | undefined>,
  event: unknown,
): Promise<boolean> {
  const webhookId = process.env.PAYPAL_WEBHOOK_ID?.trim();
  const authAlgo = headers["paypal-auth-algo"];
  const certUrl = headers["paypal-cert-url"];
  const transmissionId = headers["paypal-transmission-id"];
  const transmissionSig = headers["paypal-transmission-sig"];
  const transmissionTime = headers["paypal-transmission-time"];
  if (!webhookId || !authAlgo || !certUrl || !transmissionId || !transmissionSig || !transmissionTime) {
    return false;
  }

  const result = await paypalRequest<{ verification_status?: string }>(
    "/v1/notifications/verify-webhook-signature",
    {
      method: "POST",
      body: JSON.stringify({
        auth_algo: authAlgo,
        cert_url: certUrl,
        transmission_id: transmissionId,
        transmission_sig: transmissionSig,
        transmission_time: transmissionTime,
        webhook_id: webhookId,
        webhook_event: event,
      }),
    },
  );
  return result.verification_status === "SUCCESS";
}

export function getPlanIdFromPayPalPlan(paypalPlanId: string): PaidPlanId | null {
  return (Object.keys(PAYPAL_PLAN_ENV) as PaidPlanId[])
    .find(planId => getPayPalPlanId(planId) === paypalPlanId) ?? null;
}

export function normalizePayPalStatus(status: string): string {
  switch (status) {
    case "ACTIVE": return "active";
    case "APPROVAL_PENDING": return "approval_pending";
    case "SUSPENDED": return "past_due";
    case "CANCELLED": return "canceled";
    case "EXPIRED": return "expired";
    default: return "pending";
  }
}