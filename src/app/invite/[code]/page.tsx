import type { Metadata } from "next"
import { absoluteUrl } from "@/lib/seo/site"
import InvitePage from "./invite-client"

// Per-record metadata for public invite links: every shared circle link
// unfurls with a description and OG tags instead of a bare URL.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }> | { code: string }
}): Promise<Metadata> {
  const resolved = await Promise.resolve(params)
  const code = typeof resolved.code === "string" ? resolved.code : "invite"
  const url = absoluteUrl(`/invite/${encodeURIComponent(code)}`)
  return {
    title: "Circle Invite — Deodes",
    description:
      "You've been invited to a Deodes savings circle. Review the circle and join with a passkey — no email, no seed phrase.",
    alternates: { canonical: url },
    openGraph: {
      title: "You're invited to save together on Deodes",
      description:
        "Join a rotating savings circle with USDC on Arc. Redeem your invite in under a minute.",
      url,
      type: "website",
    },
    twitter: {
      card: "summary",
      title: "You're invited to save together on Deodes",
      description:
        "Join a rotating savings circle with USDC on Arc. Redeem your invite in under a minute.",
    },
    robots: { index: false, follow: true },
  }
}

export default function Page() {
  return <InvitePage />
}
