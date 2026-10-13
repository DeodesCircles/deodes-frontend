"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { useMultiWalletStore } from "@/stores/multi-wallet-store"
import { useAuthFlowStore, type AuthFlowStatus } from "@/stores/auth-flow-store"
import { useToast } from "@/hooks/use-toast"

export type WalletAuthMode = "login" | "register"

/** Where a successful wallet auth lands. Register keeps the hosted-wallet onboarding. */
export const WALLET_AUTH_REDIRECTS: Record<WalletAuthMode, string> = {
  login: "/",
  register: "/wallet?fresh=1",
}

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
  "connection_rejected",
  "request rejected",
]

/** True when the wallet / signer refused rather than failed technically. */
export function isUserRejectionMessage(message: string | null | undefined): boolean {
  if (!message) return false
  const lower = message.toLowerCase()
  if (lower.includes("4001")) return true
  return REJECTION_HINTS.some((hint) => lower.includes(hint))
}

/** Map raw nonce/sign/verify failures to UI-safe copy. Rejections get a retry hint. */
export function toFriendlyWalletAuthError(raw: string | null | undefined): string {
  if (!raw || !raw.trim()) return "Authentication failed. Please try again."
  if (isUserRejectionMessage(raw)) {
    return "Signature request was rejected. Reconnect and approve the signature to continue."
  }
  return raw
}

export interface UseWalletAuthOptions {
  mode: WalletAuthMode
  /** Override the post-auth destination (defaults per mode). */
  successRedirect?: string
  /** Set false to mount without auto-triggering (e.g. hidden tab). */
  enabled?: boolean
}

export interface UseWalletAuthResult {
  address: string | null
  activeWalletId: string | null
  isConnected: boolean
  isConnecting: boolean
  isAuthenticating: boolean
  /** Mode-aware error: loginError for login, registerError for register. */
  error: string | null
  flowStatus: AuthFlowStatus
  retry: () => Promise<void>
  reset: () => void
}

/**
 * Bridge: multi-wallet connection -> auth-flow signAndSubmit -> session + redirect.
 *
 * Watch the active multi-wallet entry. When it becomes connected, push the
 * address into auth-flow (`connectSuccess`) and run `signAndSubmit`
 * (POST /auth/nonce -> personal_sign -> POST /auth/verify|register, which
 * already sets session tokens). On `authenticated`, replace to the redirect
 * target. Failures land in the mode-scoped route error (loginError /
 * registerError) with user-rejected signatures mapped to friendly copy.
 */
