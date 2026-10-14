import { renderHook, waitFor } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { AxiosError } from "axios"
import { get } from "@/lib/api-client"
import { isAdminRole, useAdminMetrics, useAdminUsers } from "@/hooks/use-admin"
import { createQueryWrapper } from "./test-utils"

vi.mock("@/lib/api-client", () => ({
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  del: vi.fn(),
}))

const mockedGet = vi.mocked(get)

describe("isAdminRole", () => {
  it("grants only the exact admin role", () => {
    expect(isAdminRole("admin")).toBe(true)
    expect(isAdminRole("user")).toBe(false)
    expect(isAdminRole("Admin")).toBe(false)
    expect(isAdminRole(undefined)).toBe(false)
    expect(isAdminRole(null)).toBe(false)
    expect(isAdminRole("")).toBe(false)
  })
})

describe("useAdminMetrics", () => {
  it("returns platform aggregates from /admin/metrics", async () => {
    mockedGet.mockResolvedValue({
      data: { totalUsers: 42, totalCircles: 7, activeCircles: 3 },
    })
    const { QueryWrapper } = createQueryWrapper()
    const { result } = renderHook(() => useAdminMetrics(true), {
      wrapper: QueryWrapper,
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mockedGet).toHaveBeenCalledWith("/admin/metrics")
    expect(result.current.data?.totalUsers).toBe(42)
    expect(result.current.data?.totalCircles).toBe(7)
  })

  it("stays idle for non-admins", () => {
    mockedGet.mockClear()
    const { QueryWrapper } = createQueryWrapper()
    const { result } = renderHook(() => useAdminMetrics(false), {
      wrapper: QueryWrapper,
    })

    expect(result.current.fetchStatus).toBe("idle")
    expect(mockedGet).not.toHaveBeenCalled()
  })

  it("resolves null when the envelope has no data", async () => {
    mockedGet.mockResolvedValue({ data: undefined })
    const { QueryWrapper } = createQueryWrapper()
    const { result } = renderHook(() => useAdminMetrics(true), {
      wrapper: QueryWrapper,
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toBeNull()
  })
})

describe("useAdminUsers", () => {
  it("fetches the user directory with search and pagination", async () => {
    mockedGet.mockResolvedValue({
      data: { users: [{ id: "u1", walletAddress: "0x1", role: "user" }] },
      meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
    })
    const { QueryWrapper } = createQueryWrapper()
    const { result } = renderHook(
      () => useAdminUsers({ search: "0x1", page: 1, limit: 20 }, true),
      { wrapper: QueryWrapper },
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mockedGet).toHaveBeenCalledWith("/admin/users?search=0x1&page=1&limit=20")
    expect(result.current.data?.users).toHaveLength(1)
    expect(result.current.data?.forbidden).toBe(false)
  })

  it("omits the search param when no search is given", async () => {
    mockedGet.mockResolvedValue({ data: { users: [] } })
    const { QueryWrapper } = createQueryWrapper()
    const { result } = renderHook(() => useAdminUsers({}, true), {
      wrapper: QueryWrapper,
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mockedGet).toHaveBeenCalledWith("/admin/users?page=1&limit=20")
  })

  it("surfaces a 403 as forbidden instead of throwing", async () => {
    mockedGet.mockRejectedValue(
      new AxiosError("forbidden", "ERR", undefined, null, {
        status: 403,
      } as never),
    )
    const { QueryWrapper } = createQueryWrapper()
    const { result } = renderHook(() => useAdminUsers({}, true), {
      wrapper: QueryWrapper,
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.users).toEqual([])
    expect(result.current.data?.forbidden).toBe(true)
  })

  it("rethrows non-403 failures", async () => {
    mockedGet.mockRejectedValue(new Error("network down"))
    const { QueryWrapper } = createQueryWrapper()
    const { result } = renderHook(() => useAdminUsers({}, true), {
      wrapper: QueryWrapper,
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error).toMatchObject({ message: "network down" })
  })

  it("stays idle for non-admins", () => {
    mockedGet.mockClear()
    const { QueryWrapper } = createQueryWrapper()
    const { result } = renderHook(() => useAdminUsers({}, false), {
      wrapper: QueryWrapper,
    })

    expect(result.current.fetchStatus).toBe("idle")
    expect(mockedGet).not.toHaveBeenCalled()
  })
})
