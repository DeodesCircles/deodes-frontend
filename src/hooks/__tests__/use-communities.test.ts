import { renderHook, waitFor } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { get } from "@/lib/api-client"
import { useCommunity, useCommunityMembership } from "@/hooks/use-communities"
import { createQueryWrapper } from "./test-utils"

vi.mock("@/lib/api-client", () => ({
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  del: vi.fn(),
}))

const mockedGet = vi.mocked(get)

describe("useCommunity", () => {
  it("combines the five community sub-resources into one result", async () => {
    mockedGet.mockImplementation(async (url: string) => {
      if (url === "/communities/c1") return { data: { community: { id: "c1", name: "Test" } } }
      if (url === "/communities/c1/members") return { data: { members: [{ userId: "u1" }] } }
      if (url === "/communities/c1/announcements") return { data: { announcements: [] } }
      if (url === "/communities/c1/activity") return { data: { events: [] } }
      if (url === "/circles?communityId=c1") return { data: { circles: [] } }
      throw new Error(`unexpected url ${url}`)
    })

    const { QueryWrapper } = createQueryWrapper()
    const { result } = renderHook(() => useCommunity("c1"), { wrapper: QueryWrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.community).toEqual({ id: "c1", name: "Test" })
    expect(result.current.data?.members).toEqual([{ userId: "u1" }])
  })

  it("degrades gracefully when one sub-resource fails", async () => {
    mockedGet.mockImplementation(async (url: string) => {
      if (url === "/communities/c1") return { data: { community: { id: "c1", name: "Test" } } }
      if (url === "/communities/c1/members") throw new Error("members down")
      if (url === "/communities/c1/announcements") return { data: { announcements: [] } }
      if (url === "/communities/c1/activity") return { data: { events: [] } }
      if (url === "/circles?communityId=c1") return { data: { circles: [] } }
      throw new Error(`unexpected url ${url}`)
    })

    const { QueryWrapper } = createQueryWrapper()
    const { result } = renderHook(() => useCommunity("c1"), { wrapper: QueryWrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.community).toEqual({ id: "c1", name: "Test" })
    expect(result.current.data?.members).toEqual([])
  })
})

describe("useCommunityMembership", () => {
  it("is disabled when the caller passes enabled: false", () => {
    const { QueryWrapper } = createQueryWrapper()
    const { result } = renderHook(() => useCommunityMembership("c1", false), {
      wrapper: QueryWrapper,
    })

    expect(result.current.fetchStatus).toBe("idle")
    expect(mockedGet).not.toHaveBeenCalledWith("/communities/c1/membership")
  })

  it("reports membership from the server", async () => {
    mockedGet.mockResolvedValue({ data: { isMember: true } })
    const { QueryWrapper } = createQueryWrapper()
    const { result } = renderHook(() => useCommunityMembership("c1", true), {
      wrapper: QueryWrapper,
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toBe(true)
  })
})
