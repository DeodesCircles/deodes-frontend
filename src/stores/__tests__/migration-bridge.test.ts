import { beforeEach, afterEach, describe, expect, it, vi } from "vitest"
import { migrateOldWalletSession } from "@/stores/migration-bridge"
import { clearHmacKeyCache, _setHmacKeyForTest } from "@/lib/wallet/hmac"

const OLD_KEY = "moistello_wallet_address"
const NEW_KEY = "moistello_wallet_sessions"
const LEGACY_ADDRESS = "GBD7M3GZ6Z6Z6Z6Z6Z6Z6Z6Z6Z6Z6Z6Z6Z6Z6Z6Z6Z6Z6Z6Z6Z6Z6Z"
const TEST_KEY = "6f7d8e9aabbccddeeff00112233445566778899aabbccddeeff001122334455"

describe("migrateOldWalletSession", () => {
  beforeEach(() => {
    localStorage.clear()
    _setHmacKeyForTest(TEST_KEY)
  })

  afterEach(() => {
    clearHmacKeyCache()
    localStorage.clear()
  })

  it("promotes a legacy wallet address into a session entry", () => {
    localStorage.setItem(OLD_KEY, LEGACY_ADDRESS)

    const migrated = migrateOldWalletSession()

    expect(migrated).toBe(true)
    expect(localStorage.getItem(OLD_KEY)).toBeNull()

    const store = JSON.parse(localStorage.getItem(NEW_KEY) ?? "null")
    expect(store.sessions).toHaveLength(1)
    expect(store.sessions[0]).toMatchObject({
      walletId: "freighter",
      publicKey: LEGACY_ADDRESS,
      network: "testnet",
    })
    expect(store.activeWalletId).toBe("freighter")
    expect(store.hmac).toBeTruthy()
  })

  it("signs the migrated store with the wallet HMAC key", async () => {
    localStorage.setItem(OLD_KEY, LEGACY_ADDRESS)
    migrateOldWalletSession()

    const store = JSON.parse(localStorage.getItem(NEW_KEY) ?? "null")
    const { computeHmacSha256Sync } = await import("@/lib/wallet/hmac")
    expect(store.hmac).toBe(
      computeHmacSha256Sync(JSON.stringify(store.sessions)),
    )
  })

  it("returns false when no legacy address exists", () => {
    expect(migrateOldWalletSession()).toBe(false)
    expect(localStorage.getItem(NEW_KEY)).toBeNull()
  })

  it("returns false without overwriting an existing session store", () => {
    localStorage.setItem(OLD_KEY, LEGACY_ADDRESS)
    const existing = { sessions: [], hmac: "existing", activeWalletId: null }
    localStorage.setItem(NEW_KEY, JSON.stringify(existing))

    expect(migrateOldWalletSession()).toBe(false)
    // The existing store is untouched and the legacy key is left in place.
    expect(JSON.parse(localStorage.getItem(NEW_KEY) ?? "null")).toEqual(existing)
    expect(localStorage.getItem(OLD_KEY)).toBe(LEGACY_ADDRESS)
  })

  it("preserves the lastConnected timestamp in the migrated entry", () => {
    vi.useFakeTimers()
    vi.setSystemTime(1_700_000_000_000)
    localStorage.setItem(OLD_KEY, LEGACY_ADDRESS)

    migrateOldWalletSession()

    const store = JSON.parse(localStorage.getItem(NEW_KEY) ?? "null")
    expect(store.sessions[0].lastConnected).toBe(1_700_000_000_000)
    vi.useRealTimers()
  })

  it("guards against the legacy value lacking the new key entries", () => {
    localStorage.setItem(OLD_KEY, LEGACY_ADDRESS)
    localStorage.setItem(NEW_KEY, "")

    expect(migrateOldWalletSession()).toBe(false)
  })

  it("does not run server-side", () => {
    const originalWindow = globalThis.window
    // @ts-expect-error – simulation of the SSR environment
    delete globalThis.window

    localStorage.setItem(OLD_KEY, LEGACY_ADDRESS)
    expect(migrateOldWalletSession()).toBe(false)

    globalThis.window = originalWindow
  })
})