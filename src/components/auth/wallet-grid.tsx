"use client"

import { cn } from "@/lib/cn"
import { AuthWalletCard } from "./auth-wallet-card"
import type { ReactNode } from "react"

interface DetectedWallet {
  id: string
  name: string
  category: string
  icon: ReactNode
  description: string
  isRecommended?: boolean
  installUrl?: string
  status?: "detected" | "not_detected"
}

interface WalletGridProps {
  wallets: DetectedWallet[]
  connectingWalletId: string | null
  onSelect: (walletId: string) => void
  className?: string
}

export function WalletGrid({
  wallets,
  connectingWalletId,
  onSelect,
  className,
}: WalletGridProps) {
  if (wallets.length === 0) return null

  return (
    <div className={cn("grid grid-cols-2 gap-3", className)}>
      {wallets.map((wallet) => (
        <AuthWalletCard
          key={wallet.id}
          wallet={wallet}
          state={connectingWalletId === wallet.id ? "connecting" : "idle"}
          isConnecting={connectingWalletId === wallet.id}
          onSelect={() => onSelect(wallet.id)}
          disabled={connectingWalletId !== null}
        />
      ))}
    </div>
  )
}
