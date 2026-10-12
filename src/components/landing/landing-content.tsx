"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import {
  Shield,
  Globe,
  Award,
  Zap,
  Shuffle,
  Coins,
  ArrowRight,
  Search,
  Users,
  Lock,
  Crown,
  Dices,
  ListOrdered,
  Gavel,
  Vote,
  Wallet,
  CirclePlus,
  HandCoins,
  Trophy,
  BadgeCheck,
  FileLock2,
} from "lucide-react"
import { Routes } from "@/lib/constants"
import { useTranslate } from "@/lib/locale/context"
import { MemberDot } from "@/components/payouts/round-simulator"
import { Marquee } from "@/components/landing/marquee"
import { useAutoDrift } from "@/hooks/use-auto-drift"

// ── DEODES landing: dense marketplace-style page ─────────────────────────────
// Structure references: sckoll.com (two-sided paths, search, stats strip,
// category grid, numbered flow, trust layer) + agentsdb apps/web (black hero,
// trust strip, top-cards band, CTA band). Content is DEODES: ROSCA savings
// circles on Arc with USDC + DeoScore reputation.

const stats = [
  { value: "1.7B+", label: "unbanked adults served" },
  { value: "4", label: "payout modes" },
  { value: "0.5%", label: "protocol fee on payouts" },
  { value: "1000", label: "max DeoScore reputation" },
]

const circleTypes = [
  {
    icon: Globe,
    name: "Public circles",
    desc: "Anyone meeting the minimum DeoScore can join. Permissionless.",
    meta: "Permissionless",
    colSpan: "lg:col-span-2",
    featured: true,
  },
  {
    icon: Lock,
    name: "Private circles",
    desc: "Invite-only via link or code. Save with people you trust.",
    meta: "Invite-only",
    colSpan: "lg:col-span-1",
  },
  {
    icon: Users,
    name: "Community circles",
    desc: "Token-gated for DAOs and holder communities. Multi-sig guarded.",
    meta: "Token-gated",
    colSpan: "lg:col-span-1",
  },
  {
    icon: Crown,
    name: "Premium circles",
    desc: "Higher limits, priority support, collateralized. Permissioned.",
    meta: "Collateralized",
    colSpan: "lg:col-span-2",
    featured: true,
  },
]

const steps = [
  {
    n: "01",
    title: "Create your signal",
    desc: "Sign in with a passkey — Face ID or fingerprint. Your Arc wallet is created automatically. No email, no seed phrase, no KYC.",
  },
  {
    n: "02",
    title: "Join or start a circle",
    desc: "Browse public circles, redeem an invite code, or spin up your own with daily, weekly or monthly rounds.",
  },
  {
    n: "03",
    title: "Contribute USDC",
    desc: "Lock in your contribution each round on Arc. Sub-cent fees, enforced on-chain — late fees and grace periods up front.",
  },
  {
    n: "04",
    title: "Receive your payout",
    desc: "Random draw, fixed order, auction win or community vote — the pool lands in your wallet when your turn comes.",
  },
  {
    n: "05",
    title: "Grow your DeoScore",
    desc: "Every on-time payment builds portable 0–1000 reputation that unlocks bigger circles and lower collateral.",
  },
]

const scoreWeights = [
  { label: "Streak — consecutive on-time payments", pct: 35 },
  { label: "Completions — successful circles", pct: 30 },
  { label: "Volume — total contributed", pct: 20 },
  { label: "Recency — recent activity", pct: 15 },
]

const trustItems = [  {
    icon: FileLock2,
    title: "Enforced on-chain",
    desc: "Arc smart contracts hold contributions and release payouts. No custodian, no middleman to trust.",
  },
  {
    icon: BadgeCheck,
    title: "Portable reputation",
    desc: "DeoScore follows your wallet for life — across every circle, community and app on DEODES.",
  },
  {
    icon: HandCoins,
    title: "Sub-cent economics",
    desc: "Arc settles for fractions of a cent with USDC. A flat 0.5% protocol fee only on payouts.",
  },
]

