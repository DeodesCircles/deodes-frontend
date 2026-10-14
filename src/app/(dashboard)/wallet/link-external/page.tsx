"use client"

import Link from "next/link"
import { ArrowLeft, ArrowRight, Copy, Check, ExternalLink, Unlink } from "lucide-react"
import { useState } from "react"
import { PageHeader } from "@/components/shared/page-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { WalletConnect } from "@/components/wallet/wallet-connect"
import { formatAddress } from "@/lib/formatters"
import { copyToClipboard } from "@/lib/clipboard"
import { useLinkExternal } from "./hooks/useLinkExternal"

/**
 * Link & sweep (Phase B): bring funds from your own wallet into your Deodes
 * wallet. This screen is a funding rail only — linking never logs you in,
 * never enrolls auto-pay, and never becomes an identity. Your Deodes wallet
 * (auto-created at signup) stays the one true wallet.
 */
export default function LinkExternalPage() {
  const {
    externalAddress,
    externalBalance,
    hostedAddress,
    amount,
    setAmount,
    status,
    sweep,
    unlink,
    explorerTxUrl,
  } = useLinkExternal()
  const [copied, setCopied] = useState(false)

  const copyHosted = async () => {
    if (!hostedAddress) return
    if (await copyToClipboard(hostedAddress)) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="container-premium space-y-6">
      <Link href="/wallet/settings" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-3.5 w-3.5" /> Wallet settings
      </Link>
      <PageHeader
        title="Use your own wallet"
        description="Link an external wallet and sweep funds into your Deodes wallet. Linking is funding only — it never logs you in or turns on auto-pay."
      />

      <div className="space-y-4">
        <section className="border-l-4 border-l-aurora-violet pl-6">
          <h2 className="text-lg font-heading">1 · Link your wallet</h2>
          <p className="text-sm text-muted-foreground">Read-only link. Nothing moves until you approve a transfer below.</p>
          <div className="mt-3">
            <WalletConnect />
          </div>
        </section>

        {externalAddress && (
          <section className="border-l-4 border-l-aurora-violet pl-6">
            <h2 className="text-lg font-heading">2 · Balances</h2>
            <div className="mt-2 flex flex-col gap-2 text-sm">
              <div className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground">External ({formatAddress(externalAddress)})</span>
                <span className="font-mono">{externalBalance ?? "…"} USDC</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground">Your Deodes wallet</span>
                <span className="flex items-center gap-2 font-mono">
                  {hostedAddress ? formatAddress(hostedAddress) : "…"}
                  {hostedAddress && (
                    <button type="button" onClick={copyHosted} aria-label="Copy Deodes wallet address" className="text-muted-foreground hover:text-foreground">
                      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                  )}
                </span>
              </div>
            </div>
          </section>
        )}

        {externalAddress && hostedAddress && (
          <section className="border-l-4 border-l-aurora-violet pl-6">
            <h2 className="text-lg font-heading">3 · Sweep funds in</h2>
            <p className="text-sm text-muted-foreground">One transfer, approved in your wallet. Your key never leaves it.</p>
            <div className="mt-3 flex flex-col gap-3 sm:flex-row">
              <Input
                id="sweep-amount"
                type="number"
                label="Amount (USDC)"
                placeholder="0.00"
                min="0"
                step="any"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
              <Button
                type="button"
                variant="primary"
                size="lg"
                className="sm:w-auto"
                onClick={() => void sweep()}
                isLoading={status.kind === "working"}
                disabled={!amount || Number(amount) <= 0}
              >
                Transfer to my Deodes wallet <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
            <div aria-live="polite" className="mt-2 text-sm">
              {status.kind === "working" && <p className="text-muted-foreground">{status.step}</p>}
              {status.kind === "error" && <p role="alert" className="text-red-400">{status.message}</p>}
              {status.kind === "done" && (
                <p className="text-emerald-400">
                  Sent.{" "}
                  <a href={explorerTxUrl(status.txHash)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 underline">
                    View on explorer <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </p>
              )}
            </div>
          </section>
        )}

        {externalAddress && (
          <section className="pl-6">
            <button
              type="button"
              onClick={unlink}
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
            >
              <Unlink className="h-4 w-4" /> Unlink this wallet
            </button>
          </section>
        )}
      </div>
    </div>
  )
}
