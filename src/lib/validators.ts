import { z } from "zod"

export function safeParse<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
): { success: true; data: T } | { success: false; errors: Record<string, string> } {
  const result = schema.safeParse(data)
  if (result.success) return { success: true, data: result.data }
  const error = result.error as { issues?: { path: (string | number)[]; message: string }[]; errors?: { path: (string | number)[]; message: string }[] }
  const issues = error.issues ?? error.errors ?? []
  const fieldErrors: Record<string, string> = {}
  for (const issue of issues) {
    fieldErrors[issue.path.join(".")] = issue.message
  }
  return { success: false, errors: fieldErrors }
}

export const SAVINGS_LIMITS = {
  NAME_MIN: 3,
  NAME_MAX: 100,
  TARGET_MAX: 1_000_000,
  NOTE_MAX: 280,
} as const

export const CIRCLE_LIMITS = {
  NAME_MIN: 3,
  NAME_MAX: 100,
  DESCRIPTION_MAX: 500,
  CONTRIBUTION_MAX: 1_000_000,
  MAX_MEMBERS_MIN: 2,
  MAX_MEMBERS_MAX: 100,
  MOI_MIN: 0,
  MOI_MAX: 1000,
  COLLATERAL_MIN: 0,
  COLLATERAL_MAX: 100,
  LATE_FEE_MIN: 0,
  LATE_FEE_MAX: 50,
  GRACE_MIN: 1,
  GRACE_MAX: 168,
  STRIKES_MIN: 1,
  STRIKES_MAX: 10,
  PREMIUM_MIN_USDC: 50,
} as const

/** True when a YYYY-MM-DD string is a real calendar date strictly after today. */
export function isFutureYyyyMmDd(value: string, now = new Date()): boolean {
  const t = new Date(`${value}T00:00:00`).getTime()
  if (Number.isNaN(t)) return false
  const startOfToday = new Date(now)
  startOfToday.setHours(0, 0, 0, 0)
  return t > startOfToday.getTime()
}

/** True when an ISO/datetime-local string parses and lies in the future. */
export function isFutureDateTime(value: string, now = Date.now()): boolean {
  const t = new Date(value).getTime()
  return !Number.isNaN(t) && t > now
}

const futureCircleStartDate = z
  .string()
  .optional()
  .or(z.literal(""))
  .refine(
    (v) => {
      if (v === undefined || v === "") return true
      const t = new Date(v).getTime()
      return !Number.isNaN(t)
    },
    { message: "Use a valid start date." },
  )
  .refine(
    (v) => {
      if (v === undefined || v === "") return true
      return isFutureDateTime(v)
    },
    { message: "Start date must be a future date." },
  )

const futureGoalDeadline = z
  .string()
  .nullish()
  .or(z.literal(""))
  .refine(
    (v) => {
      if (v === undefined || v === null || v === "") return true
      const t = new Date(`${v}T00:00:00`).getTime()
      return !Number.isNaN(t)
    },
    { message: "Use a valid date (YYYY-MM-DD)." },
  )
  .refine(
    (v) => {
      if (v === undefined || v === null || v === "") return true
      return isFutureYyyyMmDd(v)
    },
    { message: "Deadline must be a future date." },
  )

export const createGoalSchema = z.object({
  name: z
    .string()
    .trim()
    .min(SAVINGS_LIMITS.NAME_MIN, `Vault name must be at least ${SAVINGS_LIMITS.NAME_MIN} characters.`)
    .max(SAVINGS_LIMITS.NAME_MAX, `Vault name must be at most ${SAVINGS_LIMITS.NAME_MAX} characters.`),
  description: z
    .string()
    .max(SAVINGS_LIMITS.NOTE_MAX, `Note must be at most ${SAVINGS_LIMITS.NOTE_MAX} characters.`)
    .optional()
    .or(z.literal("")),
  targetAmount: z
    .number({ error: "Enter a target above 0 USDC." })
    .gt(0, "Enter a target above 0 USDC.")
    .max(SAVINGS_LIMITS.TARGET_MAX, "Target must not exceed 1,000,000 USDC."),
  targetDate: futureGoalDeadline,
  circleId: z.string().optional().nullable().or(z.literal("")),
  autoReserve: z.boolean().optional(),
})

export type CreateGoalInputSchema = z.infer<typeof createGoalSchema>

