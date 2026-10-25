import { Capacitor } from "@capacitor/core";
import {
  NativePurchases,
  PURCHASE_TYPE,
  type Product,
  type Transaction,
} from "@capgo/native-purchases";
import { supabase } from "@/integrations/supabase/client";
import { apiUrl } from "@/lib/api-url";

const IOS_PRODUCT_ID = import.meta.env.VITE_IOS_PREMIUM_PRODUCT_ID?.trim();
const ANDROID_PRODUCT_ID = import.meta.env.VITE_ANDROID_PREMIUM_PRODUCT_ID?.trim();
const ANDROID_BASE_PLAN_ID = import.meta.env.VITE_ANDROID_PREMIUM_BASE_PLAN_ID?.trim();

export function isNativeStudentApp(): boolean {
  return Capacitor.isNativePlatform();
}

function productConfig() {
  const platform = Capacitor.getPlatform();
  if (platform === "ios" && IOS_PRODUCT_ID) return { platform, productId: IOS_PRODUCT_ID };
  if (platform === "android" && ANDROID_PRODUCT_ID && ANDROID_BASE_PLAN_ID) {
    return { platform, productId: ANDROID_PRODUCT_ID, planId: ANDROID_BASE_PLAN_ID };
  }
  throw new Error("Mobile Premium is not configured for this store yet.");
}

export async function loadNativePremiumProduct(): Promise<Product> {
  const config = productConfig();
  const { products } = await NativePurchases.getProducts({
    productIdentifiers: [config.productId],
    productType: PURCHASE_TYPE.SUBS,
  });
  const product = products.find(
    (item) => item.identifier === config.productId || item.planIdentifier === config.productId,
  );
  if (!product) throw new Error("Premium is not available in this store yet.");
  return product;
}

export async function purchaseNativePremium(): Promise<void> {
  const config = productConfig();
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Please sign in again before purchasing Premium.");

  const transaction = await NativePurchases.purchaseProduct({
    productIdentifier: config.productId,
    productType: PURCHASE_TYPE.SUBS,
    ...(config.planId ? { planIdentifier: config.planId } : {}),
    autoAcknowledgePurchases: false,
  });
  await verifyAndFinishPurchase(transaction, token, config.platform);
}

export async function restoreNativePremium(): Promise<void> {
  const config = productConfig();
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Please sign in again before restoring Premium.");

  await NativePurchases.restorePurchases();
  const { purchases } = await NativePurchases.getPurchases({ productType: PURCHASE_TYPE.SUBS });
  const owned = purchases.find((item) => item.productIdentifier === config.productId);
  if (!owned) throw new Error("No Premium purchase was found for this store account.");
  await verifyAndFinishPurchase(owned, token, config.platform);
}

export async function manageNativePremium(): Promise<void> {
  await NativePurchases.manageSubscriptions();
}

async function verifyAndFinishPurchase(
  transaction: Transaction,
  token: string,
  platform: string,
): Promise<void> {
  const response = await fetch(apiUrl("/api/payments/mobile-subscribe"), {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      platform,
      productId: transaction.productIdentifier,
      transactionId: transaction.transactionId,
      signedTransaction: transaction.jwsRepresentation,
      purchaseToken: transaction.purchaseToken,
    }),
  });
  if (!response.ok) {
    const result = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(result.error || "The store purchase could not be verified. Please try again.");
  }
  const verification = (await response.json()) as { active?: boolean };
  if (!verification.active) {
    throw new Error(
      "This store subscription has expired. Choose a current subscription to continue.",
    );
  }

  if (platform === "ios") {
    await NativePurchases.finishTransaction({ transactionId: transaction.transactionId });
  } else if (transaction.purchaseToken) {
    await NativePurchases.acknowledgePurchase({ purchaseToken: transaction.purchaseToken });
  }
}
