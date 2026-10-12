'use client'

import { Skeleton } from '@/components/ui/skeleton'

export function CircleCardSkeleton() {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 space-y-4">
      {/* Circle header with avatar and title */}
      <div className="flex items-start gap-3">
        <Skeleton variant="circular" width={40} height={40} />
        <div className="flex-1 space-y-2">
          <Skeleton variant="heading" />
          <Skeleton variant="text" className="w-2/3" />
        </div>
      </div>

      {/* Circle stats */}
      <div className="grid grid-cols-3 gap-2">
        <div className="space-y-1">
          <Skeleton variant="text" className="h-3 w-full" />
          <Skeleton variant="text" className="h-4 w-2/3" />
        </div>
        <div className="space-y-1">
          <Skeleton variant="text" className="h-3 w-full" />
          <Skeleton variant="text" className="h-4 w-2/3" />
        </div>
        <div className="space-y-1">
          <Skeleton variant="text" className="h-3 w-full" />
          <Skeleton variant="text" className="h-4 w-2/3" />
        </div>
      </div>

      {/* Progress bar */}
      <Skeleton variant="rectangular" className="h-2 w-full" />

      {/* Action button */}
      <Skeleton variant="rectangular" className="h-9 w-full rounded-lg" />
    </div>
  )
}
