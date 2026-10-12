import { renderHook } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

const translation = {
  locale: "en",
  setLocale: vi.fn(),
  t: (key: string) => `translated:${key}`,
}

vi.mock("@/lib/locale/context", () => ({
  LocaleProvider: ({ children }: { children: React.ReactNode }) => children,
  useTranslate: () => translation,
}))

import { useI18n, useTranslate } from "@/hooks/use-i18n"

describe("useI18n", () => {
  it("delegates to the existing locale context", () => {
    const { result } = renderHook(() => useI18n())

    expect(result.current).toBe(translation)
    expect(result.current.t("common.save")).toBe("translated:common.save")
    expect(useTranslate()).toBe(translation)
  })
})
