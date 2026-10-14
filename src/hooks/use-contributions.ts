"use client";

import { logger } from "@/lib/logger"
import { useQuery } from "@tanstack/react-query";
import { useOptimisticMutation, OPTIMISTIC_PENDING_USER_ID } from "./use-optimistic-mutation";
import { get, post } from "@/lib/api-client";
import { useUIStore } from "@/stores/ui-store";
import type { ApiResponse, Contribution } from "@/types";

export interface ContributionFilters {
  circleId?: string;
  userId?: string;
  page?: number;
  limit?: number;
}

interface CreateContributionPayload {
  circleId: string;
  amount: number;
  roundNumber: number;
  txnHash: string;
  idempotencyKey?: string;
}

function newIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function normalizeContribution(c: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = { ...c };
  const txn = out.txnHash as unknown;
  if (txn && typeof txn === "object" && "String" in (txn as Record<string, unknown>)) {
    const s = (txn as { String?: unknown }).String;
    out.txnHash = typeof s === "string" && s ? s : null;
  }
  return out;
}

export function useContributions(filters?: ContributionFilters) {
  return useQuery({
    queryKey: ["contributions", filters ?? {}],
    queryFn: async () => {
      // Backend GET /contributions supports only circleId, userId, page,
      // limit. Search/amount/date/sort are client-side concerns (see the
      // contributions page) — they are intentionally NOT sent so a stale
      // query string cannot be mistaken for server filtering.
      const params = new URLSearchParams();
      if (filters?.circleId) params.set("circleId", filters.circleId);
      if (filters?.userId) params.set("userId", filters.userId);
      if (filters?.page) params.set("page", String(filters.page));
      if (filters?.limit) params.set("limit", String(filters.limit));

      const query = params.toString();
      const url = `/contributions${query ? `?${query}` : ""}`;
      const response = await get<ApiResponse<{ contributions?: Contribution[]; summary?: any }>>(url);

      const raw = response.data?.contributions ?? (
        Array.isArray(response.data) ? response.data : []
      );
      // Normalize legacy sql.NullString txnHash ({String,Valid}) to string.
      const contributions = (raw as unknown[]).map((c) =>
        normalizeContribution(c as Record<string, unknown>),
      ) as unknown as Contribution[];

      return {
        contributions,
        summary: response.data?.summary ?? null,
        meta: response.meta ?? {
          page: filters?.page ?? 1,
          limit: filters?.limit ?? 20,
          total: contributions.length,
          totalPages: 1,
        },
      };
    },
  });
}

export function useCreateContribution() {
  const addToast = useUIStore((s) => s.addToast);

  return useOptimisticMutation<CreateContributionPayload, Contribution>({
    // There is no POST /contributions on the backend. Contributions are
    // recorded via POST /circles/:id/contribute with
    // { amount, roundNumber, txnHash } + Idempotency-Key (CSRF via api-client).
    mutationFn: async (payload) => {
      const key = payload.idempotencyKey ?? newIdempotencyKey();
      const response = await post<
        ApiResponse<{ contribution?: Contribution } & Partial<Contribution>>
      >(
        `/circles/${payload.circleId}/contribute`,
        {
          amount: payload.amount,
          roundNumber: payload.roundNumber,
          txnHash: payload.txnHash,
        },
        { headers: { "Idempotency-Key": key } },
      );
      const data = response.data as
        | ({ contribution?: Contribution } & Partial<Contribution>)
        | undefined;
      if (data && typeof data === "object" && "contribution" in data && data.contribution) {
        return data.contribution as Contribution;
      }
      return data as unknown as Contribution;
    },
    queryKeys: [["contributions"]],
    dedupeKey: (vars) => `create-contribution-${vars.circleId}-${vars.roundNumber}-${vars.amount}-${vars.txnHash}`,
    applyOptimistic: (variables, tempId, qc) => {
      qc.setQueriesData({ queryKey: ["contributions"] }, (old: any) => {
        if (!old) return old;
        const newContrib: Contribution = {
          id: tempId,
          circleId: variables.circleId,
          userId: OPTIMISTIC_PENDING_USER_ID,
          roundNumber: variables.roundNumber,
          amount: variables.amount,
          status: "pending",
          onTime: true,
          createdAt: new Date().toISOString(),
        };
        if (Array.isArray(old.contributions)) {
          return {
            ...old,
            contributions: [newContrib, ...old.contributions],
          };
        }
        if (Array.isArray(old)) {
          return [newContrib, ...old];
        }
        return old;
      });
    },
    onSuccess: () => {
      addToast({
        type: "success",
        title: "Contribution added",
        description: "Your contribution has been created successfully.",
      });
    },
    onError: (err) => {
      logger.error("[useCreateContribution] Failed:", err);
      addToast({
        type: "error",
        title: "Failed to add contribution",
        description: "Could not create contribution. Please try again.",
      });
    },
  });
}
