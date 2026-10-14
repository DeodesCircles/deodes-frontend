"use client";

import { logger } from "@/lib/logger";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { del, get, post } from "@/lib/api-client";
import { useUIStore } from "@/stores/ui-store";
import { queryKeys } from "@/lib/query-keys";
import type { ApiResponse, Subscription } from "@/types";

function extractErrorMessage(err: unknown, fallback: string): string {
  const apiErr = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
  if (apiErr) return apiErr;
  if (err instanceof Error) return err.message;
  return fallback;
}

function invalidate(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: queryKeys.subscriptions.all });
}

/** Upcoming debit calendar: all of the member's auto-debit consents. */
export function useMySubscriptions() {
  return useQuery({
    queryKey: queryKeys.subscriptions.mine(),
    queryFn: () =>
      get<ApiResponse<{ subscriptions: Subscription[] }>>("/users/me/subscriptions"),
  });
}

interface SubscribeInput {
  circleId: string;
  amount: number;
  capTotal: number;
}

export function useSubscribe() {
  const queryClient = useQueryClient();
  const addToast = useUIStore((s) => s.addToast);

  return useMutation({
    mutationFn: ({ circleId, amount, capTotal }: SubscribeInput) =>
      post<ApiResponse<{ subscription: Subscription }>>(
        `/circles/${circleId}/subscription`,
        { amount, capTotal },
      ),
    onSuccess: (_, vars) => {
      invalidate(queryClient);
      queryClient.invalidateQueries({ queryKey: queryKeys.circles.detail(vars.circleId) });
      addToast({
        type: "success",
        title: "Auto-debit on",
        description: "Contributions will pull automatically each round. Pause anytime.",
      });
    },
    onError: (err) => {
      logger.error("[useSubscribe] Failed to subscribe:", err);
      addToast({
        type: "error",
        title: "Could not enable auto-debit",
        description: extractErrorMessage(err, "Could not enable auto-debit. Please try again."),
        requestId: (err as { requestId?: string }).requestId,
      });
    },
  });
}

function useSubscriptionCommand(
  action: "pause" | "resume" | "cancel",
  successTitle: string,
  successDescription: string,
) {
  const queryClient = useQueryClient();
  const addToast = useUIStore((s) => s.addToast);

  return useMutation({
    mutationFn: (circleId: string) => {
      const base = `/circles/${circleId}/subscription`;
      if (action === "cancel") return del<ApiResponse<{ success: boolean }>>(base);
      return post<ApiResponse<{ success: boolean }>>(`${base}/${action}`);
    },
    onSuccess: (_, circleId) => {
      invalidate(queryClient);
      queryClient.invalidateQueries({ queryKey: queryKeys.circles.detail(circleId) });
      addToast({ type: "success", title: successTitle, description: successDescription });
    },
    onError: (err) => {
      logger.error(`[useSubscription${action}] Failed:`, err);
      addToast({
        type: "error",
        title: "Request failed",
        description: extractErrorMessage(err, "Please try again."),
        requestId: (err as { requestId?: string }).requestId,
      });
    },
  });
}

export function usePauseSubscription() {
  return useSubscriptionCommand("pause", "Auto-debit paused", "Future rounds are manual until you resume.");
}

export function useResumeSubscription() {
  return useSubscriptionCommand("resume", "Auto-debit resumed", "Pulls restart from the current round.");
}

export function useCancelSubscription() {
  return useSubscriptionCommand("cancel", "Auto-debit cancelled", "Past debits stand; future rounds are manual.");
}
