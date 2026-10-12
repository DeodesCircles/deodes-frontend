import type { BrowserContext, Page, Route } from "@playwright/test"

import type { Circle, CircleMember, Contribution, Payout, User } from "@/types"

const APP_ORIGIN = "http://localhost:1110"
const ACCESS_TOKEN_COOKIE = "moistello_token"

export interface MockCalls {
  authLogins: unknown[]
  registerRequests: unknown[]
  verificationSends: unknown[]
  verificationChecks: unknown[]
  profileUpdates: unknown[]
  walletCreations: unknown[]
  circleCreates: unknown[]
  contributionPosts: unknown[]
}

export interface MockAppFixtures {
  user: User
  token: string
  refreshToken: string
  loginUser?: User
  loginToken?: string
  loginRefreshToken?: string
  circles: Circle[]
  members: CircleMember[]
  contributions: Contribution[]
  payouts: Payout[]
  dashboardCircles: Circle[]
  savingsGoals?: Array<{
    id: string
    name: string
    targetAmount: number
    currentAmount: number
    autoReserve: boolean
    targetDate: string | null
  }>
  walletPublicKey?: string
  verificationCode?: string
  verificationId?: string
  createdCircle: Circle
}

export function buildMockFixtures(overrides: Partial<MockAppFixtures> = {}): MockAppFixtures {
  const user: User = overrides.user ?? {
    id: "user-1",
    walletAddress: "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
    email: "amina@example.com",
    displayName: "Amina Okafor",
    countryCode: "NG",
    preferredLanguage: "en",
    moiScore: 640,
    createdAt: "2026-07-10T09:00:00.000Z",
  }

  const circle: Circle = overrides.createdCircle ?? {
    id: "circle-alpha",
    contractId: "contract-alpha",
    name: "Neighborhood Savings Circle",
    description: "A monthly USDC circle for close friends and neighbors.",
    circleType: "public",
    payoutType: "fixed",
    contributionAmount: 250,
    currency: "USDC",
    frequency: "monthly",
    maxMembers: 5,
    minMoiScore: 0,
    collateralPercent: 10,
    lateFeePercent: 5,
    gracePeriodHours: 24,
    maxStrikes: 3,
    startDate: "2026-08-01T09:00:00.000Z",
    status: "active",
    currentRound: 2,
    totalContributions: 750,
    organizerId: user.id,
    organizerName: user.displayName ?? "Amina Okafor",
    memberCount: 3,
    createdAt: "2026-07-15T12:00:00.000Z",
  }

  return {
    user,
    token: overrides.token ?? "access-token-123",
    refreshToken: overrides.refreshToken ?? "refresh-token-123",
    loginUser: overrides.loginUser ?? user,
    loginToken: overrides.loginToken ?? "login-token-123",
    loginRefreshToken: overrides.loginRefreshToken ?? "login-refresh-token-123",
    circles: overrides.circles ?? [circle],
    members: overrides.members ?? [
      {
        id: "member-1",
        circleId: circle.id,
        userId: user.id,
        position: 1,
        status: "active",
        userName: user.displayName ?? "Amina Okafor",
        userAddress: user.walletAddress,
        joinedAt: "2026-07-16T09:00:00.000Z",
      },
      {
        id: "member-2",
        circleId: circle.id,
        userId: "user-2",
        position: 2,
        status: "active",
        userName: "Grace Mensah",
        userAddress: "GBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB",
        joinedAt: "2026-07-17T09:00:00.000Z",
      },
    ],
    contributions: overrides.contributions ?? [
      {
        id: "contribution-1",
        circleId: circle.id,
        userId: user.id,
        roundNumber: 1,
        amount: 250,
        txnHash: "A".repeat(64),
        status: "confirmed",
        onTime: true,
        createdAt: "2026-07-18T08:30:00.000Z",
      },
    ],
    payouts: overrides.payouts ?? [
      {
        id: "payout-1",
        circleId: circle.id,
        recipientId: "user-2",
        roundNumber: 2,
        amount: 250,
        feeAmount: 1.25,
        txnHash: "B".repeat(64),
        payoutType: "fixed",
        createdAt: "2026-07-25T10:00:00.000Z",
      },
    ],
    dashboardCircles: overrides.dashboardCircles ?? [circle],
    savingsGoals: overrides.savingsGoals ?? [],
    walletPublicKey: overrides.walletPublicKey ?? "GCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC",
    verificationCode: overrides.verificationCode ?? "123456",
    verificationId: overrides.verificationId ?? "verification-1",
    createdCircle: circle,
  }
}

