"use client"

import { useEffect, useRef, useCallback } from "react"
import { useAuthFlowStore } from "@/stores/auth-flow-store"
import { captureAuthError } from "@/lib/monitoring"

export function useConditionalMediation() {
  const abortRef = useRef<AbortController | null>(null)

  const abort = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
  }, [])

  useEffect(() => {
    if (typeof window === "undefined") return
    if (!window.PublicKeyCredential?.isConditionalMediationAvailable) return

    const mode = useAuthFlowStore.getState().mode
    if (mode !== "login") return

    let cancelled = false

    window.PublicKeyCredential.isConditionalMediationAvailable()
      .then((available) => {
        if (!available || cancelled) return

        const rpId = (typeof process !== "undefined" && (process.env as Record<string, string>).NEXT_PUBLIC_PASSKEY_RP_ID) || window.location.hostname

        const controller = new AbortController()
        abortRef.current = controller

        navigator.credentials.get({
          signal: controller.signal,
          mediation: "conditional",
          publicKey: {
            challenge: new Uint8Array(32),
            rpId,
            allowCredentials: [],
            userVerification: "required",
          },
        } as CredentialRequestOptions).then((credential) => {
          abortRef.current = null
          if (cancelled || !credential) return
          const store = useAuthFlowStore.getState()
          if (store.mode === "login") {
            store.connectStart("passkey")
            store.setStep("sign")
          }
        }).catch((err: unknown) => {
          abortRef.current = null
          if ((err as DOMException)?.name === "AbortError") return
          captureAuthError(err, { step: "choose", mode: "login", errorCode: "internal_error" })
        })
      })
      .catch(() => { /* conditional mediation unavailable — fallback to standard auth */ })

    return () => {
      cancelled = true
      abortRef.current?.abort()
      abortRef.current = null
    }
  }, [])

  return abort
}
