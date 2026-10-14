"use client"

import Link from "next/link"
import { ExternalLink } from "lucide-react"
import { formatAddress, formatCurrency, formatDate, isArcTxnHash } from "@/lib/formatters"
import { getArcExplorerTxUrl } from "@/lib/explorer"
import type { Payout } from "@/types"

interface PayoutHistoryTableProps {
  payouts: Payout[]
}

/**
 * Payout history rows. Arc-only: amounts are Arc USDC, receipts link to the
 * Arc explorer, and recipient wallets render as truncated 0x addresses.
 */
export function PayoutHistoryTable({ payouts }: PayoutHistoryTableProps) {
  return (
    <ol className="border-t border-dotted border-foreground/20" data-testid="payout-history">
      {payouts.map((payout) => (
        <li
          key={payout.id}
          className="border-l-4 border-l-emerald-400 border-b border-b-dotted border-b-foreground/20 py-4 pl-4 pr-2"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href={`/circles/${payout.circleId}`}
                  className="font-heading text-sm font-semibold text-foreground underline decoration-emerald-400/60 decoration-2 underline-offset-4 hover:decoration-emerald-400"
                >
                  Circle {formatAddress(payout.circleId)}
                </Link>
                <span className="rounded-full bg-emerald-400/15 px-2.5 py-0.5 font-mono text-2xs font-semibold text-emerald-400">
                  #{payout.roundNumber}
                </span>
                <span className="rounded-full border border-aurora-violet/40 px-2.5 py-0.5 font-mono text-2xs font-semibold text-aurora-violet">
                  USDC · Arc
                </span>
              </div>
              <p className="mt-1.5 font-body text-2xs text-muted-foreground">
                To {formatAddress(payout.recipientId)} · {formatDate(payout.createdAt)}
                {payout.feeAmount != null && payout.feeAmount > 0 && (
                  <> · fee {formatCurrency(payout.feeAmount, "USDC")}</>
                )}
              </p>
            </div>
            <div className="text-right">
              <p className="font-mono text-xl font-bold text-emerald-400">
                +{formatCurrency(payout.amount, "USDC")}
              </p>
              {payout.txnHash ? (
                isArcTxnHash(payout.txnHash) ? (
                  <a
                    href={getArcExplorerTxUrl(payout.txnHash)}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 inline-flex items-center gap-1 font-mono text-2xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
                  >
                    {formatAddress(payout.txnHash)}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                ) : (
                  <span className="mt-1 block font-mono text-2xs text-muted-foreground">
                    {formatAddress(payout.txnHash)}
                  </span>
                )
              ) : (
                <span className="mt-1 block font-body text-2xs text-muted-foreground">
                  settling…
                </span>
              )}
            </div>
          </div>
        </li>
      ))}
    </ol>
  )
}
