"use client";

import { useCallback, useRef } from "react";
import {
  useMutation,
  useQueryClient,
  type MutateOptions,
  type UseMutationResult,
} from "@tanstack/react-query";

/**
 * Stable temp id for optimistic rows. Prefers crypto.randomUUID() with a
 * prefix so the id is unique for the lifetime of a mutation but clearly
 * synthetic, never colliding with server-generated ids.
 */
export function createTempId(prefix = "optimistic"): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/**
 * Sentinel userId used on optimistic rows before the server responds. Kept
 * in one place so every hook uses the same sentinel and no hook fabricates
 * its own placeholder.
 */
export const OPTIMISTIC_PENDING_USER_ID = "optimistic-pending";

export interface OptimisticMutationContext {
  /** JSON.stringify(queryKey) -> snapshot of query data before mutation */
  snapshots: Map<string, unknown>;
  /** Stable id for the optimistic row(s) created by this invocation */
  tempId: string;
  /** dedupe key (when dedupeKey is configured) so double-invocations can be detected */
  dedupeKey: string | null;
}

export interface UseOptimisticMutationOptions<TVariables, TData> {
  mutationFn: (variables: TVariables) => Promise<TData>;
  /**
   * Query keys whose caches are cancelled before the optimistic write and
   * invalidated on success (and on failure when rollback cannot run).
   */
  queryKeys: Array<readonly unknown[]>;
  /**
   * Applies the optimistic cache writes. Receives the variables, the stable
   * temp id and the queryClient so hooks never need their own reference.
   */
  applyOptimistic: (
    variables: TVariables,
    tempId: string,
    queryClient: ReturnType<typeof useQueryClient>,
  ) => void;
  /**
   * Optional: returns a key identifying a logical mutation. While a mutation
   * with the same key is pending, further invocations are ignored (dedup) —
   * this prevents double-clicks / rapid refires from double-applying the
   * optimistic update.
   */
  dedupeKey?: (variables: TVariables) => string;
  onSuccess?: (data: TData, variables: TVariables) => void;
  onError?: (error: unknown, variables: TVariables) => void;
  onSettled?: (
    data: TData | undefined,
    error: unknown,
    variables: TVariables,
  ) => void;
  /** Invalidate the query keys on success. Defaults to true. */
  invalidateOnSuccess?: boolean;
  /** Invalidate the query keys when rollback cannot run (onMutate threw). Defaults to true. */
  invalidateOnUnrolledError?: boolean;
}

/**
 * Shared optimistic-update mutation hook.
 *
 * Centralizes the optimistic-update lifecycle that was previously hand-rolled
 * in each data hook:
 *  - cancels in-flight queries for the affected keys
 *  - snapshots current cache state so onError can roll back reliably
 *  - generates a stable temp id for optimistic rows
 *  - dedups double-invocations while a logical mutation is pending
 *  - invalidates on success so server data replaces the optimistic rows
 *  - supports onSettled for shared teardown
 */
export function useOptimisticMutation<TVariables, TData>({
  mutationFn,
  queryKeys,
  applyOptimistic,
  dedupeKey,
  onSuccess,
  onError,
  onSettled,
  invalidateOnSuccess = true,
  invalidateOnUnrolledError = true,
}: UseOptimisticMutationOptions<TVariables, TData>): UseMutationResult<
  TData,
  unknown,
  TVariables
> & {
  /** Dedup-aware mutate: ignores invocations whose dedupe key is pending. */
  mutate: (
    variables: TVariables,
    options?: MutateOptions<TData, unknown, TVariables, OptimisticMutationContext>,
  ) => void;
} {
  const queryClient = useQueryClient();
  const pendingDedupeKeys = useRef<Set<string>>(new Set());
  const pendingPromises = useRef<Map<string, Promise<TData>>>(new Map());

  const mutation = useMutation<
    TData,
    unknown,
    TVariables,
    OptimisticMutationContext | undefined
  >({
    mutationFn,
    onMutate: async (variables) => {
      await Promise.all(
        queryKeys.map((key) => queryClient.cancelQueries({ queryKey: key })),
      );

      const snapshots = new Map<string, unknown>();
      for (const key of queryKeys) {
        snapshots.set(JSON.stringify(key), queryClient.getQueryData(key));
      }

      const tempId = createTempId();
      applyOptimistic(variables, tempId, queryClient);

      return {
        snapshots,
        tempId,
        dedupeKey: dedupeKey ? dedupeKey(variables) : null,
      };
    },
    onError: (error, variables, context) => {
      if (context?.snapshots) {
        // Reliable rollback: restore each snapshot regardless of null-ness so
        // a removed cache entry is restored as null rather than stale data.
        for (const [keyJson, data] of context.snapshots) {
          queryClient.setQueryData(
            JSON.parse(keyJson) as readonly unknown[],
            data,
          );
        }
      } else if (invalidateOnUnrolledError) {
        // onMutate never completed (e.g. synchronous throw before snapshots)
        // — force a refetch so the UI is not stuck on stale data.
        for (const key of queryKeys) {
          queryClient.invalidateQueries({ queryKey: key });
        }
      }
      onError?.(error, variables);
    },
    onSuccess: (data, variables) => {
      if (invalidateOnSuccess) {
        for (const key of queryKeys) {
          queryClient.invalidateQueries({ queryKey: key });
        }
      }
      onSuccess?.(data, variables);
    },
    onSettled: (data, error, variables, context) => {
      if (context?.dedupeKey) {
        pendingDedupeKeys.current.delete(context.dedupeKey);
        pendingPromises.current.delete(context.dedupeKey);
      }
      onSettled?.(data, error, variables);
    },
  });

  const mutate = useCallback(
    (
      variables: TVariables,
      options?: MutateOptions<
        TData,
        unknown,
        TVariables,
        OptimisticMutationContext
      >,
    ) => {
      const key = dedupeKey ? dedupeKey(variables) : null;
      if (key && pendingDedupeKeys.current.has(key)) {
        // Dedup: an identical logical mutation is already in flight — ignore
        // so the optimistic update is not applied twice.
        return;
      }
      if (key) pendingDedupeKeys.current.add(key);
      mutation.mutate(variables, {
        ...options,
        onSettled: (data, error, vars, _onMutateResult, ctx) => {
          if (key) pendingDedupeKeys.current.delete(key);
          options?.onSettled?.(data, error, vars, _onMutateResult, ctx);
        },
      });
    },
    [dedupeKey, mutation],
  );

  const mutateAsync = useCallback(
    (
      variables: TVariables,
      options?: MutateOptions<
        TData,
        unknown,
        TVariables,
        OptimisticMutationContext
      >,
    ) => {
      const key = dedupeKey ? dedupeKey(variables) : null;
      if (key && pendingDedupeKeys.current.has(key)) {
        // Dedup: an identical logical mutation is already in flight — return
        // the pending invocation's promise so the caller awaits the same
        // outcome instead of firing a second request or double-applying the
        // optimistic update.
        return pendingPromises.current.get(key) as Promise<TData>;
      }
      if (key) pendingDedupeKeys.current.add(key);
      const promise = mutation.mutateAsync(variables, {
        ...options,
        onSettled: (data, error, vars, _onMutateResult, ctx) => {
          if (key) pendingDedupeKeys.current.delete(key);
          options?.onSettled?.(data, error, vars, _onMutateResult, ctx);
        },
      });
      if (key) pendingPromises.current.set(key, promise);
      return promise;
    },
    [dedupeKey, mutation],
  );

  return { ...mutation, mutate, mutateAsync };
}
