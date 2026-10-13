"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { get, getErrorMessage, post } from "@/lib/api-client"
import { useAuthStore } from "@/stores/auth-store"
import { useMultiWalletStore } from "@/stores/multi-wallet-store"
import { useToast } from "@/hooks/use-toast"

/**
 * Rejection copy mirrors `use-wallet-auth` (same hints, link-scoped wording)
 * without importing it, so this hook stays usable on authed pages that never
 * mount the login/register bridge.
 */
const REJECTION_HINTS = [
  "user rejected",
  "user_rejected",
  "rejected",
  "denied",
  "cancelled",
  "canceled",
  "declined",
  "dismissed",
  "user closed",
  "user cancelled",
  "user canceled",
  "action_rejected",
  "request rejected",
]

function isUserRejectionMessage(message: string | null | undefined): boolean {
  if (!message) return false
  const lower = message.toLowerCase()
  if (lower.includes("4001")) return true
  return REJECTION_HINTS.some((hint) => lower.includes(hint))
}

function toFriendlyLinkError(raw: string | null | undefined): string {
  if (!raw || !raw.trim()) return "Linking failed. Please try again."
  if (isUserRejectionMessage(raw)) {
    return "Signature request was rejected. Approve the signature to link this wallet."
  }
  return raw
}

function isArcAddress(address: string): boolean {
  return /^0x[0-9a-fA-F]{40}$/.test(address)
}

interface WalletRow {
  publicKey?: unknown
  address?: unknown
  walletAddress?: unknown
}

/** GET /wallets arrives as { data: { wallets: [...] } } or { wallets: [...] }. */
function extractWallets(res: unknown): WalletRow[] {
  if (typeof res !== "object" || res === null) return []
  const root = res as Record<string, unknown>
  const data =
    typeof root.data === "object" && root.data !== null
      ? (root.data as Record<string, unknown>)
      : root
  const list = data.wallets
  return Array.isArray(list) ? (list as WalletRow[]) : []
}

function rowMatchesAddress(row: WalletRow, address: string): boolean {
  const target = address.toLowerCase()
  for (const field of [row.publicKey, row.address, row.walletAddress]) {
    if (typeof field === "string" && field.toLowerCase() === target) return true
  }
  return false
}

/** POST /auth/nonce arrives as { data: { nonce: { nonce } } } or flatter shapes. */
function extractNonce(res: unknown): string | null {
  if (typeof res !== "object" || res === null) return null
  const root = res as Record<string, unknown>
  const data =
    typeof root.data === "object" && root.data !== null
      ? (root.data as Record<string, unknown>)
      : root
  const nonce = data.nonce
  if (typeof nonce === "string" && nonce.length > 0) return nonce
  if (typeof nonce === "object" && nonce !== null) {
    const inner = (nonce as Record<string, unknown>).nonce
    if (typeof inner === "string" && inner.length > 0) return inner
  }
  return null
}

function statusOf(err: unknown): number | undefined {
  if (typeof err === "object" && err !== null && "response" in err) {
    const response = (err as { response?: { status?: unknown } }).response
    if (typeof response?.status === "number") return response.status
  }
  return undefined
}

export interface UseWalletLinkResult {
  /** True when an authed user has a connected 0x address the server doesn't know. */
  needsLink: boolean
  /** Nonce -> personal_sign -> link. Toasts success, maps failures to friendly copy. */
  link: () => Promise<void>
  linking: boolean
  error: string | null
  /** The connected candidate address, or null when there is none. */
  address: string | null
  /** True while the initial GET /wallets check is in flight. */
  checking: boolean
  /** Re-run the GET /wallets recorded check. */
  refresh: () => Promise<void>
}

/**
 * Link prompt for signed-in (Google/email) users.
 *
 * `useWalletAuth` only runs on the login/register bridge, so an already
 * authenticated user who connects a wallet gets nothing server-side. This
 * hook fills that gap: when the active wallet is a connected non-hosted 0x
 * address that GET /wallets doesn't already record (hosted or linked), it
 * exposes `needsLink` and a `link()` that proves ownership
 * (POST /auth/nonce -> adapter.signMessage -> POST /wallets/link, i.e. the
 * backend's POST /v1/wallets/link contract) and toasts on success.
 */
export function useWalletLink(): UseWalletLinkResult {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const address = useMultiWalletStore((s) => {
    const id = s.activeWalletId
    if (!id) return null
    return s.wallets[id]?.publicKey ?? null
  })
  const isConnected = useMultiWalletStore((s) => {
    const id = s.activeWalletId
    if (!id) return false
    const st = s.wallets[id]?.status
    return st === "connected" || st === "reconnecting"
  })
  const toast = useToast()

  const [recorded, setRecorded] = useState<boolean | null>(null)
  const [checking, setChecking] = useState(false)
  const [linking, setLinking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const busyRef = useRef(false)

  const candidate =
    isAuthenticated && isConnected && address && isArcAddress(address)
      ? address
      : null

  const refresh = useCallback(async () => {
    if (!candidate) {
      setRecorded(null)
      return
    }
    setChecking(true)
    try {
      const wallets = extractWallets(await get("/wallets"))
      setRecorded(wallets.some((w) => rowMatchesAddress(w, candidate)))
    } catch {
      // Unknown beats wrong: a failed check must not prompt a link CTA.
      setRecorded(null)
    } finally {
      setChecking(false)
    }
  }, [candidate])

  useEffect(() => {
    void refresh()
  }, [refresh])

  // A new wallet (or sign-out) clears any stale link error.
  useEffect(() => {
    setError(null)
  }, [candidate, isAuthenticated])

  const link = useCallback(async () => {
    if (!candidate || busyRef.current) return
    busyRef.current = true
    setLinking(true)
    setError(null)
    try {
      const nonce = extractNonce(
        await post("/auth/nonce", { walletAddress: candidate }),
      )
      if (!nonce) {
        throw new Error("Could not get a signing challenge. Please try again.")
      }
      const signature =
        await useMultiWalletStore.getState().signMessage(nonce)
      await post("/wallets/link", { address: candidate, signature })
      toast.success("Wallet linked to your account.")
      setRecorded(true)
      // Confirm server-side; a failed re-check keeps the optimistic state.
      try {
        const wallets = extractWallets(await get("/wallets"))
        setRecorded(wallets.some((w) => rowMatchesAddress(w, candidate)))
      } catch {
        /* keep optimistic linked state */
      }
    } catch (err: unknown) {
      const status = statusOf(err)
      let friendly: string
      if (status === 404) {
        friendly =
          "Wallet linking is not available yet. Please try again later."
      } else if (status === 409) {
        friendly = "This wallet is already linked to another account."
      } else if (status === 401) {
        friendly = "Signature verification failed. Please try again."
      } else {
        const raw = err instanceof Error ? err.message : getErrorMessage(err)
        friendly = toFriendlyLinkError(raw)
      }
      setError(friendly)
      toast.error(friendly)
    } finally {
      busyRef.current = false
      setLinking(false)
    }
  }, [candidate, toast])

  return {
    needsLink: candidate !== null && recorded === false,
    link,
    linking,
    error,
    address: candidate,
    checking,
    refresh,
  }
}
