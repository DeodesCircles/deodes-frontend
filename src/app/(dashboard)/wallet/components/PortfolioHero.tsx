"use client"

import { formatUsdc } from "../utils/wallet-format"

interface PortfolioHeroProps {
  usdc?: string | null
  loading: boolean
  locale: string
}

/**
 * Standard fintech portfolio hero: one total in USD plus a single
 * USDC-on-Arc holding row. Native and ERC-20 USDC are the same balance,
 * so there is exactly one asset row — and no XLM anywhere.
 */
export function PortfolioHero({ usdc, loading, locale }: PortfolioHeroProps) {
  return (
    <section
      aria-label="Portfolio balance"
      className="relative overflow-hidden border-y border-aurora-violet/15 bg-gradient-to-br from-aurora-violet/10 via-transparent to-emerald-500/10 px-5 py-7 sm:px-8"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-10 -top-14 h-40 w-40 rounded-full bg-aurora-violet/10 blur-3xl"
      />
      <p className="text-xs font-heading font-medium uppercase tracking-widest text-muted-foreground">
        Total balance
      </p>
      {loading ? (
        <div className="mt-2 h-14 w-56 animate-pulse rounded-lg bg-white/10" />
      ) : (
        <p
          data-testid="portfolio-total"
          className="mt-1 font-heading text-5xl font-bold tracking-tight text-foreground sm:text-6xl"
        >
          ${formatUsdc(usdc, locale)}
          <span className="ml-2 align-middle font-body text-sm font-medium text-muted-foreground">
            USD
          </span>
        </p>
      )}
      <div className="mt-5 flex items-center justify-between gap-3 border-t border-white/10 pt-4">
        <div className="flex items-center gap-2.5">
          <span
            aria-hidden="true"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500/15 font-heading text-sm font-bold text-emerald-400"
          >
            $
          </span>
          <div>
            <p className="text-sm font-semibold text-foreground">USDC on Arc</p>
            <p className="text-xs text-muted-foreground">USD Coin · Arc network</p>
          </div>
        </div>
        {loading ? (
          <div className="h-6 w-24 animate-pulse rounded-full bg-white/10" />
        ) : (
          <p data-testid="portfolio-usdc-row" className="font-mono text-lg font-semibold text-foreground">
            {formatUsdc(usdc, locale)}
          </p>
        )}
      </div>
      <div
        aria-hidden="true"
        className="absolute bottom-0 left-0 h-0.5 w-full bg-gradient-to-r from-aurora-violet via-aurora-cyan to-emerald-400"
      />
    </section>
  )
}