/** GoalForm field names differ from the API (target/deadline/note), so map them. */
export function validateGoalFormFields(values: {
  name: string
  target: string
  deadline: string
  description: string
}): { name?: string; target?: string; deadline?: string; description?: string } {
  const errors: { name?: string; target?: string; deadline?: string; description?: string } = {}
  const trimmedName = values.name.trim()
  if (!trimmedName) {
    errors.name = "Give your vault a name."
  } else if (trimmedName.length < SAVINGS_LIMITS.NAME_MIN) {
    errors.name = `Vault name must be at least ${SAVINGS_LIMITS.NAME_MIN} characters.`
  } else if (trimmedName.length > SAVINGS_LIMITS.NAME_MAX) {
    errors.name = `Vault name must be at most ${SAVINGS_LIMITS.NAME_MAX} characters.`
  }
  if (!values.target.trim()) {
    errors.target = "Enter a target above 0 USDC."
  } else {
    const amount = Number(values.target)
    if (!Number.isFinite(amount) || amount <= 0) {
      errors.target = "Enter a target above 0 USDC."
    } else if (amount > SAVINGS_LIMITS.TARGET_MAX) {
      errors.target = "Target must not exceed 1,000,000 USDC."
    }
  }
  if (values.deadline.trim()) {
    const t = new Date(`${values.deadline.trim()}T00:00:00`).getTime()
    if (Number.isNaN(t)) {
      errors.deadline = "Use a valid date (YYYY-MM-DD)."
    } else if (!isFutureYyyyMmDd(values.deadline.trim())) {
      errors.deadline = "Deadline must be a future date."
    }
  }
  if (values.description.length > SAVINGS_LIMITS.NOTE_MAX) {
    errors.description = `Note must be at most ${SAVINGS_LIMITS.NOTE_MAX} characters.`
  }
  return errors
}

/**
 * Pull per-field messages out of an Axios-style API error. The Go API returns
 * `{ code: "VALIDATION_ERROR", message, details }` where details may be an
 * array of `{ field, message }` or a field->message map; gin binding failures
 * surface as a plain message string. Unknown shapes fall back to {}.
 */
export function parseApiFieldErrors(error: unknown): Record<string, string> {
  const out: Record<string, string> = {}
  const resp = (error as { response?: { data?: unknown } })?.response?.data as
    | Record<string, unknown>
    | undefined
  if (!resp || typeof resp !== "object") return out
  const container = (resp.data ?? resp) as Record<string, unknown>
  const details = (container.details ?? resp.details) as unknown
  if (Array.isArray(details)) {
    for (const entry of details) {
      if (entry && typeof entry === "object") {
        const field = String((entry as Record<string, unknown>).field ?? "")
        const message = String((entry as Record<string, unknown>).message ?? "")
        if (field && message) out[field] = message
      }
    }
  } else if (details && typeof details === "object") {
    for (const [k, v] of Object.entries(details as Record<string, unknown>)) {
      if (typeof v === "string" && v) out[k] = v
    }
  }
  const nested = (container.errors ?? resp.errors) as unknown
  if (nested && typeof nested === "object" && !Array.isArray(nested)) {
    for (const [k, v] of Object.entries(nested as Record<string, unknown>)) {
      if (typeof v === "string" && v && !out[k]) out[k] = v
    }
  }
  return out
}

/** Best-effort human message from an API error envelope. */
export function parseApiErrorMessage(error: unknown, fallback: string): string {
  const resp = (error as { response?: { data?: unknown }; message?: string })?.response
    ?.data as Record<string, unknown> | string | undefined
  if (typeof resp === "string" && resp) return resp
  if (resp && typeof resp === "object") {
    const container = (resp.data ?? resp) as Record<string, unknown>
    if (typeof container.error === "string" && container.error) return container.error
    if (typeof resp.error === "string" && resp.error) return resp.error as string
    if (typeof container.message === "string" && container.message) return container.message
    if (typeof resp.message === "string" && resp.message) return resp.message as string
  }
  const msg = (error as { message?: string })?.message
  return msg || fallback
}

export const loginSchema = z.object({
  walletAddress: z.string().min(56).max(56),
  signature: z.string().min(1, "Signature is required"),
})

