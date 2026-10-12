import { describe, expect, it } from "vitest"

import en from "@/lib/locale/en.json"
import fr from "@/lib/locale/fr.json"
import enPublic from "../../../../public/locales/en/common.json"
import frPublic from "../../../../public/locales/fr/common.json"

const keysOf = (dict: Record<string, unknown>) => Object.keys(dict).sort()
const PLACEHOLDER = /\{[^}]+\}/g

function placeholders(value: string): string[] {
  return value.match(PLACEHOLDER)?.sort() ?? []
}

describe("locale parity", () => {
  it("fr has exactly the same keys as en", () => {
    expect(keysOf(fr as Record<string, string>)).toEqual(keysOf(en))
  })

  it("every en and fr value is a non-empty string", () => {
    for (const dict of [en, fr] as Record<string, string>[]) {
      for (const [key, value] of Object.entries(dict)) {
        expect(typeof value, `expected string for ${key}`).toBe("string")
        expect(value.trim(), `expected non-empty value for ${key}`).not.toBe("")
      }
    }
  })

  it("interpolation placeholders in fr match en", () => {
    for (const key of Object.keys(en)) {
      expect(placeholders(fr[key as keyof typeof fr]), `placeholder mismatch for ${key}`).toEqual(
        placeholders(en[key as keyof typeof en]),
      )
    }
  })

  it("public locale files served at /locales stay in sync with the bundled dictionaries", () => {
    expect(enPublic).toEqual(en)
    expect(frPublic).toEqual(fr)
  })
})
