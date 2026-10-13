"use client"

import { useEffect } from "react"
import { X } from "lucide-react"
import { WalletSelector } from "./wallet-selector"
import { useMultiWalletStore } from "@/stores/multi-wallet-store"
import { useFocusTrap } from "@/hooks/use-focus-trap"
import { cn } from "@/lib/cn"

/**
 * Global wallet-selector dialog for the authenticated dashboard shell.
 *
 * Root cause it fixes: <WalletSelector/> (the only component that renders
 * the wallet list / QR panel) was mounted solely on the login + register
 * pages. Everywhere else — wallet empty state, header Connect modal —
 * callers flipped `isSelectorOpen` with nothing listening, so the button
 * appeared dead. This dialog mounts once in the dashboard layout and
 * follows that flag, closing on backdrop/Esc/X and automatically after a
 * successful connect.
 */
export function WalletSelectorDialog() {
  const isOpen = useMultiWalletStore((s) => s.isSelectorOpen)
  const isConnected = useMultiWalletStore((s) => {
    const id = s.activeWalletId
    if (!id) return false
    const st = s.wallets[id]?.status
    return st === "connected" || st === "reconnecting"
  })
  const setOpen = useMultiWalletStore((s) => s.setSelectorOpen)
  const dialogRef = useFocusTrap<HTMLDivElement>(isOpen, () => setOpen(false))

  // A fresh connection fulfills the dialog's purpose — close it so the
  // page underneath (balances, link CTA) takes over.
  useEffect(() => {
    if (isOpen && isConnected) setOpen(false)
  }, [isOpen, isConnected, setOpen])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Dismiss wallet dialog"
        tabIndex={-1}
        onClick={() => setOpen(false)}
        className="absolute inset-0 cursor-default bg-black/60 backdrop-blur-md"
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Connect wallet"
        tabIndex={-1}
        className={cn(
          "relative z-10 max-h-[85vh] w-full max-w-sm overflow-y-auto",
          "rounded-2xl border border-white/10 bg-card p-6",
        )}
      >
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Close wallet dialog"
          className="absolute right-4 top-4 rounded-full p-2 text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
        <WalletSelector variant="overlay" />
      </div>
    </div>
  )
}
