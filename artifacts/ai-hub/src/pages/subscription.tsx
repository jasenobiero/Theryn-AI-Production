import { useEffect, useState } from "react";
import { BadgeCheck, CalendarClock, CreditCard, Loader2, ReceiptText, ShieldCheck, Sparkles } from "lucide-react";

type PlanId = "free" | "plus" | "pro" | "ultra";
type FeatureAccess = string;

interface Plan {
  id: PlanId;
  name: string;
  priceMonthlyUsd: number;
  paypalEnabled?: boolean;
  features: Record<string, FeatureAccess>;
  usageAllowances: {
    totalMonthlyCredits: number | null;
    features: Record<string, number>;
  };
}

interface Subscription {
  planId: PlanId;
  status: string;
  provider: string | null;
  founderNumber?: number | null;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
}

interface Usage {
  creditsUsed: number;
  totalMonthlyAllowance: number | null;
  remainingCredits: number | null;
  allowanceConfigured: boolean;
  resetAt: string;
  history: Array<{ feature: string; credits: number; status: string; createdAt: string }>;
}

interface BillingRecord {
  kind: string;
  amountUsdCents: number;
  currency: string;
  status: string;
  invoiceUrl: string | null;
  createdAt: string;
}

const FEATURE_LABELS: Record<string, string> = {
  aiChat: "AI Chat",
  arena: "Arena",
  studio: "Studio",
  imageGen: "Image Generation",
  videoGen: "Video Generation",
  gifGen: "GIF Generation",
  mediaConversion: "Media Conversion",
  voiceTts: "Voice TTS",
  agentStudio: "Agent Studio",
  promptLibrary: "Prompt Library",
  socialShield: "Social Shield",
  botHub: "Bot Hub",
  pwa: "PWA",
  settings: "Settings",
};

function formatFeatureAccess(access: string): string {
  const labels: Record<string, string> = {
    none: "Not included",
    limited: "Limited",
    expanded: "Expanded",
    high: "High",
    highest: "Highest",
    basic: "Basic",
    advanced: "Advanced",
    maximum: "Maximum",
    full: "Full access",
    "all-6": "All 6 models",
    "one-agent": "1 agent",
    "multiple-agents": "Multiple agents",
  };
  return labels[access] ?? access;
}

function formatDate(value: string | null): string {
  if (!value) return "Not scheduled";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(value));
}

