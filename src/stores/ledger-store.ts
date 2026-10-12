"use client"

import { create } from "zustand"

type LedgerConnectionState = "idle" | "detecting" | "connecting" | "waiting_for_app" |
  "waiting_for_confirm" | "connected" | "disconnected" | "error" | "waiting_for_reconnect"

interface LedgerState {
  transportType: "usb" | "ble" | null
  connectionState: LedgerConnectionState
  firmwareVersion: string | null
  stellarAppVersion: string | null
  firmwareWarnings: string[]
  connectionError: string | null
  setTransportType: (value: LedgerState["transportType"]) => void
  setConnectionState: (value: LedgerConnectionState) => void
  setFirmwareVersion: (value: string | null) => void
  setStellarAppVersion: (value: string | null) => void
  setFirmwareWarnings: (value: string[]) => void
  setConnectionError: (value: string | null) => void
  reset: () => void
}

export const useLedgerStore = create<LedgerState>()((set) => ({
  transportType: null,
  connectionState: "idle",
  firmwareVersion: null,
  stellarAppVersion: null,
  firmwareWarnings: [],
  connectionError: null,
  setTransportType: (transportType) => set({ transportType }),
  setConnectionState: (connectionState) => set({ connectionState }),
  setFirmwareVersion: (firmwareVersion) => set({ firmwareVersion }),
  setStellarAppVersion: (stellarAppVersion) => set({ stellarAppVersion }),
  setFirmwareWarnings: (firmwareWarnings) => set({ firmwareWarnings }),
  setConnectionError: (connectionError) => set({ connectionError }),
  reset: () => set({ transportType: null, connectionState: "idle", firmwareVersion: null,
    stellarAppVersion: null, firmwareWarnings: [], connectionError: null }),
}))
