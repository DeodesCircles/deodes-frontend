"use client";

import { useQuery } from "@tanstack/react-query";
import { get } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type { Circle } from "@/types";
import { getDynamicMockCircles } from "@/lib/circles/mock-circles";

export type ExploreSource = "live" | "mock";

interface CirclesListEnvelope {
  success?: boolean;
  data?: { circles?: Circle[] } | Circle[];
}

/**
 * Public circle discovery for /explore. No auth token is attached — the list
 * endpoint answers unauthenticated.
 *
 * Source resolution (`NEXT_PUBLIC_EXPLORE_SOURCE`, default `auto`):
 * - auto: live circles when the API returns any, otherwise the clearly
 *   labeled mock showcase. Real circles automatically take over the moment
 *   the first one is created.
 * - live: API only (empty state when none exist).
 * - mock: showcase pinned (useful for demos/screenshots).
 */
export function useExploreCircles(search = "", type = "all") {
  const forced = (process.env.NEXT_PUBLIC_EXPLORE_SOURCE ?? "auto").toLowerCase();

  const query = useQuery({
    queryKey: [...queryKeys.circles.all, "explore"],
    queryFn: async (): Promise<Circle[]> => {
      if (forced === "mock") return [];
      const res = await get<CirclesListEnvelope>("/circles", {
        params: { limit: 50 },
      });
      const data = res?.data;
      if (Array.isArray(data)) return data;
      if (data && Array.isArray(data.circles)) return data.circles;
      return [];
    },
    staleTime: 60_000,
    retry: 1,
  });

  const live = query.data ?? [];
  const useMock = forced === "mock" || (forced !== "live" && live.length === 0);
  const source: ExploreSource = useMock ? "mock" : "live";
  // Mock showcase stays dynamic (rounds advance, order rotates) so the page
  // never looks frozen while no real circles exist yet.
  const base = useMock ? getDynamicMockCircles() : live;

  const q = search.trim().toLowerCase();
  const circles = base.filter((c) => {
    if (type !== "all" && c.circleType !== type) return false;
    if (!q) return true;
    return (
      c.name.toLowerCase().includes(q) ||
      (c.description ?? "").toLowerCase().includes(q) ||
      (c.organizerName ?? "").toLowerCase().includes(q)
    );
  });

  return { circles, source, isLoading: query.isLoading, isError: query.isError };
}

export function resolveExploreSource(
  liveCount: number,
  forced: string,
): ExploreSource {
  if (forced === "mock") return "mock";
  if (forced === "live") return "live";
  return liveCount > 0 ? "live" : "mock";
}
