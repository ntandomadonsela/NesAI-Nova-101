// Server-only helpers for talking to PayPal's REST API.
// Never import this from a route/component file that ships to the client bundle.

const PAYPAL_API_BASE =
  process.env.PAYPAL_ENV === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";

let cachedToken: { value: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now()) {
    return cachedToken.value;
  }

  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("Missing PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET");
  }

  const res = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!res.ok) {
    throw new Error(`PayPal OAuth failed: ${res.status} ${await res.text()}`);
  }

  const data = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = { value: data.access_token, expiresAt: Date.now() + (data.expires_in - 60) * 1000 };
  return data.access_token;
}

export async function paypalFetch(path: string, init: RequestInit = {}) {
  const token = await getAccessToken();
  return fetch(`${PAYPAL_API_BASE}${path}`, {
    ...init,
    headers: {
      ...init.headers,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
}

/** Fetches full subscription details (status, plan, next billing time) from PayPal. */
export async function getSubscription(subscriptionId: string) {
  const res = await paypalFetch(`/v1/billing/subscriptions/${subscriptionId}`);
  if (!res.ok) throw new Error(`PayPal getSubscription failed: ${res.status}`);
  return res.json() as Promise<{
    id: string;
    status: string;
    plan_id: string;
    billing_info?: { next_billing_time?: string };
  }>;
}

/**
 * Verifies an incoming webhook actually came from PayPal, using PayPal's
 * own verification endpoint (safer than reimplementing signature checks).
 */
export async function verifyWebhookSignature(params: {
  headers: Headers;
  body: unknown;
  webhookId: string;
}) {
  const { headers, body, webhookId } = params;
  const res = await paypalFetch("/v1/notifications/verify-webhook-signature", {
    method: "POST",
    body: JSON.stringify({
      auth_algo: headers.get("paypal-auth-algo"),
      cert_url: headers.get("paypal-cert-url"),
      transmission_id: headers.get("paypal-transmission-id"),
      transmission_sig: headers.get("paypal-transmission-sig"),
      transmission_time: headers.get("paypal-transmission-time"),
      webhook_id: webhookId,
      webhook_event: body,
    }),
  });
  if (!res.ok) return false;
  const data = (await res.json()) as { verification_status: string };
  return data.verification_status === "SUCCESS";
}
