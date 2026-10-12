import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRight, CirclePlus, Compass, Crown, Globe, Lock, Users } from "lucide-react"
import { buildRouteMetadata } from "@/lib/seo/route-metadata"
import { PublicLayout } from "@/components/layout/public-layout"
import { Routes } from "@/lib/constants"

export const metadata: Metadata = buildRouteMetadata("/explore")

const types = [
  {
    id: "public",
    icon: Globe,
    name: "Public circles",
    desc: "Open to anyone meeting the minimum DeoScore. New rounds start regularly — join from the app.",
    meta: "Permissionless",
  },
  {
    id: "private",
    icon: Lock,
    name: "Private circles",
    desc: "Invite-only via link or code. Ask your organizer for an invite, then redeem it in the app.",
    meta: "Invite-only",
  },
  {
    id: "community",
    icon: Users,
    name: "Community circles",
    desc: "Token-gated circles for DAOs and holder communities, guarded by multi-sig.",
    meta: "Token-gated",
  },
  {
    id: "premium",
    icon: Crown,
    name: "Premium circles",
    desc: "Higher limits, priority support and collateral. A strong DeoScore gets you in.",
    meta: "Collateralized",
  },
]

export default function ExplorePage() {
  return (
    <PublicLayout>
      <div className="auroral-mesh min-h-screen">
        <main className="container-premium py-12">
          <p className="text-sm uppercase tracking-widest text-muted-foreground">Explore</p>
          <h1 className="font-heading text-4xl md:text-6xl font-black tracking-tight mt-2">
            Savings circles, <span className="gradient-text">open to all.</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mt-4">
            Browse the kinds of circles running on DEODES. Live discovery with real-time seats
            and rounds lives inside the app — create your passkey wallet to step in.
          </p>
          <a href="#types" className="mt-4 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            See what&apos;s inside <span aria-hidden="true">↓</span>
          </a>
          <div className="mt-8 flex flex-col sm:flex-row gap-4">
            <Link
              href={Routes.REGISTER}
              className="gradient-bg-premium h-12 px-8 rounded-2xl font-heading font-semibold text-white inline-flex items-center justify-center gap-2 hover:opacity-90 transition-all"
            >
              Start saving <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/how-it-works"
              className="h-12 px-8 rounded-2xl font-heading font-medium inline-flex items-center justify-center glass-strong hover:bg-white/[0.06] transition-all"
            >
              How circles work
            </Link>
          </div>

          <div id="types" className="mt-16 grid gap-4 md:grid-cols-2 scroll-mt-24">
            {types.map((c) => {
              const Icon = c.icon
              return (
                <div key={c.name} id={c.id} className="glass-premium rounded-2xl p-6 md:p-8 tilt-hover scroll-mt-24">
                  <div className="w-12 h-12 rounded-2xl gradient-bg-extended flex items-center justify-center text-white mb-5">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h2 className="font-heading text-xl font-semibold mb-2">{c.name}</h2>
                  <p className="text-muted-foreground text-sm leading-relaxed">{c.desc}</p>
                  <span className="mt-4 inline-block rounded-full px-3 py-1 text-xs font-mono border border-white/10 text-muted-foreground">
                    {c.meta}
                  </span>
                </div>
              )
            })}
          </div>

          <div className="mt-12 rounded-2xl border border-white/[0.08] p-8 text-center">
            <Compass className="h-8 w-8 mx-auto text-muted-foreground" />
            <h2 className="mt-4 font-heading text-2xl font-semibold">Live seats change every round</h2>
            <p className="mt-2 text-muted-foreground max-w-xl mx-auto text-sm">
              Circle rosters, contribution progress and open seats update in real time. Sign in to
              see what&apos;s open right now.
            </p>
            <Link
              href={Routes.REGISTER}
              className="mt-6 inline-flex items-center gap-2 rounded-2xl px-6 py-3 text-sm font-heading font-semibold glass-strong hover:bg-white/[0.06] transition-all"
            >
              <CirclePlus className="h-4 w-4" /> Join the app
            </Link>
          </div>

          <div className="mt-12">
            <h2 className="font-heading text-2xl md:text-3xl font-semibold">How joining works</h2>
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {[
                { n: "1", t: "Create your wallet", d: "One passkey tap — Face ID or fingerprint. No email, no seed phrase." },
                { n: "2", t: "Pick a circle", d: "Choose a type above, or redeem an organizer's invite code." },
                { n: "3", t: "Contribute each round", d: "Lock USDC per round on Arc and watch your DeoScore climb." },
              ].map((s) => (
                <div key={s.n} className="rounded-2xl border border-white/[0.08] p-6">
                  <p className="font-mono text-xl font-bold gradient-text">{s.n}</p>
                  <h3 className="mt-3 font-heading font-semibold">{s.t}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{s.d}</p>
                </div>
              ))}
            </div>
            <p className="mt-6 text-sm text-muted-foreground">
              Still curious? <Link href="/faq" className="hover:text-foreground underline underline-offset-4">Read the FAQ</Link>
              {" "}or <Link href="/how-it-works" className="hover:text-foreground underline underline-offset-4">see how it works</Link>.
            </p>
          </div>
        </main>
      </div>
    </PublicLayout>
  )
}
