"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { DollarSign, CircleAlert } from "lucide-react";
import { useContributions } from "@/hooks/use-contributions";
import { buildContributionSummary } from "@/lib/contributions/summary";
import { ContributionsSummaryStrip } from "./components/contributions-summary-strip";
import { ContributionTimelineItem } from "./components/contribution-timeline-item";
import { filterContributions } from "./utils/filter-contributions";
import type { Contribution } from "@/types";

const PAGE_SIZE = 20;

export default function ContributionsPage() {
  const [page, setPage] = useState(1);
  const [circleId, setCircleId] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"all" | Contribution["status"]>("all");

  const { data, isLoading, isError, refetch } = useContributions({
    page,
    limit: PAGE_SIZE,
    circleId: circleId.trim() || undefined,
  });

  const contributions = useMemo(() => data?.contributions ?? [], [data]);
  const meta = data?.meta;
  const summary = useMemo(() => buildContributionSummary(contributions), [contributions]);
  const visible = useMemo(
    () => filterContributions(contributions, search, status),
    [contributions, search, status],
  );

  if (isLoading) {
    return (
      <div className="space-y-6" data-testid="contributions-loading">
        <Skeleton variant="heading" width="40%" height={40} />
        <div className="space-y-3">
          <Skeleton variant="rectangular" height={80} />
          <Skeleton variant="rectangular" height={80} />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <EmptyState
        icon={<CircleAlert />}
        title="Failed to load contributions"
        description="Something went wrong while fetching your contributions. Please try again later."
        action={{ label: "Retry", onClick: () => refetch() }}
        className="border border-red-400/27"
      />
    );
  }

  if (contributions.length === 0) {
    return (
      <div className="space-y-8" data-testid="contributions-page">
        <PageHeader
          title="Contributions"
          description="Track your regular circle contributions and payment history."
        />
        <EmptyState
          icon={<DollarSign />}
          title="No contributions yet"
          description="Join a savings circle and make your first contribution to start building your on-chain financial record."
          action={{ label: "Browse Circles", onClick: () => (window.location.href = "/circles") }}
          className="border border-dashed border-aurora-violet/30"
        />
      </div>
    );
  }

  const totalPages = meta?.totalPages ?? 1;

  return (
    <div className="space-y-8" data-testid="contributions-page">
      <PageHeader
        title="Contributions"
        description="Track your regular circle contributions and payment history."
      />
      <ContributionsSummaryStrip summary={summary} />
      <div className="flex flex-wrap gap-3">
        <input
          value={circleId}
          onChange={(e) => {
            setCircleId(e.target.value);
            setPage(1);
          }}
          placeholder="Filter by circle ID"
          aria-label="Filter by circle ID"
          className="rounded-full border border-muted-foreground/20 bg-transparent px-4 py-1.5 text-sm"
        />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search round, id or tx hash"
          aria-label="Search contributions"
          className="rounded-full border border-muted-foreground/20 bg-transparent px-4 py-1.5 text-sm"
        />
      </div>
      <nav aria-label="Filter by status" className="flex gap-5 border-b border-muted-foreground/15 text-sm">
        {(["all", "confirmed", "pending", "failed", "late"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            aria-pressed={status === s}
            className={status === s ? "border-b-2 border-aurora-violet pb-2 font-semibold" : "pb-2 text-muted-foreground"}
          >
            {s}
          </button>
        ))}
      </nav>
      {visible.length === 0 ? (
        <p className="text-sm text-muted-foreground">No contributions match these filters.</p>
      ) : (
        <ol className="space-y-1">
          {visible.map((c) => (
            <ContributionTimelineItem key={c.id} contribution={c} />
          ))}
        </ol>
      )}
      <div className="flex items-center gap-3">
        <button
          disabled={page <= 1}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          className="rounded-full border px-4 py-1.5 text-sm disabled:opacity-40"
        >
          Previous
        </button>
        <span className="text-sm text-muted-foreground">
          Page {page} of {totalPages}
        </span>
        <button
          disabled={page >= totalPages}
          onClick={() => setPage((p) => p + 1)}
          className="rounded-full border px-4 py-1.5 text-sm disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  );
}
