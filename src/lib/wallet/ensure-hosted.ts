"use client";

import { logger } from "@/lib/logger";
import { post } from "@/lib/api-client";

export interface HostedWalletInfo {
  publicKey: string;
  walletType: string;
}

/**
 * Best-effort hosted Arc wallet provisioning.
 *
 * The backend derives the key deterministically from the user ID and returns
 * the existing wallet when one is present, so this is safe to call after
 * every login: first call creates, later calls are a cheap no-op read.
 * Never throws and never blocks auth — returns null when the backend is
 * unreachable or not yet migrated.
 */
export async function ensureHostedArcWallet(): Promise<HostedWalletInfo | null> {
  if (typeof window === "undefined") return null;
  try {
    const res = (await post<Record<string, unknown>>(
      "/wallets/hosted-arc/ensure",
    )) as Record<string, unknown>;
    const data = (res?.data ?? res) as Record<string, unknown>;
    const wallet = (data?.wallet ?? {}) as Record<string, unknown>;
    const publicKey = typeof wallet.publicKey === "string" ? wallet.publicKey : "";
    if (!/^0x[0-9a-fA-F]{40}$/.test(publicKey)) return null;
    return {
      publicKey,
      walletType: typeof wallet.walletType === "string" ? wallet.walletType : "hosted",
    };
  } catch (e) {
    logger.warn("[wallet] Hosted wallet ensure failed (non-blocking):", e);
    return null;
  }
}
