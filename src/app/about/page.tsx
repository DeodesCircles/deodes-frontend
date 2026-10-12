import type { Metadata } from "next"
import { buildRouteMetadata } from "@/lib/seo/route-metadata"
import { PublicLayout } from "@/components/layout/public-layout"

export const metadata: Metadata = buildRouteMetadata("/about")

export default function AboutPage() {
  return (
    <PublicLayout>
      <div className="auroral-mesh min-h-screen">
        <main className="container-premium py-16">
          <h1 className="holo-text font-heading text-5xl md:text-7xl font-black mb-8">About Deodes</h1>
          <div className="space-y-6 max-w-3xl">
            <div className="glass-premium rounded-2xl p-8 holo-border border-l-4 border-l-aurora-indigo">
              <h2 className="font-heading text-xl font-semibold mb-3 gradient-text">Our Mission</h2>
              <p className="text-muted-foreground leading-relaxed">
                1.3 billion adults remain unbanked globally. In communities across Africa, Latin America, South Asia, and Southeast Asia, people rely on informal savings circles — esusu, tontines, chit funds, tandas — to access capital and build financial resilience. Deodes wraps this centuries-old model in Arc smart contracts, bringing transparency, security, and portable on-chain reputation to every participant.
              </p>
            </div>
            <div className="glass rounded-2xl p-8 border-l-4 border-l-aurora-violet">
              <h2 className="font-heading text-xl font-semibold mb-3 gradient-text">Why Arc</h2>
              <p className="text-muted-foreground leading-relaxed">Arc&apos;s sub-cent transaction fees and fast settlement make contribution cycles practical. The Arc smart contract platform provides the programmability for complex payout rules, auction mechanics, and reputation tracking — all while keeping gas costs negligible.</p>
            </div>
            <div className="glass rounded-2xl p-8 border-l-4 border-l-aurora-cyan">
              <h2 className="font-heading text-xl font-semibold mb-3 gradient-text">Open Source</h2>
              <p className="text-muted-foreground leading-relaxed">Our smart contracts, backend API, and frontend are open source under Apache 2.0. Contribute on GitHub.</p>
            </div>
            <div className="glass rounded-2xl p-8 border-l-4 border-l-premium-gold">
              <h2 className="font-heading text-xl font-semibold mb-3 gradient-text-gold">Founders</h2>
              <p className="text-muted-foreground leading-relaxed">
                DEODES is built by two founders — Nzubechukwu Cyprian (cyprianz.com) and
                Nekwachukwu Ucheokoye. Talk to us on X or through the contact page.
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <a
                  href="https://cyprianz.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center rounded-xl px-4 py-2 text-sm glass-strong hover:bg-white/[0.06] transition-all"
                >
                  cyprianz.com
                </a>
                <a
                  href="https://x.com/cyprianzube"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center rounded-xl px-4 py-2 text-sm glass-strong hover:bg-white/[0.06] transition-all"
                >
                  @cyprianzube
                </a>
                <a
                  href="https://x.com/nekwasar"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center rounded-xl px-4 py-2 text-sm glass-strong hover:bg-white/[0.06] transition-all"
                >
                  @nekwasar
                </a>
              </div>
            </div>
          </div>
        </main>
      </div>
    </PublicLayout>
  );
}