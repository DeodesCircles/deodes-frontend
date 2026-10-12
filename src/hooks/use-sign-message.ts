"use client"

import { useCallback } from "react"
import { useAuthFlowStore } from "@/stores/auth-flow-store"

/**
 * @deprecated Use `useAuthFlowStore.getState().signAndSubmit()` directly instead.
 * This hook is a thin wrapper for backward compatibility and will be removed in a future version.
 */
export function useSignMessage() {
  const signAndSubmit = useAuthFlowStore((s) => s.signAndSubmit)

  const handleSign = useCallback(async () => {
    await signAndSubmit()
    const status = useAuthFlowStore.getState().status.status
    return status === "authenticated"
  }, [signAndSubmit])

  return { sign: handleSign, signAndSubmit }
}
