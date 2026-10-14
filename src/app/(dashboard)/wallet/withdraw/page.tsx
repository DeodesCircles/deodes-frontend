import Link from "next/link";
import { ArrowLeft, Banknote, BellRing } from "lucide-react";

const COMING_SOON_RAILS = [
  { code: "NGN", label: "Nigerian Naira", detail: "Bank transfer" },
  { code: "KES", label: "Kenyan Shilling", detail: "M-Pesa" },
  { code: "GHS", label: "Ghanaian Cedi", detail: "Mobile money" },
];

/**
 * Cash-out to local currency is coming soon.
 *
 * The fiat off-ramp was removed while provider onboarding is pending — this
 * page is intentionally static: no quote calls, no wizard state. On-chain
 * USDC movement between members works today; this screen only covers fiat
 * out.
 */
export default function WithdrawPage() {
  return (
    <div className="space-y-6 max-w-xl mx-auto">
      {/* ── Back + Title ── */}
      <div className="flex items-center gap-3">
        <Link href="/wallet" className="text-muted-foreground hover:text-foreground transition-colors" aria-label="Back to wallet">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="font-heading text-xl font-bold text-foreground">Withdraw to Bank</h1>
          <p className="text-sm text-muted-foreground">Cash out USDC to local currency</p>
        </div>
      </div>

      {/* Staggered-card announcement */}
      <div className="grid gap-3 md:grid-cols-[auto_1fr] md:items-end">
        <p className="font-mono text-7xl font-black gradient-text-extended leading-none">Soon</p>
        <div className="border-t-2 border-aurora-violet pt-3">
          <p className="font-heading text-lg font-semibold text-foreground">Cash-out is on the way</p>
          <p className="mt-1 text-sm text-muted-foreground leading-relaxed max-w-md">
            Bank and mobile-money withdrawals are coming first to NGN, then KES
            and GHS. Deodes itself takes only its 0.5% payout fee — any rail
            fee will be quoted up front before you confirm.
          </p>
        </div>
      </div>

      {/* Rail pills */}
      <ul aria-label="Upcoming withdrawal rails" className="flex flex-wrap gap-2">
        {COMING_SOON_RAILS.map((rail) => (
          <li
            key={rail.code}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-xs"
          >
            <Banknote className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
            <span className="font-heading font-semibold text-foreground">{rail.code}</span>
            <span className="text-muted-foreground">{rail.label} · {rail.detail}</span>
          </li>
        ))}
      </ul>

      {/* Notify strip */}
      <div className="rounded-xl border border-dashed border-white/15 px-5 py-4 flex items-start gap-3">
        <BellRing className="h-4 w-4 shrink-0 mt-0.5 text-amber-300" aria-hidden="true" />
        <p className="text-xs text-muted-foreground leading-relaxed">
          USDC payouts inside your circle already settle on-chain today. Watch
          this space — fiat cash-out opens here first.
        </p>
      </div>

      <Link href="/wallet" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to Wallet
      </Link>
    </div>
  );
}
