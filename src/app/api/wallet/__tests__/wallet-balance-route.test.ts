/**
 * wallet-balance-route.test.ts
 *
 * Route-level tests for GET /api/wallet/balance (Arc-only rail).
 *
 * Tests cover:
 *  - Missing / invalid address param (non-0x rejected, legacy included)
 *  - Successful Arc balance fetch (eth_getBalance, 18-dec formatting)
 *  - Arc RPC failure propagation (502)
 *  - Server-side cache hit (second request within TTL)
 *  - Network / fetch failure (502)
 */

import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"

// ── Fetch mock — install before module import so the route picks it up ───────
const mockFetch = vi.fn()
global.fetch = mockFetch

// ── Import route once; fetch is called at request-time, not import-time ───────
import { GET } from "@/app/api/wallet/balance/route"

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeBalanceRequest(params: Record<string, string>) {
  const url = new URL("http://localhost/api/wallet/balance")
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
  return new NextRequest(url.toString(), { method: "GET" })
}

function makeRpcResponse(result: string, status = 200) {
  return new Response(JSON.stringify({ jsonrpc: "2.0", id: 1, result }), { status })
}

// Use unique addresses per test to avoid the server-side cache (30s TTL)
let _addrSuffix = 10000
function uniqueAddress(): string {
  _addrSuffix++
  return "0x" + String(_addrSuffix).padStart(4, "0").padEnd(40, "a").slice(0, 40)
}

// 10 USDC in wei hex.
const TEN_USDC_HEX = "0x8ac7230489e80000"

describe("GET /api/wallet/balance", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("validation", () => {
    it("returns 400 when address param is missing", async () => {
      const res = await GET(makeBalanceRequest({}))
      expect(res.status).toBe(400)
      const json = await res.json()
      expect(json.error).toMatch(/address/i)
    })

    it("returns 400 for a non-0x address", async () => {
      const res = await GET(makeBalanceRequest({ address: "not-an-address" }))
      expect(res.status).toBe(400)
      const json = await res.json()
      expect(json.error).toMatch(/arc 0x/i)
    })

    it("returns 400 for a legacy G... address", async () => {
      const res = await GET(makeBalanceRequest({ address: "GAX23V3WWDPPR5WRER3KTEUTDLSCGZYMSJY5FDRRKKCIQ4JADF5T27RC" }))
      expect(res.status).toBe(400)
    })
  })

  describe("Arc balance", () => {
    it("returns formatted USDC balance from eth_getBalance", async () => {
      mockFetch.mockResolvedValueOnce(makeRpcResponse(TEN_USDC_HEX))
      const res = await GET(makeBalanceRequest({ address: uniqueAddress() }))
      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json.xlm).toBe("0")
      expect(json.usdc).toBe("10")
    })

    it("propagates Arc RPC error status as 502", async () => {
      mockFetch.mockResolvedValueOnce(new Response("{}", { status: 503 }))
      const res = await GET(makeBalanceRequest({ address: uniqueAddress() }))
      expect(res.status).toBe(502)
    })

    it("returns 502 when fetch throws a network error", async () => {
      mockFetch.mockRejectedValueOnce(new Error("ECONNREFUSED"))
      const res = await GET(makeBalanceRequest({ address: uniqueAddress() }))
      expect(res.status).toBe(502)
      const json = await res.json()
      expect(json.error).toBeDefined()
    })
  })

  describe("cache headers", () => {
    it("marks first request as MISS and second as HIT", async () => {
      const addr = uniqueAddress()
      mockFetch.mockResolvedValueOnce(makeRpcResponse(TEN_USDC_HEX))
      const first = await GET(makeBalanceRequest({ address: addr }))
      expect(first.headers.get("X-Cache")).toBe("MISS")
      expect(mockFetch).toHaveBeenCalledTimes(1)

      const second = await GET(makeBalanceRequest({ address: addr }))
      expect(second.headers.get("X-Cache")).toBe("HIT")
      expect(mockFetch).toHaveBeenCalledTimes(1)
      expect(second.headers.get("Cache-Control")).toContain("s-maxage=15")
    })
  })
})
