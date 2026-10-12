"use client";

// Endless keyword ticker (awwwards-style marquee). One CSS keyframe on a
// doubled list: transform-only, pause-on-hover, frozen under
// prefers-reduced-motion. The list must stay identical in both copies or the
// loop seam shows.
const ITEMS = [
  "Public circles",
  "VRF draws",
  "0.5% protocol fee",
  "USDC on Arc",
  "Sub-second finality",
  "DeoScore 1000",
  "No custodian",
  "Fixed order",
  "Chit-fund auctions",
  "Community votes",
  "Passkey wallets",
  "Multi-sig guarded",
];

function Row({ hidden }: { hidden: boolean }) {
  return (
    <div className="flex shrink-0 items-center" aria-hidden={hidden}>
      {ITEMS.map((item) => (
        <span key={item} className="flex items-center">
          <span className="whitespace-nowrap px-6 font-mono text-xs uppercase tracking-[0.25em] text-muted-foreground">
            {item}
          </span>
          <span className="h-1 w-1 rounded-full bg-aurora-violet/60" aria-hidden="true" />
        </span>
      ))}
    </div>
  );
}

export function Marquee() {
  return (
    <div className="relative z-10 overflow-hidden border-y border-white/[0.06] py-5">
      <div className="marquee-track flex w-max">
        <Row hidden={false} />
        <Row hidden={true} />
      </div>
    </div>
  );
}
