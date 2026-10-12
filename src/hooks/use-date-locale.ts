"use client"

import { useState, useEffect } from "react"
import type { Locale } from "date-fns"
import { useTranslate } from "@/lib/locale/context"
import { loadDateFnsLocale } from "@/lib/locale/date-locale-map"

interface DateLocale {
  /** The date-fns Locale object for the current app locale, or undefined while loading. */
  dateFnsLocale: Locale | undefined
  /** The BCP-47 locale code currently active in the app (e.g. "fr", "en-US"). */
  localeCode: string
}

/**
 * Returns the date-fns Locale object corresponding to the currently active app
 * locale. Starts as `undefined` on the first render and resolves asynchronously
 * to avoid blocking the component tree.
 *
 * Usage:
 * ```tsx
 * const { dateFnsLocale, localeCode } = useDateLocale()
 * formatRelativeTimeLocalized(date, dateFnsLocale)
 * formatDateLocalized(date, localeCode)
 * ```
 */
export function useDateLocale(): DateLocale {
  const { locale } = useTranslate()
  const [dateFnsLocale, setDateFnsLocale] = useState<Locale | undefined>(
    undefined,
  )

  useEffect(() => {
    let cancelled = false
    loadDateFnsLocale(locale).then((loc) => {
      if (!cancelled) setDateFnsLocale(loc)
    })
    return () => {
      cancelled = true
    }
  }, [locale])

  return { dateFnsLocale, localeCode: locale }
}
