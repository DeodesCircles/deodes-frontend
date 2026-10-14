import type { CircleFormData } from "@/types"
import {
  CIRCLE_LIMITS,
  createCircleSchema,
  isFutureDateTime,
  isFutureYyyyMmDd,
  safeParse,
  type CreateCircleInput,
} from "@/lib/validators"

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
    autoDebit: false,
  }
}

export function buildCircleFormData(
  formData: CircleFormData,
  communityId?: string,
): CreateCircleInput {
  const d = formData
  return {
    name: d.name.trim(),
    description: d.description?.trim() || undefined,
    circleType: d.circleType,
    payoutType: d.payoutType,
    contributionAmount: d.contributionAmount,
    // The wizard only offers USDC; anything else fails schema validation.
    // The cast keeps the form's wider Currency type compiling.
    currency: d.currency as unknown as CreateCircleInput["currency"],
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
    autoDebit: d.autoDebit,
  }
}

export interface StepValidationResult {
  success: boolean
  errors: Record<string, string>
}

function isInt(n: unknown): n is number {
  return typeof n === "number" && Number.isInteger(n)
}

function validateDetails(formData: CircleFormData, errors: Record<string, string>) {
  const name = formData.name.trim()
  if (!name) {
    errors.name = "Circle name is required."
  } else if (name.length < CIRCLE_LIMITS.NAME_MIN) {
    errors.name = `Name must be at least ${CIRCLE_LIMITS.NAME_MIN} characters`
  } else if (name.length > CIRCLE_LIMITS.NAME_MAX) {
    errors.name = `Name must be at most ${CIRCLE_LIMITS.NAME_MAX} characters`
  }
  if (formData.description && formData.description.length > CIRCLE_LIMITS.DESCRIPTION_MAX) {
    errors.description = `Description must be at most ${CIRCLE_LIMITS.DESCRIPTION_MAX} characters`
  }
  if (!isInt(formData.maxMembers)) {
    errors.maxMembers = "Max members must be a whole number."
  } else if (formData.maxMembers < CIRCLE_LIMITS.MAX_MEMBERS_MIN) {
    errors.maxMembers = "Must have at least 2 members"
  } else if (formData.maxMembers > CIRCLE_LIMITS.MAX_MEMBERS_MAX) {
    errors.maxMembers = "Must have at most 100 members."
  }
  if (formData.startDate) {
    const t = new Date(formData.startDate).getTime()
    if (Number.isNaN(t)) {
      errors.startDate = "Use a valid start date."
    } else if (!isFutureDateTime(formData.startDate)) {
      errors.startDate = "Start date must be a future date."
    }
  }
}

function validateFinancials(formData: CircleFormData, errors: Record<string, string>) {
  if (!Number.isFinite(formData.contributionAmount) || formData.contributionAmount <= 0) {
    errors.contributionAmount = "Contribution must be positive"
  } else if (formData.contributionAmount > CIRCLE_LIMITS.CONTRIBUTION_MAX) {
    errors.contributionAmount = "Contribution must not exceed 1,000,000 USDC."
  } else if (
    formData.circleType === "premium" &&
    formData.contributionAmount < CIRCLE_LIMITS.PREMIUM_MIN_USDC
  ) {
    errors.contributionAmount = `Premium circles require minimum ${CIRCLE_LIMITS.PREMIUM_MIN_USDC} USDC contribution`
  }
  if (formData.currency !== "USDC") {
    errors.currency = "Currency must be USDC."
  }
  if (!Number.isFinite(formData.lateFeePercent)) {
    errors.lateFeePercent = "Late fee must be between 0 and 50%."
  } else if (
    formData.lateFeePercent < CIRCLE_LIMITS.LATE_FEE_MIN ||
    formData.lateFeePercent > CIRCLE_LIMITS.LATE_FEE_MAX
  ) {
    errors.lateFeePercent = "Late fee must be between 0 and 50%."
  }
  if (!isInt(formData.gracePeriodHours)) {
    errors.gracePeriodHours = "Grace period must be a whole number of hours."
  } else if (
    formData.gracePeriodHours < CIRCLE_LIMITS.GRACE_MIN ||
    formData.gracePeriodHours > CIRCLE_LIMITS.GRACE_MAX
  ) {
    errors.gracePeriodHours = "Grace period must be between 1 and 168 hours."
  }
  if (!isInt(formData.maxStrikes)) {
    errors.maxStrikes = "Max strikes must be a whole number."
  } else if (
    formData.maxStrikes < CIRCLE_LIMITS.STRIKES_MIN ||
    formData.maxStrikes > CIRCLE_LIMITS.STRIKES_MAX
  ) {
    errors.maxStrikes = "Max strikes must be between 1 and 10."
  }
}

function validatePayout(formData: CircleFormData, errors: Record<string, string>) {
  if (formData.collateralPercent != null && formData.collateralPercent !== undefined) {
    if (
      !Number.isFinite(formData.collateralPercent) ||
      formData.collateralPercent < CIRCLE_LIMITS.COLLATERAL_MIN ||
      formData.collateralPercent > CIRCLE_LIMITS.COLLATERAL_MAX
    ) {
      errors.collateralPercent = "Collateral must be between 0 and 100%."
    }
  }
  if (formData.minMoiScore != null && formData.minMoiScore !== undefined) {
    if (
      !isInt(formData.minMoiScore) ||
      formData.minMoiScore < CIRCLE_LIMITS.MOI_MIN ||
      formData.minMoiScore > CIRCLE_LIMITS.MOI_MAX
    ) {
      errors.minMoiScore = "DeoScore must be between 0 and 1000."
    }
  }
}

/** Human-readable one-liner for the Review step when full-schema checks fail. */
export function formatSubmitErrors(errors: Record<string, string>): string {
  const entries = Object.entries(errors)
  if (entries.length === 0) return "Please fix the highlighted fields and try again."
  return entries.map(([field, message]) => `${field}: ${message}`).join(" · ")
}

export function validateCircleStep(
  step: number,
  formData: CircleFormData,
  userMoiScore = 0,
  communityId?: string,
): StepValidationResult {
  const errors: Record<string, string> = {}

  if (step === 1) {
    validateDetails(formData, errors)
    if (formData.circleType === "premium" && userMoiScore < 50) {
      errors.submit = "Premium circles require at least 50 DeoScore"
    }
    return { success: Object.keys(errors).length === 0, errors }
  }

  if (step === 2) {
    validateFinancials(formData, errors)
    return { success: Object.keys(errors).length === 0, errors }
  }

  if (step === 3) {
    validatePayout(formData, errors)
    return { success: Object.keys(errors).length === 0, errors }
  }

  const stepErrors: Record<string, string> = {}
  validateDetails(formData, stepErrors)
  validateFinancials(formData, stepErrors)
  validatePayout(formData, stepErrors)
  if (formData.circleType === "premium" && userMoiScore < 50) {
    stepErrors.submit = "Premium circles require at least 50 DeoScore"
  }
  const result = safeParse(createCircleSchema, buildCircleFormData(formData, communityId))
  if (!result.success) {
    for (const [field, message] of Object.entries(result.errors)) {
      if (!(field in stepErrors)) stepErrors[field] = message
    }
  }
  if (Object.keys(stepErrors).length > 0) {
    if (!stepErrors.submit) stepErrors.submit = formatSubmitErrors(stepErrors)
    return { success: false, errors: stepErrors }
  }
  return { success: true, errors: {} }
}

// Re-exported for tests and date-field parity with the savings deadline rule.
export { isFutureDateTime, isFutureYyyyMmDd }
