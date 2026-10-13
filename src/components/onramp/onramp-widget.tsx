"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CircleAlert, LoaderCircle } from "lucide-react";
import {
  createOnrampAppKit,
  fetchOnrampSession,
  fetchOnrampWidgetBaseUrl,
} from "@/lib/onramp/session";
import { cn } from "@/lib/cn";

export interface DepositSettledPayload {
  paymentId?: string;
  amount?: string;
  [key: string]: unknown;
}

interface OnrampWidgetProps {
  appUserId: string;
  destinationAddress: string;
  widgetBaseUrl?: string;
  onSettled?: (payload: DepositSettledPayload) => void;
  onNotCompleted?: (code: string) => void;
  onError?: (message: string) => void;
  className?: string;
}

type WidgetState = "loading" | "ready" | "error";

/**
 * Circle App Kit Onramp widget (iframe mode) — buy USDC on Arc with fiat.
 *
 * The container needs an explicit height or the iframe collapses to 0px
 * (Circle hosting requirement). Sessions are minted server-side; the API
 * key never reaches the browser. Invalid (non-0x) destinations are refused
 * before any network call.
 */
export function OnrampWidget({
  appUserId,
  destinationAddress,
  widgetBaseUrl,
  onSettled,
  onNotCompleted,
  onError,
  className,
}: OnrampWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetRef = useRef<{ close: () => void } | null>(null);
  const callbacksRef = useRef({ onSettled, onNotCompleted, onError });
  callbacksRef.current = { onSettled, onNotCompleted, onError };
  const [state, setState] = useState<WidgetState>("loading");
  const [error, setError] = useState("");

  const fail = useCallback((message: string) => {
    setError(message);
    setState("error");
    callbacksRef.current.onError?.(message);
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    if (!/^0x[0-9a-fA-F]{40}$/.test(destinationAddress)) {
      fail("Connect an Arc wallet first — onramp needs a 0x destination address.");
      return;
    }
    if (!appUserId) {
      fail("Sign in first — onramp sessions are per-user.");
      return;
    }

    let cancelled = false;

    const mount = async (remount = false) => {
      try {
        const resolvedBase = await fetchOnrampWidgetBaseUrl(widgetBaseUrl);
        if (cancelled) return;
        const kit = createOnrampAppKit(resolvedBase);
        const session = await fetchOnrampSession({ appUserId, destinationAddress });
        if (cancelled) return;
        widgetRef.current?.close();
        widgetRef.current = kit.onramp.mountIframe({
          session,
          container,
          onDepositSettled: ({ payload }) =>
            callbacksRef.current.onSettled?.(
              (payload ?? {}) as DepositSettledPayload,
            ),
          onDepositNotCompleted: ({ code }) =>
            callbacksRef.current.onNotCompleted?.(String(code ?? "unknown")),
          onSessionExpired: async () => {
            if (!cancelled) await mount(true);
          },
        });
        if (!cancelled && !remount) setState("ready");
      } catch (err) {
        if (cancelled) return;
        fail(
          err instanceof Error ? err.message : "Failed to start onramp session",
        );
      }
    };

    void mount();
    const stop = () => {
      cancelled = true;
      widgetRef.current?.close();
      widgetRef.current = null;
    };
    window.addEventListener("beforeunload", stop);
    return () => {
      window.removeEventListener("beforeunload", stop);
      stop();
    };
  }, [appUserId, destinationAddress, widgetBaseUrl, fail]);

  return (
    <div className={cn("w-full", className)}>
      {state === "loading" && (
        <div className="flex h-[720px] w-full items-center justify-center rounded-xl border border-white/10">
          <LoaderCircle className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden="true" />
          <span className="sr-only">Loading onramp…</span>
        </div>
      )}
      {state === "error" && (
        <div role="alert" className="flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-xs text-red-300">
          <CircleAlert className="h-3.5 w-3.5 shrink-0 mt-0.5" aria-hidden="true" />
          {error}
        </div>
      )}
      <div
        ref={containerRef}
        id="onramp-root"
        className={cn("w-full", state === "ready" ? "h-[720px]" : "h-0 overflow-hidden")}
      />
      <p className="mt-2 text-[11px] text-muted-foreground">
        Card and bank payments are processed by Circle. Deodes charges nothing on deposits.
      </p>
    </div>
  );
}

/**
 * Popup mode — call directly from a click handler or the browser blocks it.
 * Returns 'opened' | 'blocked'.
 */
export async function openOnrampPopup(args: {
  appUserId: string;
  destinationAddress: string;
  widgetBaseUrl?: string;
  onSettled?: (payload: DepositSettledPayload) => void;
  onNotCompleted?: (code: string) => void;
}): Promise<"opened" | "blocked" | "error"> {
  try {
    const resolvedBase = await fetchOnrampWidgetBaseUrl(args.widgetBaseUrl);
    const kit = createOnrampAppKit(resolvedBase);
    const session = await fetchOnrampSession({
      appUserId: args.appUserId,
      destinationAddress: args.destinationAddress,
    });
    const result = await kit.onramp.openWindow({
      session,
      onDepositSettled: ({ payload }) =>
        args.onSettled?.((payload ?? {}) as DepositSettledPayload),
      onDepositNotCompleted: ({ code }) =>
        args.onNotCompleted?.(String(code ?? "unknown")),
    });
    return result.status === "blocked" ? "blocked" : "opened";
  } catch {
    return "error";
  }
}
