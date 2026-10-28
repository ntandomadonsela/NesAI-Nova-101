/** Keep backend diagnostics out of student-facing messages. */
export function userFacingError(error: unknown, fallback: string) {
  const candidate = error as { code?: string; status?: number; message?: string } | null;
  const message = candidate?.message?.toLowerCase() ?? "";
  if (message.includes("redirect") && (message.includes("allow") || message.includes("url"))) {
    return "We couldn’t open that email link. Please request a new link and try again.";
  }
  if (
    candidate?.code === "user_banned" ||
    message.includes("user is banned") ||
    message.includes("user has been banned")
  ) {
    return "We couldn’t sign you in. Please contact NesAI support for help with your account.";
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
