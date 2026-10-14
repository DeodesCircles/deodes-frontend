"use client";

import { useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { PayoutSkeleton } from "@/components/skeletons";
import { Award, CircleAlert } from "lucide-react";
import { useLivePayouts } from "@/hooks/use-live-payouts";
import { formatCurrency } from "@/lib/formatters";
import { PayoutHistoryTable } from "./components/payout-history-table";
import { getCurrentPagePayoutTotal } from "./payout-summary";

const PAGE_SIZE = 20;

export default function PayoutsPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading, isError, refetch, isLive } = useLivePayouts({
    page,
    limit: PAGE_SIZE,
  });

  const payouts = data?.payouts ?? [];
  const meta = data?.meta as
    | { page?: number; limit?: number; total?: number; totalItems?: number; totalPages?: number }
    | undefined;
  const totalPages = meta?.totalPages ?? 0;
  const totalAll = meta?.total ?? meta?.totalItems ?? payouts.length;
  const pageTotal = getCurrentPagePayoutTotal(payouts);

  if (isLoading) {
    return (
      <div data-testid="payouts-loading">
        <PayoutSkeleton />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-8" data-testid="payouts-page">
        <PageHeader
          title="Payouts"
          description="View all circle payouts distributed to your wallet."
        />
        <EmptyState
          icon={<CircleAlert />}
          title="Failed to load payouts"
          description="Something went wrong while retrieving your payouts. Please try again."
          action={{ label: "Retry", onClick: () => refetch() }}
          className="border border-red-400/20"
        />
      </div>
    );
  }

  if (payouts.length === 0) {
    return (
      <div className="space-y-8" data-testid="payouts-page">
        <PageHeader
          title="Payouts"
          description="View all circle payouts distributed to your wallet."
        />
        <EmptyState
          icon={<Award />}
          title="No payouts received yet"
          description="Active round disbursements and completed circle payouts will appear here once distributed."
          action={{
            label: "View Circles",
            onClick: () => (window.location.href = "/circles"),
          }}
          className="border border-dashed border-aurora-violet/30"
        />
      </div>
    );
  }

  return (
    <div className="space-y-8" data-testid="payouts-page">
      <PageHeader
        title="Payouts"
        description="Round distributions settled to your Arc wallet in USDC."
        action={
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-mono text-2xs font-semibold ${
              isLive ? "bg-emerald-400/15 text-emerald-400" : "bg-amber-400/15 text-amber-400"
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${isLive ? "bg-emerald-400 animate-pulse" : "bg-amber-400"}`} />
            {isLive ? "Live" : "Offline"}
          </span>
        }
      />

      <section
        aria-label="Payout summary"
        className="border-y-2 border-emerald-400/40 bg-emerald-400/[0.06] px-5 py-4"
      >
        <div className="flex flex-wrap gap-x-10 gap-y-3">
          <div>
            <p className="font-body text-2xs uppercase tracking-widest text-muted-foreground">
              Total on this page
            </p>
            <p className="font-mono text-3xl font-bold text-emerald-400" data-testid="payout-page-total">
              +{formatCurrency(pageTotal, "USDC")}
            </p>
          </div>
          <div>
            <p className="font-body text-2xs uppercase tracking-widest text-muted-foreground">
              Number of payouts
            </p>
            <p className="font-mono text-3xl font-bold text-foreground" data-testid="payout-count">
              {payouts.length}
            </p>
          </div>
          <div>
            <p className="font-body text-2xs uppercase tracking-widest text-muted-foreground">
              All time
            </p>
            <p className="font-mono text-3xl font-bold text-foreground">
              {totalAll}
            </p>
          </div>
        </div>
      </section>

      <PayoutHistoryTable payouts={payouts} />

      {totalPages > 1 && (
        <nav
          aria-label="Payout pages"
          className="flex items-center justify-between border-t-2 border-aurora-violet/40 pt-3"
        >
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="border-b-2 border-transparent pb-1 font-body text-sm font-medium text-muted-foreground hover:text-foreground hover:border-aurora-violet disabled:opacity-40"
          >
            ← Previous
          </button>
          <span className="font-mono text-xs text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="border-b-2 border-transparent pb-1 font-body text-sm font-medium text-muted-foreground hover:text-foreground hover:border-aurora-violet disabled:opacity-40"
          >
            Next →
          </button>
        </nav>
      )}
    </div>
  );
}
