"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserPlus } from "lucide-react";
import { useJoinCircle } from "@/hooks/use-circles";
import { Button } from "@/components/ui/button";
import {
  getJoinBlockMessage,
  getJoinBlockReason,
  isEnded,
  needsInvite,
} from "@/lib/circles/joinability";
import type { JoinBlockReason } from "@/lib/circles/joinability";
import type { Circle } from "@/types";

interface CircleJoinActionProps {
  circle: Circle;
  moiScore?: number | null;
  blockReason: JoinBlockReason | null;
}

/**
 * Join affordance for a discovery card: direct Join when the viewer clears
 * every gate, a Get-invite shortcut for invite-only circles, otherwise the
 * plain-language reason. Success lands on the circle detail page.
 */
export function CircleJoinAction({ circle, moiScore, blockReason }: CircleJoinActionProps) {
  const router = useRouter();
  const joinCircle = useJoinCircle();
  const [error, setError] = useState<string | null>(null);

  const inviteOnly = needsInvite(circle) && !isEnded(circle);

  const handleJoin = async () => {
    // Requirements check first: no request when the server would refuse.
    const reason = getJoinBlockReason(circle, { moiScore });
    if (reason !== null) {
      setError(getJoinBlockMessage(reason, circle, { moiScore }));
      return;
    }
    setError(null);
    try {
      await joinCircle.mutateAsync({ circleId: circle.id });
      router.push(`/circles/${circle.id}`);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        (err instanceof Error ? err.message : "Could not join circle. Please try again.");
      setError(msg);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        {blockReason === null ? (
          <Button
            type="button"
            variant="primary"
            size="sm"
            leftIcon={<UserPlus className="h-4 w-4" />}
            onClick={handleJoin}
            isLoading={joinCircle.isPending}
          >
            Join
          </Button>
        ) : inviteOnly ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            leftIcon={<UserPlus className="h-4 w-4" />}
            onClick={() => router.push(`/circles/${circle.id}`)}
          >
            Get invite
          </Button>
        ) : null}
      </div>
      {blockReason !== null && !inviteOnly && (
        <p className="text-xs text-muted-foreground" role="note">
          {getJoinBlockMessage(blockReason, circle, { moiScore })}
        </p>
      )}
      {error && (
        <p className="text-xs text-red-400" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
