import { renderHook, act } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useOptimisticMutation, createTempId } from "../use-optimistic-mutation";
import { createQueryWrapper } from "./test-utils";

interface TestData {
  id: string;
  amount: number;
}

describe("createTempId", () => {
  it("generates unique ids with the given prefix", () => {
    const a = createTempId("optimistic");
    const b = createTempId("optimistic");
    expect(a).toMatch(/^optimistic-/);
    expect(a).not.toBe(b);
  });
});

describe("useOptimisticMutation", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("applies the optimistic update with a stable temp id", async () => {
    const mutationFn = vi.fn().mockResolvedValue({ id: "server-1", amount: 100 });
    const applyOptimistic = vi.fn();

    const { queryClient, QueryWrapper } = createQueryWrapper();
    queryClient.setQueryData(["items"], [{ id: "a", amount: 10 }]);

    const { result } = renderHook(
      () =>
        useOptimisticMutation<{ amount: number }, TestData>({
          mutationFn,
          queryKeys: [["items"]],
          applyOptimistic: (vars, tempId, qc) => {
            applyOptimistic(vars, tempId, qc);
            qc.setQueryData<TestData[]>(["items"], (old) => [
              ...(old ?? []),
              { id: tempId, amount: vars.amount },
            ]);
          },
        }),
      { wrapper: QueryWrapper },
    );

    await act(async () => {
      result.current.mutate({ amount: 100 });
    });

    // The temp id was provided to the caller and written into the cache.
    const tempId = applyOptimistic.mock.calls[0][1] as string;
    const items = queryClient.getQueryData<TestData[]>(["items"]);
    expect(items).toHaveLength(2);
    expect(items?.[1].id).toBe(tempId);
    expect(items?.[1].amount).toBe(100);
  });

  it("rolls back to the pre-mutation snapshot on error", async () => {
    const mutationFn = vi.fn().mockRejectedValue(new Error("Network Error"));

    const { queryClient, QueryWrapper } = createQueryWrapper();
    queryClient.setQueryData(["items"], [{ id: "a", amount: 10 }]);

    const { result } = renderHook(
      () =>
        useOptimisticMutation<{ amount: number }, TestData>({
          mutationFn,
          queryKeys: [["items"]],
          applyOptimistic: (_vars, tempId, qc) => {
            qc.setQueryData<TestData[]>(["items"], (old) => [
              ...(old ?? []),
              { id: tempId, amount: 999 },
            ]);
          },
        }),
      { wrapper: QueryWrapper },
    );

    await act(async () => {
      try {
        await result.current.mutateAsync({ amount: 999 });
      } catch {
        // expected rejection
      }
    });

    // Rollback restored the original single item.
    const items = queryClient.getQueryData<TestData[]>(["items"]);
    expect(items).toEqual([{ id: "a", amount: 10 }]);
  });

  it("rolls back entries that were removed or set to null", async () => {
    const mutationFn = vi.fn().mockRejectedValue(new Error("boom"));

    const { queryClient, QueryWrapper } = createQueryWrapper();
    queryClient.setQueryData(["item", "1"], { id: "1", amount: 5 });

    const { result } = renderHook(
      () =>
        useOptimisticMutation<{ id: string }, TestData>({
          mutationFn,
          queryKeys: [["item", "1"]],
          applyOptimistic: (_vars, _tempId, qc) => {
            // Optimistic update removes the entry entirely.
            qc.setQueryData(["item", "1"], null);
          },
        }),
      { wrapper: QueryWrapper },
    );

    await act(async () => {
      try {
        await result.current.mutateAsync({ id: "1" });
      } catch {
        // expected
      }
    });

    const restored = queryClient.getQueryData<TestData | null>(["item", "1"]);
    expect(restored).toEqual({ id: "1", amount: 5 });
  });

  it("dedups double-invocations while the same logical mutation is pending", async () => {
    let resolvePost: (val: unknown) => void;
    const postPromise = new Promise((resolve) => {
      resolvePost = resolve;
    });
    const mutationFn = vi.fn(() => postPromise as Promise<TestData>);

    const { queryClient, QueryWrapper } = createQueryWrapper();
    queryClient.setQueryData(["items"], [{ id: "a", amount: 10 }]);

    const { result } = renderHook(
      () =>
        useOptimisticMutation<{ amount: number }, TestData>({
          mutationFn,
          queryKeys: [["items"]],
          dedupeKey: (vars) => `amount:${vars.amount}`,
          applyOptimistic: (vars, tempId, qc) => {
            qc.setQueryData<TestData[]>(["items"], (old) => [
              ...(old ?? []),
              { id: tempId, amount: vars.amount },
            ]);
          },
        }),
      { wrapper: QueryWrapper },
    );

    // Fire the same logical mutation twice while the first is still pending.
    await act(async () => {
      result.current.mutate({ amount: 50 });
      result.current.mutate({ amount: 50 });
    });

    // Only one optimistic row was added, and only one request was made.
    const items = queryClient.getQueryData<TestData[]>(["items"]);
    expect(items).toHaveLength(2);
    expect(mutationFn).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolvePost!({ id: "server-50", amount: 50 });
    });
  });

  it("releases the dedupe guard after the mutation settles so a later retry fires", async () => {
    const mutationFn = vi.fn().mockRejectedValueOnce(new Error("fail"));
    const mutationFn2 = vi.fn().mockResolvedValue({ id: "ok", amount: 50 });

    const { queryClient, QueryWrapper } = createQueryWrapper();
    queryClient.setQueryData(["items"], []);

    const { result, rerender } = renderHook(
      ({ fn }: { fn: typeof mutationFn }) =>
        useOptimisticMutation<{ amount: number }, TestData>({
          mutationFn: fn,
          queryKeys: [["items"]],
          dedupeKey: (vars) => `amount:${vars.amount}`,
          applyOptimistic: (vars, tempId, qc) => {
            qc.setQueryData<TestData[]>(["items"], (old) => [
              ...(old ?? []),
              { id: tempId, amount: vars.amount },
            ]);
          },
        }),
      { wrapper: QueryWrapper, initialProps: { fn: mutationFn } },
    );

    await act(async () => {
      try {
        await result.current.mutateAsync({ amount: 50 });
      } catch {
        // expected
      }
    });

    // After settling (failure), a new invocation must not be deduped.
    rerender({ fn: mutationFn2 });
    await act(async () => {
      await result.current.mutateAsync({ amount: 50 });
    });

    expect(mutationFn).toHaveBeenCalledTimes(1);
    expect(mutationFn2).toHaveBeenCalledTimes(1);
    const items = queryClient.getQueryData<TestData[]>(["items"]);
    expect(items).toHaveLength(1);
  });

  it("invalidates the query keys on success", async () => {
    const mutationFn = vi.fn().mockResolvedValue({ id: "server-1", amount: 100 });
    const refetch = vi.fn().mockResolvedValue(undefined);

    const { queryClient, QueryWrapper } = createQueryWrapper();
    queryClient.setQueryData(["items"], [{ id: "a", amount: 10 }]);
    // Track invalidation by subscribing to query state changes.
    const invalidations: string[][] = [];
    const originalInvalidate = queryClient.invalidateQueries.bind(queryClient);
    queryClient.invalidateQueries = ((opts: { queryKey?: readonly unknown[] }) => {
      if (opts?.queryKey) invalidations.push(opts.queryKey as string[]);
      return originalInvalidate(opts);
    }) as typeof queryClient.invalidateQueries;

    const { result } = renderHook(
      () =>
        useOptimisticMutation<{ amount: number }, TestData>({
          mutationFn,
          queryKeys: [["items"]],
          applyOptimistic: () => {},
        }),
      { wrapper: QueryWrapper },
    );

    await act(async () => {
      await result.current.mutateAsync({ amount: 100 });
    });

    expect(refetch).not.toHaveBeenCalled();
    expect(invalidations).toContainEqual(["items"]);
  });
});
