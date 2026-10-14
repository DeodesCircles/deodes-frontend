import type { Circle } from "@/types";

/**
 * Joinability rules for circle discovery (explore + circles browser).
 *
 * A circle is DIRECTLY joinable when a newcomer can tap "Join" and land in
 * the roster: status pending/active, Arc USDC rail, seats left, no invite
 * gate, and the viewer's DeoScore clears the circle floor. Everything else
 * stays visible but carries a clear badge + message instead of a dead button.
 */

export type JoinBlockReason =
  | "already-member"
  | "ended"
  | "legacy-rail"
  | "full"
  | "invite-only"
  | "score";

export interface JoinCheckInput {
  userId?: string | null;
  /** Viewer's DeoScore (user.moiScore). Null/undefined counts as 0. */
  moiScore?: number | null;
  isMember?: boolean;
  /** Overrides circle.memberCount when the caller has a fresher roster. */
  memberCount?: number | null;
}

/** Premium circles floor at 50 DeoScore on top of any minMoiScore. */
export function requiredScore(circle: Pick<Circle, "circleType" | "minMoiScore">): number {
  const floor = circle.minMoiScore ?? 0;
  if (circle.circleType === "premium") return Math.max(50, floor);
  return floor;
}

export function isEnded(circle: Pick<Circle, "status">): boolean {
  return circle.status !== "pending" && circle.status !== "active";
}

export function isFull(
  circle: Pick<Circle, "maxMembers" | "memberCount">,
  memberCountOverride?: number | null,
): boolean {
  const count = memberCountOverride ?? circle.memberCount ?? 0;
  return count >= circle.maxMembers;
}

export function needsInvite(
  circle: Pick<Circle, "circleType"> & { requiresInvite?: boolean | null },
): boolean {
  return circle.circleType === "private" || circle.requiresInvite === true;
}

export function meetsScore(
  circle: Pick<Circle, "circleType" | "minMoiScore">,
  moiScore?: number | null,
): boolean {
  return (moiScore ?? 0) >= requiredScore(circle);
}

/**
 * First blocking reason in display-priority order, or null when the viewer
 * can join directly. Invite-only counts as blocked here — the code-entry
 * path handles it separately.
 */
export function getJoinBlockReason(
  circle: Circle,
  input?: JoinCheckInput,
): JoinBlockReason | null {
  if (input?.isMember) return "already-member";
  if (isEnded(circle)) return "ended";
  if (circle.currency !== "USDC") return "legacy-rail";
  if (isFull(circle, input?.memberCount)) return "full";
  if (needsInvite(circle)) return "invite-only";
  if (!meetsScore(circle, input?.moiScore)) return "score";
  return null;
}

export function isJoinable(circle: Circle, input?: JoinCheckInput): boolean {
  return getJoinBlockReason(circle, input) === null;
}

export function getJoinBlockMessage(
  reason: JoinBlockReason | null,
  circle: Pick<Circle, "maxMembers" | "memberCount" | "circleType">,
  input?: Pick<JoinCheckInput, "moiScore" | "memberCount">,
): string {
  switch (reason) {
    case "already-member":
      return "You're already a member of this circle.";
    case "ended":
      return "This circle has ended and is no longer joinable.";
    case "legacy-rail":
      return "Only USDC circles on Arc can be joined.";
    case "full": {
      const count = input?.memberCount ?? circle.memberCount ?? 0;
      return `This circle is full (${count}/${circle.maxMembers}). Try another open circle.`;
    }
    case "invite-only":
      return "This circle is invite-only. Ask the organizer for an invite code.";
    case "score": {
      const need = requiredScore(circle as Pick<Circle, "circleType" | "minMoiScore">);
      const have = input?.moiScore ?? 0;
      return `Requires DeoScore ${need} — you have ${have}. Build score in public circles first.`;
    }
    default:
      return "";
  }
}
