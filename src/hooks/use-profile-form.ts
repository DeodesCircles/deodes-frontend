"use client"

import { useCallback } from "react"
import { useAuthFlowStore } from "@/stores/auth-flow-store"

export function useProfileForm() {
  const profile = useAuthFlowStore((s) => s.profile)
  const updateProfileField = useAuthFlowStore((s) => s.updateProfileField)
  const setFieldError = useAuthFlowStore((s) => s.setFieldError)
  const validateProfile = useAuthFlowStore((s) => s.validateProfile)

  const handleUpdateField = useCallback(
    (field: keyof typeof profile, value: string) => {
      updateProfileField(field, value)
    },
    [updateProfileField]
  )

  const handleSetFieldError = useCallback(
    (field: string, error: string | null) => {
      setFieldError(field, error)
    },
    [setFieldError]
  )

  const handleValidate = useCallback((): boolean => {
    return validateProfile()
  }, [validateProfile])

  return {
    profile,
    updateField: handleUpdateField,
    setFieldError: handleSetFieldError,
    validate: handleValidate,
  }
}
