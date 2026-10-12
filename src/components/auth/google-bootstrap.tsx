"use client";

import { useEffect, useRef } from "react";
import { useAuthStore } from "@/stores/auth-store";
import { useToast } from "@/hooks/use-toast";
import type { User } from "@/types";

interface SessionPayload {
  sub?: string;
  email?: string;
  name?: string | null;
  provider?: string;
}

function payloadFromToken(token: string): SessionPayload | null {
  try {
    const part = token.split(".")[1];
    if (!part) return null;
    return JSON.parse(atob(part)) as SessionPayload;
  } catch {
    return null;
  }
}

/**
 * Completes a Google sign-in on the client. The OAuth callback (server) sets
 * the HttpOnly session cookie and redirects home; the profile inside the JWT
 * still has to reach the encrypted localStorage user store, which only page
 * script can write. Runs once per mount, only when the store is authenticated
 * but profile-less.
 */
export function GoogleBootstrap() {
  const toast = useToast();
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    const params = new URLSearchParams(window.location.search);
    const err = params.get("error");
    if (err !== null && err.startsWith("google")) {
      const messages: Record<string, string> = {
        "google-not-configured": "Google sign-in is not configured yet.",
        "google-cancelled": "Google sign-in was cancelled.",
        "google-failed": "Google sign-in failed. Try again.",
      };
      toast.error(messages[err] ?? "Google sign-in failed.");
      window.history.replaceState(null, "", window.location.pathname);
      return;
    }

    const { isAuthenticated, isLoading, user, setTokens } = useAuthStore.getState();
    if (isLoading || !isAuthenticated || user !== null) return;

    void (async () => {
      try {
        const res = await fetch("/api/auth/session");
        if (!res.ok) return;
        const body = (await res.json()) as { token?: string };
        if (typeof body.token !== "string") return;
        const claims = payloadFromToken(body.token);
        if (claims?.provider !== "google" || typeof claims.sub !== "string") return;
        const profile: User = {
          id: claims.sub,
          walletAddress: "",
          email: typeof claims.email === "string" ? claims.email : null,
          phone: null,
          displayName: typeof claims.name === "string" ? claims.name : null,
          avatarIpfsHash: null,
          countryCode: null,
          preferredLanguage: "en",
          moiScore: 0,
          createdAt: new Date().toISOString(),
        };
        await setTokens(body.token, body.token, profile);
        toast.success(`Signed in as ${profile.email ?? "your Google account"}!`);
      } catch {
        // Stay signed out on any failure — checkAuth already resolved state.
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
