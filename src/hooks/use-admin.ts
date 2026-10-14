"use client"

import { useQuery } from "@tanstack/react-query"
import { AxiosError } from "axios"
import { get } from "@/lib/api-client"
import { queryKeys } from "@/lib/query-keys"
import type { ApiResponse, PaginationMeta } from "@/types"

/** Backend role value that unlocks the admin section and /admin/* routes. */
export const ADMIN_ROLE = "admin" as const

/** Single source of truth for the admin gate: missing/unknown roles are denied. */
export function isAdminRole(role: unknown): boolean {
  return role === ADMIN_ROLE
}

export interface AdminUser {
  id: string
  walletAddress: string
  email?: string | null
  displayName?: string | null
  role?: string
  moiScore?: number
  createdAt?: string
}

export interface AdminMetrics {
  totalUsers: number
  totalCircles: number
  activeCircles: number
  totalContributions: number
  totalPayouts: number
  activeUsers: number
  newUsers30d: number
  contributionVolume: number
  payoutVolume: number
  totalVolumeUSD: number
  volumeUSD30d: number
}

export interface AdminUsersResult {
  users: AdminUser[]
  meta: PaginationMeta
  /** True when the backend answered 403 — the cached role is stale or revoked. */
  forbidden: boolean
}

function isForbidden(error: unknown): boolean {
  return (
    error instanceof AxiosError &&
    (error.response?.status === 403 ||
      (error as { status?: number }).status === 403)
  )
}

const EMPTY_META: PaginationMeta = { page: 1, limit: 20, total: 0, totalPages: 0 }

/**
 * Platform-wide aggregates for the admin overview (GET /admin/metrics).
 * Disabled unless the caller is an admin, so non-admins never fire it.
 */
export function useAdminMetrics(enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.admin.metrics(),
    queryFn: async (): Promise<AdminMetrics | null> => {
      const response = await get<ApiResponse<AdminMetrics>>("/admin/metrics")
      return response.data ?? null
    },
    enabled,
    staleTime: 60_000,
    retry: false,
  })
}

/**
 * Paginated user directory for admins (GET /admin/users).
 * A 403 resolves to `{ users: [], forbidden: true }` instead of throwing,
 * so the page can render the access-denied state inline.
 */
export function useAdminUsers(
  filters: { search?: string; page?: number; limit?: number },
  enabled: boolean,
) {
  const { search = "", page = 1, limit = 20 } = filters
  return useQuery({
    queryKey: queryKeys.admin.users({ search, page, limit }),
    queryFn: async (): Promise<AdminUsersResult> => {
      const params = new URLSearchParams()
      if (search) params.set("search", search)
      params.set("page", String(page))
      params.set("limit", String(limit))
      try {
        const response = await get<
          ApiResponse<{ users: AdminUser[] }>
        >(`/admin/users?${params.toString()}`)
        return {
          users: response.data?.users ?? [],
          meta: response.meta ?? { ...EMPTY_META, page, limit },
          forbidden: false,
        }
      } catch (error) {
        if (isForbidden(error)) {
          return { users: [], meta: { ...EMPTY_META, page, limit }, forbidden: true }
        }
        throw error
      }
    },
    enabled,
    staleTime: 30_000,
    retry: false,
  })
}
