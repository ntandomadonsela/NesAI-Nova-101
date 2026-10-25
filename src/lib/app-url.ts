import { Capacitor } from "@capacitor/core";

/** Build auth callback URLs against the canonical public app origin when set. */
export function appUrl(path: string): string {
  if (Capacitor.isNativePlatform()) return new URL(path, "nesai://app/").toString();
  const configuredOrigin =
    import.meta.env.VITE_APP_URL?.trim() || import.meta.env.VITE_API_BASE_URL?.trim();
  const origin = configuredOrigin || window.location.origin;
  return new URL(path, `${origin.replace(/\/+$/, "")}/`).toString();
}
