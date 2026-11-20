/**
 * The path the site is served under: "" locally, "/Quire" on GitHub Pages
 * (https://<user>.github.io/Quire/). Set at build time by NEXT_PUBLIC_BASE_PATH.
 *
 * next/link, the router and next/font add it automatically. Use `withBase` for anything else
 * that is a plain string URL: files in /public, fetch() calls, raw <a href>, links in QR codes.
 */
export const BASE_PATH = (process.env.NEXT_PUBLIC_BASE_PATH ?? "").replace(/\/$/, "");

export function withBase(path: string): string {
  if (!path.startsWith("/") || path.startsWith("//")) return path;
  if (BASE_PATH && (path === BASE_PATH || path.startsWith(`${BASE_PATH}/`))) return path;
  return `${BASE_PATH}${path}`;
}
