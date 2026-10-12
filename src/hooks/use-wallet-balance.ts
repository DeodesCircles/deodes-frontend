"use client"

/**
 * useWalletBalance
 *
 * Fetches and polls the real USDC/XLM balance for the connected wallet
 * via the first-party proxy (/api/wallet/balance).
 *
 * Features:
 * - Auto-fetches when `address` becomes available
 * - Polls every POLL_INTERVAL_MS while the tab is visible
 * - Manual `refresh()` for immediate refetch
 * - Exposes loading / error state
 * - Delegates caching + circuit-breaker to `fetchBalanceWithBackoff`
 */

import { useState, useEffect, useCallback, useRef } from "react"
import {
  fetchBalanceWithBackoff,
  type WalletBalance,
} from "@/lib/wallet/balance-cache"

export const POLL_INTERVAL_MS = 30_000 // 30 s — matches server-side cache TTL

export interface UseWalletBalanceReturn {
  balance: WalletBalance | null
  isLoading: boolean
  error: string | null
  refresh: () => void
  lastUpdatedAt: number | null
}

export function useWalletBalance(address: string | null | undefined): UseWalletBalanceReturn {
  const [balance, setBalance] = useState<WalletBalance | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchBalance = useCallback(
    async (forceRefresh = false) => {
      if (!address) return

      // Cancel any in-flight fetch triggered by a prior call
      abortRef.current?.abort()
      abortRef.current = new AbortController()

      setIsLoading(true)
      setError(null)

      try {
        const result = await fetchBalanceWithBackoff(address, { forceRefresh })
        setBalance(result)
        setLastUpdatedAt(Date.now())
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch balance")
      } finally {
        setIsLoading(false)
      }
    },
    [address],
  )

  // Start / restart polling whenever address changes
  useEffect(() => {
    if (!address) {
      setBalance(null)
      setError(null)
      setLastUpdatedAt(null)
      return
    }

    // Immediate fetch on mount / address change
    fetchBalance()

    // Poll while tab is visible
    function scheduleNext() {
      timerRef.current = setTimeout(() => {
        if (document.visibilityState !== "hidden") {
          fetchBalance()
        }
        scheduleNext()
      }, POLL_INTERVAL_MS)
    }

    scheduleNext()

    // Restart polling on tab visibility change
    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        fetchBalance()
      }
    }
    document.addEventListener("visibilitychange", handleVisibilityChange)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      document.removeEventListener("visibilitychange", handleVisibilityChange)
      abortRef.current?.abort()
    }
  }, [address, fetchBalance])

  const refresh = useCallback(() => {
    // Clear pending poll and do an immediate forced fetch
    if (timerRef.current) clearTimeout(timerRef.current)
    fetchBalance(true)
  }, [fetchBalance])

  return { balance, isLoading, error, refresh, lastUpdatedAt }
}