export function createMockCalls(): MockCalls {
  return {
    authLogins: [],
    registerRequests: [],
    verificationSends: [],
    verificationChecks: [],
    profileUpdates: [],
    walletCreations: [],
    circleCreates: [],
    contributionPosts: [],
  }
}

function jsonHeaders(extra: Record<string, string> = {}): Record<string, string> {
  return {
    "content-type": "application/json",
    "access-control-allow-origin": "*",
    "access-control-allow-headers": "content-type, x-csrf-token, authorization",
    "access-control-allow-methods": "GET,POST,PATCH,PUT,DELETE,OPTIONS",
    ...extra,
  }
}

async function fulfillJson(
  route: Route,
  payload: unknown,
  status = 200,
) {
  await route.fulfill({
    status,
    headers: jsonHeaders(),
    body: JSON.stringify(payload),
  })
}

async function parseJsonBody(request: { postDataJSON?: () => unknown; postData?: () => string | null }): Promise<unknown> {
  try {
    return request.postDataJSON?.()
  } catch {
    const raw = request.postData?.()
    if (!raw) return null
    try {
      return JSON.parse(raw)
    } catch {
      return raw
    }
  }
}

function circleForRoute(fixtures: MockAppFixtures, circleId: string): Circle {
  return fixtures.createdCircle.id === circleId
    ? fixtures.createdCircle
    : fixtures.circles.find((circle) => circle.id === circleId) ?? fixtures.createdCircle
}

function success<T>(data: T) {
  return { success: true, data }
}

