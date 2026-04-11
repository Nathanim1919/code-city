/** Canonical prod frontend (post-login redirect). Listed in server `trustedOrigins`. */
const PROD_AUTH_ORIGIN = "https://codecity.nathanim.dev";

/** Post-login path (SPA is a single view; use `/` unless you add a router route). */
const POST_AUTH_PATH = "/";

/**
 * Post-auth redirect target. Must use an origin listed in the Better Auth server
 * `trustedOrigins`.
 *
 * Order: `VITE_AUTH_CALLBACK_URL` → `VITE_CLIENT_BASE_URL` → dev: current tab
 * origin → prod: {@link PROD_AUTH_ORIGIN}. Without that, opening the app on
 * e.g. a preview domain would send that host as the callback.
 */
export function getPostAuthCallbackUrl(): string {
  const fromEnv =
    import.meta.env.VITE_AUTH_CALLBACK_URL?.trim() ||
    import.meta.env.VITE_CLIENT_BASE_URL?.trim();
  const fromWindow =
    typeof window !== "undefined" && import.meta.env.DEV
      ? window.location.origin
      : "";
  const base = (
    fromEnv ||
    fromWindow ||
    (import.meta.env.PROD ? PROD_AUTH_ORIGIN : "")
  ).replace(/\/$/, "");
  const path = POST_AUTH_PATH.startsWith("/") ? POST_AUTH_PATH : `/${POST_AUTH_PATH}`;
  if (base) return `${base}${path}`;
  if (typeof window !== "undefined") return `${window.location.origin}${path}`;
  return path;
}
