import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRight, LifeBuoy, Mail, MessagesSquare } from "lucide-react"
import { buildRouteMetadata } from "@/lib/seo/route-metadata"
import { PublicLayout } from "@/components/layout/public-layout"

export const metadata: Metadata = buildRouteMetadata("/contact")

const channels = [
  {
    icon: LifeBuoy,
    name: "Support tickets",
    desc: "Circle issues, payouts and account help. Open a ticket or look one up by ID.",
    href: "/support",
    cta: "Open support",
  },
  {
    icon: MessagesSquare,
    name: "X (Twitter)",
    desc: "Launch news and updates from the team.",
    href: "https://x.com/cyprianzube",
    cta: "@cyprianzube",
    external: true,
  },
  {
    icon: Mail,
    name: "Contribute",
    desc: "Developers, designers and writers — the codebase is Apache 2.0 and open.",
    href: "/become-a-contributor",
    cta: "Become a contributor",
  },
]

export default function ContactPage() {
  return (
    <PublicLayout>
      <div className="auroral-mesh min-h-screen">
        <main className="container-premium py-12">
          <p className="text-sm uppercase tracking-widest text-muted-foreground">Contact</p>
          <h1 className="font-heading text-4xl md:text-6xl font-black tracking-tight mt-2">
            Talk to <span className="gradient-text">the team.</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mt-4">
            Three ways to reach us — pick the one that fits.
          </p>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {channels.map((c) => {
              const Icon = c.icon
              return (
                <div key={c.name} className="glass-premium rounded-2xl p-6 md:p-8 tilt-hover">
                  <div className="w-12 h-12 rounded-2xl gradient-bg-extended flex items-center justify-center text-white mb-5">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h2 className="font-heading text-xl font-semibold mb-2">{c.name}</h2>
                  <p className="text-muted-foreground text-sm leading-relaxed">{c.desc}</p>
                  <Link
                    href={c.href}
                    {...(c.external === true ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                    className="mt-4 inline-flex items-center gap-2 text-sm font-heading font-semibold hover:opacity-80 transition-all"
                  >
                    {c.cta} <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              )
            })}
          </div>
        </main>
      </div>
    </PublicLayout>
  )
}
