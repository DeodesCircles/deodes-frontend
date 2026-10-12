"use client"

import { create } from "zustand"
import { WC2_QR_EXPIRATION_MS } from "@/lib/constants"

export type WalletConnectPairingState =
  | "idle" | "connecting" | "pairing" | "awaiting_approval"
  | "approved" | "rejected" | "timeout" | "error"

interface WalletConnectState {
  pairingUri: string | null
  pairingState: WalletConnectPairingState
  relayStatus: "healthy" | "degraded" | "down"
  pairingError: string | null
  qrExpiresAt: number | null
  setPairingUri: (uri: string | null) => void
  setPairingState: (state: WalletConnectPairingState) => void
  setPairingError: (error: string | null) => void
  setRelayStatus: (status: WalletConnectState["relayStatus"]) => void
  reset: () => void
}

export const useWalletConnectStore = create<WalletConnectState>()((set, get) => ({
  pairingUri: null,
  pairingState: "idle",
  relayStatus: "healthy",
  pairingError: null,
  qrExpiresAt: null,
  setPairingUri: (pairingUri) => set({
    pairingUri,
    pairingState: pairingUri ? "pairing" : "idle",
    qrExpiresAt: pairingUri ? Date.now() + WC2_QR_EXPIRATION_MS : null,
  }),
  setPairingState: (pairingState) => set({ pairingState }),
  setPairingError: (pairingError) => set({
    pairingError,
    pairingState: pairingError ? "error" : get().pairingState,
  }),
  setRelayStatus: (relayStatus) => set({ relayStatus }),
  reset: () => set({ pairingUri: null, pairingState: "idle", pairingError: null, qrExpiresAt: null }),
}))
