/**
 * Google OAuth helpers — SERVER ONLY (imports Node crypto; never import from
 * client components — route handlers only).
 *
 * Flow: GET /api/auth/google/start → Google consent → GET
 * /api/auth/google/callback → verify → mint DEODES session JWT → set the
 * same HttpOnly cookies the passkey flow uses → redirect home.
 *
 * ID-token verification is done with WebCrypto RS256 against Google's
 * published certs (cached 1h). Session JWTs are HS256 signed with a key
 * derived from WALLET_HMAC_KEY. Zero new dependencies.
 */

import crypto from "crypto";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_CERTS_URL = "https://www.googleapis.com/oauth2/v3/certs";

export const GOOGLE_STATE_COOKIE = "deodes_oauth_state";
const STATE_TTL_SECONDS = 10 * 60;
const SESSION_TTL_SECONDS = 60 * 60 * 24; // 24h, matches ACCESS_TOKEN_MAX_AGE

export function googleConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

function appOrigin(): string {
  const raw =
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.NODE_ENV === "production" ? "https://deodes.com" : "http://localhost:1110");
  try {
    return new URL(raw).origin;
  } catch {
    return raw;
  }
}

export function googleRedirectUri(): string {
  return `${appOrigin()}/api/auth/google/callback`;
}

/** Public origin for post-OAuth redirects (never the internal host). */
export function publicOrigin(requestUrl: string): string {
  void requestUrl;
  return appOrigin();
}

export function newState(): string {
  return crypto.randomBytes(24).toString("base64url");
}

export function buildAuthUrl(state: string, next: string | null): string {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID ?? "",
    redirect_uri: googleRedirectUri(),
    response_type: "code",
    scope: "openid email profile",
    access_type: "online",
    prompt: "select_account",
    state: next !== null && next.startsWith("/") ? `${state}.${Buffer.from(next).toString("base64url")}` : state,
  });
  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

export function splitState(raw: string | null): { state: string; next: string } {
  if (!raw) return { state: "", next: "/" };
  const dot = raw.indexOf(".");
  if (dot === -1) return { state: raw, next: "/" };
  let next = "/";
  try {
    const decoded = Buffer.from(raw.slice(dot + 1), "base64url").toString("utf-8");
    if (decoded.startsWith("/") && !decoded.startsWith("//")) next = decoded;
  } catch {
    // keep default
  }
  return { state: raw.slice(0, dot), next };
}

interface GoogleTokens {
  id_token?: string;
}

export async function exchangeCode(code: string): Promise<GoogleTokens> {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID ?? "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      redirect_uri: googleRedirectUri(),
      grant_type: "authorization_code",
    }).toString(),
  });
  if (!res.ok) throw new Error("Google token exchange failed");
  return (await res.json()) as GoogleTokens;
}

export interface GoogleProfile {
  sub: string;
  email: string;
  name: string | null;
  picture: string | null;
}

let certCache: { at: number; keys: Record<string, JsonWebKey> } | null = null;

async function googleKeys(): Promise<Record<string, JsonWebKey>> {
  if (certCache !== null && Date.now() - certCache.at < 3_600_000) return certCache.keys;
  const res = await fetch(GOOGLE_CERTS_URL);
  if (!res.ok) throw new Error("Could not fetch Google signing keys");
  const body = (await res.json()) as { keys?: Array<JsonWebKey & { kid?: string }> };
  const keys: Record<string, JsonWebKey> = {};
  for (const k of body.keys ?? []) {
    if (k.kid) keys[k.kid] = k;
  }
  certCache = { at: Date.now(), keys };
  return keys;
}

/** Verify a Google ID token and return the profile it carries. */
export async function verifyIdToken(idToken: string): Promise<GoogleProfile> {
  const parts = idToken.split(".");
  if (parts.length !== 3) throw new Error("Malformed ID token");
  const [h64, p64, s64] = parts;
  const header = JSON.parse(Buffer.from(h64, "base64url").toString("utf-8")) as { kid?: string; alg?: string };
  if (header.alg !== "RS256" || !header.kid) throw new Error("Unexpected ID token header");

  const keys = await googleKeys();
  const jwk = keys[header.kid];
  if (!jwk) {
    certCache = null;
    throw new Error("Unknown Google signing key");
  }
  const key = await crypto.subtle.importKey(
    "jwk",
    jwk as unknown as JsonWebKey,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["verify"],
  );
  const data = Buffer.from(`${h64}.${p64}`, "utf-8");
  const sig = Buffer.from(s64, "base64url");
  const ok = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, sig, data);
  if (!ok) throw new Error("Bad ID token signature");

  const payload = JSON.parse(Buffer.from(p64, "base64url").toString("utf-8")) as {
    iss?: string;
    aud?: string;
    exp?: number;
    sub?: string;
    email?: string;
    email_verified?: boolean;
    name?: string;
    picture?: string;
  };
  if (payload.iss !== "https://accounts.google.com" && payload.iss !== "accounts.google.com") {
    throw new Error("Wrong ID token issuer");
  }
  if (payload.aud !== process.env.GOOGLE_CLIENT_ID) throw new Error("Wrong ID token audience");
  if (typeof payload.exp !== "number" || payload.exp * 1000 <= Date.now()) {
    throw new Error("Expired ID token");
  }
  if (!payload.sub || !payload.email) throw new Error("ID token missing identity");
  return {
    sub: payload.sub,
    email: payload.email,
    name: typeof payload.name === "string" ? payload.name : null,
    picture: typeof payload.picture === "string" ? payload.picture : null,
  };
}

function sessionKey(): Buffer {
  const base = process.env.WALLET_HMAC_KEY ?? "";
  if (base.length < 32) throw new Error("WALLET_HMAC_KEY is not set");
  return crypto.createHash("sha256").update(`deodes-google-session:${base}`).digest();
}

export interface DeodesSessionClaims {
  sub: string;
  email: string;
  name: string | null;
  provider: "google";
}

/** Mint the HS256 session JWT the app stores in its HttpOnly cookie. */
export function mintSessionJwt(profile: Pick<GoogleProfile, "sub" | "email" | "name">): string {
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const body = Buffer.from(
    JSON.stringify({
      sub: `google:${profile.sub}`,
      email: profile.email,
      name: profile.name,
      provider: "google",
      iat: now,
      exp: now + SESSION_TTL_SECONDS,
    } satisfies DeodesSessionClaims & { iat: number; exp: number }),
  ).toString("base64url");
  const sig = crypto.createHmac("sha256", sessionKey()).update(`${header}.${body}`).digest("base64url");
  return `${header}.${body}.${sig}`;
}

/** Verify a JWT minted by {@link mintSessionJwt} (unit-testable seam). */
export function verifySessionJwt(token: string): (DeodesSessionClaims & { exp: number }) | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [h64, p64, s64] = parts;
  let expected: string;
  try {
    expected = crypto.createHmac("sha256", sessionKey()).update(`${h64}.${p64}`).digest("base64url");
  } catch {
    return null;
  }
  const a = Buffer.from(s64);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(p64, "base64url").toString("utf-8")) as DeodesSessionClaims & {
      exp?: number;
    };
    if (typeof payload.exp !== "number" || payload.exp * 1000 <= Date.now()) return null;
    if (payload.provider !== "google" || typeof payload.sub !== "string") return null;
    return payload as DeodesSessionClaims & { exp: number };
  } catch {
    return null;
  }
}

export { STATE_TTL_SECONDS };
