// @vitest-environment node
import { describe, expect, it, vi, afterEach } from "vitest";
import { GET } from "../route";

describe("GET /api/wallet/hmac/key", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("serves WALLET_HMAC_KEY when set", async () => {
    vi.stubEnv("WALLET_HMAC_KEY", "a".repeat(64));
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.keyHex).toBe("a".repeat(64));
  });

  it("refuses to serve a key in production without WALLET_HMAC_KEY", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("WALLET_HMAC_KEY", "");
    const res = await GET();
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toMatch(/WALLET_HMAC_KEY/i);
  });

  it("serves a deterministic key in development (stable across requests)", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("WALLET_HMAC_KEY", "");

    const res1 = await GET();
    const res2 = await GET();
    expect(res1.status).toBe(200);
    expect(res2.status).toBe(200);

    const body1 = await res1.json();
    const body2 = await res2.json();
    // Deterministic: the same dev key on every request so local sessions
    // survive reloads and tests are reproducible.
    expect(body1.keyHex).toBe(body2.keyHex);
    expect(body1.keyHex).toMatch(/^[0-9a-f]{64}$/);
  });

  it("does not leak the dev key into production fallback", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("WALLET_HMAC_KEY", "");
    const res = await GET();
    expect(res.status).toBe(500);
  });
});
