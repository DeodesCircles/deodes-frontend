import { computeHmacSha256Sync } from "@/lib/wallet/hmac"
import type { EncryptedSessionStore, WalletSession } from "@/lib/wallet/types"

/**
 * One-time migrations for client storage.
 *
 * Earlier builds kept a single wallet address in `moistello_wallet_address`.
 * The session manager now persists an HMAC-signed list of wallet sessions, so
 * on first load any legacy single address is promoted into a session entry
 * under the new storage key. The migration only touches storage — it never
 * touches the network — and is safe to call on every startup: it is a no-op
 * once the new key exists or no legacy address is present.
 */

const OLD_STORAGE_KEY = "moistello_wallet_address"
const NEW_STORAGE_KEY = "moistello_wallet_sessions"

/**
 * Migrate a legacy single wallet address into the session store.
 *
 * @returns true when a migration happened, false when there was nothing to
 * migrate, the new store already existed, or storage was unavailable.
 */
export function migrateOldWalletSession(): boolean {
  if (typeof window === "undefined") return false
  try {
    const oldAddress = localStorage.getItem(OLD_STORAGE_KEY)
    if (!oldAddress) return false

    const alreadyMigrated = localStorage.getItem(NEW_STORAGE_KEY)
    if (alreadyMigrated !== null) return false

    const sessions: WalletSession[] = [
      {
        walletId: "freighter",
        publicKey: oldAddress,
        lastConnected: Date.now(),
        network: "testnet",
      },
    ]

    const hmac = computeHmacSha256Sync(JSON.stringify(sessions))
    const store: EncryptedSessionStore = {
      sessions,
      hmac,
      activeWalletId: "freighter",
    }

    localStorage.setItem(NEW_STORAGE_KEY, JSON.stringify(store))
    localStorage.removeItem(OLD_STORAGE_KEY)
    return true
  } catch {
    return false
  }
}