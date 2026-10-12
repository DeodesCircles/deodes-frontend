"use client";

import { useMultiWalletStore } from "@/stores/multi-wallet-store";
import { useMultiWalletConnection } from "@/hooks/use-multi-wallet";

export function useWallet() {
  const wallets = useMultiWalletStore((s) => s.wallets);
  const activeWalletId = useMultiWalletStore((s) => s.activeWalletId);
  const connect = useMultiWalletStore((s) => s.connect);
  const disconnect = useMultiWalletStore((s) => s.disconnect);
  const refreshBalance = useMultiWalletStore((s) => s.refreshBalance);
  const { address, isConnected, isConnecting, error } = useMultiWalletConnection();

  const activeEntry = activeWalletId ? wallets[activeWalletId] : null;
  const balance = activeEntry?.balance ?? null;

  return {
    address,
    isConnected,
    balance,
    isConnecting,
    error,
    connect,
    disconnect,
    refreshBalance,
  };
}
