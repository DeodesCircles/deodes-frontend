import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRight, BadgePercent, Coins, FileLock2, Landmark, Scale } from "lucide-react"
import { buildRouteMetadata } from "@/lib/seo/route-metadata"
import { PublicLayout } from "@/components/layout/public-layout"
import { Routes } from "@/lib/constants"

export const metadata: Metadata = buildRouteMetadata("/transparency")

const rows = [
  {
    icon: BadgePercent,
    name: "Protocol fee (Deodes)",
    value: "0.5%",
    desc: "Our only charge. Taken once, on payouts only — never on contributions. Shown up front before you join.",
  },
  {
    icon: Coins,
    name: "Settlement",
    value: "Sub-cent",
    desc: "USDC on Arc settles for fractions of a cent with deterministic finality.",
  },
  {
    icon: Landmark,
    name: "Fiat deposits (coming soon)",
    value: "₦0",
    desc: "Deodes charges nothing on deposits. Local-currency rails (NGN bank, KES M-Pesa, GHS mobile money) open here first — any rail fee will be quoted up front before you confirm.",
  },
  {
    icon: FileLock2,
    name: "Custody",
    value: "Hybrid",
    desc: "Circle funds sit in contracts, not company accounts. Optional hosted Arc wallets keep your encrypted key with us; self-custody wallets never share keys.",
  },
  {
    icon: Scale,
    name: "Source",
    value: "Apache 2.0",
    desc: "Contracts, API and frontend are open source. Verify instead of trusting.",
  },
]

export default function TransparencyPage() {
  return (
    <PublicLayout>
      <div className="auroral-mesh min-h-screen">
        <main className="container-premium py-12">
          <p className="text-sm uppercase tracking-widest text-muted-foreground">Transparency & fees</p>
          <h1 className="font-heading text-4xl md:text-6xl font-black tracking-tight mt-2">
            Every fee, <span className="gradient-text">on one page.</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mt-4">
            Deodes charges one fee: 0.5% on payouts. Local-currency rails are coming soon — any rail fee will be quoted before you pay, no surprises.
          </p>
          <div className="mt-10 grid gap-4 md:grid-cols-2">
            {rows.map((r) => {
              const Icon = r.icon
              return (
                <div key={r.name} className="glass-premium rounded-2xl p-6 md:p-8">
                  <div className="flex items-start justify-between gap-3">
                    <span className="w-12 h-12 rounded-2xl gradient-bg-extended flex items-center justify-center text-white">
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="font-heading text-2xl font-black gradient-text">{r.value}</span>
                  </div>
                  <h2 className="mt-4 font-heading text-xl font-semibold">{r.name}</h2>
                  <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{r.desc}</p>
                </div>
              )
            })}
          </div>
          <div className="mt-10 rounded-2xl border border-white/[0.08] p-8 text-center">
            <h2 className="font-heading text-2xl font-semibold">Reputation math is public too</h2>
            <p className="mt-2 text-sm text-muted-foreground max-w-xl mx-auto">
              DeoScore weights — streak 35%, completions 30%, volume 20%, recency 15%. Same numbers
              everywhere, enforced on-chain.
            </p>
            <Link
              href="/deoscore"
              className="mt-6 inline-flex items-center gap-2 rounded-2xl px-6 py-3 text-sm font-heading font-semibold glass-strong hover:bg-white/[0.06] transition-all"
            >
              How DeoScore works <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="mt-8 text-center">
            <Link
              href={Routes.REGISTER}
              className="gradient-bg-premium h-12 px-8 rounded-2xl font-heading font-semibold text-white inline-flex items-center justify-center gap-2 hover:opacity-90 transition-all"
            >
              Start saving <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </main>
      </div>
    </PublicLayout>
  )
}
