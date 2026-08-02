import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SiteNav } from "@/components/site-nav";
import { Check, Loader2 } from "lucide-react";
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

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSignedIn(!!data.session));
  }, []);

  useEffect(() => {
    if (!signedIn || !PAYPAL_CLIENT_ID || !PAYPAL_PLAN_ID) return;

    setStatus("loading-sdk");
    const script = document.createElement("script");
    // vault=true + intent=subscription renders both the PayPal button AND a
    // "Debit or Credit Card" button, so no separate card processor is needed.
    script.src = `https://www.paypal.com/sdk/js?client-id=${PAYPAL_CLIENT_ID}&vault=true&intent=subscription`;
    script.async = true;
    script.onload = () => {
      const paypal = (window as unknown as { paypal?: PayPalNamespace }).paypal;
      if (!paypal || !paypalRef.current) return;

      paypal
        .Buttons({
          style: { shape: "pill", color: "gold", layout: "vertical", label: "subscribe" },
          createSubscription: (_data: unknown, actions: { subscription: { create: (opts: { plan_id: string }) => Promise<string> } }) =>
            actions.subscription.create({ plan_id: PAYPAL_PLAN_ID! }),
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
              toast.error("We took your payment but couldn't activate Premium — contact support.");
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
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, [signedIn, navigate]);

  return (
    <div className="min-h-screen bg-background">
      <SiteNav />
      <div className="mx-auto max-w-2xl px-6 py-16">
        <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Premium</div>
        <h1 className="mt-2 font-serif text-4xl md:text-5xl">Study without limits.</h1>
        <p className="mt-3 text-muted-foreground">
          One monthly subscription. Cancel anytime. Pay with PayPal or a debit/credit card — both
          options appear in the checkout below.
        </p>

        <div className="mt-10 rounded-2xl border border-border bg-card p-8">
          <ul className="space-y-3">
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
            {signedIn && !PAYPAL_CLIENT_ID && (
              <p className="text-sm text-destructive">
                Payments aren't configured yet — set VITE_PAYPAL_CLIENT_ID and VITE_PAYPAL_PLAN_ID.
              </p>
            )}
            {signedIn && PAYPAL_CLIENT_ID && (
              <>
                {status === "loading-sdk" && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /> Loading secure checkout…
                  </div>
                )}
                <div ref={paypalRef} />
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
