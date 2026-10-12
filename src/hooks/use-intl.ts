"use client"

import { useTranslate } from "@/lib/locale/context"
import {
  formatCurrency,
  formatDate,
  formatNumber,
  formatRelativeTime,
  DEFAULT_LOCALE,
} from "@/lib/formatters"
import type { Locale } from "date-fns"

export { useTranslate } from "@/lib/locale/context"

/**
 * Locale-aware formatting bound to whichever language is currently active in
 * the app's i18n context (issue #259).
 *
 * Every member honors the active locale (or the pinned {@link DEFAULT_LOCALE}
 * when the provider isn't mounted), so `Intl` output is consistent across the
 * app instead of being hard-coded to `["en"]` / `"en-US"`.
 */
export function useIntl() {
  const { locale: activeLocale } = useTranslate()
  const locale = activeLocale || DEFAULT_LOCALE

  return {
    /** BCP-47 tag of the active locale, e.g. `"en"`, `"fr"`. */
    locale,
    currency: (amount: number, currency: string) =>
      formatCurrency(amount, currency, locale),
    number: (num: number) => formatNumber(num, locale),
    date: (
      date: string | Date,
      options?: Intl.DateTimeFormatOptions
    ) => formatDate(date, options, locale),
    relativeTime: (date: string | Date, dateFnsLocale?: Locale) =>
      formatRelativeTime(date, dateFnsLocale),
    /** Human-readable region name for a country code, in the active locale. */
    regionName: (countryCode: string) =>
      new Intl.DisplayNames([locale], { type: "region" }).of(countryCode) ??
      countryCode,
  }
}