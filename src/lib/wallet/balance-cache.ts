/**
 * Balance Cache Manager
 *
 * Provides client-side caching with TTL and exponential backoff retry
 * for Stellar wallet account balance queries.
 *
 * Improvements over v1:
 * - Single-flight dedup: concurrent requests for the same address share one Promise
 * - Exponential backoff with ±20% jitter to prevent thundering herd
 * - Hard cap on retries (MAX_RETRIES_CAP = 5)
 * - Circuit breaker: 3 consecutive failures → 60 s cooldown per address
 * - Removed direct Horizon fallback (it bypassed circuit breaker and leaked testnet URLs)
 * - Stale cache returned when circuit is open, avoiding UI breakage
 *
 * Privacy guarantee: wallet addresses are ONLY ever sent to the first-party
 * proxy (/api/wallet/balance). No direct third-party (Horizon) fallback is
 * performed from the client — see issue #202.
 */

export interface WalletBalance {
  xlm: string
  usdc: string
}

interface CacheEntry {
  data: WalletBalance
  timestamp: number
}

export const BALANCE_CACHE_TTL_MS = 30_000
export const MAX_RETRIES = 3
export const MAX_RETRIES_CAP = 5
export const CIRCUIT_BREAKER_THRESHOLD = 3
export const CIRCUIT_BREAKER_RESET_MS = 60_000

const balanceCache = new Map<string, CacheEntry>()

// Single-flight registry: address → in-flight promise
const inFlight = new Map<string, Promise<WalletBalance>>()

export interface CircuitState {
  failures: number
  openedAt: number | null // null = closed
}

const circuitStates = new Map<string, CircuitState>()

function getCircuit(address: string): CircuitState {
  if (!circuitStates.has(address)) {
    circuitStates.set(address, { failures: 0, openedAt: null })
  }
  return circuitStates.get(address)!
}

function isCircuitOpen(address: string): boolean {
  const c = getCircuit(address)
  if (c.openedAt === null) return false
  if (Date.now() - c.openedAt >= CIRCUIT_BREAKER_RESET_MS) {
    // Half-open: allow one probe through, reset state
    c.openedAt = null
    c.failures = 0
    return false
  }
  return true
}

function recordSuccess(address: string): void {
  const c = getCircuit(address)
  c.failures = 0
  c.openedAt = null
}

function recordFailure(address: string): void {
  const c = getCircuit(address)
  c.failures += 1
  if (c.failures >= CIRCUIT_BREAKER_THRESHOLD) {
    c.openedAt = Date.now()
  }
}

/** Delay with ±20% jitter to avoid thundering herd */
export function delayWithJitter(ms: number): Promise<void> {
  const jitter = ms * 0.2 * (Math.random() * 2 - 1)
  return new Promise((resolve) => setTimeout(resolve, Math.max(0, ms + jitter)))
}

export interface FetchBalanceOptions {
  forceRefresh?: boolean
  maxRetries?: number
  initialDelayMs?: number
}

async function _doFetch(
  address: string,
  options: FetchBalanceOptions,
): Promise<WalletBalance> {
  const { maxRetries = MAX_RETRIES, initialDelayMs = 500 } = options

  const boundedRetries = Math.min(maxRetries, MAX_RETRIES_CAP)

  if (isCircuitOpen(address)) {
    const stale = balanceCache.get(address)
    if (stale) return stale.data
    throw new Error(
      `Circuit open for ${address}; balance fetch suspended for ${CIRCUIT_BREAKER_RESET_MS / 1000}s`,
    )
  }

  let lastError: Error | null = null
  let currentDelay = initialDelayMs

  for (let attempt = 0; attempt <= boundedRetries; attempt++) {
    try {
      if (attempt > 0) {
        await delayWithJitter(currentDelay)
        currentDelay *= 2
      }

      const response = await fetch(
        `/api/wallet/balance?address=${encodeURIComponent(address)}`,
      )

      if (response.status === 404) {
        const empty: WalletBalance = { xlm: "0", usdc: "0" }
        balanceCache.set(address, { data: empty, timestamp: Date.now() })
        recordSuccess(address)
        return empty
      }

      if (!response.ok) {
        throw new Error(`Balance request failed with status ${response.status}`)
      }

      const data: WalletBalance = await response.json()
      const result: WalletBalance = {
        xlm: data.xlm ?? "0",
        usdc: data.usdc ?? "0",
      }
      balanceCache.set(address, { data: result, timestamp: Date.now() })
      recordSuccess(address)
      return result
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err))
    }
  }

  // All retries exhausted
  recordFailure(address)

  // Return stale data rather than breaking UI
  const stale = balanceCache.get(address)
  if (stale) return stale.data

  throw lastError ?? new Error("Failed to fetch balance after retries")
}

/**
 * Fetch balance with caching, single-flight dedup, retry + jitter, and circuit breaker.
 */
export async function fetchBalanceWithBackoff(
  address: string,
  options: FetchBalanceOptions = {},
): Promise<WalletBalance> {
  const { forceRefresh = false } = options

  // 1. Serve from cache if still fresh
  if (!forceRefresh) {
    const cached = balanceCache.get(address)
    if (cached && Date.now() - cached.timestamp < BALANCE_CACHE_TTL_MS) {
      return cached.data
    }
  }

  // 2. Single-flight: return existing in-flight promise for this address
  if (!forceRefresh && inFlight.has(address)) {
    return inFlight.get(address)!
  }

  // 3. Start a new fetch, register for dedup, clean up when done
  const promise = _doFetch(address, options).finally(() => {
    inFlight.delete(address)
  })
  inFlight.set(address, promise)
  return promise
}

/** Clear cache (and circuit state) — useful for logout or testing */
export function clearBalanceCache(address?: string): void {
  if (address) {
    balanceCache.delete(address)
    circuitStates.delete(address)
    inFlight.delete(address)
  } else {
    balanceCache.clear()
    circuitStates.clear()
    inFlight.clear()
  }
}

/** Inspect cached balance — useful for testing */
export function getCachedBalance(address: string): CacheEntry | undefined {
  return balanceCache.get(address)
}

/** Inspect circuit state — useful for monitoring/testing */
export function getCircuitState(address: string): CircuitState {
  return getCircuit(address)
}
