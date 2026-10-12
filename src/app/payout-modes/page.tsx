import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRight, Dices, Gavel, ListOrdered, Vote } from "lucide-react"
import { buildRouteMetadata } from "@/lib/seo/route-metadata"
import { PublicLayout } from "@/components/layout/public-layout"
import { Routes } from "@/lib/constants"

export const metadata: Metadata = buildRouteMetadata("/payout-modes")

const modes = [
  {
    id: "random",
    icon: Dices,
    name: "Random",
    tag: "Provably fair",
    how: "A verifiable random draw picks the recipient each round. Nobody — not even the organizer — can rig the order.",
    bestFor: "Groups that want pure fairness with zero politics.",
  },
  {
    id: "fixed",
    icon: ListOrdered,
    name: "Fixed order",
    tag: "Predictable",
    how: "The payout sequence is set when the circle is created and enforced on-chain. Everyone knows their round up front.",
    bestFor: "Planners who need to know exactly when their payout lands.",
  },
  {
    id: "auction",
    icon: Gavel,
    name: "Auction",
    tag: "Market-priced",
    how: "Classic chit-fund mechanics: members bid the discount they'll accept, the highest discount wins the pool minus the bid. Early access has a price; patience earns a premium.",
    bestFor: "Groups comfortable letting the market price urgency.",
  },
  {
    id: "vote",
    icon: Vote,
    name: "Vote-based",
    tag: "Community-led",
    how: "Members vote the recipient each round. Useful when need is uneven — the group directs funds where they matter most.",
    bestFor: "Communities built on mutual aid, not just savings.",
  },
]

export default function PayoutModesPage() {
  return (
    <PublicLayout>
      <div className="auroral-mesh min-h-screen">
        <main className="container-premium py-12">
          <p className="text-sm uppercase tracking-widest text-muted-foreground">Payout modes</p>
          <h1 className="font-heading text-4xl md:text-6xl font-black tracking-tight mt-2">
            Four ways the <span className="gradient-text">pool finds you.</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mt-4">
            Every DEODES circle picks one payout rule at creation. The rule is enforced by smart
            contracts — the organizer can&apos;t change it mid-circle.
          </p>
          <a href="#random" className="mt-4 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            Compare the modes <span aria-hidden="true">↓</span>
          </a>

          <div className="mt-12 grid gap-4 md:grid-cols-2">
            {modes.map((m) => {
              const Icon = m.icon
              return (
                <article
                  key={m.id}
                  id={m.id}
                  className="glass-premium rounded-2xl p-6 md:p-8 tilt-hover scroll-mt-24"
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="w-12 h-12 rounded-2xl gradient-bg-extended flex items-center justify-center text-white">
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="whitespace-nowrap rounded-full bg-accent px-2 py-1 text-xs font-medium text-accent-foreground">
                      {m.tag}
                    </span>
                  </div>
                  <h2 className="mt-5 font-heading text-2xl font-semibold">{m.name}</h2>
                  <p className="mt-2 text-muted-foreground text-sm leading-relaxed">{m.how}</p>
                  <p className="mt-4 text-sm">
                    <span className="text-muted-foreground">Best for: </span>
                    {m.bestFor}
                  </p>
                </article>
              )
            })}
          </div>

          <div className="mt-12 text-center">
            <Link
              href={Routes.REGISTER}
              className="gradient-bg-premium h-12 px-8 rounded-2xl font-heading font-semibold text-white inline-flex items-center justify-center gap-2 hover:opacity-90 transition-all"
            >
              Pick your mode <ArrowRight className="h-4 w-4" />
            </Link>
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
                  {modes.map((m) => (
                    <tr key={m.id} className="border-b border-white/[0.04] last:border-0">
                      <td className="px-5 py-3 font-heading font-semibold">{m.name}</td>
                      <td className="px-5 py-3 text-muted-foreground">{m.how}</td>
                      <td className="px-5 py-3 text-muted-foreground">{m.bestFor}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
    </PublicLayout>
  )
}
