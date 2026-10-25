import { createSign } from "node:crypto";

function base64url(value: string | Buffer): string {
  return Buffer.from(value).toString("base64url");
}

export async function googleAccessToken(): Promise<string> {
  const rawServiceAccount = process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON?.trim();
  if (!rawServiceAccount) throw new Error("google_verifier_not_configured");
  const account = JSON.parse(rawServiceAccount) as { client_email?: string; private_key?: string };
  if (!account.client_email || !account.private_key) throw new Error("invalid_google_verifier");
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = base64url(
    JSON.stringify({
      iss: account.client_email,
      scope: "https://www.googleapis.com/auth/androidpublisher",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    }),
  );
  const signingInput = `${header}.${claims}`;
  const signer = createSign("RSA-SHA256");
  signer.update(signingInput);
  signer.end();
  const assertion = `${signingInput}.${signer.sign(account.private_key).toString("base64url")}`;
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  if (!response.ok) throw new Error("google_auth_failed");
  const tokenResponse = (await response.json()) as { access_token?: string };
  if (!tokenResponse.access_token) throw new Error("google_auth_failed");
  return tokenResponse.access_token;
}

export async function getGoogleSubscription(purchaseToken: string) {
  const packageName = process.env.ANDROID_PACKAGE_NAME?.trim();
  if (!packageName) throw new Error("google_verifier_not_configured");
  const accessToken = await googleAccessToken();
  const url = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${encodeURIComponent(packageName)}/purchases/subscriptionsv2/tokens/${encodeURIComponent(purchaseToken)}`;
  const response = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!response.ok) throw new Error("google_purchase_invalid");
  return (await response.json()) as {
    subscriptionState?: string;
    lineItems?: Array<{
      productId?: string;
      expiryTime?: string;
      offerDetails?: { basePlanId?: string };
    }>;
  };
}

export function summarizeGoogleSubscription(
  subscription: Awaited<ReturnType<typeof getGoogleSubscription>>,
  productId: string,
) {
  const basePlanId = process.env.ANDROID_PREMIUM_BASE_PLAN_ID?.trim();
  if (!basePlanId) throw new Error("google_verifier_not_configured");
  const lineItem = subscription.lineItems?.find(
    (item) =>
      item.productId === productId &&
      item.offerDetails?.basePlanId === basePlanId &&
      item.expiryTime,
  );
  if (!lineItem?.expiryTime) throw new Error("google_subscription_missing");
  return {
    expiresAt: lineItem.expiryTime,
    active:
      [
        "SUBSCRIPTION_STATE_ACTIVE",
        "SUBSCRIPTION_STATE_IN_GRACE_PERIOD",
        "SUBSCRIPTION_STATE_CANCELED",
      ].includes(subscription.subscriptionState ?? "") &&
      Date.parse(lineItem.expiryTime) > Date.now(),
  };
}
