import { DEFAULT_LOCALE } from "@/lib/formatters"

/**
 * USDC on Arc uses 18 decimals natively and is the gas token — native and
 * ERC-20 USDC are the SAME balance, so the wallet renders one row only.
 * Balances arrive from GET /wallets/balance as decimal strings.
 */
export function formatUsdc(
  value?: string | null,
  locale: string = DEFAULT_LOCALE,
): string {
  if (!value) return "0.00"
  const n = parseFloat(value)
  if (isNaN(n)) return "0.00"
  return n.toLocaleString(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export function formatActivityAmount(
  value: number,
  locale: string = DEFAULT_LOCALE,
): string {
  return value.toLocaleString(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

/** Arc addresses are 0x hex; anything else is a legacy Stellar key. */
export function isArcAddress(address: string): boolean {
  return /^0x[0-9a-fA-F]{40}$/.test(address.trim())
}
