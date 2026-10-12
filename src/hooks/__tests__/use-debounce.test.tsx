import { act, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { useDebounce } from "@/hooks/use-debounce"

describe("useDebounce", () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it("updates only after the delay", () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 200),
      { initialProps: { value: "first" } },
    )

    rerender({ value: "second" })
    expect(result.current).toBe("first")
    act(() => vi.advanceTimersByTime(200))
    expect(result.current).toBe("second")
  })

  it("clears superseded and unmounted timers", () => {
    const clearTimeoutSpy = vi.spyOn(window, "clearTimeout")
    const { rerender, unmount } = renderHook(
      ({ value }) => useDebounce(value, 200),
      { initialProps: { value: "first" } },
    )

    rerender({ value: "second" })
    unmount()
    expect(clearTimeoutSpy).toHaveBeenCalledTimes(2)
  })
})
