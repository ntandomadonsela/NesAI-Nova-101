import { createFileRoute } from "@tanstack/react-router";
import {
  getPlan,
  getSubscription,
  hasPaidR50MonthlyCycle,
  isR50MonthlyPlan,
  verifyWebhookSignature,
} from "@/lib/paypal.server";

const PAID_EVENTS = new Set(["BILLING.SUBSCRIPTION.ACTIVATED", "PAYMENT.SALE.COMPLETED"]);
const PAYMENT_FAILURE_EVENTS = new Set(["BILLING.SUBSCRIPTION.PAYMENT.FAILED"]);
const REVOKE_EVENTS = new Map<string, string>([
  ["BILLING.SUBSCRIPTION.CANCELLED", "cancelled"],
  ["BILLING.SUBSCRIPTION.EXPIRED", "expired"],
  ["BILLING.SUBSCRIPTION.SUSPENDED", "suspended"],
  ["PAYMENT.SALE.REFUNDED", "refunded"],
  ["PAYMENT.SALE.REVERSED", "reversed"],
]);

export const Route = createFileRoute("/api/payments/paypal-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const webhookId = process.env.PAYPAL_WEBHOOK_ID?.trim();
        if (!webhookId) {
          console.error("Missing PAYPAL_WEBHOOK_ID");
          return new Response("Server not configured", { status: 500 });
        }

        let event: {
          event_type?: string;
          resource?: {
            id?: string;
            billing_agreement_id?: string;
            amount?: { value?: string; currency?: string };
            state?: string;
          };
        };
        try {
          event = (await request.json()) as typeof event;
        } catch {
          return new Response("Bad request", { status: 400 });
        }
        if (typeof event.event_type !== "string" || !event.resource) {
          return new Response("Bad request", { status: 400 });
        }

        const verified = await verifyWebhookSignature({
          headers: request.headers,
          body: event,
          webhookId,
        });
        if (!verified) return new Response("Invalid signature", { status: 400 });

        const eventType = event.event_type;
        const resource = event.resource;
        const subscriptionId =
          resource.billing_agreement_id ??
          (eventType.startsWith("BILLING.SUBSCRIPTION") ? resource.id : undefined);
        if (!subscriptionId || subscriptionId.length > 64) return new Response("OK (ignored)");

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: subscription, error: lookupError } = await supabaseAdmin
          .from("subscriptions")
          .select("id,user_id,paypal_plan_id,current_period_end")
          .eq("paypal_subscription_id", subscriptionId)
          .maybeSingle();
        if (lookupError) {
          console.error("Could not find Premium subscription for verified webhook", lookupError);
          return new Response("Could not load subscription", { status: 500 });
        }
        if (!subscription) return new Response("OK (unknown subscription)");

        if (PAID_EVENTS.has(eventType)) {
          const configuredPlan = process.env.PAYPAL_PLAN_ID?.trim() || process.env.VITE_PAYPAL_PLAN_ID?.trim();
          if (!configuredPlan || subscription.paypal_plan_id !== configuredPlan) {
            console.error("Premium webhook plan does not match configured plan");
            return new Response("Subscription plan mismatch", { status: 400 });
          }

          try {
            const [details, plan] = await Promise.all([
              getSubscription(subscriptionId),
              getPlan(configuredPlan),
            ]);
            if (
              details.id !== subscriptionId ||
              details.plan_id !== configuredPlan ||
              details.plan_overridden === true ||
              !isR50MonthlyPlan(plan)
            ) {
              console.error("Premium webhook did not match the configured R50 monthly plan");
              return new Response("Subscription plan mismatch", { status: 400 });
            }

            const paidSale =
              eventType === "PAYMENT.SALE.COMPLETED" &&
              resource.state === "completed" &&
              resource.amount?.currency === "ZAR" &&
              Number(resource.amount.value) === 50;
            if (details.status !== "ACTIVE" || (!hasPaidR50MonthlyCycle(details) && !paidSale)) {
              // An activation notice can precede the successful first charge.
              // Keep the row pending until PayPal confirms the amount was paid.
              return new Response("OK (payment pending)");
            }

            const { error: updateError } = await supabaseAdmin
              .from("subscriptions")
              .update({
                status: "active",
                current_period_end: details.billing_info?.next_billing_time ?? null,
                updated_at: new Date().toISOString(),
              })
              .eq("id", subscription.id)
              .eq("user_id", subscription.user_id);
            if (updateError) throw updateError;
          } catch (error) {
            console.error("Could not confirm paid Premium subscription", error);
            return new Response("Could not reconcile payment", { status: 500 });
          }
        } else if (PAYMENT_FAILURE_EVENTS.has(eventType)) {
          const { error } = await supabaseAdmin
            .from("subscriptions")
            .update({ status: "past_due", updated_at: new Date().toISOString() })
            .eq("id", subscription.id);
          if (error) {
            console.error("Could not update failed Premium payment", error);
            return new Response("Could not update subscription", { status: 500 });
          }
        } else if (REVOKE_EVENTS.has(eventType)) {
          const { error } = await supabaseAdmin
            .from("subscriptions")
            .update({ status: REVOKE_EVENTS.get(eventType), updated_at: new Date().toISOString() })
            .eq("id", subscription.id);
          if (error) {
            console.error("Could not update Premium subscription status", error);
            return new Response("Could not update subscription", { status: 500 });
          }
        } else {
          return new Response("OK (ignored)");
        }

        const { data: remaining, error: remainingError } = await supabaseAdmin
          .from("subscriptions")
          .select("status,current_period_end")
          .eq("user_id", subscription.user_id)
          .in("status", ["active", "cancelled"]);
        if (remainingError) {
          console.error("Could not refresh Premium access", remainingError);
          return new Response("Could not refresh account access", { status: 500 });
        }
        const premiumActive = (remaining ?? []).some(
          (item) =>
            item.status === "active" ||
            (item.status === "cancelled" &&
              Boolean(item.current_period_end) &&
              Date.parse(item.current_period_end!) > Date.now()),
        );
        const { error: profileError } = await supabaseAdmin
          .from("profiles")
          .update({ is_premium: premiumActive })
          .eq("id", subscription.user_id);
        if (profileError) {
          console.error("Could not synchronize verified Premium access", profileError);
          return new Response("Could not refresh account access", { status: 500 });
        }
        return new Response("OK");
      },
    },
  },
});
