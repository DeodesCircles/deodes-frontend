"use client";

import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";
import { cn } from "@/lib/cn";

// Floating back-to-top control (agentsdb ScrollToTop pattern, DEODES skin).
// Appears past 500px of scroll on every public page; smooth-scrolls home.
// Compositor-friendly: opacity transition only, no layout thrash.
export function ScrollToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let frame = 0;
    const onScroll = (): void => {
      if (frame !== 0) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        setVisible(window.scrollY > 500);
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame !== 0) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <button
      type="button"
      onClick={() => {
        const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
      }}
      aria-label="Scroll back to top"
      tabIndex={visible ? 0 : -1}
      className={cn(
        "fixed bottom-6 right-6 z-40 flex h-11 w-11 items-center justify-center rounded-full",
        "text-white gradient-bg-extended shadow-[0_8px_30px_rgba(0,0,0,0.35)]",
        "transition-opacity duration-300 hover:opacity-85 focus-visible:opacity-100",
        visible ? "opacity-100" : "pointer-events-none opacity-0",
      )}
    >
      <ArrowUp className="h-5 w-5" />
    </button>
  );
}
