import { createFileRoute } from "@tanstack/react-router";
import {
  createPublicKey,
  verify as verifySignature,
  type JsonWebKey as CryptoJsonWebKey,
} from "node:crypto";
import { createHash } from "node:crypto";
import { getGoogleSubscription, summarizeGoogleSubscription } from "@/lib/google-play.server";

type GoogleJwk = CryptoJsonWebKey & { kid?: string; alg?: string };
let googleKeysCache: { keys: GoogleJwk[]; expiresAt: number } | null = null;

function decodeJwtPart<T>(part: string): T {
  return JSON.parse(Buffer.from(part, "base64url").toString("utf8")) as T;
}

async function verifyPubSubOidcToken(token: string): Promise<void> {
  const audience = process.env.GOOGLE_PUBSUB_AUDIENCE?.trim();
  const expectedEmail = process.env.GOOGLE_PUBSUB_SERVICE_ACCOUNT_EMAIL?.trim();
  if (!audience || !expectedEmail) throw new Error("google_pubsub_not_configured");
  const [encodedHeader, encodedPayload, encodedSignature, extra] = token.split(".");
  if (!encodedHeader || !encodedPayload || !encodedSignature || extra) {
    throw new Error("google_pubsub_token_invalid");
  }
  const header = decodeJwtPart<{ alg?: string; kid?: string }>(encodedHeader);
  const claims = decodeJwtPart<{
    aud?: string | string[];
    email?: string;
    email_verified?: boolean;
    exp?: number;
    iat?: number;
    iss?: string;
  }>(encodedPayload);
  const audiences = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
  const now = Math.floor(Date.now() / 1000);
  if (
    header.alg !== "RS256" ||
    (claims.iss !== "https://accounts.google.com" && claims.iss !== "accounts.google.com") ||
    !audiences.includes(audience) ||
    claims.email !== expectedEmail ||
    claims.email_verified !== true ||
    !claims.exp ||
    claims.exp <= now ||
    !claims.iat ||
    claims.iat > now + 60 ||
    now - claims.iat > 3600
  ) {
    throw new Error("google_pubsub_token_invalid");
  }

  if (!googleKeysCache || googleKeysCache.expiresAt <= Date.now()) {
    const response = await fetch("https://www.googleapis.com/oauth2/v3/certs");
    if (!response.ok) throw new Error("google_pubsub_keys_unavailable");
    const jwks = (await response.json()) as { keys?: GoogleJwk[] };
    if (!jwks.keys?.length) throw new Error("google_pubsub_keys_unavailable");
    const maxAge = Number(
      response.headers.get("cache-control")?.match(/max-age=(\d+)/i)?.[1] ?? 300,
    );
    googleKeysCache = { keys: jwks.keys, expiresAt: Date.now() + maxAge * 1000 };
  }
  const jwk = googleKeysCache.keys.find((key) => key.kid === header.kid && key.alg === "RS256");
  if (!jwk) throw new Error("google_pubsub_signing_key_missing");
  const valid = verifySignature(
    "RSA-SHA256",
    Buffer.from(`${encodedHeader}.${encodedPayload}`),
    createPublicKey({ key: jwk, format: "jwk" }),
    Buffer.from(encodedSignature, "base64url"),
  );
  if (!valid) throw new Error("google_pubsub_signature_invalid");
}

export const Route = createFileRoute("/api/payments/google-notifications")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const bearer = (request.headers.get("authorization") ?? "").match(/^Bearer\s+(.+)$/i)?.[1];
        if (!bearer) return Response.json({ error: "Unauthorized." }, { status: 401 });
        try {
          await verifyPubSubOidcToken(bearer);
          const rawBody = await request.text();
          if (rawBody.length > 128_000)
            return Response.json({ error: "Request too large." }, { status: 413 });
          const body = JSON.parse(rawBody) as {
            message?: {
              data?: string;
              publishTime?: string;
              messageId?: string;
            };
          };
          const encodedData = body.message?.data;
          if (!encodedData)
            return Response.json({ error: "Invalid Pub/Sub message." }, { status: 400 });
          const data = JSON.parse(Buffer.from(encodedData, "base64").toString("utf8")) as {
            packageName?: string;
            subscriptionNotification?: {
              subscriptionId?: string;
              purchaseToken?: string;
            };
            testNotification?: unknown;
          };
          if (data.testNotification) return Response.json({ ok: true });

          const packageName = process.env.ANDROID_PACKAGE_NAME?.trim();
          const productId = process.env.ANDROID_PREMIUM_PRODUCT_ID?.trim();
          const event = data.subscriptionNotification;
          if (!packageName || !productId) throw new Error("google_verifier_not_configured");
          if (
            data.packageName !== packageName ||
            event?.subscriptionId !== productId ||
            !event.purchaseToken
          ) {
            return Response.json(
              { error: "Notification does not match this app subscription." },
              { status: 400 },
            );
          }

          const subscription = await getGoogleSubscription(event.purchaseToken);
          const verified = summarizeGoogleSubscription(subscription, productId);
          const notificationAt = body.message?.publishTime
            ? new Date(body.message.publishTime).toISOString()
            : null;
          if (!notificationAt) throw new Error("google_pubsub_publish_time_missing");
          const purchaseHash = createHash("sha256").update(event.purchaseToken).digest("hex");
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { data: linked, error: lookupError } = await supabaseAdmin
            .from("subscriptions")
            .select("id,user_id,store_last_notification_at")
            .eq("provider", "google")
            .eq("store_purchase_token", purchaseHash)
            .maybeSingle();
          if (lookupError) throw new Error("google_subscription_lookup_failed");
          if (!linked)
            return Response.json(
              { error: "Subscription has not been linked yet." },
              { status: 503 },
            );
          const receivedAt = Date.parse(notificationAt);
          if (
            linked.store_last_notification_at &&
            Date.parse(linked.store_last_notification_at) >= receivedAt
          ) {
            return Response.json({ ok: true, ignored: true });
          }

          const wasCancelled = subscription.subscriptionState === "SUBSCRIPTION_STATE_CANCELED";
          const { data: updated, error: updateError } = await supabaseAdmin
            .from("subscriptions")
            .update({
              status: verified.active ? (wasCancelled ? "cancelled" : "active") : "expired",
              current_period_end: verified.expiresAt,
              store_last_notification_at: notificationAt,
              updated_at: new Date().toISOString(),
            })
            .eq("id", linked.id)
            .eq("user_id", linked.user_id)
            .or(
              `store_last_notification_at.is.null,store_last_notification_at.lt.${notificationAt}`,
            )
            .select("user_id")
            .maybeSingle();
          if (updateError) throw new Error("google_subscription_update_failed");
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
          const code = error instanceof Error ? error.message : "google_notification_failed";
          console.error("Google Play subscription notification failed", code);
          const unavailable = code.includes("not_configured");
          return Response.json(
            {
              error: unavailable
                ? "Google Play notifications are not configured."
                : "Could not process notification.",
            },
            { status: unavailable ? 503 : 500 },
          );
        }
      },
    },
  },
});
