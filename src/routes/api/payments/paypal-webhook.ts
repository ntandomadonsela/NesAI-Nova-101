import { createFileRoute } from "@tanstack/react-router";
import { verifyWebhookSignature, getSubscription } from "@/lib/paypal.server";

// Events that mean "the user should have premium access right now".
const ACTIVE_STATUSES = new Set(["BILLING.SUBSCRIPTION.ACTIVATED", "PAYMENT.SALE.COMPLETED"]);
// Events that mean access should be revoked.
const INACTIVE_EVENTS = new Set([
  "BILLING.SUBSCRIPTION.CANCELLED",
  "BILLING.SUBSCRIPTION.EXPIRED",
  "BILLING.SUBSCRIPTION.SUSPENDED",
  "PAYMENT.SALE.REFUNDED",
]);

export const Route = createFileRoute("/api/payments/paypal-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const webhookId = process.env.PAYPAL_WEBHOOK_ID;
        if (!webhookId) {
          console.error("Missing PAYPAL_WEBHOOK_ID");
          return new Response("Server not configured", { status: 500 });
        }

        const event = await request.json();

        const verified = await verifyWebhookSignature({
          headers: request.headers,
          body: event,
          webhookId,
        });
        if (!verified) {
          console.error("PayPal webhook signature verification failed");
          return new Response("Invalid signature", { status: 400 });
        }

        const eventType: string = event.event_type;
        const resource = event.resource ?? {};
        // For BILLING.SUBSCRIPTION.* events, resource.id IS the subscription id.
        // For PAYMENT.SALE.* events, the subscription id lives in billing_agreement_id.
        const subscriptionId: string | undefined =
          resource.billing_agreement_id ??
          (eventType.startsWith("BILLING.SUBSCRIPTION") ? resource.id : undefined);

        if (!subscriptionId) {
          // Nothing we can tie back to a user — acknowledge and move on.
          return new Response("OK (ignored)", { status: 200 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const { data: sub } = await supabaseAdmin
          .from("subscriptions")
          .select("id, user_id")
          .eq("paypal_subscription_id", subscriptionId)
          .maybeSingle();

        if (!sub) {
          console.warn(`Webhook for unknown subscription ${subscriptionId}`);
          return new Response("OK (unknown subscription)", { status: 200 });
        }

        if (ACTIVE_STATUSES.has(eventType)) {
          let currentPeriodEnd: string | null = null;
          try {
            const details = await getSubscription(subscriptionId);
            currentPeriodEnd = details.billing_info?.next_billing_time ?? null;
          } catch (err) {
            console.error("Could not refresh subscription details", err);
          }

          await supabaseAdmin
            .from("subscriptions")
            .update({
              status: "active",
              current_period_end: currentPeriodEnd,
              updated_at: new Date().toISOString(),
            })
            .eq("id", sub.id);
          await supabaseAdmin.from("profiles").update({ is_premium: true }).eq("id", sub.user_id);
        } else if (INACTIVE_EVENTS.has(eventType)) {
          await supabaseAdmin
            .from("subscriptions")
            .update({ status: "cancelled", updated_at: new Date().toISOString() })
            .eq("id", sub.id);
          await supabaseAdmin.from("profiles").update({ is_premium: false }).eq("id", sub.user_id);
        }

        return new Response("OK", { status: 200 });
      },
    },
  },
});
