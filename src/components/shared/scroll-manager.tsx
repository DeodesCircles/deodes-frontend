"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

// Route-change scroll manager: after visiting a sub-nav page, opening
// another one must start at the top instead of inheriting the old scroll
// position. Next.js preserves scroll in several client-navigation cases
// (hash URLs, same-layout transitions), so enforce it explicitly.
//
// Slow connections render the target seconds after navigation, so anchor
// scrolling retries until the element exists (up to ~2s) instead of giving
// up and dumping the visitor at the wrong spot.

const ANCHOR_RETRY_MS = 120;
const ANCHOR_MAX_ATTEMPTS = 16;
const TOP_REASSERT_MS = 350;

export function ScrollManager() {
  const pathname = usePathname();
  const first = useRef(true);
  const timers = useRef<number[]>([]);

  const clearTimers = (): void => {
    timers.current.forEach((id) => window.clearTimeout(id));
    timers.current = [];
  };

  const later = (fn: () => void, ms: number): void => {
    timers.current.push(window.setTimeout(fn, ms));
  };

  const scrollToHash = (attempt: number): void => {
    const hash = window.location.hash;
    if (hash.length <= 1) return;
    let el: Element | null = null;
    try {
      el = document.querySelector(hash);
    } catch {
      el = null;
    }
    if (el !== null) {
      el.scrollIntoView({ behavior: "auto", block: "start" });
      return;
    }
    if (attempt < ANCHOR_MAX_ATTEMPTS) {
      later(() => scrollToHash(attempt + 1), ANCHOR_RETRY_MS);
    }
  };

  useEffect(() => {
    // Skip the initial mount — the browser already restored position.
    if (first.current) {
      first.current = false;
      return;
    }
    clearTimers();
    if (window.location.hash.length > 1) {
      scrollToHash(0);
      return;
    }
    // No hash: top now, plus one re-assert to beat late scroll restoration.
    window.scrollTo(0, 0);
    const here = window.location.pathname;
    later(() => {
      if (window.location.pathname === here && window.location.hash.length <= 1) {
        window.scrollTo(0, 0);
      }
    }, TOP_REASSERT_MS);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  useEffect(() => {
    // Same-page hash clicks (pathname unchanged) — the router won't help.
    const onHashChange = (): void => {
      clearTimers();
      scrollToHash(0);
    };
    window.addEventListener("hashchange", onHashChange);
    return () => {
      window.removeEventListener("hashchange", onHashChange);
      clearTimers();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
