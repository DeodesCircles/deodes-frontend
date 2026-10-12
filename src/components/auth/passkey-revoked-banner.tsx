"use client"

import { ShieldAlert } from "lucide-react"
import Link from "next/link"

export function PasskeyRevokedBanner() {
  return (
    <div
      className="flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4"
      role="alert"
    >
      <ShieldAlert className="h-5 w-5 shrink-0 mt-0.5 text-red-400" />
      <div className="space-y-1">
        <p className="text-sm font-medium text-red-400">Passkey revoked</p>
        <p className="text-xs text-muted-foreground">
          Your passkey has been revoked. Please set up a new one to continue.
        </p>
        <Link
          href="/register"
          className="inline-block mt-2 text-xs font-medium text-aurora-cyan hover:underline"
        >
          Set up new passkey &rarr;
        </Link>
      </div>
    </div>
  )
}
