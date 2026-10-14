"use client";

import { logger } from "@/lib/logger"
import { useMutation, useQuery } from "@tanstack/react-query";
import { useOptimisticMutation } from "./use-optimistic-mutation";
import { get, post } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { normalizePayout, normalizePayouts } from "@/lib/payout";
import { useUIStore } from "@/stores/ui-store";
import type {
  ApiResponse,
  Payout,
  PayoutPreview,
  PaginationMeta,
  TriggerPayoutPayload,
} from "@/types";

interface PayoutFilters {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortDir?: string;
  circleId?: string;
  payoutType?: string;
  dateFrom?: string;
  dateTo?: string;
}

interface PreviewPayoutPayload {
  recipientId?: string;
  roundNumber?: number;
  amount?: number;
  feeAmount?: number;
}

function fallbackMeta(page: number, limit: number, total: number): PaginationMeta {
  return {
    page,
    limit,
    total,
    totalPages: limit > 0 ? Math.ceil(total / limit) : 0,
  };
}

function extractPayouts(response: ApiResponse<{ payouts?: Payout[] }>): Payout[] {
  const raw = response.data?.payouts ?? (
    Array.isArray(response.data) ? response.data : []
  );
  return normalizePayouts(raw);
}

export function usePayouts(filters?: PayoutFilters) {
  const page = filters?.page ?? 1;
  const limit = filters?.limit ?? 20;
  return useQuery({
    queryKey: queryKeys.payouts.list({ ...filters, page, limit }),
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", String(limit));
      if (filters?.sortBy) params.set("sortBy", filters.sortBy);
      if (filters?.sortDir) params.set("sortDir", filters.sortDir);
      if (filters?.circleId) params.set("circleId", filters.circleId);
      if (filters?.payoutType) params.set("payoutType", filters.payoutType);
      if (filters?.dateFrom) params.set("dateFrom", filters.dateFrom);
      if (filters?.dateTo) params.set("dateTo", filters.dateTo);

      const response = await get<ApiResponse<{ payouts?: Payout[] }>>(
        `/payouts?${params.toString()}`,
      );
      const payouts = extractPayouts(response);

      return {
        payouts,
        meta: response.meta ?? fallbackMeta(page, limit, payouts.length),
      };
    },
    staleTime: 5000,
    refetchOnWindowFocus: true,
  });
}

export function useCirclePayouts(circleId: string, filters?: Omit<PayoutFilters, "circleId">) {
  const page = filters?.page ?? 1;
  const limit = filters?.limit ?? 20;
  return useQuery({
    queryKey: queryKeys.payouts.forCircle(circleId, { page, limit }),
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", String(limit));
      if (filters?.sortBy) params.set("sortBy", filters.sortBy);
      if (filters?.sortDir) params.set("sortDir", filters.sortDir);
      if (filters?.payoutType) params.set("payoutType", filters.payoutType);

      const response = await get<ApiResponse<{ payouts?: Payout[] }>>(
        `/circles/${circleId}/payouts?${params.toString()}`,
      );
      const payouts = extractPayouts(response);

      return {
        payouts,
        meta: response.meta ?? fallbackMeta(page, limit, payouts.length),
      };
    },
    enabled: !!circleId,
    staleTime: 5000,
    refetchOnWindowFocus: true,
  });
}

/**
 * Dry-run distribution preview for a circle round.
 *
 * POST /circles/:id/payout/preview — authenticated; organizer only. The
 * shared api-client attaches the Bearer token and the CSRF double-submit
 * header automatically. Previews never record a payout.
 */
export function usePayoutPreview(circleId: string) {
  return useMutation({
    mutationFn: async (payload: PreviewPayoutPayload) => {
      const response = await post<ApiResponse<{ preview: PayoutPreview }>>(
        `/circles/${circleId}/payout/preview`,
        payload,
      );
      return response.data?.preview as PayoutPreview;
    },
  });
}

/**
 * Trigger distribution for a due round.
 *
 * POST /circles/:id/payout — authenticated (organizer only) with idempotency
 * key enforced by the route. Auth + CSRF come from the shared api-client.
 * A replay for the same recipient/round returns the existing payout; a
 * different recipient for an already-paid round is a 409.
 */
export function useTriggerPayout(circleId: string) {
  const addToast = useUIStore((s) => s.addToast);

  return useOptimisticMutation<TriggerPayoutPayload, Payout>({
    mutationFn: async (payload) => {
      const response = await post<ApiResponse<{ payout: Payout }>>(
        `/circles/${circleId}/payout`,
        payload,
      );
      return normalizePayout(response.data?.payout);
    },
    queryKeys: [
      queryKeys.payouts.all,
      queryKeys.payouts.forCircle(circleId),
      queryKeys.circles.rounds(circleId),
    ],
    dedupeKey: (vars) => `trigger-payout-${circleId}-${vars.roundNumber}`,
    applyOptimistic: (variables, tempId, qc) => {
      const optimistic: Payout = {
        id: tempId,
        circleId,
        recipientId: variables.recipientId,
        roundNumber: variables.roundNumber,
        amount: variables.amount,
        feeAmount: variables.feeAmount,
        txnHash: variables.txnHash,
        payoutType: variables.payoutType,
        createdAt: new Date().toISOString(),
      };
      for (const key of [queryKeys.payouts.all, queryKeys.payouts.forCircle(circleId)] as const) {
        qc.setQueriesData({ queryKey: [...key] }, (old: unknown) => {
          if (!old) return old;
          if (Array.isArray(old)) return [optimistic, ...old];
          if (typeof old === "object" && old !== null && Array.isArray((old as { payouts?: unknown }).payouts)) {
            const prev = old as { payouts: Payout[] };
            return { ...prev, payouts: [optimistic, ...prev.payouts] };
          }
          return old;
        });
      }
    },
    onSuccess: () => {
      addToast({
        type: "success",
        title: "Payout distributed",
        description: "The round payout has been recorded.",
      });
    },
    onError: (err) => {
      logger.error("[useTriggerPayout] Failed:", err);
      addToast({
        type: "error",
        title: "Failed to distribute payout",
        description: "Could not distribute the payout. Please try again.",
      });
    },
  });
}
