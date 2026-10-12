"use client"

import { useTranslate } from "@/lib/locale/context"

export function LandingContent({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

export function useLandingLocale() {
  const { t } = useTranslate()
  return { t }
}
