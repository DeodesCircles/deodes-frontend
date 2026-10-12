"use client";

import { useState } from "react";
import { BellRing, Check } from "lucide-react";

const STORAGE_KEY = "deodes_waitlist";

// Launch-updates form. No backend exists yet, so the address is kept on the
// visitor's own device (localStorage) and confirmed inline — never claimed
// to be sent anywhere.
export function WaitlistForm() {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) !== null;
    } catch {
      return false;
    }
  });
  const [error, setError] = useState<string | null>(null);

  if (done) {
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Check className="h-4 w-4 text-emerald-400" /> You&apos;re on the list. Watch your inbox at launch.
      </p>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const form = e.currentTarget;
        // Honeypot: bots fill it, humans can't see it.
        const trap = (form.elements.namedItem("company") as HTMLInputElement | null)?.value;
        if (trap) return;
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
          setError("Enter a valid email address.");
          return;
        }
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify({ email: email.trim(), at: Date.now() }));
        } catch {
          // Private mode: confirm anyway, nothing persisted.
        }
        setError(null);
        setDone(true);
      }}
    >
      <p className="text-sm font-medium text-foreground">Launch updates</p>
      <div className="mt-2 flex gap-2">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          aria-label="Email for launch updates"
          className="h-10 min-w-0 flex-1 rounded-xl glass-strong px-3 text-sm outline-none placeholder:text-muted-foreground/60"
        />
        <input
          type="text"
          name="company"
          autoComplete="off"
          tabIndex={-1}
          aria-hidden="true"
          className="absolute h-0 w-0 overflow-hidden opacity-0"
        />
        <button
          type="submit"
          className="h-10 shrink-0 rounded-xl px-4 text-sm font-heading font-semibold text-white gradient-bg-premium hover:opacity-90 transition-all"
        >
          <BellRing className="h-4 w-4" />
          <span className="sr-only">Notify me</span>
        </button>
      </div>
      {error !== null && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </form>
  );
}
