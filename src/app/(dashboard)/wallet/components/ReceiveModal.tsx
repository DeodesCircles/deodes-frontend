"use client"

import { useEffect, useRef, useState } from "react"
import { Check, Copy } from "lucide-react"
import { Button } from "@/components/ui/button"
import { copyToClipboard } from "@/lib/clipboard"
import { useFocusTrap } from "@/hooks/use-focus-trap"

interface ReceiveModalProps {
  address: string | null
  open: boolean
  onClose: () => void
}

/** Receive QR modal for the hosted/connected address. USDC on Arc only. */
export function ReceiveModal({ address, open, onClose }: ReceiveModalProps) {
  const [copied, setCopied] = useState(false)
  const qrCanvasRef = useRef<HTMLCanvasElement>(null)
  const dialogRef = useFocusTrap<HTMLDivElement>(open && address !== null, onClose)

  useEffect(() => {
    if (!open || !address) return
    let cancelled = false
    import("qrcode")
      .then((QRCode) => {
        if (cancelled || !qrCanvasRef.current) return
        QRCode.toCanvas(qrCanvasRef.current, address, {
          width: 160,
          margin: 2,
        }).catch(() => {})
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [open, address])

  if (!open || !address) return null

  const copyKey = async () => {
    const success = await copyToClipboard(address)
    if (success) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <button
        type="button"
        aria-label="Dismiss receive dialog"
        tabIndex={-1}
        onClick={onClose}
        className="absolute inset-0 cursor-default"
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="receive-wallet-title"
        tabIndex={-1}
        className="relative z-10 w-full max-w-sm space-y-5 rounded-xl border border-white/15 bg-[rgb(var(--background))] p-6"
      >
        <div className="flex items-center justify-between">
          <h3 id="receive-wallet-title" className="font-heading text-base font-semibold text-foreground">
            Receive
          </h3>
          <button
            type="button"
            aria-label="Close receive dialog"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/10 text-sm text-muted-foreground hover:text-foreground"
          >
            ✕
          </button>
        </div>
        <div className="mx-auto flex h-40 w-40 items-center justify-center rounded-xl bg-white">
          <canvas ref={qrCanvasRef} width={160} height={160} aria-label="Wallet address QR code" />
        </div>
        <div className="rounded-xl bg-white/5 px-4 py-3">
          <code className="break-all font-mono text-sm text-foreground">{address}</code>
        </div>
        <Button
          variant="primary"
          size="md"
          onClick={copyKey}
          leftIcon={copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          className="w-full"
        >
          {copied ? "Copied!" : "Copy Address"}
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          Send only USDC on Arc to this address.
        </p>
      </div>
    </div>
  )
}
