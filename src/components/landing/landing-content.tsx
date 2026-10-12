"use client"

import Link from "next/link"
import { Shield, Globe, Award, Zap, Shuffle, Coins, ArrowRight } from "lucide-react"
import { Routes } from "@/lib/constants"
import { useTranslate } from "@/lib/locale/context"

const features = [
  { icon: Shield, titleKey: "landing.feat1Title", descKey: "landing.feat1Desc", colSpan: "lg:col-span-2", featured: true },
  { icon: Globe, titleKey: "landing.feat2Title", descKey: "landing.feat2Desc", colSpan: "lg:col-span-1" },
  { icon: Award, titleKey: "landing.feat3Title", descKey: "landing.feat3Desc", colSpan: "lg:col-span-1" },
  { icon: Zap, titleKey: "landing.feat4Title", descKey: "landing.feat4Desc", colSpan: "lg:col-span-2", featured: true },
  { icon: Shuffle, titleKey: "landing.feat5Title", descKey: "landing.feat5Desc", colSpan: "lg:col-span-1" },
  { icon: Coins, titleKey: "landing.feat6Title", descKey: "landing.feat6Desc", colSpan: "lg:col-span-1" },
]

export function LandingContent() {
  const { t } = useTranslate()

  return (
    <>
      <div className="auroral-mesh min-h-screen">
        <section className="relative z-10 min-h-[90vh] flex flex-col justify-center">
          <div className="container-premium">
            <p className="font-heading text-xs tracking-[0.3em] uppercase text-muted-foreground mb-6">{t("landing.badge")}</p>
            <h1>
              <span className="font-heading text-5xl md:text-7xl xl:text-8xl font-black tracking-tighter block">{t("landing.saveTogether")}</span>
              <span className="holo-text text-5xl md:text-7xl xl:text-8xl font-black block">{t("landing.grow")}</span>
              <span className="font-heading text-5xl md:text-7xl xl:text-8xl font-black tracking-tighter block">{t("landing.together")}</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mt-8">{t("landing.heroDesc")}</p>
            <div className="mt-10 flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
              <Link href={Routes.REGISTER} className="gradient-bg-premium h-14 px-10 rounded-2xl text-lg font-heading font-semibold text-white inline-flex items-center justify-center gap-2 holo-glow hover:opacity-90 transition-all shadow-[0_0_40px_rgb(var(--premium-gold)/0.25)]">
                {t("landing.launchApp")} <ArrowRight className="h-5 w-5" />
              </Link>
              <Link href="/how-it-works" className="holo-border h-14 px-10 rounded-2xl text-lg font-heading font-medium text-foreground inline-flex items-center justify-center glass-strong hover:bg-white/[0.06] transition-all">
                {t("landing.howItWorks")}
              </Link>
            </div>
            <div className="mt-10">
              <div className="glass-strong rounded-full px-6 py-3 inline-flex flex-wrap items-center justify-center gap-8 text-sm">
                <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-aurora-cyan animate-pulse-glow" />1.3B+ Unbanked</span>
                <span className="text-muted-foreground">|</span>
                <span>{t("landing.fees")}</span>
                <span className="text-muted-foreground">|</span>
                <span>{t("landing.settlement")}</span>
              </div>
            </div>
          </div>
        </section>

        <section className="relative z-10 py-24 md:py-32">
          <div className="container-premium">
            <h2 className="font-heading text-4xl md:text-5xl gradient-text-extended text-center mb-16">{t("landing.architectureTitle")}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
              {features.map((feature, i) => {
                const Icon = feature.icon;
                return (
                  <div key={i} className={`glass-premium rounded-2xl p-6 md:p-8 tilt-hover ${feature.colSpan} ${feature.featured ? "holo-border" : ""}`}>
                    <div className="w-12 h-12 rounded-2xl gradient-bg-extended flex items-center justify-center text-white mb-5">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="font-heading text-lg md:text-xl font-semibold mb-2">{t(feature.titleKey)}</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">{t(feature.descKey)}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="relative z-10 py-24 md:py-32 bg-gradient-to-b from-gray-100/50 via-transparent to-gray-100/50 dark:bg-gradient-to-b dark:from-black dark:via-black/95 dark:to-transparent">
          <div className="container-premium text-center">
            <div className="w-12 h-px bg-black/20 dark:bg-white/20 mx-auto mb-8" />
            <p className="text-black dark:text-white font-heading text-[180px] md:text-[280px] font-black leading-none tracking-tighter select-none">{t("landing.contractsCount")}</p>
            <p className="text-black/60 dark:text-white/60 font-mono text-xs tracking-[0.3em] uppercase">{t("landing.contractsLabel")}</p>
            <p className="text-black/40 dark:text-white/20 font-mono text-[10px] tracking-wider mt-6 max-w-2xl mx-auto leading-relaxed">{t("landing.contractsList")}</p>
          </div>
        </section>

        <section className="relative z-10 py-24 text-center">
          <div className="container-premium">
            <h2 className="font-heading text-4xl md:text-6xl gradient-text-extended">{t("landing.readyTitle")}</h2>
            <p className="text-muted-foreground mt-4">{t("landing.readyDesc")}</p>
            <Link href={Routes.REGISTER} className="gradient-bg-premium h-14 px-10 rounded-2xl text-lg font-heading font-semibold text-white inline-flex items-center justify-center gap-2 mt-8 holo-glow hover:opacity-90 transition-all shadow-[0_0_40px_rgb(var(--premium-gold)/0.25)]">
              {t("landing.launchApp")} <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </section>
      </div>
    </>
  )
}
