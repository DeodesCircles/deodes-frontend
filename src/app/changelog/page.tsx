import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { buildRouteMetadata } from "@/lib/seo/route-metadata"
import { PublicLayout } from "@/components/layout/public-layout"

export const metadata: Metadata = buildRouteMetadata("/changelog")

// Sourced from the real repo history — every entry below shipped.
const entries = [
  {
    date: "Oct 2026",
    title: "Open site: explore, payout modes, DeoScore",
    desc: "Public pages for circle discovery, the four payout rules and reputation — nav links stop hitting login walls.",
  },
  {
    date: "Oct 2026",
    title: "Prime mega-nav + fat footer",
    desc: "Circle-style dropdown menus (Save, Earn), mobile accordions, seven-column footer with socials.",
  },
  {
    date: "Oct 2026",
    title: "Dense DEODES homepage",
    desc: "Marketplace-style landing: dual CTAs, invite-code search, trust strip, circle grid, payout cards, 5-step flow, DeoScore band.",
  },
  {
    date: "Oct 2026",
    title: "Zero-lag rotating hero",
    desc: "Centered Grow → Save → Earn → Rise on compositor-only animation; local fonts replace Google Fonts stalls.",
  },
  {
    date: "Oct 2026",
    title: "Arc rebrand",
    desc: "Deodes brand, Arc chain copy, DeoScore naming and deodes.com canonical across metadata and docs.",
  },
  {
    date: "Oct 2026",
    title: "Production serving",
    desc: "Minified builds behind the shared edge with automatic TLS — 89KB shared JS instead of 11MB dev bundles.",
  },
]

export default function ChangelogPage() {
  return (
    <PublicLayout>
      <div className="auroral-mesh min-h-screen">
        <main className="container-premium py-12">
          <p className="text-sm uppercase tracking-widest text-muted-foreground">Changelog</p>
          <h1 className="font-heading text-4xl md:text-6xl font-black tracking-tight mt-2">
            What <span className="gradient-text">shipped.</span>
          </h1>
          <div className="mt-10 max-w-3xl space-y-0">
            {entries.map((e, i) => (
              <div key={`${e.title}-${i}`} className="relative flex gap-5 pb-8 last:pb-0">
                <div className="flex flex-col items-center">
                  <span className="h-3 w-3 rounded-full gradient-bg-extended shrink-0 mt-1.5" />
                  {i < entries.length - 1 && <span className="mt-2 w-px flex-1 bg-white/10" />}
                </div>
                <div className="pb-1">
                  <p className="font-mono text-xs text-muted-foreground">{e.date}</p>
                  <h2 className="mt-1 font-heading text-lg font-semibold">{e.title}</h2>
                  <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{e.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-10">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm font-heading font-semibold hover:opacity-80 transition-all"
            >
              Back home <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </main>
      </div>
    </PublicLayout>
  )
}
