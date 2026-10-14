"use client"

import { useState } from "react"
import { Check, Copy, Share2 } from "lucide-react"
import { copyToClipboard } from "@/lib/clipboard"

interface ShareButtonsProps {
  url: string
  title: string
  text?: string
  className?: string
}

function intentUrls(url: string, text: string) {
  const u = encodeURIComponent(url)
  const t = encodeURIComponent(text)
  return [
    {
      key: "x",
      label: "Share on X",
      href: `https://twitter.com/intent/tweet?text=${t}&url=${u}`,
    },
    {
      key: "farcaster",
      label: "Share on Farcaster",
      href: `https://warpcast.com/~/compose?text=${t}&embeds[]=${u}`,
    },
    {
      key: "whatsapp",
      label: "Share on WhatsApp",
      href: `https://wa.me/?text=${t}%20${u}`,
    },
    {
      key: "telegram",
      label: "Share on Telegram",
      href: `https://t.me/share/url?url=${u}&text=${t}`,
    },
  ]
}

/**
 * Social share row: X, Farcaster, WhatsApp, Telegram intents + copy link,
 * with native Web Share when the browser offers it. No SDKs, no tracking.
 */
export function ShareButtons({ url, title, text, className }: ShareButtonsProps) {
  const [copied, setCopied] = useState(false)
  const [open, setOpen] = useState(false)
  const message = text ?? title
  const canNativeShare =
    typeof navigator !== "undefined" && "share" in navigator

  const copy = async () => {
    if (await copyToClipboard(url)) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const nativeShare = async () => {
    try {
      await (navigator as Navigator & { share: (d: ShareData) => Promise<void> }).share({
        title,
        text: message,
        url,
      })
    } catch {
      // Dismissed — fall back to the intent list.
      setOpen(true)
    }
  }

  return (
    <div className={className ?? "relative"}>
      <button
        type="button"
        aria-label="Share"
        aria-expanded={open}
        onClick={() => (canNativeShare ? void nativeShare() : setOpen((v) => !v))}
        className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 text-muted-foreground hover:text-foreground transition-colors"
      >
        <Share2 className="h-4 w-4" />
      </button>
      {open && (
        <div
          role="menu"
          aria-label="Share options"
          className="absolute right-0 z-30 mt-2 w-52 rounded-xl border border-white/10 bg-card p-2 shadow-xl"
        >
          {intentUrls(url, message).map((opt) => (
            <a
              key={opt.key}
              role="menuitem"
              href={opt.href}
              target="_blank"
              rel="noopener noreferrer"
              className="block rounded-lg px-3 py-2 text-sm text-foreground hover:bg-white/5"
            >
              {opt.label}
            </a>
          ))}
          <button
            type="button"
            role="menuitem"
            onClick={copy}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-foreground hover:bg-white/5"
          >
            {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copied!" : "Copy link"}
          </button>
        </div>
      )}
    </div>
  )
}
