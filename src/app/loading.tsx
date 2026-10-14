import { headers } from "next/headers"
import { DashboardSkeleton, MarketingSkeleton } from "@/components/skeletons"

/**
 * Host-aware loading screen.
 *
 * app.deodes.com must never flash the marketing (apex) preloader: an
 * authenticated user landing in the app would otherwise see deodes.com
 * branding and assume they were bounced out. App host gets the dashboard
 * skeleton; everything else keeps the marketing one.
 */
export default function Loading() {
  const host = headers().get("host")?.split(":")[0].toLowerCase() ?? ""
  if (host === "app.deodes.com") {
    return <DashboardSkeleton />
  }
  return <MarketingSkeleton />
}
