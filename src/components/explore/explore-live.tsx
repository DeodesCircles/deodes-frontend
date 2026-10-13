"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { CircleCard } from "@/components/circles/circle-card";
import { CircleCardSkeleton } from "@/components/skeletons";
import { useExploreCircles } from "@/hooks/use-explore-circles";

const TYPE_FILTERS = ["all", "public", "private", "community", "premium"] as const;

/**
 * Live circle discovery band for the public Explore page. Shows live API
 * results with a Live badge, or the labeled mock showcase while no circles
 * exist yet. Clicking any card sends logged-out visitors to signup.
 */
export function ExploreLive() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [type, setType] = useState<(typeof TYPE_FILTERS)[number]>("all");
  const { circles, source, isLoading } = useExploreCircles(search, type);

  return (
    <div className="mt-16">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-widest text-muted-foreground">Live now</p>
          <h2 className="mt-2 font-heading text-2xl md:text-3xl font-semibold">
            Circles on Deodes
          </h2>
        </div>
        <span
          className={
            source === "live"
              ? "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-mono border border-emerald-400/30 text-emerald-400"
              : "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-mono border border-white/10 text-muted-foreground"
          }
        >
          <span className={`h-1.5 w-1.5 rounded-full ${source === "live" ? "bg-emerald-400 animate-pulse-glow" : "bg-muted-foreground/50"}`} />
          {source === "live" ? "Live" : "Preview — sample data"}
        </span>
      </div>

      <div className="mt-6 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search circles, organizers…"
            aria-label="Search circles"
            className="h-11 w-full rounded-xl glass-strong pl-11 pr-4 text-sm outline-none placeholder:text-muted-foreground/60"
          />
        </div>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by circle type">
          {TYPE_FILTERS.map((t) => (
            <button
              key={t}
              type="button"
              aria-pressed={type === t}
              onClick={() => setType(t)}
              className={
                type === t
                  ? "rounded-full px-4 py-2 text-xs font-heading font-semibold text-white gradient-bg-extended"
                  : "rounded-full px-4 py-2 text-xs font-heading font-medium text-muted-foreground glass-whisper hover:text-foreground transition-colors"
              }
            >
              {t === "all" ? "All" : t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true" aria-label="Loading circles">
          {Array.from({ length: 6 }, (_, i) => (
            <CircleCardSkeleton key={i} />
          ))}
        </div>
      ) : circles.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-white/[0.08] p-10 text-center">
          <p className="font-heading text-lg font-semibold">No circles match</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Try a different search — or start the first one.
          </p>
        </div>
      ) : (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {circles.map((circle) => (
            <CircleCard key={circle.id} circle={circle} onClick={() => router.push("/register")} />
          ))}
        </div>
      )}
      {source === "mock" && (
        <p className="mt-4 text-xs text-muted-foreground/70">
          Sample circles for preview — live circles appear here automatically once created.
        </p>
      )}
    </div>
  );
}
