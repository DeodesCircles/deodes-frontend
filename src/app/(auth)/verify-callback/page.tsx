import type { Metadata } from "next"
import { buildRouteMetadata } from "@/lib/seo/route-metadata"
import VerifyCallbackPage from "./verify-callback-client"

export const metadata: Metadata = buildRouteMetadata("/verify-callback")

export default function Page() {
  return <VerifyCallbackPage />
}
