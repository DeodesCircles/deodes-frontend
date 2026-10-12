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

const payoutModes = [
  {
    icon: Dices,
    name: "Random",
    desc: "Provably-fair VRF draw picks the recipient each round.",
    price: "Fair",
  },
  {
    icon: ListOrdered,
    name: "Fixed order",
    desc: "Pre-defined sequential distribution. No surprises.",
    price: "Ordered",
  },
  {
    icon: Gavel,
    name: "Auction",
    desc: "Chit-fund bidding: members bid a discount, winner takes the pool.",
    price: "Market",
  },
  {
    icon: Vote,
    name: "Vote-based",
    desc: "The community votes the recipient every round.",
    price: "Social",
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
// gradient re-raster. Each word carries its own static gradient + glow mix,
// painted once — the swap animation never touches pixels.
const GROW_WORDS = [
  { word: "Grow.", gradient: "gradient-text-extended", glow: "glow-violet" },
  { word: "Save.", gradient: "gradient-text-gold", glow: "glow-gold" },
  { word: "Earn.", gradient: "gradient-text-cyan", glow: "glow-cyan" },
  { word: "Rise.", gradient: "gradient-text", glow: "glow-indigo" },
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
        className={`grow-word ${current.gradient} ${current.glow} font-display text-5xl md:text-7xl xl:text-8xl font-black tracking-tight`}
      >
        {current.word}
      </span>
    </span>
  )
}

// ── Audience tabs (arc.io use-case tabs pattern) ─────────────────────────────
// Instant switching (no animation library): one state, conditional render.
const AUDIENCES = [
  {
    id: "savers",
    tab: "For savers",
    title: "Join a circle, get paid on your round.",
    desc: "Pick a public circle or redeem an invite, contribute USDC each round, and receive the full pool when your turn lands. Your DeoScore grows with every on-time payment.",
    points: ["Passkey wallet in one tap", "VRF-fair or fixed payouts", "Portable 0–1000 reputation"],
    cta: { label: "Explore circles", href: "/explore" },
  },
  {
    id: "organizers",
    tab: "For organizers",
    title: "Run a circle without becoming a treasurer.",
    desc: "Set the amount, frequency and payout rule. Contracts collect, enforce late fees and release payouts — you just invite the people.",
    points: ["Daily, weekly or monthly rounds", "Late fees + grace periods on-chain", "Invite links with usage caps"],
    cta: { label: "Start a circle", href: "/register" },
  },
  {
    id: "communities",
    tab: "For communities",
    title: "Turn your group chat into a savings engine.",
    desc: "Token-gated circles for DAOs and holder groups, multi-sig guarded, with community votes directing payouts where need is greatest.",
    points: ["Token-gated membership", "Vote-based payouts", "Shared DeoScore standing"],
    cta: { label: "How it works", href: "/how-it-works" },
  },
] as const

function AudienceTabs() {
  const [active, setActive] = useState<(typeof AUDIENCES)[number]["id"]>("savers")
  const current = AUDIENCES.find((a) => a.id === active) ?? AUDIENCES[0]

  return (
    <div>
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Who is Deodes for">
        {AUDIENCES.map((a) => (
          <button
            key={a.id}
            type="button"
            role="tab"
            aria-selected={active === a.id}
            onClick={() => setActive(a.id)}
            className={
              active === a.id
                ? "rounded-full px-5 py-2 text-sm font-heading font-semibold text-white gradient-bg-extended"
                : "rounded-full px-5 py-2 text-sm font-heading font-medium text-muted-foreground glass-whisper hover:text-foreground transition-colors"
            }
          >
            {a.tab}
          </button>
        ))}
      </div>
      <div key={current.id} className="mt-8 grid gap-8 lg:grid-cols-2 lg:items-center">
        <div>
          <h3 className="font-heading text-3xl md:text-4xl font-bold tracking-tight">{current.title}</h3>
          <p className="mt-3 text-muted-foreground leading-relaxed">{current.desc}</p>
          <Link
            href={current.cta.href}
            className="mt-6 inline-flex items-center gap-2 rounded-2xl px-6 py-3 text-sm font-heading font-semibold glass-strong hover:bg-white/[0.06] transition-all"
          >
            {current.cta.label} <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <ul className="space-y-3">
          {current.points.map((p) => (
            <li key={p} className="flex items-center gap-3 rounded-2xl border border-white/[0.08] px-5 py-4 text-sm">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-aurora-cyan" />
              {p}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

export function LandingContent() {
  const { t } = useTranslate()

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

            {/* Saver pills */}
            <div className="mt-10">
              <div className="glass-strong rounded-full px-6 py-3 inline-flex flex-wrap items-center justify-center gap-8 text-sm">
                <span className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-aurora-cyan animate-pulse-glow" />
                  1.7B+ Unbanked
                </span>
                <span className="text-muted-foreground">|</span>
                <span>{t("landing.fees")}</span>
                <span className="text-muted-foreground">|</span>
                <span>{t("landing.settlement")}</span>
              </div>
            </div>

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

        {/* ═══ AUDIENCES (arc.io use-case tabs pattern) ═══ */}
        <section className="relative z-10 py-24 md:py-32">
          <div className="container-premium">
            <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-muted-foreground">Ref. 01 — Who it serves</p>
            <h2 className="mt-2 font-heading text-4xl md:text-5xl gradient-text-extended">
              Built for savers, organizers, communities.
            </h2>
            <div className="mt-10">
              <AudienceTabs />
            </div>
          </div>
        </section>

        {/* ═══ CIRCLE TYPES (sckoll category-grid analog) ═══ */}
        <section className="relative z-10 py-24 md:py-32">
          <div className="container-premium">
            <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-muted-foreground">Ref. 02 — Find your circle</p>
            <h2 className="mt-2 font-heading text-4xl md:text-5xl gradient-text-extended">
              Every kind of saver has a circle here.
            </h2>
            <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
              {circleTypes.map((c) => {
                const Icon = c.icon
                return (
                  <div
                    key={c.name}
                    className={`glass-premium rounded-2xl p-6 md:p-8 tilt-hover ${c.colSpan} ${c.featured ? "holo-border" : ""}`}
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
            </div>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                href="/explore"
                className="inline-flex items-center gap-2 text-sm font-heading font-semibold hover:opacity-80 transition-all"
              >
                Browse all circles <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href={Routes.REGISTER}
                className="inline-flex items-center gap-2 text-sm font-heading font-semibold text-muted-foreground hover:text-foreground transition-all"
              >
                <CirclePlus className="h-4 w-4" /> Start your own
              </Link>
            </div>
          </div>
        </section>

        {/* ═══ PAYOUT MODES (agentsdb top-cards band analog) ═══ */}
        <section className="relative z-10 border-t border-white/[0.06]">
          <div className="container-premium py-16 md:py-24">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-muted-foreground">Ref. 03 — Payout modes</p>
                <h2 className="mt-2 font-heading text-3xl md:text-4xl font-semibold tracking-tight">
                  Four ways the pool finds you.
                </h2>
              </div>
              <Link
                href="/how-it-works"
                className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm glass-strong hover:bg-white/[0.06] transition-all"
              >
                How payouts work
              </Link>
            </div>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {payoutModes.map((m) => {
                const Icon = m.icon
                return (
                  <div key={m.name} className="rounded-2xl border border-white/[0.08] bg-card p-5 tilt-hover">
                    <div className="flex items-start justify-between gap-3">
                      <span className="w-10 h-10 rounded-xl gradient-bg-extended flex items-center justify-center text-white">
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="whitespace-nowrap rounded-full bg-accent px-2 py-1 text-xs font-medium text-accent-foreground">
                        {m.price}
                      </span>
                    </div>
                    <h3 className="mt-4 font-heading font-semibold">{m.name}</h3>
                    <p className="mt-2 text-sm text-muted-foreground">{m.desc}</p>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        {/* ═══ HOW IT WORKS — numbered flow (sckoll 01–05 pattern) ═══ */}
        <section className="relative z-10 py-24 md:py-32 border-t border-white/[0.06]">
          <div className="container-premium">
            <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-muted-foreground">Ref. 04 — How DEODES works</p>
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
              <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-muted-foreground">Ref. 05 — DeoScore reputation</p>
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

        {/* ═══ TRUST LAYER (sckoll trust pattern) ═══ */}
        <section className="relative z-10 py-24 border-t border-white/[0.06]">
          <div className="container-premium">
            <p className="text-center font-mono text-[11px] uppercase tracking-[0.25em] text-muted-foreground">
              Ref. 06 — The trust layer
            </p>
            <h2 className="mt-2 text-center font-heading text-3xl md:text-4xl font-semibold tracking-tight">
              Move money without stepping into the dark.
            </h2>
            <div className="mt-12 grid gap-4 md:grid-cols-3">
              {trustItems.map((item) => {
                const Icon = item.icon
                return (
                  <div key={item.title} className="flex gap-4 rounded-2xl border border-white/[0.08] p-6">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl gradient-bg text-white">
                      <Icon className="h-5 w-5" />
                    </span>
                    <span>
                      <h3 className="font-heading font-semibold">{item.title}</h3>
                      <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
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
            <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-muted-foreground">Ref. 07 — Simple by design</p>
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