// ── Zero-lag rotating hero word ──────────────────────────────────────────────
// Compositor-only animation (transform + opacity): no layout, no paint, no
// gradient re-raster. Each word carries its own static gradient, painted
// once — the swap animation never touches pixels. No glow: the words stay
// crisp at display sizes.
const GROW_WORDS = [
  { word: "Grow.", gradient: "gradient-text-extended" },
  { word: "Earn.", gradient: "gradient-text-gold" },
  { word: "Rise.", gradient: "gradient-text-cyan" },
  { word: "Win.", gradient: "gradient-text" },
]

function RotatingGrow() {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % GROW_WORDS.length)
    }, 2600)
    return () => clearInterval(id)
  }, [])

  const current = GROW_WORDS[index]

  return (
    <span className="block text-left" aria-live="polite">
      <span
        key={index}
        className={`grow-word ${current.gradient} font-display text-5xl md:text-7xl xl:text-8xl font-black tracking-tight`}
      >
        {current.word}
      </span>
    </span>
  )
}

// ── Round-ledger motif ───────────────────────────────────────────────────────
// The page's signature device: member dots marching across rounds. Thin
// divider variant between sections; full interactive strip in the payout band.
// Static markup + instant state only — zero animation cost.
const LEDGER_MEMBERS = ["Ada", "Bola", "Chidi", "Dara", "Emeka", "Funke"] as const

function LedgerDivider({ caption }: { caption: string }) {
  return (
    <div className="relative z-10 py-10" aria-hidden="true">
      <div className="container-premium flex items-center gap-4">
        <span className="h-px flex-1 bg-white/[0.08]" />
        <span className="flex items-center gap-1.5">
          {LEDGER_MEMBERS.slice(0, 5).map((m, i) => (
            <span key={m} className="flex items-center gap-1.5">
              <span
                className={
                  i === 2
                    ? "flex h-2.5 w-2.5 rounded-full gradient-bg-extended"
                    : "flex h-2 w-2 rounded-full bg-white/15"
                }
              />
              {i < 4 && <span className="h-px w-4 bg-white/15" />}
            </span>
          ))}
        </span>
        <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground/70">
          {caption}
        </span>
        <span className="h-px flex-1 bg-white/[0.08]" />
      </div>
    </div>
  )
}

const STRIP_MODES = [
  { id: "random", icon: Dices, name: "Random", order: [2, 5, 0, 3], note: "VRF draw" },
  { id: "fixed", icon: ListOrdered, name: "Fixed", order: [0, 1, 2, 3], note: "Locked seats" },
  { id: "auction", icon: Gavel, name: "Auction", order: [4, 1, 3, 0], note: "Top discount" },
  { id: "vote", icon: Vote, name: "Vote", order: [5, 2, 4, 1], note: "Majority" },
] as const

