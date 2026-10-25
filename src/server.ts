import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isH3SwallowedErrorBody(body)) return response;

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isH3SwallowedErrorBody(body: string): boolean {
  try {
    const payload = JSON.parse(body) as { unhandled?: unknown; message?: unknown };
    return payload.unhandled === true && payload.message === "HTTPError";
  } catch {
    return false;
  }
}

const DEFAULT_MOBILE_API_ORIGINS = new Set(["capacitor://localhost", "https://localhost"]);

function withMobileApiCors(request: Request, response: Response): Response {
  const requestUrl = new URL(request.url);
  if (!requestUrl.pathname.startsWith("/api/")) return response;

  const origin = request.headers.get("origin");
  if (!origin) return response;

  const configuredOrigins = process.env.MOBILE_APP_CORS_ORIGINS?.split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  const allowedOrigins = configuredOrigins?.length
    ? new Set(configuredOrigins)
    : DEFAULT_MOBILE_API_ORIGINS;
  if (!allowedOrigins.has(origin)) return response;

  const headers = new Headers(response.headers);
  headers.set("Access-Control-Allow-Origin", origin);
  headers.set("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Authorization, Content-Type");
  headers.set("Access-Control-Max-Age", "600");

  const vary = headers.get("Vary");
  if (!vary) headers.set("Vary", "Origin");
  else if (
    vary !== "*" &&
    !vary
      .toLowerCase()
      .split(/\s*,\s*/)
      .includes("origin")
  ) {
    headers.set("Vary", `${vary}, Origin`);
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    const requestUrl = new URL(request.url);
    const origin = request.headers.get("origin");
    if (request.method === "OPTIONS" && requestUrl.pathname.startsWith("/api/") && origin) {
      const preflight = withMobileApiCors(request, new Response(null, { status: 204 }));
      if (preflight.headers.has("Access-Control-Allow-Origin")) return preflight;
    }

    try {
      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return withMobileApiCors(request, await normalizeCatastrophicSsrResponse(response));
    } catch (error) {
      console.error(error);
      return withMobileApiCors(
        request,
        new Response(renderErrorPage(), {
          status: 500,
          headers: { "content-type": "text/html; charset=utf-8" },
        }),
      );
    }
  },
};
