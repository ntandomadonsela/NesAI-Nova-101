/** Build auth callback URLs against the canonical public app origin when set. */
export function appUrl(path: string): string {
  const configuredOrigin = import.meta.env.VITE_APP_URL?.trim();
  const origin = configuredOrigin || window.location.origin;
  return new URL(path, `${origin.replace(/\/+$/, "")}/`).toString();
}
