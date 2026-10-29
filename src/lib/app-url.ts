/** Build auth callback URLs against the canonical public app origin when set. */
export function appUrl(path: string): string {
  const configuredOrigin = import.meta.env.VITE_APP_URL?.trim();
  const currentOrigin =
    typeof window !== "undefined" ? window.location.origin : "https://www.nesai.co.za";
  const configured = configuredOrigin
    ? /^[a-z][a-z\d+.-]*:\/\//i.test(configuredOrigin)
      ? configuredOrigin
      : `https://${configuredOrigin}`
    : currentOrigin;

  try {
    const base = new URL(configured);
    if (base.protocol !== "https:" && base.protocol !== "http:") {
      throw new Error("Unsupported URL protocol");
    }
    return new URL(path, `${base.origin}/`).toString();
  } catch {
    return new URL(path, `${currentOrigin.replace(/\/+$/, "")}/`).toString();
  }
}
