"use client"

import { useTranslate } from "@/lib/locale/context"

export { LocaleProvider, useTranslate } from "@/lib/locale/context"

export function useI18n() {
  return useTranslate()
}
