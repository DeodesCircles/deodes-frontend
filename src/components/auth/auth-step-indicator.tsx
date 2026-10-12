"use client"

import { CreateStepIndicator, type Step } from "@/components/circles/create-step-indicator"

interface AuthStepIndicatorProps {
  steps: Step[]
  currentStep: string
  className?: string
}

export function AuthStepIndicator({
  steps,
  currentStep,
  className,
}: AuthStepIndicatorProps) {
  const currentStepIndex = steps.findIndex((s) => s.key === currentStep)
  const currentStepNumber = currentStepIndex >= 0 ? currentStepIndex + 1 : 1

  const normalizedSteps = steps.map((step, index) => ({
    key: step.key,
    label: step.label,
    number: step.number ?? index + 1,
    optional: step.optional,
  }))

  return (
    <CreateStepIndicator
      currentStep={currentStepNumber}
      steps={normalizedSteps}
      variant="auth"
      className={className}
    />
  )
}
