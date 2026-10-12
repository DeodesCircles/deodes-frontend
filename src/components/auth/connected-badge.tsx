"use client"

import { X } from "lucide-react"
import { cn } from "@/lib/cn"
import { formatAddress } from "@/lib/formatters"

interface ConnectedBadgeProps {
  walletName: string
  address: string
  onDisconnect?: () => void
  className?: string
}

export function ConnectedBadge({
  walletName,
  address,
  onDisconnect,
  className,
}: ConnectedBadgeProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-2xl glass px-4 py-3 border border-emerald-500/20",
        className
      )}
    >
      <span className="relative flex h-3 w-3 shrink-0">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
        <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500" />
      </span>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground">{walletName}</p>
        <p className="text-xs text-muted-foreground font-mono truncate">
          {formatAddress(address)}
        </p>
      </div>

      {onDisconnect && (
        <button
          type="button"
          onClick={onDisconnect}
          className="shrink-0 rounded-lg p-1.5 text-muted-foreground hover:text-red-400 hover:bg-white/10 transition-colors"
          aria-label="Disconnect wallet"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  )
}
