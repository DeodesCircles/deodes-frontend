import { act, renderHook } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { useMediaQuery } from "@/hooks/use-media-query"

describe("useMediaQuery", () => {
  afterEach(() => vi.unstubAllGlobals())

  it("tracks media query changes and removes its listener on unmount", () => {
    let listener: (() => void) | undefined
    const mediaQuery = {
      matches: true,
      media: "(min-width: 768px)",
      onchange: null,
      addEventListener: vi.fn((_event: string, callback: () => void) => {
        listener = callback
      }),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }
    vi.stubGlobal("matchMedia", vi.fn(() => mediaQuery))

    const { result, unmount } = renderHook(() =>
      useMediaQuery("(min-width: 768px)"),
    )
    expect(result.current).toBe(true)

    mediaQuery.matches = false
    act(() => listener?.())
    expect(result.current).toBe(false)

    unmount()
    expect(mediaQuery.removeEventListener).toHaveBeenCalledWith(
      "change",
      listener,
    )
  })
})
