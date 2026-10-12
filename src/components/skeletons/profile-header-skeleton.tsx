'use client'

import { Skeleton } from '@/components/ui/skeleton'

export function ProfileHeaderSkeleton() {
  return (
    <div className="space-y-4">
      {/* Profile cover and avatar area */}
      <div className="relative">
        <Skeleton variant="rectangular" className="h-32 w-full rounded-xl" />
        <div className="absolute bottom-0 left-4 -translate-y-1/2">
          <Skeleton variant="circular" width={96} height={96} />
        </div>
      </div>

      {/* Profile info section */}
      <div className="pl-4 pt-10 space-y-3">
        {/* Name and handle */}
        <div className="space-y-2">
          <Skeleton variant="heading" className="w-1/2" />
          <Skeleton variant="text" className="w-1/3" />
        </div>

        {/* Bio/description */}
        <div className="space-y-2">
          <Skeleton variant="text" className="w-full" />
          <Skeleton variant="text" className="w-4/5" />
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-4 gap-4 pt-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="space-y-1">
              <Skeleton variant="text" className="h-3 w-full" />
              <Skeleton variant="text" className="h-4 w-3/4" />
            </div>
          ))}
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 pt-2">
          <Skeleton variant="rectangular" className="h-9 flex-1 rounded-lg" />
          <Skeleton variant="rectangular" className="h-9 flex-1 rounded-lg" />
        </div>
      </div>
    </div>
  )
}
