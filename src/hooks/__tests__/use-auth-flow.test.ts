import { renderHook, act } from "@testing-library/react"
import { describe, it, expect, beforeEach } from "vitest"
import { useProfileForm } from "../use-profile-form"
import { useOnlineStatus } from "../use-online-status"
import { useAuthFlowStore } from "@/stores/auth-flow-store"

describe("useProfileForm", () => {
  beforeEach(() => {
    act(() => {
      useAuthFlowStore.getState().reset()
    })
  })

  it("provides initial profile state", () => {
    const { result } = renderHook(() => useProfileForm())
    expect(result.current.profile.displayName).toBe("")
    expect(result.current.profile.language).toBe("en")
  })

  it("updates profile fields via updateField", () => {
    const { result } = renderHook(() => useProfileForm())

    act(() => {
      result.current.updateField("displayName", "Jane Doe")
    })

    expect(useAuthFlowStore.getState().profile.displayName).toBe("Jane Doe")
  })

  it("sets and validates field errors", () => {
    const { result } = renderHook(() => useProfileForm())

    act(() => {
      result.current.setFieldError("displayName", "Display name is required")
    })

    expect(useAuthFlowStore.getState().profile.fieldErrors.displayName).toBe("Display name is required")
  })
})

describe("useOnlineStatus", () => {
  it("defaults to online status", () => {
    const { result } = renderHook(() => useOnlineStatus())
    expect(result.current).toBe(true)
  })

  it("responds to offline and online window events", () => {
    const { result } = renderHook(() => useOnlineStatus())

    act(() => {
      window.dispatchEvent(new Event("offline"))
    })
    expect(result.current).toBe(false)

    act(() => {
      window.dispatchEvent(new Event("online"))
    })
    expect(result.current).toBe(true)
  })
})
