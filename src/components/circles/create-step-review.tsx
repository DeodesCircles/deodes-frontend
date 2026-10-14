"use client"

import React from "react"
import { Check, TriangleAlert } from "lucide-react"
import type { CircleFormData } from "@/types"

interface CreateStepReviewProps {
  formData: CircleFormData
  isPending: boolean
  errors?: Record<string, string>
}

const FIELD_LABELS: Record<string, string> = {
  name: "Name",
  description: "Description",
  maxMembers: "Max members",
  startDate: "Start date",
  contributionAmount: "Contribution",
  currency: "Currency",
  lateFeePercent: "Late fee",
  gracePeriodHours: "Grace period",
  maxStrikes: "Max strikes",
  collateralPercent: "Collateral",
  minMoiScore: "Min DeoScore",
  submit: "Submit",
}

export function CreateStepReview({ formData, errors = {} }: CreateStepReviewProps) {
  const freqLabel = formData.frequency.charAt(0).toUpperCase() + formData.frequency.slice(1)

  const rows: { label: string; value: string }[] = [
    { label: "Name", value: formData.name },
    ...(formData.description ? [{ label: "Description", value: formData.description }] : []),
    { label: "Type", value: formData.circleType },
    { label: "Max Members", value: String(formData.maxMembers) },
    { label: "Contribution", value: `${formData.contributionAmount} ${formData.currency} · ${freqLabel}` },
    { label: "Mode", value: formData.autoDebit ? "Auto (keeper pulls each round)" : "Flexible (manual payments)" },
    { label: "Payout Type", value: formData.payoutType },
    { label: "Late Fee", value: `${formData.lateFeePercent}%` },
    { label: "Grace Period", value: `${formData.gracePeriodHours}h` },
    { label: "Max Strikes", value: String(formData.maxStrikes) },
    ...(formData.collateralPercent != null ? [{ label: "Collateral", value: `${formData.collateralPercent}%` }] : []),
    ...(formData.minMoiScore != null && formData.minMoiScore > 0 ? [{ label: "Min DeoScore", value: String(formData.minMoiScore) }] : []),
  ]

  const fieldEntries = Object.entries(errors).filter(([key]) => key !== "submit")

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/20">
          <Check className="h-4 w-4 text-emerald-400" />
        </div>
        <h3 className="font-heading text-lg font-semibold text-foreground">
          Review Your Circle
        </h3>
      </div>

      <div className="glass-whisper rounded-xl divide-y divide-border">
        {rows.map((row, i) => (
          <div key={i} className="flex items-center justify-between px-5 py-3">
            <span className="text-sm text-muted-foreground font-body">{row.label}</span>
            <span className="text-sm font-medium text-foreground font-heading">
              {row.value}
            </span>
          </div>
        ))}
      </div>

      {fieldEntries.length > 0 && (
        <div
          role="alert"
          data-testid="circle-review-field-errors"
          className="space-y-1 rounded-xl bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-400 font-body"
        >
          <p className="flex items-center gap-2 font-medium">
            <TriangleAlert className="h-4 w-4 shrink-0" />
            Please fix the following before creating your circle:
          </p>
          <ul className="list-disc pl-8">
            {fieldEntries.map(([field, message]) => (
              <li key={field}>
                <span className="font-medium">{FIELD_LABELS[field] ?? field}:</span> {message}
              </li>
            ))}
          </ul>
        </div>
      )}

      {errors.submit && (
        <div
          role="alert"
          data-testid="circle-review-submit-error"
          className="flex items-start gap-2 rounded-xl bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-400 font-body"
        >
          <TriangleAlert className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{errors.submit}</span>
        </div>
      )}
    </div>
  )
}
