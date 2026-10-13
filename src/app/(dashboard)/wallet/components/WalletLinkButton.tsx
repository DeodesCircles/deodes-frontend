"use client"

import { Link2, LoaderCircle } from "lucide-react"
import { useWalletLink } from "@/hooks/use-wallet-link"

/**
 * "Link to account" CTA for signed-in users whose connected 0x wallet is not
 * yet recorded server-side. Renders nothing when there is nothing to link.
 * Lives directly under the CustodyBadge on the wallet page.
 */
export function WalletLinkButton() {
  const { needsLink, link, linking, error } = useWalletLink()

  if (!needsLink && !error) return null

  return (
    <div className="rounded-xl border border-aurora-violet/30 bg-aurora-violet/10 px-4 py-3">
      {needsLink && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <p className="flex-1 text-xs text-muted-foreground min-w-40">
            This wallet isn&apos;t linked to your account yet. Link it to keep
            it across sessions.
          </p>
          <button
            type="button"
            onClick={() => void link()}
            disabled={linking}
            data-testid="wallet-link-cta"
            className="inline-flex h-9 items-center gap-1.5 rounded-xl px-4 text-xs font-heading font-semibold text-white gradient-bg-extended holo-glow disabled:opacity-50"
          >
            {linking ? (
              <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Link2 className="h-3.5 w-3.5" />
            )}
            {linking ? "Linking…" : "Link to account"}
          </button>
        </div>
      )}
      {error && (
        <p role="alert" className="mt-2 text-xs text-red-400">
          {error}
        </p>
      )}
    </div>
  )
}
