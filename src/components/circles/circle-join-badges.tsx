"use client";

import { Shield } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { isEnded, isFull, needsInvite } from "@/lib/circles/joinability";
import type { JoinBlockReason } from "@/lib/circles/joinability";
import type { Circle } from "@/types";

type BadgeCircle = Pick<
  Circle,
  "status" | "currency" | "memberCount" | "maxMembers" | "circleType" | "requiresInvite"
>;

interface CircleJoinBadgesProps {
  circle: BadgeCircle;
  blockReason?: JoinBlockReason | null;
}

/** Availability badges: Full / Invite only / Ended / Legacy rail / gated. */
export function CircleJoinBadges({ circle, blockReason }: CircleJoinBadgesProps) {
  const ended = isEnded(circle);
  const full = !ended && isFull(circle);
  const inviteOnly = needsInvite(circle) && !ended;
  const legacy = !ended && circle.currency !== "USDC";

  if (!full && !inviteOnly && !ended && !legacy && blockReason !== "score") return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5" aria-label="Circle availability">
      {full && <Badge variant="destructive" size="sm">Full</Badge>}
      {inviteOnly && <Badge variant="info" size="sm">Invite only</Badge>}
      {ended && <Badge variant="default" size="sm">Ended</Badge>}
      {legacy && <Badge variant="warning" size="sm">Legacy rail</Badge>}
      {blockReason === "score" && (
        <Badge variant="warning" size="sm" className="inline-flex items-center gap-1">
          <Shield className="h-3 w-3" /> DeoScore gated
        </Badge>
      )}
    </div>
  );
}
