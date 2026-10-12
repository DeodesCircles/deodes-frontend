import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRight, Landmark, Trophy } from "lucide-react"
import { buildRouteMetadata } from "@/lib/seo/route-metadata"
import { PublicLayout } from "@/components/layout/public-layout"
import { Routes } from "@/lib/constants"

export const metadata: Metadata = buildRouteMetadata("/deoscore")

const weights = [
  { label: "Streak — consecutive on-time payments", pct: 35 },
  { label: "Completions — successful circles", pct: 30 },
  { label: "Volume — total contributed", pct: 20 },
  { label: "Recency — recent activity", pct: 15 },
]

export default function DeoScorePage() {
  return (
    <PublicLayout>
      <div className="auroral-mesh min-h-screen">
        <main className="container-premium py-12">
          <p className="text-sm uppercase tracking-widest text-muted-foreground">DeoScore reputation</p>
          <h1 className="font-heading text-4xl md:text-6xl font-black tracking-tight mt-2">
            Good saving <span className="gradient-text">follows you.</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mt-4">
            DeoScore is a portable 0–1000 reputation score that lives on your wallet. Pay on time,
            complete circles, and your score opens bigger circles with lower collateral — anywhere
            on DEODES.
          </p>
          <a href="#breakdown" className="mt-4 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            See the breakdown <span aria-hidden="true">↓</span>
          </a>

          <div id="breakdown" className="mt-12 grid gap-12 lg:grid-cols-2 lg:items-start scroll-mt-24">
            <div className="space-y-4">
              {weights.map((w) => (
                <div key={w.label} className="glass-premium rounded-2xl p-5">
                  <div className="flex items-center justify-between gap-4 text-sm">
                    <span>{w.label}</span>
                    <span className="font-mono font-bold gradient-text">{w.pct}%</span>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/[0.06]">
                    <div
                      className="h-full rounded-full gradient-bg-extended"
                      style={{ width: `${w.pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="glass rounded-2xl p-8 border-l-4 border-l-aurora-violet">
              <h2 className="font-heading text-xl font-semibold mb-3 gradient-text">
                Scores above 600 unlock more
              </h2>
              <p className="text-muted-foreground leading-relaxed text-sm">
                High DeoScores qualify for premium circles, higher contribution limits and reduced
                collateral requirements. Your live score, history and tier live in the app.
              </p>
              <Link
                href={Routes.REGISTER}
                className="mt-6 inline-flex items-center gap-2 rounded-2xl px-6 py-3 text-sm font-heading font-semibold glass-strong hover:bg-white/[0.06] transition-all"
              >
                <Trophy className="h-4 w-4" /> Start building score
              </Link>
            </div>
          </div>

          <div className="mt-12">
            <h2 className="font-heading text-2xl md:text-3xl font-semibold">Raise your score</h2>
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {[
                { t: "Never miss a round", d: "Streak is the heaviest weight at 35%. Set reminders — one late payment resets the clock." },
                { t: "Finish what you start", d: "Completed circles count 30%. Seeing every circle through to payout compounds fast." },
                { t: "Stay active", d: "Recency matters. Regular contributors outrank dormant high-volume wallets." },
              ].map((tip) => (
                <div key={tip.t} className="rounded-2xl border border-white/[0.08] p-6">
                  <h3 className="font-heading font-semibold">{tip.t}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{tip.d}</p>
                </div>
              ))}
            </div>
          </div>

          <div id="governance" className="mt-16 glass rounded-2xl p-8 border-l-4 border-l-aurora-cyan scroll-mt-24">
            <h2 className="font-heading text-2xl font-semibold mb-3 flex items-center gap-2">
              <Landmark className="h-5 w-5" /> Reputation powers governance
            </h2>
            <p className="text-muted-foreground leading-relaxed text-sm max-w-3xl">
              DeoScore-weighted voting decides circle disputes, payout challenges and community
              proposals. Voting happens inside the app — connect your wallet to have your say.
            </p>
            <Link
              href="/governance"
              className="mt-6 inline-flex items-center gap-2 text-sm font-heading font-semibold hover:opacity-80 transition-all"
            >
              Open governance app <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </main>
      </div>
    </PublicLayout>
  )
}
