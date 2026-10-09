import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { getSubscription } from "@/lib/paypal.server";

export const Route = createFileRoute("/api/payments/paypal-subscribe")({
  server: {
    handlers: {
      // Called from the browser right after the PayPal buttons' onApprove fires.
      // We double-check the subscription with PayPal directly rather than trusting
      // the client — the webhook is still the source of truth for renewals/cancellations.
      POST: async ({ request }) => {
        const authHeader = request.headers.get("authorization") ?? "";
        const token = authHeader.replace(/^Bearer\s+/i, "");
        if (!token) return new Response("Unauthorized", { status: 401 });

        const supabaseUrl = process.env.SUPABASE_URL;
        const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;
        if (!supabaseUrl || !publishableKey) {
          console.error("Missing server Supabase URL or publishable key for payment activation");
          return new Response("Account service is not configured", { status: 503 });
        }
        const supabase = createClient(supabaseUrl, publishableKey, {
          global: { headers: { Authorization: `Bearer ${token}` } },
          auth: { persistSession: false, autoRefreshToken: false },
        });

        const { data: userData, error: userErr } = await supabase.auth.getUser();
        if (userErr || !userData.user) return new Response("Unauthorized", { status: 401 });

        let body: { subscriptionId?: string };
        try {
          body = (await request.json()) as { subscriptionId?: string };
        } catch {
          return new Response("Bad request", { status: 400 });
        }
        if (!body.subscriptionId) return new Response("Bad request", { status: 400 });

        let details;
        try {
          details = await getSubscription(body.subscriptionId);
        } catch (err) {
          console.error("PayPal verify failed", err);
          return new Response("Could not verify subscription with PayPal", { status: 502 });
        }

        if (details.id !== body.subscriptionId) {
          return new Response("Subscription verification failed", { status: 402 });
        }
        const configuredPlan = process.env.VITE_PAYPAL_PLAN_ID;
        if (configuredPlan && details.plan_id !== configuredPlan) {
          return new Response("Subscription plan does not match this product", { status: 402 });
        }
        const isActive = details.status === "ACTIVE" || details.status === "APPROVED";
        if (!isActive) {
          return new Response(JSON.stringify({ error: `Subscription status: ${details.status}` }), {
            status: 402,
            headers: { "Content-Type": "application/json" },
          });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { error: subscriptionError } = await supabaseAdmin.from("subscriptions").upsert(
          {
            user_id: userData.user.id,
            provider: "paypal",
            paypal_subscription_id: details.id,
            paypal_plan_id: details.plan_id,
            status: "active",
            current_period_end: details.billing_info?.next_billing_time ?? null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "paypal_subscription_id" },
        );
        if (subscriptionError) {
          console.error("Could not save PayPal subscription", subscriptionError);
          return new Response("Could not activate Premium. Please contact support.", {
            status: 500,
          });
        }
        const { error: profileError } = await supabaseAdmin
          .from("profiles")
          .update({ is_premium: true })
          .eq("id", userData.user.id);
        if (profileError) {
          console.error("Could not update premium profile", profileError);
          return new Response("Could not activate Premium. Please contact support.", {
            status: 500,
          });
        }

        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});
