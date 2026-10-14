"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { ARC_RPC_URL } from "@/lib/constants"

export type TxStatus = "pending" | "finalized" | "failed" | "timeout"

export interface TransferPollResult {
  status: TxStatus
  /** Number of poll attempts made so far. */
  attempts: number
}

export const POLL_INTERVAL_MS = 3_000
export const MAX_ATTEMPTS = 20 // 60 s before timeout

interface JsonRpcReceiptResponse {
  result?: { status?: string | number } | null
  error?: { code?: number; message?: string }
}

/**
 * Polls the Arc JSON-RPC endpoint until the given EVM txnHash reaches a
 * terminal status.
 *
 * Uses `eth_getTransactionReceipt` (plain fetch POST, no extra deps):
 * - receipt === null → not mined yet → keep polling (like NOT_FOUND before)
 * - receipt.status 0x1 → finalized
 * - receipt.status 0x0 → failed
 * - any RPC / network error → poll-continue
 * - MAX_ATTEMPTS exhausted → timeout
 *
 * @param txnHash - The Arc (0x…) transaction hash to watch. Pass null to skip.
 */
export function useTransferPoll(txnHash: string | null): TransferPollResult {
  const [status, setStatus] = useState<TxStatus>("pending")
  const [attempts, setAttempts] = useState(0)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const attemptsRef = useRef(0)
  const activeRef = useRef(true)

  const poll = useCallback(async () => {
    if (!txnHash || !activeRef.current) return

    try {
      const res = await fetch(ARC_RPC_URL, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "eth_getTransactionReceipt",
          params: [txnHash],
        }),
      })
      if (!res.ok) throw new Error(`RPC HTTP ${res.status}`)
      const json = (await res.json()) as JsonRpcReceiptResponse
      if (json?.error) throw new Error(json.error.message ?? "RPC error")
      const receipt = json?.result ?? null
      if (receipt) {
        const raw = String(receipt.status ?? "").toLowerCase()
        if (raw === "0x1" || raw === "0x01" || raw === "1") {
          setStatus("finalized")
          return
        }
        if (raw === "0x0" || raw === "0x00" || raw === "0") {
          setStatus("failed")
          return
        }
        // Receipt present but status missing/unrecognized — keep polling.
      }
      // result === null → pending, fall through to schedule next attempt.
    } catch {
      // Null receipt, RPC error, or network hiccup — keep polling
    }

    attemptsRef.current += 1
    setAttempts(attemptsRef.current)

    if (attemptsRef.current >= MAX_ATTEMPTS) {
      setStatus("timeout")
      return
    }

    if (activeRef.current) {
      timerRef.current = setTimeout(poll, POLL_INTERVAL_MS)
    }
  }, [txnHash])

  useEffect(() => {
    if (!txnHash) return

    activeRef.current = true
    attemptsRef.current = 0
    setStatus("pending")
    setAttempts(0)

    // Start first poll after a short delay to let the network process the tx
    timerRef.current = setTimeout(poll, 1_500)

    return () => {
      activeRef.current = false
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [txnHash, poll])

  return { status, attempts }
}
