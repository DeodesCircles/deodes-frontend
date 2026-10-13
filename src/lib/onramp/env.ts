/**
 * Circle App Kit environment resolution (server-only).
 *
 * Circle issues separate sandbox and production API keys
 * (`TEST_API_KEY:...` / `LIVE_API_KEY:...` from console.circle.com/api-keys).
 * The active env is deployment config — NOT a runtime toggle: there is no
 * admin identity in this frontend to gate a live flip, and an unauthenticated
 * switch could route users to real-money rails. Restart to change envs.
 */
export type CircleEnv = "sandbox" | "production";

export function resolveCircleEnv(): CircleEnv {
  return process.env.CIRCLE_ENV?.trim().toLowerCase() === "production"
    ? "production"
    : "sandbox";
}

/** API key for the active env. Empty = onramp disabled (route 503s). */
export function circleApiKeyFor(env: CircleEnv): string {
  if (env === "production") {
    return (process.env.CIRCLE_API_KEY ?? "").trim();
  }
  return (process.env.CIRCLE_TEST_API_KEY ?? "").trim();
}

/** Optional wallets-api base URL override (staging/emulators). */
export function circleBaseUrl(): string | undefined {
  const v = (
    process.env.CIRCLE_BASE_URL ??
    process.env.ONRAMP_API_BASE_URL ??
    ""
  ).trim();
  return v === "" ? undefined : v;
}

/** Per-env wallets-api base URLs. Sandbox default targets Circle test. */
export const CIRCLE_SANDBOX_API_BASE_URL = "https://api-test.circle.com";
export const CIRCLE_PRODUCTION_API_BASE_URL = "https://api.circle.com";

/** Per-env hosted widget origins. Sandbox default targets Arc test widget. */
export const CIRCLE_SANDBOX_WIDGET_BASE_URL = "https://onramp-sandbox.arc.io";
export const CIRCLE_PRODUCTION_WIDGET_BASE_URL = "https://onramp.arc.io";

/** Wallets-api base URL for the active env (CIRCLE_BASE_URL wins). */
export function circleApiBaseUrl(env: CircleEnv): string {
  const override = circleBaseUrl();
  if (override !== undefined) return override;
  return env === "production"
    ? CIRCLE_PRODUCTION_API_BASE_URL
    : CIRCLE_SANDBOX_API_BASE_URL;
}

/** Hosted widget origin for the active env (server override wins). */
export function circleWidgetBaseUrl(env: CircleEnv): string {
  const v = (
    process.env.CIRCLE_WIDGET_BASE_URL ??
    process.env.ONRAMP_WIDGET_BASE_URL ??
    ""
  ).trim();
  if (v !== "") return v;
  return env === "production"
    ? CIRCLE_PRODUCTION_WIDGET_BASE_URL
    : CIRCLE_SANDBOX_WIDGET_BASE_URL;
}

/**
 * Client-safe widget-origin override (NEXT_PUBLIC_* only).
 * Undefined = use the server probe (`GET /api/onramp/sessions`) default.
 */
export function circleWidgetBaseUrlPublicOverride(): string | undefined {
  const v = (
    process.env.NEXT_PUBLIC_CIRCLE_WIDGET_BASE_URL ??
    process.env.NEXT_PUBLIC_ONRAMP_WIDGET_BASE_URL ??
    ""
  ).trim();
  return v === "" ? undefined : v;
}
