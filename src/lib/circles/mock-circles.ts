import type { Circle, Frequency } from "@/types";

/**
 * Sample circles for the public Explore page. Shown only when the live API
 * returns no circles yet — replaced automatically the moment real circles
 * exist (see useExploreCircles). Clearly labeled "Preview" in the UI; never
 * presented as live data.
 */
export const MOCK_CIRCLES: Circle[] = [
  {
    id: "sample-esusu-lagos",
    name: "Lagos Market Esusu",
    description: "Weekly savings for Balogun market traders. New members welcome.",
    circleType: "public",
    payoutType: "fixed",
    contributionAmount: 50,
    currency: "USDC",
    frequency: "weekly",
    maxMembers: 12,
    minMoiScore: 100,
    collateralPercent: 0,
    lateFeePercent: 5,
    gracePeriodHours: 24,
    autoDebit: false,
    maxStrikes: 3,
    status: "active",
    currentRound: 4,
    totalContributions: 2400,
    organizerId: "sample-org-ada",
    organizerName: "Adaeze O.",
    memberCount: 11,
    createdAt: "2026-09-01T00:00:00.000Z",
  },
  {
    id: "sample-tontine-accra",
    name: "Accra Drivers Tontine",
    description: "Biweekly pool for transport union drivers. VRF draws keep it fair.",
    circleType: "public",
    payoutType: "random",
    contributionAmount: 25,
    currency: "USDC",
    frequency: "biweekly",
    maxMembers: 10,
    minMoiScore: 0,
    collateralPercent: 0,
    lateFeePercent: 5,
    gracePeriodHours: 48,
    autoDebit: false,
    maxStrikes: 3,
    status: "active",
    currentRound: 2,
    totalContributions: 500,
    organizerId: "sample-org-kwame",
    organizerName: "Kwame A.",
    memberCount: 8,
    createdAt: "2026-09-15T00:00:00.000Z",
  },
  {
    id: "sample-family-nairobi",
    name: "Nairobi Family Pot",
    description: "Private monthly circle for the extended family across three cities.",
    circleType: "private",
    payoutType: "fixed",
    contributionAmount: 100,
    currency: "USDC",
    frequency: "monthly",
    maxMembers: 8,
    minMoiScore: null,
    collateralPercent: 0,
    lateFeePercent: 0,
    gracePeriodHours: 72,
    autoDebit: false,
    maxStrikes: 5,
    status: "active",
    currentRound: 6,
    totalContributions: 4800,
    organizerId: "sample-org-wanjiru",
    organizerName: "Wanjiru K.",
    memberCount: 8,
    createdAt: "2026-06-01T00:00:00.000Z",
  },
  {
    id: "sample-dao-savers",
    name: "Builders DAO Fund",
    description: "Token-gated monthly savings for DAO contributors. Votes direct payouts.",
    circleType: "community",
    payoutType: "vote",
    contributionAmount: 200,
    currency: "USDC",
    frequency: "monthly",
    maxMembers: 20,
    minMoiScore: 300,
    collateralPercent: 10,
    lateFeePercent: 5,
    gracePeriodHours: 24,
    autoDebit: false,
    maxStrikes: 2,
    status: "pending",
    currentRound: 0,
    totalContributions: 0,
    organizerId: "sample-org-dao",
    organizerName: "Builders DAO",
    memberCount: 6,
    createdAt: "2026-10-01T00:00:00.000Z",
  },
  {
    id: "sample-chit-810",
    name: "Chit Fund 810",
    description: "Auction-style pool for small business owners. Bid urgency, earn patience.",
    circleType: "premium",
    payoutType: "auction",
    contributionAmount: 500,
    currency: "USDC",
    frequency: "monthly",
    maxMembers: 15,
    minMoiScore: 600,
    collateralPercent: 20,
    lateFeePercent: 8,
    gracePeriodHours: 24,
    autoDebit: false,
    maxStrikes: 2,
    status: "active",
    currentRound: 3,
    totalContributions: 15000,
    organizerId: "sample-org-priya",
    organizerName: "Priya S.",
    memberCount: 12,
    createdAt: "2026-08-01T00:00:00.000Z",
  },
  {
    id: "sample-daily-grind",
    name: "Daily Grind Pool",
    description: "Fast daily rounds for gig workers. Small amounts, high discipline.",
    circleType: "public",
    payoutType: "random",
    contributionAmount: 10,
    currency: "USDC",
    frequency: "daily",
    maxMembers: 10,
    minMoiScore: 0,
    collateralPercent: 0,
    lateFeePercent: 5,
    gracePeriodHours: 12,
    autoDebit: false,
    maxStrikes: 3,
    status: "active",
    currentRound: 18,
    totalContributions: 1800,
    organizerId: "sample-org-tunde",
    organizerName: "Tunde B.",
    memberCount: 10,
    createdAt: "2026-09-20T00:00:00.000Z",
  },
];

const FREQUENCY_MS: Record<Frequency, number> = {
  daily: 86_400_000,
  weekly: 7 * 86_400_000,
  biweekly: 14 * 86_400_000,
  monthly: 30 * 86_400_000,
};

/** Tiny deterministic hash — stable pseudo-randomness per (circle, day). */
function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

/**
 * Makes the showcase feel alive without a backend: rounds advance with real
 * time from each circle's start date, membership drifts toward full, and the
 * display order rotates daily. Fully deterministic for a given timestamp —
 * no randomness between renders. Still labeled Preview in the UI.
 */
export function getDynamicMockCircles(now: number = Date.now()): Circle[] {
  const daySeed = Math.floor(now / 86_400_000);
  return MOCK_CIRCLES.map((base, i) => {
    if (base.status !== "active") return base;
    const started = Date.parse(base.createdAt);
    const elapsedRounds = Number.isFinite(started)
      ? Math.max(0, Math.floor((now - started) / FREQUENCY_MS[base.frequency]))
      : 0;
    const roundSpan = Math.max(1, base.maxMembers);
    const currentRound = Math.min(
      base.maxMembers,
      base.currentRound + (elapsedRounds % (roundSpan + 1)),
    );
    const seatsLeft = Math.max(0, base.maxMembers - (base.memberCount ?? 0));
    const joiners =
      seatsLeft === 0 ? 0 : hashStr(`${base.id}:${daySeed}`) % (seatsLeft + 1);
    const memberCount = Math.min(
      base.maxMembers,
      (base.memberCount ?? 0) + joiners,
    );
    const totalContributions =
      base.contributionAmount * Math.max(0, currentRound) * Math.max(0, memberCount);
    return { ...base, currentRound, memberCount, totalContributions };
  }).sort((a, b) => hashStr(`${a.id}:${daySeed}`) - hashStr(`${b.id}:${daySeed}`));
}