export const createCircleSchema = z.object({
  name: z
    .string()
    .trim()
    .min(CIRCLE_LIMITS.NAME_MIN, `Name must be at least ${CIRCLE_LIMITS.NAME_MIN} characters`)
    .max(CIRCLE_LIMITS.NAME_MAX, `Name must be at most ${CIRCLE_LIMITS.NAME_MAX} characters`),
  description: z
    .string()
    .max(CIRCLE_LIMITS.DESCRIPTION_MAX, `Description must be at most ${CIRCLE_LIMITS.DESCRIPTION_MAX} characters`)
    .optional()
    .or(z.literal("")),
  communityId: z.string().uuid("Community must be a valid ID.").optional(),
  circleType: z.enum(["public", "private", "community", "premium"], {
    error: "Circle type must be public, private, community, or premium.",
  }),
  payoutType: z.enum(["random", "fixed", "auction", "vote"], {
    error: "Payout type must be random, fixed, auction, or vote.",
  }),
  contributionAmount: z
    .number({ error: "Contribution must be positive." })
    .gt(0, "Contribution must be positive.")
    .max(CIRCLE_LIMITS.CONTRIBUTION_MAX, "Contribution must not exceed 1,000,000 USDC."),
  currency: z.literal("USDC", { error: "Currency must be USDC." }),
  frequency: z.enum(["daily", "weekly", "biweekly", "monthly"], {
    error: "Frequency must be daily, weekly, biweekly, or monthly.",
  }),
  maxMembers: z
    .number({ error: "Max members must be between 2 and 100." })
    .int("Max members must be a whole number.")
    .min(CIRCLE_LIMITS.MAX_MEMBERS_MIN, "Must have at least 2 members.")
    .max(CIRCLE_LIMITS.MAX_MEMBERS_MAX, "Must have at most 100 members."),
  minMoiScore: z
    .number({ error: "DeoScore must be between 0 and 1000." })
    .int("DeoScore must be a whole number.")
    .min(CIRCLE_LIMITS.MOI_MIN, "DeoScore must be between 0 and 1000.")
    .max(CIRCLE_LIMITS.MOI_MAX, "DeoScore must be between 0 and 1000.")
    .optional(),
  collateralPercent: z
    .number({ error: "Collateral must be between 0 and 100%." })
    .min(CIRCLE_LIMITS.COLLATERAL_MIN, "Collateral must be between 0 and 100%.")
    .max(CIRCLE_LIMITS.COLLATERAL_MAX, "Collateral must be between 0 and 100%.")
    .optional(),
  lateFeePercent: z
    .number({ error: "Late fee must be between 0 and 50%." })
    .min(CIRCLE_LIMITS.LATE_FEE_MIN, "Late fee must be between 0 and 50%.")
    .max(CIRCLE_LIMITS.LATE_FEE_MAX, "Late fee must be between 0 and 50%.")
    .default(5),
  gracePeriodHours: z
    .number({ error: "Grace period must be between 1 and 168 hours." })
    .int("Grace period must be a whole number of hours.")
    .min(CIRCLE_LIMITS.GRACE_MIN, "Grace period must be between 1 and 168 hours.")
    .max(CIRCLE_LIMITS.GRACE_MAX, "Grace period must be between 1 and 168 hours.")
    .default(24),
  maxStrikes: z
    .number({ error: "Max strikes must be between 1 and 10." })
    .int("Max strikes must be a whole number.")
    .min(CIRCLE_LIMITS.STRIKES_MIN, "Max strikes must be between 1 and 10.")
    .max(CIRCLE_LIMITS.STRIKES_MAX, "Max strikes must be between 1 and 10.")
    .default(3),
  startDate: futureCircleStartDate,
  requiresInvite: z.boolean().optional(),
  autoDebit: z.boolean().default(false),
})

export const updateCircleSchema = createCircleSchema.partial()

export const updateProfileSchema = z.object({
  displayName: z
    .string()
    .min(2, "Display name must be at least 2 characters")
    .max(50)
    .optional(),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  phone: z
    .string()
    .regex(/^\+?[0-9]{7,15}$/, "Invalid phone number")
    .optional()
    .or(z.literal("")),
  countryCode: z
    .string()
    .length(2, "Country code must be 2 characters")
    .optional()
    .or(z.literal("")),
  preferredLanguage: z.string().max(10).optional().or(z.literal("")),
})

export type LoginInput = z.infer<typeof loginSchema>
export type CreateCircleInput = z.infer<typeof createCircleSchema>
export type UpdateCircleInput = z.infer<typeof updateCircleSchema>
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>
