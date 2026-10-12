"use client"

import { createContext, useContext, useEffect, useRef, type ReactNode } from "react"
import {
  useAuthFlowStore,
  type AuthFlowStore,
  type AuthFlowStatus,
} from "@/stores/auth-flow-store"
import { useMultiWalletStore } from "@/stores/multi-wallet-store"

type AuthFlowContextValue = null

const AuthFlowContext = createContext<AuthFlowContextValue>(null)

export function AuthFlowProvider({ children }: { children: ReactNode }) {
  const prevStatusRef = useRef<AuthFlowStatus["status"]>("idle")

  useEffect(() => {
    const unsub = useAuthFlowStore.subscribe((state) => {
      const status = state.status.status
      const address = state.connection.address
      const prevStatus = prevStatusRef.current

      if (status === "connected" && prevStatus !== "connected" && state.connection.walletId && address) {
        useMultiWalletStore.getState().setLoginError(null)
      }

      prevStatusRef.current = status
    })

    return unsub
  }, [])

  // Multi-tab sync: listen for storage events
  useEffect(() => {
    function handleStorageChange(event: StorageEvent) {
      if (event.key !== "moistello-auth-flow") return
      if (!event.newValue) return

      try {
        const parsed = JSON.parse(event.newValue)
        const remoteState = parsed?.state
        if (!remoteState) return

        const remoteStatus = remoteState.status?.status
        const localStatus = useAuthFlowStore.getState().status.status

        // If another tab authenticated and this tab is still in flow, reset
        if (remoteStatus === "authenticated" && localStatus !== "authenticated") {
          useAuthFlowStore.getState().reset()
        }
      } catch {
        // Storage event with invalid JSON from concurrent writes — ignore
      }
    }

    window.addEventListener("storage", handleStorageChange)
    return () => window.removeEventListener("storage", handleStorageChange)
  }, [])

  return <AuthFlowContext.Provider value={null}>{children}</AuthFlowContext.Provider>
}

export function useAuthFlow<U>(selector: (state: AuthFlowStore) => U): U {
  const context = useContext(AuthFlowContext)
  if (context === null && typeof window !== "undefined") {
    // Allow use outside provider during SSR/hydration — provider is guaranteed at runtime
  }
  return useAuthFlowStore(selector)
}
