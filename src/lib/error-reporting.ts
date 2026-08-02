// Client-side error reporting hook. Wire this up to whatever error-tracking
// service you use (Sentry, Bugsnag, a custom endpoint, etc.) by filling in
// `sendToErrorTracker` below. Left as a console log by default.

export function reportError(error: unknown, context: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;

  const message =
    error instanceof Response
      ? `Response ${error.status}${error.url ? ` at ${error.url}` : ""}`
      : error instanceof Error
        ? error.message
        : String(error);

  const payload = {
    message,
    stack: error instanceof Error ? error.stack : undefined,
    route: window.location.pathname,
    ...context,
  };

  sendToErrorTracker(payload);
}

function sendToErrorTracker(payload: {
  message: string;
  stack?: string;
  route: string;
  [key: string]: unknown;
}) {
  // TODO: replace with your error-tracking integration.
  console.error("[error-reporting]", payload);
}
