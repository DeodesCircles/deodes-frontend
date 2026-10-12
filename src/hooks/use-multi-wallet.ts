"use client"

import { useShallow } from "zustand/react/shallow"
import { useMultiWalletStore } from "@/stores/multi-wallet-store"

/** Derive connection state from active wallet entry — no manual sync needed. */
export function useMultiWalletConnection() {
  const activeWalletId = useMultiWalletStore((s) => s.activeWalletId)
  const wallets = useMultiWalletStore((s) => s.wallets)
  const activeEntry = activeWalletId ? wallets[activeWalletId] : undefined

  return {
    isConnected: activeEntry?.status === "connected" || activeEntry?.status === "reconnecting",
    isConnecting: activeEntry?.status === "connecting",
    address: activeEntry?.publicKey ?? null,
    error: activeEntry?.error?.message ?? null,
    activeAdapter: activeEntry?.adapter ?? null,
  }
}

/** Active-wallet identity slice — subscribe only when the active wallet/id changes. */
export function useMultiWalletActive() {
  const activeWalletId = useMultiWalletStore((s) => s.activeWalletId)
  const wallets = useMultiWalletStore((s) => s.wallets)
  const activeWallet = activeWalletId ? wallets[activeWalletId] : undefined
  return { activeWalletId, activeWallet, wallets }
}

/** Wallet list slice — subscribe only when the detected/available wallet list changes. */
export function useMultiWalletList() {
  return useMultiWalletStore(useShallow((s) => ({
    detectedWallets: s.detectedWallets,
    isSelectorOpen: s.isSelectorOpen,
  })))
}

/** Action slice — actions are stable references and never cause re-renders. */
export function useMultiWalletActions() {
  return useMultiWalletStore(useShallow((s) => ({
    connect: s.connect,
    disconnect: s.disconnect,
    signMessage: s.signMessage,
    switchWallet: s.switchWallet,
    refreshBalance: s.refreshBalance,
    setSelectorOpen: s.setSelectorOpen,
  })))
}

/**
 * Convenience aggregator kept for backwards-compatibility.
 * Prefer the focused hooks above to avoid subscribing to the full state.
 */
export function useMultiWallet() {
  const connection = useMultiWalletConnection()
  const { activeWalletId, activeWallet, wallets } = useMultiWalletActive()
  const { detectedWallets, isSelectorOpen } = useMultiWalletList()
  const actions = useMultiWalletActions()

  return {
    activeWalletId,
    activeWallet,
    wallets,
    detectedWallets,
    adapter: connection.activeAdapter,
    isConnected: connection.isConnected,
    address: connection.address,
    isConnecting: connection.isConnecting,
    error: connection.error,
    isSelectorOpen,
    ...actions,
  }
}
