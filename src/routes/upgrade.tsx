import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SiteNav } from "@/components/site-nav";
import { Check, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/upgrade")({
  head: () => ({
    meta: [
      { title: "Upgrade — NesAI Nova Premium" },
      { name: "description", content: "Unlock unlimited AI tutoring with NesAI Nova Premium." },
    ],
  }),
  component: UpgradePage,
});

const PAYPAL_CLIENT_ID = import.meta.env.VITE_PAYPAL_CLIENT_ID as string | undefined;
const PAYPAL_PLAN_ID = import.meta.env.VITE_PAYPAL_PLAN_ID as string | undefined;

const PERKS = [
  "Unlimited daily questions across every subject tutor",
  "Priority responses, even during peak exam season",
  "Full access to The Vault's past papers, memos & notes",
  "Support South African students & Nesma Holdings' mission",
];

function UpgradePage() {
  const navigate = useNavigate();
  const paypalRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"idle" | "loading-sdk" | "ready" | "processing" | "error">(
    "idle",
  );
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [activeSubscription, setActiveSubscription] = useState<{
    id: string;
    current_period_end: string | null;
  } | null>(null);
  const [subscriptionLoaded, setSubscriptionLoaded] = useState(false);
  const [subscriptionLoadError, setSubscriptionLoadError] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const paymentReady = Boolean(PAYPAL_CLIENT_ID && PAYPAL_PLAN_ID);

  useEffect(() => {
    let cancelled = false;
    async function loadAccount() {
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      setSignedIn(!!data.session);
      if (!data.session) {
        setSubscriptionLoaded(true);
        return;
      }
      const { data: subscription, error } = await supabase
        .from("subscriptions")
        .select("id, current_period_end")
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!cancelled) {
        setActiveSubscription(subscription);
        setSubscriptionLoadError(Boolean(error));
        setSubscriptionLoaded(true);
      }
    }
    void loadAccount();
    return () => {
      cancelled = true;
    };
  }, []);

  async function cancelPremium() {
    if (!activeSubscription || cancelling) return;
    if (
      !window.confirm(
        "Cancel your NesAI Premium subscription? This will stop future renewals and end Premium access.",
      )
    ) {
      return;
    }
    setCancelling(true);
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error("Please sign in again to manage your subscription.");
      const response = await fetch("/api/payments/paypal-cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ subscriptionId: activeSubscription.id }),
      });
      if (!response.ok) throw new Error(await response.text());
      setActiveSubscription(null);
      toast.success("Your Premium subscription has been cancelled.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not cancel your subscription.");
    } finally {
      setCancelling(false);
    }
  }

  useEffect(() => {
    if (
      !signedIn ||
      !subscriptionLoaded ||
      activeSubscription ||
      subscriptionLoadError ||
      !PAYPAL_CLIENT_ID ||
      !PAYPAL_PLAN_ID
    )
      return;

    setStatus("loading-sdk");
    const script = document.createElement("script");
    // vault=true + intent=subscription renders both the PayPal button AND a
    // "Debit or Credit Card" button, so no separate card processor is needed.
    script.src = `https://www.paypal.com/sdk/js?client-id=${PAYPAL_CLIENT_ID}&vault=true&intent=subscription`;
    script.async = true;
    script.onload = () => {
      const paypal = (window as unknown as { paypal?: PayPalNamespace }).paypal;
      if (!paypal || !paypalRef.current) {
        setStatus("error");
        toast.error("PayPal checkout could not load. Check your connection and try again.");
        return;
      }

      paypal
        .Buttons({
          style: { shape: "pill", color: "gold", layout: "vertical", label: "subscribe" },
          createSubscription: (
            _data: unknown,
            actions: { subscription: { create: (opts: { plan_id: string }) => Promise<string> } },
          ) => actions.subscription.create({ plan_id: PAYPAL_PLAN_ID! }),
          onApprove: async (data: { subscriptionID: string }) => {
            setStatus("processing");
            try {
              const { data: sessionData } = await supabase.auth.getSession();
              const res = await fetch("/api/payments/paypal-subscribe", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${sessionData.session?.access_token}`,
                },
                body: JSON.stringify({ subscriptionId: data.subscriptionID }),
              });
              if (!res.ok) throw new Error(await res.text());
              toast.success("Welcome to Premium! Unlimited tutoring, unlocked.");
              navigate({ to: "/chat" });
            } catch (err) {
              console.error(err);
              toast.error(
                "PayPal approved the subscription, but Premium could not be activated. Contact support with your PayPal receipt.",
              );
              setStatus("error");
            }
          },
          onError: (err: unknown) => {
            console.error("PayPal error", err);
            setStatus("error");
            toast.error("Something went wrong with PayPal. Please try again.");
          },
        })
        .render(paypalRef.current);
      setStatus("ready");
    };
    script.onerror = () => {
      setStatus("error");
      toast.error("PayPal checkout could not load. Refresh the page or try again later.");
    };
    document.body.appendChild(script);
    return () => {
      if (paypalRef.current) paypalRef.current.replaceChildren();
      document.body.removeChild(script);
    };
  }, [signedIn, subscriptionLoaded, activeSubscription, subscriptionLoadError, navigate]);

  return (
    <div className="min-h-screen bg-background nesai-app-surface">
      <SiteNav />
      <div className="premium-page mx-auto max-w-5xl px-6 py-14 md:py-20">
        <div className="premium-intro">
          <div className="app-eyebrow">NESAI PREMIUM</div>
          <h1 className="mt-2 font-serif text-4xl md:text-5xl app-page-title">
            Study without limits.
          </h1>
          <p className="mt-3 text-muted-foreground">
            One monthly subscription. Cancel anytime. Pay with PayPal or a debit/credit card — both
            options appear in the checkout below.
          </p>
        </div>

        <div className="premium-card mt-10 rounded-2xl border border-border bg-card p-8">
          <div className="premium-card-heading">
            <div>
              <span className="app-eyebrow">ONE PLAN. MORE ROOM TO LEARN.</span>
              <h2>Nova Premium</h2>
            </div>
            <span className="premium-plan-badge">MONTHLY</span>
          </div>
          {activeSubscription && (
            <div className="premium-active-status" role="status">
              <div>
                <ShieldCheck size={19} />
                <span>
                  <strong>Premium is active</strong>
                  <small>
                    {activeSubscription.current_period_end
                      ? `Next renewal ${new Date(activeSubscription.current_period_end).toLocaleDateString()}`
                      : "Your subscription is active."}
                  </small>
                </span>
              </div>
              <button type="button" onClick={() => void cancelPremium()} disabled={cancelling}>
                {cancelling ? "Cancelling…" : "Cancel renewal"}
              </button>
            </div>
          )}
          <ul className="premium-perks space-y-3">
            {PERKS.map((perk) => (
              <li key={perk} className="flex items-start gap-3 text-sm">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-success)]" />
                <span>{perk}</span>
              </li>
            ))}
          </ul>

          <div className="mt-8 border-t border-border pt-8">
            {signedIn === false && (
              <p className="text-sm text-muted-foreground">
                Please{" "}
                <a href="/auth?redirect=/upgrade" className="font-medium text-foreground underline">
                  sign in
                </a>{" "}
                first to subscribe.
              </p>
            )}
            {signedIn && subscriptionLoadError && (
              <p className="text-sm text-destructive">
                We couldn’t check your subscription. Refresh the page before starting another plan.
              </p>
            )}
            {signedIn && !subscriptionLoaded && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Checking your account…
              </div>
            )}
            {signedIn &&
              subscriptionLoaded &&
              !activeSubscription &&
              !subscriptionLoadError &&
              !paymentReady && (
                <p className="text-sm text-destructive">
                  Secure checkout is being prepared. The site owner needs to add the PayPal client
                  ID and plan ID in the deployment settings.
                </p>
              )}
            {signedIn &&
              subscriptionLoaded &&
              !activeSubscription &&
              !subscriptionLoadError &&
              PAYPAL_CLIENT_ID &&
              PAYPAL_PLAN_ID && (
                <>
                  {status === "loading-sdk" && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" /> Loading secure checkout…
                    </div>
                  )}
                  <div id="paypal-button-container" ref={paypalRef} />
                  {status === "processing" && (
                    <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" /> Activating your subscription…
                    </div>
                  )}
                </>
              )}
          </div>
        </div>
      </div>
    </div>
  );
}
