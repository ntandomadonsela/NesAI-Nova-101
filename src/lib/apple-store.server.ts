import { Environment, SignedDataVerifier } from "@apple/app-store-server-library";

function appleVerifiers() {
  const encodedRoots = process.env.APPLE_ROOT_CERTIFICATES_BASE64?.trim();
  const bundleId = process.env.IOS_BUNDLE_ID?.trim();
  const appAppleId = Number(process.env.APPLE_APP_ID);
  if (!encodedRoots || !bundleId || !Number.isInteger(appAppleId)) {
    throw new Error("apple_verifier_not_configured");
  }
  const roots = encodedRoots
    .split(",")
    .map((certificate) => Buffer.from(certificate.trim(), "base64"));
  return [Environment.PRODUCTION, Environment.SANDBOX].map((environment) => ({
    environment,
    verifier: new SignedDataVerifier(
      roots,
      true,
      environment,
      bundleId,
      environment === Environment.PRODUCTION ? appAppleId : undefined,
    ),
  }));
}

export async function verifyAppleTransaction(signedTransaction: string, productId: string) {
  let lastError: unknown;
  for (const { verifier } of appleVerifiers()) {
    try {
      const transaction = await verifier.verifyAndDecodeTransaction(signedTransaction);
      if (
        transaction.productId !== productId ||
        !transaction.originalTransactionId ||
        !transaction.transactionId ||
        !transaction.expiresDate
      ) {
        throw new Error("apple_subscription_mismatch");
      }
      return {
        transactionId: transaction.originalTransactionId,
        expiresAt: new Date(transaction.expiresDate).toISOString(),
        active: !transaction.revocationDate && transaction.expiresDate > Date.now(),
      };
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError ?? new Error("apple_transaction_invalid");
}

export async function verifyAppleNotification(signedPayload: string) {
  let lastError: unknown;
  for (const { verifier, environment } of appleVerifiers()) {
    try {
      const notification = await verifier.verifyAndDecodeNotification(signedPayload);
      const transaction = notification.data?.signedTransactionInfo
        ? await verifier.verifyAndDecodeTransaction(notification.data.signedTransactionInfo)
        : null;
      return { notification, transaction, environment };
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError ?? new Error("apple_notification_invalid");
}
