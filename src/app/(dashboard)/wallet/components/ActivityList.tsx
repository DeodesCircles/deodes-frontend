"use client"

import Link from "next/link"
import { Clock, ExternalLink } from "lucide-react"
import { DEFAULT_LOCALE } from "@/lib/formatters"
import { getArcExplorerTxUrl } from "@/lib/explorer"
import { cn } from "@/lib/cn"
import type { ActivityItem } from "../hooks/useWalletOverview"
import { formatActivityAmount } from "../utils/wallet-format"

interface ActivityListProps {
  transactions: ActivityItem[]
  loading: boolean
  locale?: string
}

/** Recent activity from contributions + payouts. Amounts are USDC. */
export function ActivityList({ transactions, loading, locale }: ActivityListProps) {
  const activeLocale = locale || DEFAULT_LOCALE

  return (
    <section aria-label="Recent activity">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-heading text-base font-semibold text-foreground">
          <Clock className="h-4 w-4 text-aurora-violet" aria-hidden="true" />
          Recent Activity
        </h2>
        <div className="flex gap-3 text-xs text-muted-foreground">
          <Link href="/contributions" className="transition-colors hover:text-foreground">
            Contributions
          </Link>
          <Link href="/payouts" className="transition-colors hover:text-foreground">
            Payouts
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3" aria-label="Loading activity">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-12 animate-pulse rounded-xl bg-white/5" />
          ))}
        </div>
      ) : transactions.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">
          No activity yet.
        </p>
      ) : (
        <ul className="divide-y divide-white/[0.06]">
          {transactions.map((tx) => (
            <li key={tx.id} className="flex items-center justify-between gap-3 py-3.5">
              <div className="flex min-w-0 items-center gap-3">
                <span
                  aria-hidden="true"
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-heading text-sm font-bold",
                    tx.type === "received"
                      ? "bg-emerald-500/15 text-emerald-400"
                      : "bg-aurora-violet/15 text-aurora-violet",
                  )}
                >
                  {tx.type === "received" ? "+" : "−"}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm text-foreground">{tx.description}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(tx.createdAt).toLocaleDateString(activeLocale, {
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span
                  className={cn(
                    "whitespace-nowrap font-heading text-sm font-semibold",
                    tx.type === "received" ? "text-emerald-400" : "text-muted-foreground",
                  )}
                >
                  {tx.type === "received" ? "+" : "-"}
                  {formatActivityAmount(tx.amount, activeLocale)} USDC
                </span>
                {tx.txnHash && (
                  <a
                    href={getArcExplorerTxUrl(tx.txnHash)}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="View transaction in Arc explorer"
                    className="text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
