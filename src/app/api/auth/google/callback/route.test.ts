// @vitest-environment node
/**
 * google/callback route tests — the callback must exchange the Google
 * identity for BACKEND-issued tokens, never mint sessions locally.
 * Regression coverage for the apex→app "asked to log in" loop, where a
 * locally-minted HS256 token passed the cookie check but failed every
 * backend call.
 */
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth/google-server", () => ({
  GOOGLE_STATE_COOKIE: "test_google_state",
  cookieDomain: () => ({}),
  defaultNext: () => "https://app.deodes.com/",
  exchangeCode: vi.fn(async () => ({ id_token: "google-id-token" })),
  publicOrigin: (url: string) => new URL(url).origin,
  splitState: (s: string | null) => ({ state: s ?? "", next: "/" }),
  verifyIdToken: vi.fn(async () => ({
    sub: "g-1",
    email: "g@example.com",
    name: "G",
  })),
}));

vi.mock("@/lib/constants", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@/lib/constants")>();
  return { ...mod, API_BASE_URL: "https://backend.test/v1" };
});

function callbackUrl(params = "code=abc&state=st123") {
  return new NextRequest(`http://localhost/api/auth/google/callback?${params}`, {
    headers: { cookie: "test_google_state=st123" },
  });
}

describe("GET /api/auth/google/callback", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it("sets backend-issued cookies and lands on the app host", async () => {
    const fetchMock = vi.fn(async () =>
      Response.json({ data: { token: "backend-at", refreshToken: "backend-rt" } }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const { GET } = await import("./route");

    const res = await GET(callbackUrl());
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("https://app.deodes.com/");

    const setCookies = res.headers.getSetCookie();
    // Cookie names differ by env (__Secure- prefix in production); match values.
    const access = setCookies.find((c) => c.includes("backend-at"));
    expect(access).toBeDefined();
    expect(access).not.toContain("google");
    const refresh = setCookies.find((c) => c.includes("backend-rt"));
    expect(refresh).toBeDefined();

    expect(fetchMock).toHaveBeenCalledWith(
      "https://backend.test/v1/auth/google",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("bounces to login when the backend rejects the exchange", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("no", { status: 401 })),
    );
    const { GET } = await import("./route");

    const res = await GET(callbackUrl());
    expect(res.status).toBe(307);
    const location = res.headers.get("location") ?? "";
    expect(location).toContain("/login");
    expect(location).toContain("google-failed");
    expect(
      res.headers.getSetCookie().some((c) => c.includes("deodes_token=")),
    ).toBe(false);
  });

  it("bounces to login on state mismatch without calling anyone", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const { GET } = await import("./route");

    const res = await GET(callbackUrl("code=abc&state=wrong"));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("google-bad-state");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
