"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

// Route-change scroll manager: after visiting a sub-nav page, opening
// another one must start at the top instead of inheriting the old scroll
// position. Next.js preserves scroll in several client-navigation cases
// (hash URLs, same-layout transitions), so enforce it explicitly:
//
// - pathname change without a hash → instant scroll to top
// - hash present → scroll the target into view (reliable even when the
//   router skips anchor scrolling), accounting for the fixed header
export function ScrollManager() {
  const pathname = usePathname();
  const first = useRef(true);

  useEffect(() => {
    // Skip the initial mount — the browser already restored position.
    if (first.current) {
      first.current = false;
      return;
    }
    scrollForCurrentHash(true);
  }, [pathname]);

  useEffect(() => {
    // Same-page hash clicks (pathname unchanged) — the router won't help.
    const onHashChange = (): void => {
      scrollForCurrentHash(false);
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  return null;
}

function scrollForCurrentHash(fromRouteChange: boolean): void {
  const hash = window.location.hash;
  if (hash.length > 1) {
    // Let the new page paint before measuring.
    window.setTimeout(() => {
      try {
        const el = document.querySelector(hash);
        if (el !== null) {
          el.scrollIntoView({ behavior: "auto", block: "start" });
          return;
        }
      } catch {
        // Invalid selector — fall through to top.
      }
      if (fromRouteChange) window.scrollTo(0, 0);
    }, 60);
    return;
  }
  window.scrollTo(0, 0);
}
