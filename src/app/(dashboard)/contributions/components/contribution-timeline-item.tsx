"use client";

import { formatCurrency, formatDate } from "@/lib/formatters";
import { getArcExplorerTxUrl } from "@/lib/explorer";
import type { Contribution } from "@/types";

function statusPill(status: Contribution["status"]): string {
  switch (status) {
    case "confirmed":
      return "border-emerald-400/40 text-emerald-400";
    case "pending":
      return "border-amber-400/40 text-amber-400";
    case "failed":
      return "border-red-400/40 text-red-400";
    default:
      return "border-muted-foreground/30 text-muted-foreground";
  }
}

function shortHash(hash: string): string {
  return `${hash.slice(0, 10)}…${hash.slice(-6)}`;
}

export function ContributionTimelineItem({ contribution }: { contribution: Contribution }) {
  const txn = typeof contribution.txnHash === "string" ? contribution.txnHash : null;
  return (
    <li className="relative pl-8">
      <span aria-hidden="true" className="absolute left-2 top-2 h-2.5 w-2.5 rounded-full bg-aurora-violet" />
      <span aria-hidden="true" className="absolute bottom-[-8px] left-[13px] top-6 w-px bg-gradient-to-b from-aurora-violet/60 to-transparent" />
      <div className="border-l-4 border-l-aurora-violet pl-4 pb-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-lg font-bold">{formatCurrency(contribution.amount, "USDC")}</span>
          <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs ${statusPill(contribution.status)}`}>
            {contribution.status}
          </span>
          {contribution.onTime ? (
            <span className="inline-flex items-center rounded-full border border-emerald-400/30 px-2.5 py-0.5 text-xs">on time</span>
          ) : (
            <span className="inline-flex items-center rounded-full border border-amber-400/30 px-2.5 py-0.5 text-xs">late</span>
          )}
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Round #{contribution.roundNumber} · {formatDate(contribution.createdAt)}
        </p>
        {txn && (
          <a
            href={getArcExplorerTxUrl(txn)}
            target="_blank"
            rel="noreferrer"
            className="mt-1 inline-block font-mono text-xs text-aurora-violet underline underline-offset-2"
          >
            {shortHash(txn)}
          </a>
        )}
      </div>
    </li>
  );
}
