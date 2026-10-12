'use client'

import { Skeleton } from '@/components/ui/skeleton'
import { SkeletonScreen } from './skeleton-primitives'

/**
 * Exact skeleton for the wallet page: address card → two gradient balance
 * tiles → 4 action pills → recent-activity timeline. Mirrors
 * (dashboard)/wallet/page.tsx (which also has inline row skeletons).
 */
export function WalletSkeleton() {
  return (
    <SkeletonScreen className="space-y-6">
      <div className="rounded-xl border border-border bg-card p-4 space-y-2">
        <Skeleton variant="text" className="h-3 w-24" />
        <Skeleton variant="rectangular" className="h-9 w-full rounded-lg" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[0, 1].map((i) => (
          <div key={i} className="rounded-xl border p-6 space-y-2">
            <Skeleton variant="text" className="h-3 w-12" />
            <Skeleton variant="rectangular" className="h-9 w-32 rounded" />
            <Skeleton variant="text" className="h-3 w-24" />
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        {[96, 96, 104, 96].map((w, i) => (
          <Skeleton key={i} variant="rectangular" className="h-10 rounded-xl" width={w} />
        ))}
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Skeleton variant="rectangular" className="h-5 w-36 rounded" />
          <div className="flex gap-3">
            <Skeleton variant="text" className="h-4 w-24" />
            <Skeleton variant="text" className="h-4 w-16" />
          </div>
        </div>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-4">
            <div className="h-2 w-2 rounded-full bg-muted" />
            <Skeleton variant="rectangular" className="h-10 flex-1 rounded" />
          </div>
        ))}
      </div>
    </SkeletonScreen>
  )
}
