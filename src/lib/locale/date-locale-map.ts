/**
 * Maps application locale codes to date-fns Locale objects.
 * All locale objects are imported statically; Next.js tree-shakes unused ones.
 */
import { enUS } from "date-fns/locale/en-US"
import { fr } from "date-fns/locale/fr"
import { es } from "date-fns/locale/es"
import { de } from "date-fns/locale/de"
import { it } from "date-fns/locale/it"
import { pt } from "date-fns/locale/pt"
import { ja } from "date-fns/locale/ja"
import { ko } from "date-fns/locale/ko"
import { zhCN } from "date-fns/locale/zh-CN"
import { ar } from "date-fns/locale/ar"
import { ru } from "date-fns/locale/ru"
import type { Locale } from "date-fns"

const DATE_LOCALE_MAP: Record<string, Locale> = {
  en: enUS,
  fr,
  es,
  de,
  it,
  pt,
  ja,
  ko,
  zh: zhCN,
  "zh-CN": zhCN,
  ar,
  ru,
  // Locales without a date-fns counterpart — fall back to English
  sw: enUS,
  ha: enUS,
  yo: enUS,
  ig: enUS,
}

/** Synchronously returns the date-fns Locale for the given locale code. */
export function getDateFnsLocale(localeCode: string): Locale {
  return DATE_LOCALE_MAP[localeCode] ?? enUS
}

/**
 * Async wrapper around getDateFnsLocale — resolves immediately with the mapped
 * locale. The async signature lets callers treat it as a future dynamic-import
 * if the map ever migrates to lazy loading.
 */
export async function loadDateFnsLocale(localeCode: string): Promise<Locale> {
  return getDateFnsLocale(localeCode)
}
