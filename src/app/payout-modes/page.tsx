import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRight, Dices, Gavel, ListOrdered, Vote } from "lucide-react"
import { buildRouteMetadata } from "@/lib/seo/route-metadata"
import { PublicLayout } from "@/components/layout/public-layout"
import { RoundSimulator } from "@/components/payouts/round-simulator"
import { Routes } from "@/lib/constants"

export const metadata: Metadata = buildRouteMetadata("/payout-modes")

const strip = [
  { icon: Dices, name: "Random", line: "Fresh draw, every round." },
  { icon: ListOrdered, name: "Fixed", line: "Your round, known day one." },
  { icon: Gavel, name: "Auction", line: "Bid urgency, earn patience." },
  { icon: Vote, name: "Vote", line: "Need directs the pool." },
]

const glossary: Array<[string, string, string]> = [
  ["Random", "VRF draw", "Groups that want pure fairness with zero politics."],
  ["Fixed order", "Locked sequence", "Planners who need their payout date up front."],
  ["Auction", "Highest discount wins", "Groups comfortable pricing urgency."],
  ["Vote-based", "Majority decides", "Communities built on mutual aid."],
]

export default function PayoutModesPage() {
  return (
    <PublicLayout>
      <div className="auroral-mesh min-h-screen">
        <main className="container-premium py-12">
          <p className="text-sm uppercase tracking-widest text-muted-foreground">Payout modes</p>
          <h1 className="font-heading text-4xl md:text-6xl font-black tracking-tight mt-2">
            Watch four rounds <span className="gradient-text">play out.</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mt-4">
            Same six savers, four different rules. Every rule is locked at creation and enforced
            by smart contracts — the organizer can&apos;t change it mid-circle.
          </p>
          <a href="#simulator" className="mt-4 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            See the simulation <span aria-hidden="true">↓</span>
          </a>

          <div className="mt-10 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {strip.map((s) => {
              const Icon = s.icon
              return (
                <div key={s.name} className="flex items-center gap-3 rounded-2xl border border-white/[0.08] px-4 py-3">
                  <span className="w-9 h-9 shrink-0 rounded-xl gradient-bg-extended flex items-center justify-center text-white">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span>
                    <span className="block text-sm font-heading font-semibold">{s.name}</span>
                    <span className="block text-xs text-muted-foreground">{s.line}</span>
                  </span>
                </div>
              )
            })}
          </div>

          <div id="simulator" className="mt-12 scroll-mt-24">
            <RoundSimulator />
          </div>

          <div className="mt-12">
            <h2 className="font-heading text-2xl md:text-3xl font-semibold">At a glance</h2>
            <div className="mt-6 overflow-x-auto rounded-2xl border border-white/[0.08]">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead>
                  <tr className="border-b border-white/[0.08] text-muted-foreground">
                    <th className="px-5 py-3 font-medium">Mode</th>
                    <th className="px-5 py-3 font-medium">How the winner is picked</th>
                    <th className="px-5 py-3 font-medium">Best for</th>
                  </tr>
                </thead>
                <tbody>
                  {glossary.map(([name, how, best]) => (
                    <tr key={name} className="border-b border-white/[0.04] last:border-0">
                      <td className="px-5 py-3 font-heading font-semibold">{name}</td>
                      <td className="px-5 py-3 text-muted-foreground">{how}</td>
                      <td className="px-5 py-3 text-muted-foreground">{best}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-12 text-center">
            <Link
              href={Routes.REGISTER}
              className="gradient-bg-premium h-12 px-8 rounded-2xl font-heading font-semibold text-white inline-flex items-center justify-center gap-2 hover:opacity-90 transition-all"
            >
              Pick your mode <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </main>
      </div>
    </PublicLayout>
  )
}
