import type { Metadata } from "next"
import { headers } from "next/headers"
import { buildRouteMetadata } from "@/lib/seo/route-metadata"
import { HomeContent } from "@/components/home-content"

export const metadata: Metadata = buildRouteMetadata("/")

export default function House() {
  // Decided server-side so the app host never flashes the marketing hero:
  // first paint is already the correct shell, no client effect needed.
  const host = headers().get("host")?.split(":")[0].toLowerCase() ?? ""
  return <HomeContent isAppHost={host === "app.deodes.com"} />
}
