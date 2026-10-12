"use client"

import { WifiOff } from "lucide-react"
import { cn } from "@/lib/cn"
import { useOnlineStatus } from "@/hooks/use-online-status"

interface OfflineBannerProps {
  className?: string
}

export function OfflineBanner({ className }: OfflineBannerProps) {
  const isOnline = useOnlineStatus()

  if (isOnline) return null

  return (
    <div
      className={cn(
        "fixed top-0 left-0 right-0 z-50 flex items-center justify-center gap-2 bg-red-500/90 px-4 py-2 text-sm font-medium text-white backdrop-blur-sm",
        className
      )}
      role="alert"
    >
      <WifiOff className="h-4 w-4 shrink-0" />
      <span>You are offline. Please check your connection.</span>
    </div>
  )
}
