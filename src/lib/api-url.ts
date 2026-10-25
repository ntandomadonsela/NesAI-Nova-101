/** Build server API URLs against the website by default or the configured API host in mobile builds. */
export function apiUrl(path: string): string {
  const configuredOrigin = import.meta.env.VITE_API_BASE_URL?.trim();
  const origin = configuredOrigin || window.location.origin;
  return new URL(path, `${origin.replace(/\/+$/, "")}/`).toString();
}
