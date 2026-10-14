"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Clock, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/cn";
import { formatCurrency } from "@/lib/formatters";
import { getJoinBlockReason, isEnded } from "@/lib/circles/joinability";
import type { Circle, CircleType } from "@/types";
import { CircleJoinBadges } from "@/components/circles/circle-join-badges";
import { CircleJoinAction } from "./circle-join-action";

const typeAccentColors: Record<CircleType, string> = {
  public: "from-emerald-500 to-aurora-cyan",
  private: "from-aurora-indigo to-aurora-violet",
  community: "from-aurora-amber to-aurora-violet",
  premium: "from-aurora-violet to-fuchsia-500",
};

interface CircleBrowseCardProps {
  circle: Circle;
  moiScore?: number | null;
}

/**
 * Discovery card with joinability baked in: ended/full/invite-only/legacy
 * circles get badges + an explanatory hint instead of a dead Join button.
 */
export function CircleBrowseCard({ circle, moiScore }: CircleBrowseCardProps) {
  const freqLabel = circle.frequency.charAt(0).toUpperCase() + circle.frequency.slice(1);
  const memberCount = circle.memberCount ?? 0;
  const progressPct = Math.min(100, Math.round((circle.currentRound / (circle.maxMembers || 1)) * 100));
  const accentGradient = typeAccentColors[circle.circleType] ?? typeAccentColors.public;

  const blockReason = getJoinBlockReason(circle, { moiScore });
  const ended = isEnded(circle);

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "rounded-2xl overflow-hidden border-l-4 bg-card/60 backdrop-blur-md shadow-md",
        ended ? "border-l-muted-foreground/40 opacity-75" : "border-l-aurora-violet",
      )}
    >
      <div className={cn("h-[3px] w-full bg-gradient-to-r", accentGradient)} />
      <div className="p-5 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <Link
              href={`/circles/${circle.id}`}
              className="font-heading text-lg font-semibold hover:text-aurora-violet transition-colors"
            >
              {circle.name}
            </Link>
            <p className="text-2xs text-muted-foreground mt-0.5 capitalize">{circle.circleType}</p>
          </div>
          <Badge
            variant={circle.status === "active" ? "success" : circle.status === "pending" ? "warning" : "default"}
            size="sm"
            className="shrink-0"
          >
            {circle.status}
          </Badge>
        </div>

        <CircleJoinBadges circle={circle} blockReason={blockReason} />

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
          <span className="gradient-text font-bold font-heading">
            {formatCurrency(circle.contributionAmount, circle.currency)}
          </span>
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" /> {freqLabel}
          </span>
          <span className="inline-flex items-center gap-1">
            <Users className="h-3.5 w-3.5" /> {memberCount}/{circle.maxMembers}
          </span>
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-between text-2xs text-muted-foreground">
            <span>Round Progress</span>
            <span>{circle.currentRound}/{circle.maxMembers}</span>
          </div>
          <Progress
            aria-label="Circle contribution progress"
            value={progressPct}
            size="sm"
            variant={progressPct >= 80 ? "success" : "primary"}
          />
        </div>

        <div className="pt-2 border-t border-border">
          <div className="flex items-start gap-2">
            <div className="flex-1 min-w-0">
              <CircleJoinAction circle={circle} moiScore={moiScore} blockReason={blockReason} />
            </div>
            <Link
              href={`/circles/${circle.id}`}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors font-body shrink-0 pt-1"
            >
              View Details &rarr;
            </Link>
          </div>
        </div>
      </div>
    </motion.article>
  );
}
