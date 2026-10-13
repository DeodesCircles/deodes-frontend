"use client"

import Link from "next/link"
import {
  ArrowDownToLine,
  ArrowDownRight,
  ArrowUpFromLine,
  ArrowUpRight,
} from "lucide-react"
import { cn } from "@/lib/cn"

interface WalletActionsProps {
  onReceive: () => void
}

const actionClass =
  "flex min-h-20 flex-col items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-card px-2 py-4 text-sm font-medium text-foreground transition-all duration-200 hover:scale-[1.02] hover:border-aurora-violet/30 active:scale-[0.97]"

/**
 * Primary action row: four long tappable buttons. Send goes to transfer,
 * Deposit/Withdraw to the onramp/offramp pages, Receive opens the QR modal.
 */
export function WalletActions({ onReceive }: WalletActionsProps) {
  return (
    <div
      role="group"
      aria-label="Wallet actions"
      className="grid grid-cols-2 gap-3 sm:grid-cols-4"
    >
      <Link
        href="/wallet/transfer"
        data-testid="wallet-action-send"
        className={cn(actionClass, "border-l-4 border-l-aurora-violet")}
      >
        <ArrowUpRight className="h-5 w-5 text-aurora-violet" aria-hidden="true" />
        Send
      </Link>
      <button
        type="button"
        onClick={onReceive}
        data-testid="wallet-action-receive"
        className={cn(actionClass, "border-l-4 border-l-emerald-400")}
      >
        <ArrowDownRight className="h-5 w-5 text-emerald-400" aria-hidden="true" />
        Receive
      </button>
      <Link
        href="/wallet/deposit"
        data-testid="wallet-action-deposit"
        className={cn(actionClass, "border-l-4 border-l-aurora-cyan")}
      >
        <ArrowDownToLine className="h-5 w-5 text-aurora-cyan" aria-hidden="true" />
        Deposit
      </Link>
      <Link
        href="/wallet/withdraw"
        data-testid="wallet-action-withdraw"
        className={cn(actionClass, "border-l-4 border-l-amber-400")}
      >
        <ArrowUpFromLine className="h-5 w-5 text-amber-400" aria-hidden="true" />
        Withdraw
      </Link>
    </div>
  )
}
