'use client'

import { Skeleton } from '@/components/ui/skeleton'
import { SkeletonScreen, SkeletonHeading, SkeletonStatCards, SkeletonListRows } from './skeleton-primitives'

/**
 * Exact skeleton for the payouts page: heading → summary stat cards →
 * payout schedule rows. Used by (dashboard)/payouts/loading.tsx.
 */
export function PayoutSkeleton() {
  return (
    <SkeletonScreen className="space-y-8 p-4 md:p-6">
      <div className="flex items-center justify-between gap-4">
        <SkeletonHeading />
        <Skeleton variant="rectangular" className="hidden sm:block h-10 w-36 shrink-0 rounded-xl" />
      </div>
      <SkeletonStatCards count={3} />
      <SkeletonListRows count={5} />
    </SkeletonScreen>
  )
}
