"use client"

import { useCallback, useEffect, useState } from "react"
import { logger } from "@/lib/logger"
import { useMultiWalletStore } from "@/stores/multi-wallet-store"
import { ensureHostedArcWallet } from "@/lib/wallet/ensure-hosted"
import { sendArcUSDCTransfer, ArcTransferError } from "@/lib/contributions/arc-transfer"
import { ARC_EXPLORER_URL } from "@/lib/constants"

function getProvider(): { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> } | null {
  if (typeof window === "undefined") return null
  const eth = (window as unknown as Record<string, unknown>).ethereum as
    | { request?: (args: { method: string; params?: unknown[] }) => Promise<unknown> }
    | undefined
  if (eth && typeof eth.request === "function") return eth as never
  return null
}

/** Native USDC (18 decimals) wei-hex to a short human string. */
export function formatWeiBalance(weiHex: string): string {
  try {
    const wei = BigInt(weiHex)
    const base = BigInt(10) ** BigInt(18)
    const whole = wei / base
    const frac = wei % base
    if (frac === BigInt(0)) return whole.toString()
    const fracStr = frac.toString().padStart(18, "0").slice(0, 6).replace(/0+$/, "")
    return fracStr ? `${whole}.${fracStr}` : whole.toString()
  } catch {
    return "0"
  }
}

export type SweepStatus =
  | { kind: "idle" }
  | { kind: "working"; step: string }
  | { kind: "done"; txHash: string }
  | { kind: "error"; message: string }

export function useLinkExternal() {
  const activeWalletId = useMultiWalletStore((s) => s.activeWalletId)
  const wallets = useMultiWalletStore((s) => s.wallets)
  const disconnect = useMultiWalletStore((s) => s.disconnect)
  const activeEntry = activeWalletId ? wallets[activeWalletId] : undefined
  const externalAddress =
    activeEntry?.status === "connected" || activeEntry?.status === "reconnecting"
      ? (activeEntry?.publicKey ?? null)
      : null

  const [externalBalance, setExternalBalance] = useState<string | null>(null)
  const [hostedAddress, setHostedAddress] = useState<string | null>(null)
  const [amount, setAmount] = useState("")
  const [status, setStatus] = useState<SweepStatus>({ kind: "idle" })

  const refreshBalances = useCallback(async () => {
    const provider = getProvider()
    if (provider && externalAddress) {
      try {
        const wei = (await provider.request({
          method: "eth_getBalance",
          params: [externalAddress, "latest"],
        })) as string
        setExternalBalance(formatWeiBalance(wei))
      } catch (e) {
        logger.warn("[link-external] balance read failed:", e)
        setExternalBalance(null)
      }
    } else {
      setExternalBalance(null)
    }
    try {
      const hosted = await ensureHostedArcWallet()
      setHostedAddress(hosted?.publicKey ?? null)
    } catch {
      setHostedAddress(null)
    }
  }, [externalAddress])

  useEffect(() => {
    void refreshBalances()
  }, [refreshBalances])

  const sweep = useCallback(async () => {
    if (!externalAddress || !hostedAddress) return
    const parsed = Number(amount)
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setStatus({ kind: "error", message: "Enter an amount greater than 0." })
      return
    }
    setStatus({ kind: "working", step: "Waiting for approval in your wallet…" })
    try {
      const txHash = await sendArcUSDCTransfer({
        from: externalAddress,
        to: hostedAddress,
        amount: parsed,
      })
      setStatus({ kind: "done", txHash })
      setAmount("")
      void refreshBalances()
    } catch (e) {
      const message =
        e instanceof ArcTransferError
          ? e.code === "user_rejected"
            ? "Transfer rejected in wallet. Nothing moved."
            : e.message
          : "Transfer failed. Nothing moved.";
      setStatus({ kind: "error", message })
    }
  }, [externalAddress, hostedAddress, amount, refreshBalances])

  const unlink = useCallback(() => {
    if (activeWalletId) disconnect(activeWalletId)
    setExternalBalance(null)
    setAmount("")
    setStatus({ kind: "idle" })
  }, [activeWalletId, disconnect])

  return {
    externalAddress,
    externalBalance,
    hostedAddress,
    amount,
    setAmount,
    status,
    sweep,
    unlink,
    refreshBalances,
    explorerTxUrl: (txHash: string) => `${ARC_EXPLORER_URL}/tx/${txHash}`,
  }
}
