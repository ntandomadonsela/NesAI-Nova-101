/** Replace service and database diagnostics with clear messages for students. */
export function userFacingError(error: unknown, fallback: string) {
  const candidate = error as { code?: string; status?: number; message?: string } | null;
  const message = candidate?.message?.toLowerCase() ?? "";
  if (message.includes("redirect") && (message.includes("allow") || message.includes("url"))) {
    return "The account email link is blocked by the Supabase redirect settings. Please contact NesAI support.";
  }
  if (
    candidate?.status === 429 ||
    message.includes("email rate limit") ||
    message.includes("over_email_send_rate_limit") ||
    message.includes("error sending") ||
    message.includes("smtp") ||
    message.includes("mailer")
  ) {
    return "We couldn’t send your email right now. Please wait a few minutes and try again. If it still doesn’t arrive, contact support.";
  }
  if (message.includes("email not confirmed") || message.includes("email_not_confirmed")) {
    return "Your email address is not confirmed yet. Request another confirmation email and check your inbox.";
  }
  if (message.includes("invalid login credentials") || message.includes("invalid_credentials")) {
    return "The email or password is incorrect. Check your details and try again.";
  }
  if (candidate?.code === "23505" || message.includes("already registered")) {
    return "An account with this email already exists. Sign in or use the password reset option.";
  }
  if (candidate?.status === 401 || candidate?.status === 403 || candidate?.code === "42501") {
    return "Your session may have expired or this action is unavailable for your account. Sign in again and try once more.";
  }
  return fallback;
}
