import { describe, it, expect } from "vitest"
import {
  initialCircleForm,
  buildCircleFormData,
  validateCircleStep,
} from "@/lib/circles/circle-creation"
import type { CircleFormData } from "@/types"

describe("circle-creation consolidation", () => {
  it("initializes a public form by default and a community form when a communityId is given", () => {
    expect(initialCircleForm().circleType).toBe("public")
    expect(initialCircleForm("abc").circleType).toBe("community")
  })

  it("builds the canonical payload from form data", () => {
    const form = initialCircleForm()
    const payload = buildCircleFormData(form, "comm-123")
    expect(payload.name).toBe("")
    expect(payload.circleType).toBe("public")
    expect(payload.communityId).toBe("comm-123")
    expect(payload.requiresInvite).toBe(false)
  })

  it("omits communityId when not provided", () => {
    const payload = buildCircleFormData(initialCircleForm())
    expect(payload.communityId).toBeUndefined()
  })

  it("validates step 1 name and member bounds", () => {
    const form = initialCircleForm()
    expect(validateCircleStep(1, form).success).toBe(false)
    const named = { ...form, name: "Savings" }
    expect(validateCircleStep(1, named).success).toBe(true)
    expect(validateCircleStep(1, { ...named, maxMembers: 1 }).success).toBe(false)
  })

  it("blocks premium circles for low MoiScore users at step 1", () => {
    const form = { ...initialCircleForm(), name: "Savings", circleType: "premium" as const }
    expect(validateCircleStep(1, form, 10).success).toBe(false)
    expect(validateCircleStep(1, form, 60).success).toBe(true)
  })

  it("validates step 2 contribution amount", () => {
    const form = { ...initialCircleForm(), name: "Savings" }
    expect(validateCircleStep(2, { ...form, contributionAmount: 0 }).success).toBe(false)
    expect(validateCircleStep(2, form).success).toBe(true)
  })

  it("passes step 3 without extra validation", () => {
    const form = { ...initialCircleForm(), name: "Savings" }
    expect(validateCircleStep(3, form).success).toBe(true)
  })

  it("runs full schema validation on the final step", () => {
    const valid = { ...initialCircleForm(), name: "Savings" } as CircleFormData
    expect(validateCircleStep(4, valid).success).toBe(true)
    const invalid = { ...initialCircleForm(), name: "ab" } as CircleFormData
    expect(validateCircleStep(4, invalid).success).toBe(false)
  })
})