function RoundStrip() {
  const [modeId, setModeId] = useState<(typeof STRIP_MODES)[number]["id"]>("random")
  const mode = STRIP_MODES.find((m) => m.id === modeId) ?? STRIP_MODES[0]

  return (
    <div>
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Preview a payout mode">
        {STRIP_MODES.map((m) => {
          const Icon = m.icon
          return (
            <button
              key={m.id}
              type="button"
              role="tab"
              aria-selected={modeId === m.id}
              onClick={() => setModeId(m.id)}
              className={
                modeId === m.id
                  ? "flex items-center gap-2 rounded-full px-5 py-2 text-sm font-heading font-semibold text-white gradient-bg-extended"
                  : "flex items-center gap-2 rounded-full px-5 py-2 text-sm font-heading font-medium text-muted-foreground glass-whisper hover:text-foreground transition-colors"
              }
            >
              <Icon className="h-4 w-4" />
              {m.name}
            </button>
          )
        })}
      </div>
      <div key={mode.id} className="mt-8 rounded-2xl border border-white/[0.08] bg-card p-6 md:p-8">
        <div className="space-y-3">
          {[0, 1, 2, 3].map((ri) => (
            <div key={ri} className="flex items-center gap-3">
              <span className="w-10 shrink-0 font-mono text-xs text-muted-foreground">R{ri + 1}</span>
              <div className="flex flex-1 items-center gap-1.5 overflow-x-auto">
                {LEDGER_MEMBERS.map((m, mi) => (
                  <MemberDot key={m} name={m} paid={mi === mode.order[ri]} isNext={false} />
                ))}
              </div>
              <span className="hidden sm:block w-28 shrink-0 text-right font-mono text-[11px] text-muted-foreground">
                {mode.note}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            Same six savers, different rule. Full round-by-round simulation:
          </p>
          <Link
            href="/payout-modes"
            className="inline-flex items-center gap-2 text-sm font-heading font-semibold hover:opacity-80 transition-all"
          >
            Open the simulator <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  )
}

export function LandingContent() {
  const { t } = useTranslate()
  const railRef = useAutoDrift<HTMLDivElement>(28)

  return (
    <>
      <div className="auroral-mesh min-h-screen">
        {/* ═══ HERO — left-aligned, zero-lag rotating word ═══ */}
        <section className="relative z-10 min-h-[92vh] flex flex-col justify-center">
          <div className="container-premium">
            <p className="font-heading text-xs tracking-[0.3em] uppercase text-muted-foreground mb-6">
              {t("landing.badge")}
            </p>
            <h1>
              <span className="font-display text-5xl md:text-7xl xl:text-8xl font-black tracking-tighter block">
                {t("landing.saveTogether")}
              </span>
              <RotatingGrow />
              <span className="font-display text-5xl md:text-7xl xl:text-8xl font-black tracking-tighter block">
                {t("landing.together")}
              </span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mt-8">{t("landing.heroDesc")}</p>

            {/* Dual CTAs: savers + organizers (sckoll two-sided pattern) */}
            <div className="mt-10 flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
              <Link
                href={Routes.REGISTER}
                className="gradient-bg-premium h-14 px-10 rounded-2xl text-lg font-heading font-semibold text-white inline-flex items-center justify-center gap-2 holo-glow hover:opacity-90 transition-all shadow-[0_0_40px_rgb(var(--premium-gold)/0.25)]"
              >
                {t("landing.launchApp")} <ArrowRight className="h-5 w-5" />
              </Link>
              <Link
                href="/explore"
                className="holo-border h-14 px-10 rounded-2xl text-lg font-heading font-medium text-foreground inline-flex items-center justify-center glass-strong hover:bg-white/[0.06] transition-all"
              >
                Explore circles
              </Link>
            </div>

            {/* Invite-code search (sckoll search-bar analog) */}
            <form
              className="mt-8 flex max-w-xl items-center gap-2"
              action="/invite"
              method="get"
              onSubmit={(e) => {
                const input = (e.currentTarget.elements as unknown as { code?: { value: string } })
                  .code
                if (input?.value) {
                  e.preventDefault()
                  window.location.href = `/invite/${encodeURIComponent(input.value.trim())}`
                }
              }}
            >
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  name="code"
                  placeholder="Have an invite code? Paste it here…"
                  className="h-12 w-full rounded-2xl glass-strong pl-11 pr-4 text-sm text-foreground placeholder:text-muted-foreground/60 outline-none focus:holo-border"
                />
              </div>
              <button
                type="submit"
                className="h-12 shrink-0 rounded-2xl px-6 text-sm font-heading font-semibold glass-strong hover:bg-white/[0.06] transition-all"
              >
                Join
              </button>
            </form>

            {/* Settlement trust strip (arc.io logo-wall pattern) */}
            <div className="mt-12 flex flex-wrap items-center gap-x-8 gap-y-4">
              <span className="font-mono text-[11px] uppercase tracking-[0.25em] text-muted-foreground">
                Settles on
              </span>
              <span className="flex items-center gap-2">
                <img src="/arc-logo.svg" alt="Arc" className="h-6 w-6" />
                <span className="font-heading font-bold tracking-tight">Arc</span>
              </span>
              <span className="font-mono text-[11px] uppercase tracking-[0.25em] text-muted-foreground">
                USDC gas
              </span>
              <span className="font-mono text-[11px] uppercase tracking-[0.25em] text-muted-foreground">
                Sub-second finality
              </span>
              <span className="font-mono text-[11px] uppercase tracking-[0.25em] text-muted-foreground">
                Predictable fees
              </span>
            </div>
          </div>
        </section>

        <Marquee />

        {/* ═══ TRUST STRIP (agentsdb stat-band pattern) ═══ */}
        <section className="relative z-10 border-y border-white/[0.06]">
          <div className="container-premium grid grid-cols-2 gap-6 py-12 text-center sm:grid-cols-4">
            {stats.map((s) => (
              <div key={s.label}>
                <p className="font-heading text-3xl md:text-4xl font-black tracking-tight gradient-text">
                  {s.value}
                </p>
                <p className="mt-1 text-xs uppercase tracking-widest text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ═══ VOICES — illustrative saver stories (labeled as such) ═══ */}
        <section className="relative z-10 py-24 md:py-32">
          <div className="container-premium">
            <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-muted-foreground">Why they stay</p>
            <h2 className="mt-2 font-heading text-4xl md:text-5xl gradient-text-extended max-w-3xl">
              Savings discipline, in their words.
            </h2>
            <div className="mt-12 grid gap-4 md:grid-cols-3">
              {[
                {
                  quote: "My esusu group moved on-chain and nobody chases contributions anymore. The contract does the chasing.",
                  who: "Market trader · Lagos",
                  role: "Saver, private circle",
                },
                {
                  quote: "I run three circles from my phone. Invites, late fees, payouts — I just watch the rounds close.",
                  who: "Cooperative organizer · Accra",
                  role: "Organizer, 42 members",
                },
                {
                  quote: "Our DAO treasury finally has a savings rhythm. Votes decide payouts; the ledger proves everything.",
                  who: "DAO steward · Nairobi",
                  role: "Community circle",
                },
              ].map((v) => (
                <figure key={v.who} className="flex flex-col rounded-2xl border border-white/[0.08] bg-card p-6 md:p-8">
                  <span className="font-display text-5xl leading-none gradient-text" aria-hidden="true">
                    &ldquo;
                  </span>
                  <blockquote className="mt-2 flex-1 text-[15px] leading-relaxed">
                    {v.quote}
                  </blockquote>
                  <figcaption className="mt-6">
                    <p className="text-sm font-heading font-semibold">{v.who}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{v.role}</p>
                  </figcaption>
                </figure>
              ))}
            </div>
            <p className="mt-6 text-xs text-muted-foreground/70">
              Illustrative stories based on common savings-circle experiences.
            </p>
          </div>
        </section>

        {/* ═══ CIRCLE TYPES — edge-to-edge snap rail (no grid) ═══ */}
        <section className="relative z-10 py-24 md:py-32 overflow-hidden">
          <div className="container-premium">
            <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-muted-foreground">Find your circle</p>
            <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
              <h2 className="font-heading text-4xl md:text-5xl gradient-text-extended max-w-xl">
                Every kind of saver has a circle here.
              </h2>
              <Link
                href="/explore"
                className="inline-flex items-center gap-2 text-sm font-heading font-semibold hover:opacity-80 transition-all"
              >
                Browse all circles <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
          <div ref={railRef} className="mt-10 flex gap-4 overflow-x-auto snap-x snap-mandatory px-4 md:px-8 pb-4 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {circleTypes.map((c) => {
              const Icon = c.icon
              return (
                <div
                  key={c.name}
                  className={`snap-start shrink-0 w-[300px] md:w-[340px] glass-premium rounded-2xl p-6 md:p-8 ${c.featured ? "holo-border" : ""}`}
                >
                  <div className="w-12 h-12 rounded-2xl gradient-bg-extended flex items-center justify-center text-white mb-5">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="font-heading text-lg md:text-xl font-semibold mb-2">{c.name}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{c.desc}</p>
                  <span className="mt-4 inline-block rounded-full px-3 py-1 text-xs font-mono border border-white/10 text-muted-foreground">
                    {c.meta}
                  </span>
                </div>
              )
            })}
            <Link
              href={Routes.REGISTER}
              className="snap-start shrink-0 w-[300px] md:w-[340px] rounded-2xl p-6 md:p-8 gradient-bg-premium text-white flex flex-col justify-center gap-3"
            >
              <CirclePlus className="h-8 w-8" />
              <span className="font-heading text-xl font-semibold">Start your own</span>
              <span className="text-sm text-white/80">Daily, weekly or monthly rounds.</span>
              <span className="inline-flex items-center gap-2 text-sm font-heading font-semibold">
                Create a circle <ArrowRight className="h-4 w-4" />
              </span>
            </Link>
            {/* Duplicate set for the seamless drift loop (hidden from AT) */}
            <div className="flex gap-4 shrink-0" aria-hidden="true">
              {circleTypes.map((c) => {
                const Icon = c.icon
                return (
                  <div
                    key={`dup-${c.name}`}
                    className={`snap-start shrink-0 w-[300px] md:w-[340px] glass-premium rounded-2xl p-6 md:p-8 ${c.featured ? "holo-border" : ""}`}
                  >
                    <div className="w-12 h-12 rounded-2xl gradient-bg-extended flex items-center justify-center text-white mb-5">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="font-heading text-lg md:text-xl font-semibold mb-2">{c.name}</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">{c.desc}</p>
                    <span className="mt-4 inline-block rounded-full px-3 py-1 text-xs font-mono border border-white/10 text-muted-foreground">
                      {c.meta}
                    </span>
                  </div>
                )
              })}
              <div className="snap-start shrink-0 w-[300px] md:w-[340px] rounded-2xl p-6 md:p-8 gradient-bg-premium text-white flex flex-col justify-center gap-3">
                <CirclePlus className="h-8 w-8" />
                <span className="font-heading text-xl font-semibold">Start your own</span>
                <span className="text-sm text-white/80">Daily, weekly or monthly rounds.</span>
              </div>
            </div>
          </div>
        </section>

        <LedgerDivider caption="Round ledger — R1 → R5" />

        {/* ═══ PAYOUT — interactive round strip (no cards) ═══ */}
        <section className="relative z-10 border-t border-white/[0.06]">
          <div className="container-premium py-16 md:py-24">
            <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-muted-foreground">Payout modes</p>
            <h2 className="mt-2 font-heading text-3xl md:text-4xl font-semibold tracking-tight max-w-2xl">
              Four rules. One ledger. Pick a mode, watch the rounds.
            </h2>
            <div className="mt-8">
              <RoundStrip />
            </div>
          </div>
        </section>

        <LedgerDivider caption="Round ledger — enforced on-chain" />

        {/* ═══ HOW IT WORKS — numbered flow (sckoll 01–05 pattern) ═══ */}
        <section className="relative z-10 py-24 md:py-32 border-t border-white/[0.06]">
          <div className="container-premium">
            <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-muted-foreground">How DEODES works</p>
            <h2 className="mt-2 font-heading text-4xl md:text-5xl gradient-text-extended max-w-3xl">
              From passkey to payout in five moves.
            </h2>
            <div className="mt-12 grid gap-px overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.06] md:grid-cols-5">
              {steps.map((s) => (
                <div key={s.n} className="bg-[rgb(var(--background))] p-6">
                  <p className="font-mono text-2xl font-bold gradient-text">{s.n}</p>
                  <h3 className="mt-4 font-heading font-semibold">{s.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══ DEOSCORE BAND ═══ */}
        <section className="relative z-10 py-24 md:py-32 border-t border-white/[0.06]">
          <div className="container-premium grid gap-12 lg:grid-cols-2 lg:items-center">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-muted-foreground">DeoScore reputation</p>
              <h2 className="mt-2 font-heading text-4xl md:text-5xl font-black tracking-tight">
                <span className="gradient-text">Good saving follows you.</span>
              </h2>
              <p className="mt-4 text-muted-foreground max-w-lg">
                Every on-time contribution builds a portable 0–1000 score on your wallet — across
                every circle and community. High scores unlock bigger circles and lower collateral.
              </p>
              <Link
                href="/deoscore"
                className="mt-6 inline-flex items-center gap-2 rounded-2xl px-6 py-3 text-sm font-heading font-semibold glass-strong hover:bg-white/[0.06] transition-all"
              >
                <Trophy className="h-4 w-4" /> Check your DeoScore
              </Link>
            </div>
            <div className="space-y-4">
              {scoreWeights.map((w) => (
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
          </div>
        </section>

        {/* ═══ TRUST — alternating Z rows (no cards) ═══ */}
        <section className="relative z-10 py-24 border-t border-white/[0.06]">
          <div className="container-premium">
            <p className="text-center font-mono text-[11px] uppercase tracking-[0.25em] text-muted-foreground">
              The trust layer
            </p>
            <h2 className="mt-2 text-center font-heading text-3xl md:text-4xl font-semibold tracking-tight">
              Move money without stepping into the dark.
            </h2>
            <div className="mt-12 space-y-10 max-w-4xl mx-auto">
              {trustItems.map((item, i) => {
                const Icon = item.icon
                const flip = i % 2 === 1
                return (
                  <div
                    key={item.title}
                    className={`flex flex-col sm:flex-row items-start gap-6 ${flip ? "sm:flex-row-reverse sm:text-right" : ""}`}
                  >
                    <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl gradient-bg text-white">
                      <Icon className="h-6 w-6" />
                    </span>
                    <span className="flex-1">
                      <span className="font-mono text-[11px] text-muted-foreground">0{i + 1}</span>
                      <h3 className="mt-1 font-heading text-xl md:text-2xl font-semibold">{item.title}</h3>
                      <p className="mt-2 text-muted-foreground leading-relaxed max-w-xl">{item.desc}</p>
                    </span>
                  </div>
                )
              })}
            </div>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Shield className="h-4 w-4" /> Non-custodial by design
              </span>
              <span className="flex items-center gap-1.5">
                <Wallet className="h-4 w-4" /> USDC on Arc
              </span>
              <span className="flex items-center gap-1.5">
                <Zap className="h-4 w-4" /> Sub-cent settlement
              </span>
              <span className="flex items-center gap-1.5">
                <Award className="h-4 w-4" /> Portable DeoScore
              </span>
            </div>
          </div>
        </section>

        {/* ═══ FINAL CTA — sckoll "simple by design" pattern, DEODES phrase ═══ */}
        <section className="relative z-10 py-24 text-center border-t border-white/[0.06]">
          <div className="container-premium">
            <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-muted-foreground">Simple by design</p>
            <h2 className="mt-3 font-heading text-4xl md:text-6xl gradient-text-extended max-w-4xl mx-auto">
              Start with the circle. Stay for the momentum.
            </h2>
            <p className="text-muted-foreground mt-4 max-w-2xl mx-auto">
              Join your first round, skip the bank queue, or organize savers without becoming a
              treasurer.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href={Routes.REGISTER}
                className="gradient-bg-premium h-14 px-10 rounded-2xl text-lg font-heading font-semibold text-white inline-flex items-center justify-center gap-2 holo-glow hover:opacity-90 transition-all shadow-[0_0_40px_rgb(var(--premium-gold)/0.25)]"
              >
                Start saving free <ArrowRight className="h-5 w-5" />
              </Link>
              <Link
                href="/contact"
                className="h-14 px-10 rounded-2xl text-lg font-heading font-medium inline-flex items-center justify-center glass-strong hover:bg-white/[0.06] transition-all"
              >
                Talk to the team
              </Link>
            </div>
          </div>
        </section>
      </div>
    </>
  )
}
