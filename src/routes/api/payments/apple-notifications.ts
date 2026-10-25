import { createFileRoute } from "@tanstack/react-router";
import { verifyAppleNotification } from "@/lib/apple-store.server";

export const Route = createFileRoute("/api/payments/apple-notifications")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: { signedPayload?: string };
        try {
          body = (await request.json()) as { signedPayload?: string };
        } catch {
          return Response.json({ error: "Invalid notification payload." }, { status: 400 });
        }
        if (!body.signedPayload || body.signedPayload.length > 256_000) {
          return Response.json({ error: "Invalid notification payload." }, { status: 400 });
        }

        try {
          const { notification, transaction } = await verifyAppleNotification(body.signedPayload);
          if (!transaction) return Response.json({ ok: true, ignored: true });

          const productId = process.env.IOS_PREMIUM_PRODUCT_ID?.trim();
          if (!productId || transaction.productId !== productId) {
            return Response.json({ ok: true, ignored: true });
          }
          if (
            !transaction.originalTransactionId ||
            !transaction.expiresDate ||
            !notification.signedDate
          ) {
            return Response.json(
              { error: "Notification is missing subscription details." },
              { status: 400 },
            );
          }

          const notificationAt = new Date(notification.signedDate).toISOString();
          const notificationType = notification.notificationType ?? "";
          const subtype = notification.subtype ?? "";
          const cancellationNotice =
            notificationType === "DID_CHANGE_RENEWAL_STATUS" && subtype === "AUTO_RENEW_DISABLED";
          const immediateRevocation = [
            "REFUND",
            "REVOKE",
            "EXPIRED",
            "GRACE_PERIOD_EXPIRED",
          ].includes(notificationType);
          const entitled =
            !immediateRevocation &&
            !transaction.revocationDate &&
            transaction.expiresDate > Date.now();
          const status = entitled ? (cancellationNotice ? "cancelled" : "active") : "expired";

          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { data: subscription, error: lookupError } = await supabaseAdmin
            .from("subscriptions")
            .select("id,user_id,store_last_notification_at")
            .eq("provider", "apple")
            .eq("store_transaction_id", transaction.originalTransactionId)
            .maybeSingle();
          if (lookupError) throw new Error("apple_subscription_lookup_failed");
          if (!subscription) {
            // Apple retries non-2xx responses, allowing a purchase callback to link the row first.
            return Response.json(
              { error: "Subscription has not been linked yet." },
              { status: 503 },
            );
          }
          if (
            subscription.store_last_notification_at &&
            Date.parse(subscription.store_last_notification_at) >= notification.signedDate
          ) {
            return Response.json({ ok: true, ignored: true });
          }

          const { data: updated, error: updateError } = await supabaseAdmin
            .from("subscriptions")
            .update({
              status,
              current_period_end: new Date(transaction.expiresDate).toISOString(),
              store_last_notification_at: notificationAt,
              updated_at: new Date().toISOString(),
            })
            .eq("id", subscription.id)
            .eq("user_id", subscription.user_id)
            .or(
              `store_last_notification_at.is.null,store_last_notification_at.lt.${notificationAt}`,
            )
            .select("user_id")
            .maybeSingle();
          if (updateError) throw new Error("apple_subscription_update_failed");
          if (!updated) return Response.json({ ok: true, ignored: true });

          const { data: rows, error: entitlementError } = await supabaseAdmin
            .from("subscriptions")
            .select("status,current_period_end")
            .eq("user_id", updated.user_id);
          if (entitlementError) throw new Error("premium_entitlement_lookup_failed");
          const premiumActive = (rows ?? []).some(
            (item) =>
              ["active", "cancelled"].includes(item.status) &&
              !!item.current_period_end &&
              Date.parse(item.current_period_end) > Date.now(),
          );
          const { error: profileError } = await supabaseAdmin
            .from("profiles")
            .update({ is_premium: premiumActive })
            .eq("id", updated.user_id);
          if (profileError) throw new Error("premium_profile_update_failed");
          return Response.json({ ok: true });
        } catch (error) {
          const code = error instanceof Error ? error.message : "apple_notification_failed";
          console.error("Apple subscription notification failed", code);
          const unavailable = code.includes("not_configured");
          return Response.json(
            {
              error: unavailable
                ? "Apple notifications are not configured."
                : "Could not process notification.",
            },
            { status: unavailable ? 503 : 500 },
          );
        }
      },
    },
  },
});
