import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  fetchBalanceWithBackoff,
  clearBalanceCache,
  BALANCE_CACHE_TTL_MS,
} from "../balance-cache";

describe("fetchBalanceWithBackoff (Issue #12)", () => {
  const mockAddress = "GBAXK6G4Q2E5N4JL3Q53PZ4Z3YJ5G2Y3K6G4Q2E5N4JL3Q53PZ4Z3YJ5";

  beforeEach(() => {
    clearBalanceCache();
    vi.restoreAllMocks();
  });

  it("returns cached balance within TTL without calling API again", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ xlm: "100.5", usdc: "50.0" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    // Initial fetch
    const firstCall = await fetchBalanceWithBackoff(mockAddress);
    expect(firstCall).toEqual({ xlm: "100.5", usdc: "50.0" });
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    // Second fetch immediately after (within 30s TTL)
    const secondCall = await fetchBalanceWithBackoff(mockAddress);
    expect(secondCall).toEqual({ xlm: "100.5", usdc: "50.0" });
    // fetch should NOT be called again due to client-side TTL caching
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("bypasses cache when forceRefresh is true", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ xlm: "100.0", usdc: "10.0" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ xlm: "200.0", usdc: "20.0" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      );

    await fetchBalanceWithBackoff(mockAddress);
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    const refreshed = await fetchBalanceWithBackoff(mockAddress, {
      forceRefresh: true,
    });
    expect(refreshed).toEqual({ xlm: "200.0", usdc: "20.0" });
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it("retries with exponential backoff on transient errors and succeeds", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockRejectedValueOnce(new Error("Network glitch"))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ xlm: "75.0", usdc: "0" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      );

    const result = await fetchBalanceWithBackoff(mockAddress, {
      maxRetries: 2,
      initialDelayMs: 10,
    });

    expect(result).toEqual({ xlm: "75.0", usdc: "0" });
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it("handles 404 unfunded accounts by returning zero balance", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ error: "Account not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      })
    );

    const result = await fetchBalanceWithBackoff(mockAddress);
    expect(result).toEqual({ xlm: "0", usdc: "0" });
  });

  it("never calls a third-party Horizon endpoint when the proxy fails (issue #202)", async () => {
    // Every proxy attempt fails; the direct Horizon fallback must NOT exist.
    vi.spyOn(globalThis, "fetch").mockRejectedValue(
      new Error("proxy down")
    );

    await expect(
      fetchBalanceWithBackoff(mockAddress, { maxRetries: 1, initialDelayMs: 1 })
    ).rejects.toThrow(/proxy down/);

    const fetchMock = globalThis.fetch as unknown as ReturnType<typeof vi.fn>;
    const calls = fetchMock.mock.calls.map((c) => String(c[0]));
    expect(calls.length).toBeGreaterThan(0);
    // Every request went to the first-party proxy, never to Horizon directly.
    for (const url of calls) {
      expect(url.startsWith("/api/wallet/balance")).toBe(true);
      expect(url).not.toContain("horizon");
      expect(url).not.toContain("stellar.org");
    }
  });

  it("degrades gracefully to stale cache when the proxy is unavailable (issue #202)", async () => {
    // Seed the cache with a successful call first.
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ xlm: "50", usdc: "25" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      );
    await fetchBalanceWithBackoff(mockAddress);

    // Now the proxy dies entirely.
    fetchSpy.mockRejectedValue(new Error("proxy down"));

    const result = await fetchBalanceWithBackoff(mockAddress, {
      forceRefresh: true,
      maxRetries: 1,
      initialDelayMs: 1,
    });
    // Stale cache returned instead of a third-party request or a crash.
    expect(result).toEqual({ xlm: "50", usdc: "25" });

    const calls = fetchSpy.mock.calls.map((c) => String(c[0]));
    for (const url of calls) {
      expect(url.startsWith("/api/wallet/balance")).toBe(true);
      expect(url).not.toContain("horizon");
      expect(url).not.toContain("stellar.org");
    }
  });

  it("exposes BALANCE_CACHE_TTL_MS of 30 seconds", () => {
    expect(BALANCE_CACHE_TTL_MS).toBe(30_000);
  });
});
