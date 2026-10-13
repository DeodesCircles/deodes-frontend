"use client";

import { useEffect, type ReactNode } from "react";
import { useAuthStore } from "@/stores/auth-store";
import { useMultiWalletStore } from "@/stores/multi-wallet-store";

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  useEffect(() => {
    useAuthStore.getState().checkAuth()
    // Arc-only: initialize EVM wallet detection on first paint so
    // Connect Wallet never shows an empty list.
    useMultiWalletStore.getState().init().catch(() => {})
  }, [])

  return <>{children}</>
}
