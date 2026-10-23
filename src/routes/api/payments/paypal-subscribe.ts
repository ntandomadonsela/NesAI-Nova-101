import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { getPlan, getSubscription, hasPaidR50MonthlyCycle, isR50MonthlyPlan } from "@/lib/paypal.server";

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
        if (!body.subscriptionId || body.subscriptionId.length > 64) return new Response("Bad request", { status: 400 });

        const configuredPlan = process.env.PAYPAL_PLAN_ID?.trim() || process.env.VITE_PAYPAL_PLAN_ID?.trim();
        if (!configuredPlan) {
          console.error("Missing PAYPAL_PLAN_ID for Premium activation");
          return new Response("Premium checkout is not configured", { status: 503 });
        }

        let details;
        let plan;
        try {
          details = await getSubscription(body.subscriptionId);
          plan = await getPlan(configuredPlan);
        } catch (err) {
          console.error("PayPal verify failed", err);
          return new Response("Could not verify subscription with PayPal", { status: 502 });
        }

        if (
          details.id !== body.subscriptionId ||
          details.plan_id !== configuredPlan ||
          plan.id !== configuredPlan ||
          !isR50MonthlyPlan(plan) ||
          details.plan_overridden === true
        ) {
          return new Response("Subscription plan does not match this product", { status: 402 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: existing, error: lookupError } = await supabaseAdmin
          .from("subscriptions")
          .select("id,user_id")
          .eq("paypal_subscription_id", details.id)
          .maybeSingle();
        if (lookupError) {
          console.error("Could not check Premium subscription ownership", lookupError);
          return new Response("Could not verify the Premium account", { status: 500 });
        }
        if (existing && existing.user_id !== userData.user.id) {
          return new Response("This PayPal subscription is already linked to another account", { status: 409 });
        }
        if (!existing) {
          const { error: insertError } = await supabaseAdmin.from("subscriptions").insert({
            user_id: userData.user.id,
            provider: "paypal",
            paypal_subscription_id: details.id,
            paypal_plan_id: details.plan_id,
            status: "pending",
            current_period_end: details.billing_info?.next_billing_time ?? null,
            updated_at: new Date().toISOString(),
          });
          if (insertError) {
            // A concurrent callback may have inserted the same id. Never use an
            // upsert that could transfer another user's PayPal subscription.
            const { data: raced, error: raceLookupError } = await supabaseAdmin
              .from("subscriptions")
              .select("id,user_id")
              .eq("paypal_subscription_id", details.id)
              .maybeSingle();
            if (raceLookupError || raced?.user_id !== userData.user.id) {
              return new Response("This PayPal subscription could not be linked safely", { status: 409 });
            }
          }
        }

        if (!hasPaidR50MonthlyCycle(details)) {
          return Response.json({ ok: true, pending: true, subscriptionId: details.id }, { status: 202 });
        }

        const { error: subscriptionError } = await supabaseAdmin
          .from("subscriptions")
          .update({
            status: "active",
            current_period_end: details.billing_info?.next_billing_time ?? null,
            updated_at: new Date().toISOString(),
          })
          .eq("paypal_subscription_id", details.id)
          .eq("user_id", userData.user.id);
        if (subscriptionError) {
          console.error("Could not activate verified PayPal subscription", subscriptionError);
          return new Response("Could not activate Premium. Please contact support.", { status: 500 });
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

        return Response.json({ ok: true, pending: false });
      },
    },
  },
});
