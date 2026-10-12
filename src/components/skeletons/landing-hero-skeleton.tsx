'use client'

import { Skeleton } from '@/components/ui/skeleton'
import { SkeletonScreen } from './skeleton-primitives'

/**
 * Hero-shaped fallback for the landing page while auth resolves. Matches the
 * real hero's footprint (badge, three headline lines, copy, two CTA bars) so
 * the footer never jumps to the top of the viewport on slow loads — the bug
 * where visitors saw the footer first.
 */
export function LandingHeroSkeleton() {
  return (
    <SkeletonScreen className="min-h-[92vh] flex flex-col justify-center">
      <div className="container-premium" aria-hidden="true">
        <Skeleton variant="text" className="h-3 w-48" />
        <div className="mt-6 space-y-3">
          <Skeleton variant="rectangular" className="h-12 md:h-16 xl:h-20 w-3/4 rounded-xl" />
          <Skeleton variant="rectangular" className="h-12 md:h-16 xl:h-20 w-1/2 rounded-xl" />
          <Skeleton variant="rectangular" className="h-12 md:h-16 xl:h-20 w-2/3 rounded-xl" />
        </div>
        <Skeleton variant="text" className="mt-8 h-5 max-w-2xl" />
        <div className="mt-10 flex flex-col sm:flex-row gap-4">
          <Skeleton variant="rectangular" className="h-14 w-full sm:w-56 rounded-2xl" />
          <Skeleton variant="rectangular" className="h-14 w-full sm:w-56 rounded-2xl" />
        </div>
      </div>
    </SkeletonScreen>
  )
}
