import type { CircleFormData } from "@/types"
import { createCircleSchema, safeParse, type CreateCircleInput } from "@/lib/validators"

export function initialCircleForm(communityId?: string): CircleFormData {
  return {
    name: "",
    description: "",
    circleType: communityId ? "community" : "public",
    payoutType: "random",
    contributionAmount: 100,
    currency: "USDC",
    frequency: "monthly",
    maxMembers: 10,
    minMoiScore: 0,
    collateralPercent: 10,
    lateFeePercent: 5,
    gracePeriodHours: 24,
    maxStrikes: 3,
    startDate: "",
    requiresInvite: false,
  }
}

export function buildCircleFormData(
  formData: CircleFormData,
  communityId?: string,
): CreateCircleInput {
  const d = formData
  return {
    name: d.name,
    description: d.description || undefined,
    circleType: d.circleType,
    payoutType: d.payoutType,
    contributionAmount: d.contributionAmount,
    currency: d.currency,
    frequency: d.frequency,
    maxMembers: d.maxMembers,
    minMoiScore: d.minMoiScore ?? undefined,
    collateralPercent: d.collateralPercent ?? undefined,
    lateFeePercent: d.lateFeePercent,
    gracePeriodHours: d.gracePeriodHours,
    maxStrikes: d.maxStrikes,
    startDate: d.startDate ? new Date(d.startDate).toISOString() : undefined,
    communityId: communityId || undefined,
    requiresInvite: d.requiresInvite,
  }
}

export interface StepValidationResult {
  success: boolean
  errors: Record<string, string>
}

export function validateCircleStep(
  step: number,
  formData: CircleFormData,
  userMoiScore = 0,
  communityId?: string,
): StepValidationResult {
  const errors: Record<string, string> = {}

  if (step === 1) {
    if (formData.name.length < 3) {
      errors.name = "Name must be at least 3 characters"
      return { success: false, errors }
    }
    if (formData.maxMembers < 2) {
      errors.maxMembers = "Must have at least 2 members"
      return { success: false, errors }
    }
    if (formData.circleType === "premium" && userMoiScore < 50) {
      errors.submit = "Premium circles require at least 50 MoiScore"
      return { success: false, errors }
    }
    return { success: true, errors: {} }
  }

  if (step === 2) {
    if (formData.contributionAmount <= 0) {
      errors.contributionAmount = "Contribution must be positive"
      return { success: false, errors }
    }
    if (
      formData.circleType === "premium" &&
      formData.currency === "USDC" &&
      formData.contributionAmount < 50
    ) {
      errors.contributionAmount = "Premium circles require minimum 50 USDC contribution"
      return { success: false, errors }
    }
    if (
      formData.circleType === "premium" &&
      formData.currency === "XLM" &&
      formData.contributionAmount < 100
    ) {
      errors.contributionAmount = "Premium circles require minimum 100 XLM contribution"
      return { success: false, errors }
    }
    return { success: true, errors: {} }
  }

  if (step === 3) {
    return { success: true, errors: {} }
  }

  const result = safeParse(createCircleSchema, buildCircleFormData(formData, communityId))
  if (!result.success) {
    errors.submit = JSON.stringify(result.errors)
    return { success: false, errors }
  }
  return { success: true, errors: {} }
}