export async function installMockApi(
  page: Page,
  fixtures: MockAppFixtures,
  calls: MockCalls,
) {
  await page.route("**/api/auth/session", async (route) => {
    const request = route.request()
    const method = request.method()
    if (method === "GET") {
      const cookieHeader = request.headers()["cookie"] ?? ""
      if (!cookieHeader.includes(`${ACCESS_TOKEN_COOKIE}=`)) {
        await route.fulfill({ status: 401, headers: jsonHeaders(), body: JSON.stringify({ success: false }) })
        return
      }
      await fulfillJson(route, {
        token: fixtures.token,
        refreshToken: fixtures.refreshToken,
        user: fixtures.user,
      })
      return
    }
    if (method === "POST") {
      await route.fulfill({
        status: 200,
        headers: {
          "content-type": "application/json",
          "set-cookie": `${ACCESS_TOKEN_COOKIE}=${fixtures.token}; Path=/; HttpOnly; SameSite=Lax`,
        },
        body: JSON.stringify({ success: true }),
      })
      return
    }
    if (method === "DELETE") {
      await route.fulfill({ status: 204 })
      return
    }
    await route.fulfill({ status: 405 })
  })

  await page.route("**/v1/**", async (route) => {
    const request = route.request()
    const method = request.method()
    const url = new URL(request.url())
    const path = url.pathname.replace(/^\/v1/, "")

    if (method === "OPTIONS") {
      await route.fulfill({
        status: 204,
        headers: jsonHeaders(),
      })
      return
    }

    if (path === "/auth/login" && method === "POST") {
      calls.authLogins.push(await parseJsonBody(request))
      await fulfillJson(route, success({
        token: fixtures.loginToken ?? fixtures.token,
        refreshToken: fixtures.loginRefreshToken ?? fixtures.refreshToken,
        user: fixtures.loginUser ?? fixtures.user,
      }))
      return
    }

    if (path === "/auth/register" && method === "POST") {
      calls.registerRequests.push(await parseJsonBody(request))
      await fulfillJson(route, success({ created: true }))
      return
    }

    if (path === "/auth/register/verify" && method === "POST") {
      calls.verificationChecks.push(await parseJsonBody(request))
      await fulfillJson(route, success({
        token: fixtures.token,
        refreshToken: fixtures.refreshToken,
        user: fixtures.user,
      }))
      return
    }

    if (path === "/claim-name" && method === "POST") {
      await fulfillJson(route, success({ name: fixtures.user.displayName ?? "Moistello Builder" }))
      return
    }

    if (path === "/users/me" && method === "PATCH") {
      calls.profileUpdates.push(await parseJsonBody(request))
      await fulfillJson(route, success({ updated: true }))
      return
    }

    if (path === "/auth/verification/send" && method === "POST") {
      calls.verificationSends.push(await parseJsonBody(request))
      await fulfillJson(route, success({
        verificationId: fixtures.verificationId,
        expiresAt: Date.now() + 10 * 60 * 1000,
        remainingAttempts: 5,
      }))
      return
    }

    if (path === "/auth/verification/verify" && method === "POST") {
      calls.verificationChecks.push(await parseJsonBody(request))
      await fulfillJson(route, success({ verified: true }))
      return
    }

    if (path === "/wallet/create" && method === "POST") {
      calls.walletCreations.push(await parseJsonBody(request))
      await fulfillJson(route, success({
        publicKey: fixtures.walletPublicKey,
        funded: true,
        usdcTrustline: true,
      }))
      return
    }

    if (path === "/auth/wallet/init" && method === "POST") {
      await fulfillJson(route, success({ initialized: true }))
      return
    }

    if (path === "/users/me/circles" && method === "GET") {
      await fulfillJson(route, success({ circles: fixtures.dashboardCircles }))
      return
    }

    if (path === "/contributions" && method === "GET") {
      await fulfillJson(route, success({ contributions: fixtures.contributions }))
      return
    }

    if (path === "/payouts" && method === "GET") {
      await fulfillJson(route, success({ payouts: fixtures.payouts }))
      return
    }

    if (path === "/savings/goals/obligations" && method === "GET") {
      await fulfillJson(route, { goals: fixtures.savingsGoals ?? [] })
      return
    }

    const circleDetailMatch = path.match(/^\/circles\/([^/]+)$/)
    if (circleDetailMatch && method === "GET") {
      const circle = circleForRoute(fixtures, circleDetailMatch[1])
      await fulfillJson(route, success({ circle }))
      return
    }

    const membersMatch = path.match(/^\/circles\/([^/]+)\/members$/)
    if (membersMatch && method === "GET") {
      await fulfillJson(route, success({ members: fixtures.members.filter((member) => member.circleId === membersMatch[1]) }))
      return
    }

    const payoutsMatch = path.match(/^\/circles\/([^/]+)\/payouts$/)
    if (payoutsMatch && method === "GET") {
      await fulfillJson(route, success({ payouts: fixtures.payouts.filter((payout) => payout.circleId === payoutsMatch[1]) }))
      return
    }

    const contributeMatch = path.match(/^\/circles\/([^/]+)\/contribute$/)
    if (contributeMatch && method === "POST") {
      calls.contributionPosts.push(await parseJsonBody(request))
      const circle = circleForRoute(fixtures, contributeMatch[1])
      await fulfillJson(route, success({
        contribution: {
          id: "contribution-new",
          circleId: contributeMatch[1],
          userId: fixtures.user.id,
          roundNumber: circle.currentRound,
          amount: circle.contributionAmount,
          status: "confirmed",
          onTime: true,
          createdAt: new Date().toISOString(),
        },
      }))
      return
    }

    const createCircleMatch = path === "/circles" && method === "POST"
    if (createCircleMatch) {
      calls.circleCreates.push(await parseJsonBody(request))
      await fulfillJson(route, success({ circle: fixtures.createdCircle }))
      return
    }

    await route.fulfill({
      status: 500,
      headers: jsonHeaders(),
      body: JSON.stringify({
        success: false,
        error: `Unhandled mock API request: ${method} ${url.pathname}${url.search}`,
      }),
    })
  })
}

export async function seedAuthCookie(context: BrowserContext, token: string) {
  await context.addCookies([
    {
      name: ACCESS_TOKEN_COOKIE,
      value: token,
      url: APP_ORIGIN,
    },
  ])
}
