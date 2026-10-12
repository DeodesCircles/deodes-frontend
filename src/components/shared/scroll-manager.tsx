"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

// Single owner of scroll position across client navigation.
//
// Why this exists: the stylesheet sets `scroll-behavior: smooth` on `html`,
// so every programmatic scroll becomes an animation. Next.js's own scroll
// handling, late scroll restoration, and any helper scrolling at the same
// time interrupt each other mid-flight — the page ends up stranded mid-page
// ("hooked") with no way back. Nav links in this app therefore use
// `scroll={false}` and this manager performs every post-navigation scroll:
//
// - new page without a hash → instant jump to top (+ one re-assert to beat
//   late restoration)
// - hash present → retry until the section exists (slow renders), then jump
// - the instant any user interaction starts (wheel / touch / scroll keys),
//   all pending programmatic scrolling is cancelled — the visitor always wins

const ANCHOR_RETRY_MS = 120;
const ANCHOR_MAX_ATTEMPTS = 16;
const TOP_REASSERT_MS = 350;

function instantTo(top: number): void {
  const root = document.documentElement;
  const prev = root.style.scrollBehavior;
  root.style.scrollBehavior = "auto";
  window.scrollTo(0, top);
  root.style.scrollBehavior = prev;
}

function instantToElement(el: Element): void {
  const root = document.documentElement;
  const prev = root.style.scrollBehavior;
  root.style.scrollBehavior = "auto";
  el.scrollIntoView({ behavior: "auto", block: "start" });
  root.style.scrollBehavior = prev;
}

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
      instantToElement(el);
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
    instantTo(0);
    const here = window.location.pathname;
    later(() => {
      if (window.location.pathname === here && window.location.hash.length <= 1) {
        instantTo(0);
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
    // The visitor always wins: any manual scrolling cancels automation.
    const onInterrupt = (): void => {
      clearTimers();
    };
    window.addEventListener("hashchange", onHashChange);
    window.addEventListener("wheel", onInterrupt, { passive: true });
    window.addEventListener("touchmove", onInterrupt, { passive: true });
    return () => {
      window.removeEventListener("hashchange", onHashChange);
      window.removeEventListener("wheel", onInterrupt);
      window.removeEventListener("touchmove", onInterrupt);
      clearTimers();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
