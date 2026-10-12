import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from "vitest"

// In-memory Redis mock
const redisStore = new Map<string, { value: string; expiresAt: number }>()
vi.mock("@/lib/redis/client", () => ({
  getRedisClient: vi.fn().mockResolvedValue({
    async set(key: string, value: string, _ex: string, ttlSeconds: number) {
      redisStore.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 })
    },
    async get(key: string) {
      const entry = redisStore.get(key)
      if (!entry) return null
      if (Date.now() > entry.expiresAt) {
        redisStore.delete(key)
        return null
      }
      return entry.value
    },
    async del(key: string) {
      redisStore.delete(key)
    },
  }),
}))

// Mock fetch for credential store backend calls
const fetchMock = vi.fn().mockResolvedValue({ ok: true })
vi.stubGlobal("fetch", fetchMock)

// Mock process.env
vi.stubEnv("PASSKEY_SERVER_PEPPER", "test-server-pepper")
vi.stubEnv("NEXT_PUBLIC_PASSKEY_RP_ID", "test-rp-id")
vi.stubEnv("PASSKEY_EXPECTED_ORIGIN", "https://test.origin")

// Store tests run server-side; hide window so getRedis() passes its guard
const _savedWindow = globalThis.window
beforeAll(() => {
  // @ts-expect-error — intentionally removing window for server-side guard bypass
  delete globalThis.window
})
afterAll(() => {
  globalThis.window = _savedWindow
})

import {
  setChallenge,
  getAndVerifyChallenge,
  storeCredential,
  getCredential,
  getPepper,
  getRpId,
  getExpectedOrigin,
} from "../store"

describe("Passkey server store", () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    redisStore.clear()
    fetchMock.mockClear().mockResolvedValue({ ok: true })
  })

  describe("challenge store", () => {
    it("stores and verifies a challenge", async () => {
      await setChallenge("user@test.com", "challenge-abc")
      expect(await getAndVerifyChallenge("user@test.com", "challenge-abc")).toBe(true)
    })

    it("deletes challenge after single use (replay protection)", async () => {
      await setChallenge("user@test.com", "challenge-abc")
      await getAndVerifyChallenge("user@test.com", "challenge-abc")
      expect(await getAndVerifyChallenge("user@test.com", "challenge-abc")).toBe(false)
    })

    it("returns false for unknown key", async () => {
      expect(await getAndVerifyChallenge("unknown", "challenge-abc")).toBe(false)
    })

    it("returns false for wrong challenge", async () => {
      await setChallenge("user@test.com", "challenge-abc")
      expect(await getAndVerifyChallenge("user@test.com", "wrong-challenge")).toBe(false)
    })

    it("returns false for expired challenge", async () => {
      vi.useFakeTimers()
      await setChallenge("user@test.com", "challenge-abc")
      vi.advanceTimersByTime(5 * 60 * 1000 + 1)
      expect(await getAndVerifyChallenge("user@test.com", "challenge-abc")).toBe(false)
      vi.useRealTimers()
    })

    it("stores challenges with credentialId key for auth mode", async () => {
      await setChallenge("cred-id-123", "challenge-auth")
      expect(await getAndVerifyChallenge("cred-id-123", "challenge-auth")).toBe(true)
    })
  })

  describe("credential store", () => {
    it("stores and retrieves a credential", async () => {
      const pubKey = new Uint8Array(32).fill(1)
      await storeCredential("cred-1", {
        publicKey: pubKey,
        counter: 0,
        transports: ["internal"],
      })
      const retrieved = await getCredential("cred-1")
      expect(retrieved).toBeDefined()
      expect(retrieved!.credentialId).toBe("cred-1")
      expect(retrieved!.counter).toBe(0)
      expect(retrieved!.transports).toEqual(["internal"])
    })

    it("returns undefined for unknown credential", async () => {
      expect(await getCredential("unknown-cred")).toBeUndefined()
    })

    it("stores credential with correct counter", async () => {
      const pubKey = new Uint8Array(32).fill(2)
      await storeCredential("cred-2", {
        publicKey: pubKey,
        counter: 5,
      })
      const cred = await getCredential("cred-2")
      expect(cred).toBeDefined()
      expect(cred!.counter).toBe(5)
    })
  })

  describe("configuration", () => {
    it("getPepper returns env value", () => {
      expect(getPepper()).toBe("test-server-pepper")
    })

    it("getRpId returns env value", () => {
      expect(getRpId()).toBe("test-rp-id")
    })

    it("getExpectedOrigin returns env value", () => {
      const result = getExpectedOrigin()
      expect(result).toContain("https://test.origin")
    })

    it("getPepper falls back to default when env not set", async () => {
      vi.stubEnv("PASSKEY_SERVER_PEPPER", "")
      const { getPepper: getPepperDefault } = await import("../store")
      expect(getPepperDefault()).toBe("moistello-passkey-pepper-v1")
    })

    it("getRpId falls back to localhost", async () => {
      vi.stubEnv("NEXT_PUBLIC_PASSKEY_RP_ID", "")
      const { getRpId: getRpIdDefault } = await import("../store")
      expect(getRpIdDefault()).toBe("localhost")
    })

    it("getExpectedOrigin falls back to localhost:1110", async () => {
      vi.stubEnv("PASSKEY_EXPECTED_ORIGIN", "")
      const { getExpectedOrigin: getOriginDefault } = await import("../store")
      expect(getOriginDefault()).toBe("http://localhost:1110")
    })
  })
})
