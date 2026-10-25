import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  useNavigate,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, useMemo, type ReactNode } from "react";
import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";
import { supabase } from "@/integrations/supabase/client";

import appCss from "../styles.css?url";
import { reportError } from "../lib/error-reporting";
import { Toaster } from "@/components/ui/sonner";

function NotFoundComponent() {
  useEffect(() => {
    if (window.location.pathname === "/**") window.location.replace("/");
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="font-serif text-8xl text-foreground">404</h1>
        <h2 className="mt-4 font-serif text-2xl text-foreground">Page not found</h2>
        <p className="mt-3 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
          >
            Back to NesAI
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: unknown; reset: () => void }) {
  const actualError = useMemo(
    () => (error instanceof Error ? error : new Error(String(error))),
    [error],
  );
  console.error(actualError);
  const router = useRouter();
  useEffect(() => {
    reportError(actualError, { boundary: "tanstack_root_error_component" });
  }, [actualError]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="font-serif text-2xl text-foreground">This page didn't load</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. Try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "NesAI | Human-led data for AI teams" },
      {
        name: "description",
        content:
          "NesAI helps AI teams create, review and evaluate training data with trained contributors and project-specific workflows.",
      },
      { name: "author", content: "NesAI" },
      { property: "og:site_name", content: "NesAI" },
      { property: "og:title", content: "NesAI | Human-led data for AI teams" },
      {
        property: "og:description",
        content: "Human-led training data, annotation and model evaluation for AI teams.",
      },
      { property: "og:type", content: "website" },
      { property: "og:locale", content: "en_ZA" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/nesai-favicon.png?v=3", type: "image/png", sizes: "512x512" },
      { rel: "icon", href: "/favicon.ico?v=3", type: "image/x-icon", sizes: "any" },
      { rel: "apple-touch-icon", href: "/nesai-favicon.png?v=3", sizes: "512x512" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&family=Playfair+Display:ital,wght@0,500;0,600;1,500;1,600&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const navigate = useNavigate();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) {
      if (import.meta.env.VITE_MOBILE_APP === "true" && window.location.pathname === "/") {
        void navigate({ to: "/chat", replace: true });
      }
      return;
    }

    let disposed = false;
    let listener: { remove: () => Promise<void> } | undefined;
    let notificationListener: { remove: () => Promise<void> } | undefined;
    const handledUrls = new Set<string>();
    const handleUrl = async (rawUrl: string) => {
      if (handledUrls.has(rawUrl)) return;
      handledUrls.add(rawUrl);
      try {
        const callback = new URL(rawUrl);
        if (callback.protocol !== "nesai:" || callback.hostname !== "app") return;
        const fragment = new URLSearchParams(callback.hash.replace(/^#/, ""));
        const code = callback.searchParams.get("code");
        const accessToken = fragment.get("access_token");
        const refreshToken = fragment.get("refresh_token");
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        } else if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (error) throw error;
        } else if (callback.searchParams.has("error")) {
          throw new Error(
            callback.searchParams.get("error_description") || "Link is invalid or has expired.",
          );
        }
        if (callback.pathname === "/auth" && callback.searchParams.get("mode") === "recovery") {
          await navigate({ to: "/auth", search: { mode: "recovery", redirect: "/chat" } });
        } else if (callback.pathname === "/profile") {
          await navigate({ to: "/profile" });
        } else {
          await navigate({ to: "/chat" });
        }
      } catch (error) {
        console.error("Native auth callback failed", error);
        await navigate({ to: "/auth", search: { mode: "signin", redirect: "/chat" } });
      }
    };

    void App.addListener("appUrlOpen", ({ url }) => void handleUrl(url)).then((handle) => {
      if (disposed) void handle.remove();
      else listener = handle;
    });
    void LocalNotifications.addListener("localNotificationActionPerformed", ({ notification }) => {
      if (notification.extra?.path === "/chat") void navigate({ to: "/chat" });
    }).then((handle) => {
      if (disposed) void handle.remove();
      else notificationListener = handle;
    });
    void App.getLaunchUrl()
      .then((launch) => {
        if (launch?.url) void handleUrl(launch.url);
      })
      .catch((error) => console.error("Could not read the native launch URL", error));
    return () => {
      disposed = true;
      void listener?.remove();
      void notificationListener?.remove();
    };
  }, [navigate]);

  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
      <Toaster />
    </QueryClientProvider>
  );
}
