"use client"

import { create } from "zustand"

type PasskeyState = "idle" | "registering" | "awaiting_biometric" | "authenticating" |
  "deriving" | "connected" | "error"

interface PasskeyWalletState {
  state: PasskeyState
  error: string | null
  publicKey: string | null
  setState: (state: PasskeyState) => void
  setError: (error: string | null) => void
  setPublicKey: (publicKey: string | null) => void
  reset: () => void
}

export const usePasskeyWalletStore = create<PasskeyWalletState>()((set, get) => ({
  state: "idle",
  error: null,
  publicKey: null,
  setState: (state) => set({ state }),
  setError: (error) => set({ error, state: error ? "error" : get().state }),
  setPublicKey: (publicKey) => set({ publicKey }),
  reset: () => set({ state: "idle", error: null, publicKey: null }),
}))