export function useWalletAuth({
  mode,
  successRedirect,
  enabled = true,
}: UseWalletAuthOptions): UseWalletAuthResult {
  const router = useRouter()
  const toast = useToast()
  const [isAuthenticating, setIsAuthenticating] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)
  const handledKeyRef = useRef<string | null>(null)
  const busyRef = useRef(false)

  const activeWalletId = useMultiWalletStore((s) => s.activeWalletId)
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
  const isConnecting = useMultiWalletStore((s) => {
    const id = s.activeWalletId
    if (!id) return false
    return s.wallets[id]?.status === "connecting"
  })
  const routeError = useMultiWalletStore((s) =>
    mode === "login" ? s.loginError : s.registerError,
  )
  const flowStatus = useAuthFlowStore((s) => s.status)

  const destination = successRedirect ?? WALLET_AUTH_REDIRECTS[mode]

  // Keep the flow endpoint (verify vs register) aligned with the page.
  useEffect(() => {
    const flow = useAuthFlowStore.getState()
    if (flow.mode !== mode) {
      if (mode === "login") flow.startLoginFlow()
      else flow.startRegisterFlow()
    }
  }, [mode])

  const authenticate = useCallback(
    async (walletId: string, walletAddress: string) => {
      if (busyRef.current) return
      if (useAuthFlowStore.getState().isSigningInFlight) return
      busyRef.current = true
      setIsAuthenticating(true)
      setLocalError(null)
      const mw = useMultiWalletStore.getState()
      if (mode === "login") mw.clearLoginError()
      else mw.clearRegisterError()
      try {
        const flow = useAuthFlowStore.getState()
        if (flow.mode !== mode) {
          if (mode === "login") flow.startLoginFlow()
          else flow.startRegisterFlow()
        }
        useAuthFlowStore.getState().connectSuccess(walletId, walletAddress)
        await useAuthFlowStore.getState().signAndSubmit()
        const after = useAuthFlowStore.getState()
        if (after.status.status === "authenticated") {
          const mwAfter = useMultiWalletStore.getState()
          if (mode === "login") mwAfter.clearLoginError()
          else mwAfter.clearRegisterError()
          toast.success(mode === "login" ? "Welcome back!" : "Account created successfully!")
          router.replace(destination)
          return
        }
        const raw =
          after.status.status === "error"
            ? after.status.message
            : (after.error?.message ?? "Authentication failed")
        const friendly = toFriendlyWalletAuthError(raw)
        setLocalError(friendly)
        const mwErr = useMultiWalletStore.getState()
        if (mode === "login") mwErr.setLoginError(friendly)
        else mwErr.setRegisterError(friendly)
        toast.error(friendly)
      } catch (err: unknown) {
        const raw = err instanceof Error ? err.message : "Authentication failed"
        const friendly = toFriendlyWalletAuthError(raw)
        setLocalError(friendly)
        const mwErr = useMultiWalletStore.getState()
        if (mode === "login") mwErr.setLoginError(friendly)
        else mwErr.setRegisterError(friendly)
        toast.error(friendly)
      } finally {
        busyRef.current = false
        setIsAuthenticating(false)
      }
    },
    [mode, destination, router, toast],
  )

  // Connected address -> bridge exactly once per wallet+address pair.
  useEffect(() => {
    if (!enabled) return
    if (!isConnected || !address || !activeWalletId) {
      if (!isConnected) handledKeyRef.current = null
      return
    }
    if (useAuthFlowStore.getState().status.status === "authenticated") return
    const key = `${activeWalletId}:${address}`
    if (handledKeyRef.current === key) return
    if (busyRef.current) return
    if (useAuthFlowStore.getState().isSigningInFlight) return
    handledKeyRef.current = key
    void authenticate(activeWalletId, address)
  }, [enabled, isConnected, address, activeWalletId, authenticate])

  // If another path (e.g. concurrent tab) flips us to authenticated, follow it.
  useEffect(() => {
    if (!enabled) return
    if (flowStatus.status === "authenticated" && handledKeyRef.current !== null) {
      router.replace(destination)
    }
  }, [flowStatus, enabled, destination, router])

  const retry = useCallback(async () => {
    const mw = useMultiWalletStore.getState()
    const id = mw.activeWalletId
    const addr = id ? (mw.wallets[id]?.publicKey ?? null) : null
    if (!id || !addr) return
    handledKeyRef.current = `${id}:${addr}`
    await authenticate(id, addr)
  }, [authenticate])

  const reset = useCallback(() => {
    handledKeyRef.current = null
    busyRef.current = false
    setIsAuthenticating(false)
    setLocalError(null)
    const mw = useMultiWalletStore.getState()
    if (mode === "login") mw.clearLoginError()
    else mw.clearRegisterError()
    if (useAuthFlowStore.getState().status.status === "error") {
      useAuthFlowStore.getState().clearError()
    }
  }, [mode])

  const flowFallback =
    flowStatus.status === "error" ? flowStatus.message : null
  const error = localError ?? routeError ?? flowFallback ?? null

  return {
    address,
    activeWalletId,
    isConnected,
    isConnecting,
    isAuthenticating:
      isAuthenticating || flowStatus.status === "signing",
    error,
    flowStatus,
    retry,
    reset,
  }
}
