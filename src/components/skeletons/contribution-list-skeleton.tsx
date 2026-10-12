'use client'

import { Skeleton } from '@/components/ui/skeleton'

interface ContributionListSkeletonProps {
  count?: number
}

export function ContributionListSkeleton({ count = 5 }: ContributionListSkeletonProps) {
  return (
    <div className="space-y-3">
      {[...Array(count)].map((_, index) => (
        <div
          key={index}
          className="flex items-center gap-3 rounded-lg border border-border bg-card p-3"
        >
          {/* Avatar */}
          <Skeleton variant="circular" width={40} height={40} />

          {/* Contribution info */}
          <div className="flex-1 space-y-2 min-w-0">
            <Skeleton variant="heading" className="w-1/2" />
            <div className="flex gap-2">
              <Skeleton variant="text" className="h-3 w-1/4" />
              <Skeleton variant="text" className="h-3 w-1/4" />
            </div>
          </div>

          {/* Amount */}
          <div className="text-right space-y-2">
            <Skeleton variant="heading" className="h-5 w-24" />
            <Skeleton variant="text" className="h-3 w-20" />
          </div>
        </div>
      ))}
    </div>
  )
}
