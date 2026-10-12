"use client";

import { cn } from "@/lib/cn";
import type { WsConnectionState } from "@/hooks/use-websocket";

interface LiveIndicatorProps {
  connectionState: WsConnectionState;
  className?: string;
}

const config: Record<
  WsConnectionState,
  { dotClass: string; label: string; ariaLabel: string }
> = {
  connected: {
    dotClass: "bg-emerald-400 animate-pulse",
    label: "Live",
    ariaLabel: "Real-time updates active",
  },
  polling: {
    dotClass: "bg-amber-400",
    label: "Polling",
    ariaLabel: "Polling for updates every 30 seconds",
  },
  disconnected: {
    dotClass: "bg-muted-foreground/50",
    label: "Offline",
    ariaLabel: "Offline — updates paused",
  },
  connecting: {
    dotClass: "bg-muted-foreground/50",
    label: "Offline",
    ariaLabel: "Connecting…",
  },
};

/**
 * Small inline status pill showing the WebSocket / polling connection state.
 *
 * Connected  — green pulsing dot + "Live"
 * Polling    — amber dot + "Polling"
 * Offline    — gray dot + "Offline"
 */
export function LiveIndicator({ connectionState, className }: LiveIndicatorProps) {
  const { dotClass, label, ariaLabel } = config[connectionState] ?? config.connecting;

  return (
    <span
      role="status"
      aria-label={ariaLabel}
      aria-live="polite"
      className={cn(
        "inline-flex items-center gap-1.5 text-xs font-body text-muted-foreground select-none",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn("h-2 w-2 rounded-full shrink-0", dotClass)}
      />
      {label}
    </span>
  );
}
