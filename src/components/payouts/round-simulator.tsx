"use client"

import { Dices, Gavel, ListOrdered, Vote } from "lucide-react"

// ── Round simulator ──────────────────────────────────────────────────────────
// Static 6-member × 4-round timelines showing how each payout mode plays out.
// Pure markup (no animation, no backend): distinct from the homepage cards,
// which keep the short versions. Data is illustrative — round counts and
// discounts are labeled as examples in the UI copy.

const MEMBERS = ["Ada", "Bola", "Chidi", "Dara", "Emeka", "Funke"] as const

interface RoundInfo {
  recipient: number
  note: string
}

interface ModeSim {
  id: string
  icon: typeof Dices
  name: string
  tag: string
  rounds: RoundInfo[]
  footnote: string
}

const SIMS: ModeSim[] = [
  {
    id: "random",
    icon: Dices,
    name: "Random",
    tag: "Provably fair",
    rounds: [
      { recipient: 2, note: "VRF draw" },
      { recipient: 5, note: "VRF draw" },
      { recipient: 0, note: "VRF draw" },
      { recipient: 3, note: "VRF draw" },
    ],
    footnote: "Example order — every round is a fresh on-chain draw nobody can rig.",
  },
  {
    id: "fixed",
    icon: ListOrdered,
    name: "Fixed order",
    tag: "Predictable",
    rounds: [
      { recipient: 0, note: "Seat 1" },
      { recipient: 1, note: "Seat 2" },
      { recipient: 2, note: "Seat 3" },
      { recipient: 3, note: "Seat 4" },
    ],
    footnote: "Sequence is locked at creation — everyone knows their round up front.",
  },
  {
    id: "auction",
    icon: Gavel,
    name: "Auction",
    tag: "Market-priced",
    rounds: [
      { recipient: 4, note: "wins −8%" },
      { recipient: 1, note: "wins −6%" },
      { recipient: 3, note: "wins −4%" },
      { recipient: 0, note: "wins −2%" },
    ],
    footnote: "Example bids — early access costs a discount; patience earns it back.",
  },
  {
    id: "vote",
    icon: Vote,
    name: "Vote-based",
    tag: "Community-led",
    rounds: [
      { recipient: 5, note: "4 of 6 votes" },
      { recipient: 2, note: "5 of 6 votes" },
      { recipient: 4, note: "3 of 6 votes" },
      { recipient: 1, note: "unanimous" },
    ],
    footnote: "Example tallies — the group directs funds where need is greatest.",
  },
]

export function MemberDot({ name, paid, isNext }: { name: string; paid: boolean; isNext: boolean }) {
  return (
    <span
      title={name}
      className={
        paid
          ? "flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-heading font-bold text-white gradient-bg-extended"
          : isNext
            ? "flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-heading font-bold border-2 border-dashed border-aurora-violet text-muted-foreground"
            : "flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-heading font-bold glass-strong text-muted-foreground"
      }
    >
      {name.slice(0, 1)}
    </span>
  )
}

export function RoundSimulator() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {SIMS.map((mode) => {
        const Icon = mode.icon
        return (
          <article
            key={mode.id}
            id={mode.id}
            className="glass-premium rounded-2xl p-6 md:p-8 scroll-mt-24"
          >
            <div className="flex items-start justify-between gap-3">
              <span className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-xl gradient-bg-extended flex items-center justify-center text-white">
                  <Icon className="h-4 w-4" />
                </span>
                <h2 className="font-heading text-xl font-semibold">{mode.name}</h2>
              </span>
              <span className="whitespace-nowrap rounded-full bg-accent px-2 py-1 text-xs font-medium text-accent-foreground">
                {mode.tag}
              </span>
            </div>

            <div className="mt-6 space-y-3">
              {mode.rounds.map((round, ri) => (
                <div key={ri} className="flex items-center gap-3">
                  <span className="w-14 shrink-0 font-mono text-xs text-muted-foreground">
                    R{ri + 1}
                  </span>
                  <div className="flex flex-1 items-center gap-1.5">
                    {MEMBERS.map((m, mi) => (
                      <MemberDot
                        key={m}
                        name={m}
                        paid={mi === round.recipient}
                        isNext={mi === (round.recipient + 1) % MEMBERS.length}
                      />
                    ))}
                  </div>
                  <span className="hidden sm:block w-24 shrink-0 text-right font-mono text-[11px] text-muted-foreground">
                    {round.note}
                  </span>
                </div>
              ))}
            </div>

            <p className="mt-2 font-mono text-[11px] text-muted-foreground sm:hidden">
              {mode.rounds.map((r) => r.note).join(" · ")}
            </p>
            <p className="mt-4 text-xs text-muted-foreground leading-relaxed">{mode.footnote}</p>
          </article>
        )
      })}
    </div>
  )
}