export default function SubscriptionPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [history, setHistory] = useState<BillingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [checkoutNotice, setCheckoutNotice] = useState<string | null>(null);
  const [pendingPlan, setPendingPlan] = useState<PlanId | null>(null);
  const [canceling, setCanceling] = useState(false);

  useEffect(() => {
    let active = true;
    const finishCheckoutAndLoad = async () => {
      const params = new URLSearchParams(window.location.search);
      const paypalResult = params.get("paypal");
      const subscriptionId = params.get("subscription_id");

      if (paypalResult === "success" && subscriptionId) {
        try {
          await readJson(await fetch("/api/subscription/paypal/confirm", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ subscriptionId }),
          }));
          if (active) setCheckoutNotice("Your PayPal subscription is active.");
        } catch {
          if (active) setCheckoutError("PayPal returned, but subscription confirmation is still pending. Refresh in a moment.");
        }
        window.history.replaceState({}, "", window.location.pathname);
      } else if (paypalResult === "cancelled") {
        if (active) setCheckoutNotice("PayPal checkout was cancelled. You have not been charged.");
        window.history.replaceState({}, "", window.location.pathname);
      }

      try {
        const [planData, subscriptionData, usageData, historyData] = await Promise.all([
          fetch("/api/subscription/plans", { credentials: "include" }).then(readJson),
          fetch("/api/subscription", { credentials: "include" }).then(readJson),
          fetch("/api/subscription/usage", { credentials: "include" }).then(readJson),
          fetch("/api/subscription/history", { credentials: "include" }).then(readJson),
        ]);
        if (!active) return;
        setPlans(planData.plans);
        setSubscription(subscriptionData);
        setUsage(usageData);
        setHistory(historyData.records);
      } catch (loadFailure) {
        if (active) setError(loadFailure instanceof Error ? loadFailure.message : "Subscription details could not be loaded.");
      } finally {
        if (active) setLoading(false);
      }
    };
    void finishCheckoutAndLoad();
    return () => { active = false; };
  }, []);

  async function startPayPalCheckout(planId: PlanId) {
    setPendingPlan(planId);
    setCheckoutError(null);
    setCheckoutNotice(null);
    try {
      const response = await fetch("/api/subscription/paypal/checkout", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId }),
      });
      const payload = await response.json() as { approvalUrl?: string; error?: string };
      if (!response.ok || !payload.approvalUrl) {
        throw new Error(payload.error ?? "Could not start PayPal checkout.");
      }
      window.location.assign(payload.approvalUrl);
    } catch (checkoutFailure) {
      setCheckoutError(checkoutFailure instanceof Error ? checkoutFailure.message : "Could not start PayPal checkout.");
      setPendingPlan(null);
    }
  }

  async function cancelPayPalRenewal() {
    if (!window.confirm("Cancel automatic PayPal renewals? Your paid access will remain until the end of this billing period.")) return;
    setCanceling(true);
    setCheckoutError(null);
    setCheckoutNotice(null);
    try {
      const response = await fetch("/api/subscription/paypal/cancel", {
        method: "POST",
        credentials: "include",
      });
      const payload = await response.json() as { currentPeriodEnd?: string | null; error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Could not cancel PayPal billing.");
      setSubscription(current => current ? {
        ...current,
        status: "canceled",
        cancelAtPeriodEnd: true,
        currentPeriodEnd: payload.currentPeriodEnd ?? current.currentPeriodEnd,
      } : current);
      setCheckoutNotice("Automatic renewal is canceled. Your paid access remains until the end of this billing period.");
    } catch (cancelFailure) {
      setCheckoutError(cancelFailure instanceof Error ? cancelFailure.message : "Could not cancel PayPal billing.");
    } finally {
      setCanceling(false);
    }
  }

  if (loading) {
    return <div className="min-h-full flex items-center justify-center text-white/50" data-testid="subscription-loading"><Loader2 className="w-5 h-5 animate-spin mr-2" />Loading billing details</div>;
  }

  if (error || !subscription || !usage) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-12" role="alert">
        <h1 className="text-xl font-semibold text-white">Billing is unavailable</h1>
        <p className="mt-2 text-sm text-white/50">
          {error && error.includes("Cloudflare")
            ? "Cloudflare is challenging the billing API. The site owner needs to allow /api/* requests through to the API service."
            : (error ?? "Subscription details are incomplete.")}
        </p>
      </div>
    );
  }

  const currentPlan = plans.find(plan => plan.id === subscription.planId);

  return (
    <div className="min-h-full px-5 py-8 md:px-8">
      <div className="max-w-6xl mx-auto space-y-9">
        <header className="flex flex-col gap-5 border-b border-white/[0.08] pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-white/40">Account</p>
            <h1 className="mt-2 text-2xl font-display font-bold text-white">Subscription &amp; Billing</h1>
            <p className="mt-1 text-sm text-white/45">Plan access, usage, and payment history.</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex items-center gap-3 border border-white/10 bg-white/[0.03] px-4 py-3">
              <BadgeCheck className="w-5 h-5 text-emerald-300" />
              <div>
                <p className="text-[10px] uppercase tracking-wider text-white/40">Current plan</p>
                <p className="text-sm font-semibold text-white">{currentPlan?.name ?? subscription.planId}</p>
              </div>
              <span className="ml-2 border border-white/10 px-2 py-1 text-[10px] uppercase text-white/50">{subscription.founderNumber ? `Founder #${subscription.founderNumber}` : subscription.status}</span>
            </div>
            {subscription.provider === "paypal" && subscription.status === "active" && !subscription.cancelAtPeriodEnd && (
              <button type="button" disabled={canceling} onClick={() => void cancelPayPalRenewal()} className="h-10 border border-rose-200/20 px-4 text-xs font-medium text-rose-100/80 hover:bg-rose-200/[0.06] disabled:cursor-wait disabled:opacity-50">
                {canceling ? "Canceling..." : "Cancel renewal"}
              </button>
            )}
          </div>
        </header>

        <section className="grid gap-4 sm:grid-cols-3" aria-label="Subscription summary">
          <Summary icon={CreditCard} label="Monthly credits used" value={usage.allowanceConfigured ? `${usage.creditsUsed} / ${usage.totalMonthlyAllowance}` : `${usage.creditsUsed} used`} />
          <Summary icon={Sparkles} label="Credits remaining" value={usage.allowanceConfigured ? String(usage.remainingCredits) : "Allowance not configured"} />
          <Summary icon={CalendarClock} label={subscription.cancelAtPeriodEnd ? "Access ends" : "Next reset / renewal"} value={formatDate(subscription.currentPeriodEnd ?? usage.resetAt)} />
        </section>

        {!usage.allowanceConfigured && (
          <p className="border-l-2 border-amber-300/60 bg-white/[0.025] px-4 py-3 text-xs leading-relaxed text-white/55">
            Usage currently counts one request unit per successful AI or voice operation. These units do not estimate provider cost; credit allowances remain disabled until a cost mapping is configured.
          </p>
        )}
        {subscription.cancelAtPeriodEnd && (
          <p className="border-l-2 border-amber-300/60 bg-white/[0.025] px-4 py-3 text-xs text-white/60" role="status">
            Automatic renewal is canceled. Your paid access ends {formatDate(subscription.currentPeriodEnd)}.
          </p>
        )}

        <section>
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-white">Compare plans</h2>
              <p className="mt-1 text-xs text-white/40">Monthly pricing in USD. Feature access is managed by the server.</p>
            </div>
          </div>
          {(checkoutError || checkoutNotice) && (
            <p className={`mb-4 border-l-2 px-4 py-3 text-sm ${checkoutError ? "border-rose-300/60 bg-rose-300/[0.05] text-rose-100" : "border-emerald-300/60 bg-emerald-300/[0.05] text-emerald-100"}`} role={checkoutError ? "alert" : "status"}>
              {checkoutError ?? checkoutNotice}
            </p>
          )}
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {plans.map(plan => {
              const isCurrent = plan.id === subscription.planId;
              const canCheckout = plan.paypalEnabled && subscription.planId === "free" && !isCurrent;
              return (
                <article key={plan.id} className={`flex min-w-0 flex-col border p-4 ${isCurrent ? "border-cyan-100/35 bg-white/[0.06]" : "border-white/[0.08] bg-white/[0.025]"}`}>
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-display text-base font-semibold text-white">{plan.name}</h3>
                    {isCurrent && <span className="text-[9px] uppercase tracking-wider text-cyan-100">Current</span>}
                  </div>
                  <p className="mt-3 text-2xl font-semibold text-white">${plan.priceMonthlyUsd}<span className="text-xs font-normal text-white/40"> / month</span></p>
                  <ul className="mt-4 flex-1 divide-y divide-white/[0.06]">
                    {Object.entries(plan.features).map(([feature, access]) => (
                      <li key={feature} className="flex items-center justify-between gap-3 py-2 text-[11px]">
                        <span className="text-white/55">{FEATURE_LABELS[feature] ?? feature}</span>
                        <span className={access === "none" ? "text-white/25" : "text-white/80"}>{formatFeatureAccess(access)}</span>
                      </li>
                    ))}
                  </ul>
                  <button
                    type="button"
                    disabled={isCurrent || !canCheckout || pendingPlan !== null}
                    onClick={() => void startPayPalCheckout(plan.id)}
                    className={`mt-4 h-9 border text-xs font-medium disabled:cursor-not-allowed ${canCheckout ? "border-cyan-100/20 bg-cyan-100/10 text-cyan-50 hover:bg-cyan-100/15" : "border-white/[0.08] bg-white/[0.03] text-white/35"}`}
                    aria-label={isCurrent ? `Current ${plan.name} plan` : canCheckout ? `Subscribe to ${plan.name} with PayPal` : "PayPal billing setup required"}
                  >
                    {isCurrent ? "Current plan" : pendingPlan === plan.id ? "Connecting to PayPal..." : canCheckout ? "Subscribe with PayPal" : plan.paypalEnabled ? "Contact support to switch" : "PayPal setup required"}
                  </button>
                </article>
              );
            })}
          </div>
        </section>

        <div className="grid gap-8 lg:grid-cols-[1fr_0.85fr]">
          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">Usage this period</h2>
            <div className="overflow-hidden border border-white/[0.08]">
              <div className="flex items-center justify-between border-b border-white/[0.07] px-4 py-3 text-xs text-white/45">
                <span>Usage history</span>
                <span>Resets {formatDate(usage.resetAt)}</span>
              </div>
              <UsageTable rows={usage.history} />
            </div>
          </section>

          <section className="space-y-7">
            <div>
              <h2 className="mb-3 text-lg font-semibold text-white">Payment methods</h2>
              <div className="flex items-center gap-3 border border-white/[0.08] bg-white/[0.025] px-4 py-4 text-sm text-white/45">
                <ShieldCheck className="w-4 h-4" />
                PayPal securely manages checkout and recurring payments. Payment details stay with PayPal.
              </div>
            </div>
            <div>
              <h2 className="mb-3 text-lg font-semibold text-white">Payment history</h2>
              {history.length === 0 ? (
                <div className="flex items-center gap-3 border border-white/[0.08] bg-white/[0.025] px-4 py-4 text-sm text-white/45"><ReceiptText className="w-4 h-4" />No payments or invoices recorded.</div>
              ) : (
                <ul className="divide-y divide-white/[0.07] border-y border-white/[0.08]">
                  {history.map((record, index) => (
                    <li key={`${record.createdAt}-${index}`} className="flex items-center justify-between gap-3 py-3 text-xs">
                      <div><p className="text-white/80">{record.kind} · {record.status}</p><p className="mt-1 text-white/35">{formatDate(record.createdAt)}</p></div>
                      <div className="text-right"><p className="text-white">{new Intl.NumberFormat(undefined, { style: "currency", currency: record.currency.toUpperCase() }).format(record.amountUsdCents / 100)}</p>{record.invoiceUrl && <a className="mt-1 inline-block text-cyan-100/70 hover:text-cyan-100" href={record.invoiceUrl} target="_blank" rel="noreferrer">Invoice</a>}</div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function Summary({ icon: Icon, label, value }: { icon: typeof CreditCard; label: string; value: string }) {
  return <div className="flex items-center gap-3 border border-white/[0.08] bg-white/[0.025] px-4 py-4"><Icon className="w-4 h-4 text-white/55" /><div className="min-w-0"><p className="text-[10px] uppercase tracking-wider text-white/40">{label}</p><p className="mt-1 truncate text-sm font-medium text-white">{value}</p></div></div>;
}

function readJson(response: Response) {
  if (!response.ok) {
    const contentType = response.headers.get("content-type") ?? "";
    if (response.status === 403 && contentType.includes("text/html")) {
      throw new Error("Cloudflare is challenging the billing API. The site owner needs to allow /api/* requests through to the API service.");
    }
    throw new Error(`Billing API request failed (${response.status}).`);
  }
  return response.json();
}

function UsageTable({ rows }: { rows: Usage["history"] }) {
  if (rows.length === 0) return <p className="px-4 py-8 text-center text-xs text-white/35">No recorded usage during this period.</p>;
  return <ul className="divide-y divide-white/[0.06]">{rows.map((row, index) => <li key={`${row.createdAt}-${index}`} className="flex justify-between gap-4 px-4 py-3 text-xs"><span className="text-white/65">{FEATURE_LABELS[row.feature] ?? row.feature} <span className="text-white/30">· {row.status}</span></span><span className="text-white/55">{row.credits} credits · {formatDate(row.createdAt)}</span></li>)}</ul>;
}