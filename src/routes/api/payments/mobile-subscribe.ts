import { createFileRoute } from "@tanstack/react-router";
import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { verifyAppleTransaction } from "@/lib/apple-store.server";
import { getGoogleSubscription, summarizeGoogleSubscription } from "@/lib/google-play.server";

type MobilePurchase = {
  platform?: "ios" | "android";
  productId?: string;
  transactionId?: string;
  signedTransaction?: string;
  purchaseToken?: string;
};

async function verifyGooglePurchase(purchaseToken: string, productId: string) {
  const result = await getGoogleSubscription(purchaseToken);
  const summary = summarizeGoogleSubscription(result, productId);
  return {
    transactionId: purchaseToken,
    ...summary,
  };
}

export const Route = createFileRoute("/api/payments/mobile-subscribe")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = (request.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
        if (!token)
          return Response.json({ error: "Sign in to verify your purchase." }, { status: 401 });
        let body: MobilePurchase;
        try {
          body = (await request.json()) as MobilePurchase;
        } catch {
          return Response.json({ error: "Invalid purchase data." }, { status: 400 });
        }
        if (
          !body.productId ||
          body.productId.length > 200 ||
          !["ios", "android"].includes(body.platform ?? "")
        ) {
          return Response.json({ error: "Invalid purchase data." }, { status: 400 });
        }
        const allowedProduct =
          body.platform === "ios"
            ? process.env.IOS_PREMIUM_PRODUCT_ID?.trim()
            : process.env.ANDROID_PREMIUM_PRODUCT_ID?.trim();
        if (!allowedProduct || body.productId !== allowedProduct) {
          return Response.json(
            { error: "Premium is not configured for this store product yet." },
            { status: 503 },
          );
        }
        const supabaseUrl =
          process.env.SUPABASE_URL?.trim() || process.env.VITE_SUPABASE_URL?.trim();
        const publishableKey =
          process.env.SUPABASE_PUBLISHABLE_KEY?.trim() ||
          process.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim() ||
          process.env.VITE_SUPABASE_ANON_KEY?.trim();
        if (!supabaseUrl || !publishableKey)
          return Response.json(
            { error: "Purchase verification is temporarily unavailable." },
            { status: 503 },
          );
        const userClient = createClient(supabaseUrl, publishableKey, {
          global: { headers: { Authorization: `Bearer ${token}` } },
          auth: { persistSession: false, autoRefreshToken: false },
        });
        const {
          data: { user },
          error: authError,
        } = await userClient.auth.getUser();
        if (authError || !user)
          return Response.json(
            { error: "Your session has expired. Sign in again." },
            { status: 401 },
          );

        try {
          const verified =
            body.platform === "ios"
              ? body.signedTransaction
                ? await verifyAppleTransaction(body.signedTransaction, allowedProduct)
                : null
              : body.purchaseToken
                ? await verifyGooglePurchase(body.purchaseToken, allowedProduct)
                : null;
          if (!verified)
            return Response.json(
              { error: "The app store did not provide a verifiable purchase." },
              { status: 400 },
            );
          const purchaseKey =
            body.platform === "ios"
              ? verified.transactionId
              : createHash("sha256").update(body.purchaseToken!).digest("hex");
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { data: existing, error: lookupError } = await supabaseAdmin
            .from("subscriptions")
            .select("id,user_id")
            .eq(
              body.platform === "ios" ? "store_transaction_id" : "store_purchase_token",
              purchaseKey,
            )
            .maybeSingle();
          if (lookupError) throw new Error("subscription_lookup_failed");
          if (existing && existing.user_id !== user.id)
            return Response.json(
              { error: "This store purchase is linked to another account." },
              { status: 409 },
            );
          const values = {
            user_id: user.id,
            provider: body.platform === "ios" ? "apple" : "google",
            store_product_id: allowedProduct,
            store_transaction_id: body.platform === "ios" ? verified.transactionId : null,
            store_purchase_token: body.platform === "android" ? purchaseKey : null,
            status: verified.active ? "active" : "expired",
            current_period_end: verified.expiresAt,
            updated_at: new Date().toISOString(),
          };
          const write = existing
            ? await supabaseAdmin
                .from("subscriptions")
                .update(values)
                .eq("id", existing.id)
                .eq("user_id", user.id)
            : await supabaseAdmin.from("subscriptions").insert(values);
          if (write.error) throw new Error("subscription_save_failed");
          const { data: entitledRows, error: entitlementError } = await supabaseAdmin
            .from("subscriptions")
            .select("status,current_period_end")
            .eq("user_id", user.id);
          if (entitlementError) throw new Error("subscription_entitlement_lookup_failed");
          const hasPremium = (entitledRows ?? []).some(
            (item) =>
              (item.status === "active" || item.status === "cancelled") &&
              !!item.current_period_end &&
              Date.parse(item.current_period_end) > Date.now(),
          );
          const { error: profileError } = await supabaseAdmin
            .from("profiles")
            .update({ is_premium: hasPremium })
            .eq("id", user.id);
          if (profileError) throw new Error("premium_update_failed");
          return Response.json({
            ok: true,
            active: verified.active,
            currentPeriodEnd: verified.expiresAt,
          });
        } catch (error) {
          const code = error instanceof Error ? error.message : "verification_failed";
          console.error("Mobile store verification failed", code);
          const unavailable = code.includes("not_configured");
          return Response.json(
            {
              error: unavailable
                ? "Store verification is not configured yet."
                : "The app store could not verify this purchase. Please try again.",
            },
            { status: unavailable ? 503 : 502 },
          );
        }
      },
    },
  },
});
