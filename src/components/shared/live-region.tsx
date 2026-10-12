"use client"

interface LiveRegionProps {
  /** Meaningful, human-readable status text — never raw spinner/loading state. */
  message: string
}

/**
 * Visually-hidden aria-live region for announcing async status changes
 * (loading, success, error) to assistive tech. Render once per flow and
 * update `message` as the flow progresses — screen readers announce the
 * new text whenever it changes.
 */
export function LiveRegion({ message }: LiveRegionProps) {
  return (
    <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
      {message}
    </div>
  )
}
