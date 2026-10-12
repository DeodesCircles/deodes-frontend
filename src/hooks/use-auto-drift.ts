"use client";

import { useEffect, useRef } from "react";

// Auto-drifting horizontal rail. The track advances constantly via rAF
// (timestamp-delta speed, transform-free — scrollLeft only, no layout work);
// duplicating the content in the markup makes the halfway wrap invisible.
// Pauses on press/touch/wheel and on card click; resumes on reclick or page
// scroll (debounced so it never fights an active swipe). Fully still under
// prefers-reduced-motion. Returns a ref to attach to the scroller.
export function useAutoDrift<T extends HTMLElement>(speedPxPerSec = 30) {
  const ref = useRef<T | null>(null);
  const paused = useRef(false);
  const resumeTimer = useRef<number | null>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const el = ref.current;
    if (!el) return;

    let raf = 0;
    let last = performance.now();

    const tick = (now: number) => {
      const dt = Math.min(now - last, 100) / 1000;
      last = now;
      if (!paused.current && el.scrollWidth > el.clientWidth * 1.5) {
        el.scrollLeft += speedPxPerSec * dt;
        const half = el.scrollWidth / 2;
        if (el.scrollLeft >= half) el.scrollLeft -= half;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    const pause = () => {
      paused.current = true;
      if (resumeTimer.current !== null) {
        window.clearTimeout(resumeTimer.current);
        resumeTimer.current = null;
      }
    };
    // Reclick toggles back on; any page scroll resumes after a beat.
    const toggle = () => {
      if (paused.current) {
        paused.current = false;
      } else {
        pause();
      }
    };
    const resumeSoon = () => {
      if (resumeTimer.current !== null) window.clearTimeout(resumeTimer.current);
      resumeTimer.current = window.setTimeout(() => {
        paused.current = false;
      }, 1500);
    };
    const onPageScroll = () => resumeSoon();

    el.addEventListener("pointerdown", pause);
    el.addEventListener("wheel", pause, { passive: true });
    el.addEventListener("touchstart", pause, { passive: true });
    el.addEventListener("click", toggle);
    window.addEventListener("scroll", onPageScroll, { passive: true });

    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener("pointerdown", pause);
      el.removeEventListener("wheel", pause);
      el.removeEventListener("touchstart", pause);
      el.removeEventListener("click", toggle);
      window.removeEventListener("scroll", onPageScroll);
      if (resumeTimer.current !== null) window.clearTimeout(resumeTimer.current);
    };
  }, [speedPxPerSec]);

  return ref;
}
