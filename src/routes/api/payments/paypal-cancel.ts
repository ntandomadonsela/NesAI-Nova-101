import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { paypalFetch } from "@/lib/paypal.server";

export const Route = createFileRoute("/api/payments/paypal-cancel")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = (request.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
        if (!token) return new Response("Unauthorized", { status: 401 });

        const supabaseUrl = process.env.SUPABASE_URL;
        const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;
        if (!supabaseUrl || !publishableKey) {
          return new Response("Account service is not configured", { status: 503 });
        }

        let body: { subscriptionId?: string };
        try {
          body = (await request.json()) as { subscriptionId?: string };
        } catch {
          return new Response("Bad request", { status: 400 });
        }
        if (!body.subscriptionId) return new Response("Bad request", { status: 400 });

        const userClient = createClient(supabaseUrl, publishableKey, {
          global: { headers: { Authorization: `Bearer ${token}` } },
          auth: { persistSession: false, autoRefreshToken: false },
        });
        const { data: userData, error: userError } = await userClient.auth.getUser();
        if (userError || !userData.user) return new Response("Unauthorized", { status: 401 });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: subscription, error: lookupError } = await supabaseAdmin
          .from("subscriptions")
          .select("id, user_id, paypal_subscription_id")
          .eq("id", body.subscriptionId)
          .eq("user_id", userData.user.id)
          .eq("provider", "paypal")
          .eq("status", "active")
          .maybeSingle();
        if (lookupError) {
          console.error("Could not find the user's PayPal subscription", lookupError);
          return new Response("Could not load subscription", { status: 500 });
        }
        if (!subscription?.paypal_subscription_id) {
          return new Response("Active subscription not found", { status: 404 });
        }

        try {
          const paypalResponse = await paypalFetch(
            `/v1/billing/subscriptions/${subscription.paypal_subscription_id}/cancel`,
            { method: "POST", body: JSON.stringify({ reason: "Cancelled by subscriber" }) },
          );
          if (!paypalResponse.ok) {
            console.error("PayPal subscription cancellation failed", paypalResponse.status);
            return new Response("PayPal could not cancel this subscription", { status: 502 });
          }
        } catch (error) {
          console.error("PayPal cancellation request failed", error);
          return new Response("Could not reach PayPal", { status: 502 });
        }

        const { error: updateError } = await supabaseAdmin
          .from("subscriptions")
          .update({ status: "cancelled", updated_at: new Date().toISOString() })
          .eq("id", subscription.id)
          .eq("user_id", userData.user.id);
        if (updateError) {
          console.error(
            "PayPal cancelled but local subscription state failed to update",
            updateError,
          );
          return new Response(
            "PayPal cancelled the plan, but the app could not refresh its status",
            {
              status: 500,
            },
          );
        }

        const { error: profileError } = await supabaseAdmin
          .from("profiles")
          .update({ is_premium: false })
          .eq("id", userData.user.id);
        if (profileError) {
          console.error("Could not update premium profile after cancellation", profileError);
          return new Response("The plan was cancelled, but the account could not be updated", {
            status: 500,
          });
        }

        return Response.json({ ok: true });
      },
    },
  },
});
