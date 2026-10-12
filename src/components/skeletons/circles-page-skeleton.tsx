'use client'

import { Skeleton } from '@/components/ui/skeleton'
import { SkeletonScreen, SkeletonHeading } from './skeleton-primitives'
import { CircleCardSkeleton } from './circle-card-skeleton'

/**
 * Exact skeleton for the circles discovery page:
 * PageHeader (title + create action) → search input → type/currency
 * filter pills → 6 circle cards. Mirrors (dashboard)/circles/page.tsx.
 */
export function CirclesPageSkeleton() {
  return (
    <SkeletonScreen className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-2">
          <SkeletonHeading className="max-w-xs" />
          <Skeleton variant="text" className="w-2/3 max-w-md" />
        </div>
        <Skeleton variant="rectangular" className="h-10 w-32 shrink-0 rounded-xl" />
      </div>

      <Skeleton variant="rectangular" className="h-11 w-full rounded-xl" />

      <div className="p-4 rounded-xl border-l-4 border-l-aurora-violet space-y-3" aria-hidden="true">
        <div className="flex flex-wrap gap-1.5">
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} variant="rectangular" className="h-7 rounded-full" width={72 + (i % 3) * 12} />
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Skeleton variant="text" className="h-4 w-16" />
          <Skeleton variant="rectangular" className="h-7 w-20 rounded-full" />
          <Skeleton variant="rectangular" className="h-7 w-20 rounded-full" />
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <CircleCardSkeleton key={i} />
        ))}
      </div>
    </SkeletonScreen>
  )
}
