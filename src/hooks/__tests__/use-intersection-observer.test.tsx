import { act, renderHook } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { useIntersectionObserver } from "@/hooks/use-intersection-observer"

describe("useIntersectionObserver", () => {
  afterEach(() => vi.unstubAllGlobals())

  it("observes a node, reports intersection, and disconnects on unmount", () => {
    let callback: IntersectionObserverCallback | undefined
    const observe = vi.fn()
    const disconnect = vi.fn()

    class IntersectionObserverMock {
      constructor(nextCallback: IntersectionObserverCallback) {
        callback = nextCallback
      }

      observe = observe
      unobserve = vi.fn()
      disconnect = disconnect
      takeRecords = vi.fn(() => [])
      root = null
      rootMargin = "0px"
      thresholds = [0]
    }

    vi.stubGlobal("IntersectionObserver", IntersectionObserverMock)
    const { result, unmount } = renderHook(() => useIntersectionObserver())
    const node = document.createElement("div")

    act(() => result.current.ref(node))
    expect(observe).toHaveBeenCalledWith(node)

    const entry = {
      isIntersecting: true,
      target: node,
    } as unknown as IntersectionObserverEntry
    act(() => callback?.([entry], {} as IntersectionObserver))
    expect(result.current.entry).toBe(entry)
    expect(result.current.isIntersecting).toBe(true)

    unmount()
    expect(disconnect).toHaveBeenCalledOnce()
  })
})
