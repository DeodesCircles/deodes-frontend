# Moistello V1 — Fix List

## 🔴 Critical

| # | Area | Problem | Fix |
|---|------|---------|-----|
| 1 | `POST /v1/circles/:id/contribute` | Handler is a stub — accepts request, discards everything, returns `success: true` | Call `contribution.Service.Record()` + Soroban `contribute()` |
| 2 | `POST /v1/circles/:id/dispute` | Stub — accepts body, ignores it, returns success | Wire to actual service call |
| 3 | `POST /v1/circles/:id/vote` | Stub — accepts body, ignores it, returns success | Wire to actual service call |
| 4 | `POST /v1/circles/:id/auction-bid` | Stub — accepts body, ignores it, returns success | Wire to actual service call |
| 5 | `GET /v1/circles/:id/payouts` | Returns empty array always | Wire to `payout.Service.GetCircleHistory()` |
| 6 | `GET /v1/circles/:id/rounds` | Returns empty rounds always | Wire to actual round data |
| 7 | `GET /v1/users/me/circles` | Returns empty array always | Wire to actual user circle query |
| 8 | Indexer event handlers | All handlers are logging-only stubs — no DB writes happen | Wire to domain repository calls |

## 🟠 High — Broken UX

| # | Area | Problem | Fix |
|---|------|---------|-----|
| 9 | `/circles/:id/settings` | Save changes, generate invite, cancel circle are all `setTimeout` fakes | Wire to actual API calls |
| 10 | `/settings` | All save handlers are simulated timeouts (profile, KYC, notifications) | Wire to `PATCH /users/me` |
| 11 | `/wallet` | Transactions are hardcoded `SIMULATED_TRANSACTIONS` mock data | Pull from Horizon API via backend |
| 12 | `/circles` | Currency filter is client-side only after API fetch | Add `currency` param to API call |
| 13 | Dashboard `totalReceived` | Fake calculation (`activeCircles * 250`) | Remove or compute from real data |

## 🟡 Medium — Feature Gaps

| # | Area | Problem | Fix |
|---|------|---------|-----|
| 14 | `/circles/:id` | Recent Payouts generated from math, not from API | Fetch from `GET /v1/circles/:id/payouts` |
| 15 | `/circles/:id/members` | No kick/remove actions, no search/filter | Add member management endpoints |
| 16 | `/circles/:id/rounds` | No round totals, no payout info per round | Add round aggregation to backend |
| 17 | `/contributions` | No search by amount/date, no total summary | Add search params to backend query |
| 18 | `/payouts` | No per-circle aggregation, no date filter | Add aggregation to backend query |
| 19 | Dashboard | No charts, no upcoming payouts widget | Add analytics queries |
| 20 | `/circles` sort options | No sort by name, amount, member count | Add sort param to backend |
| 21 | `/circles/my` | No "My Circles" tab — only shows all circles | Add filter by user membership |

## 🟢 Low — Polish

| # | Area | Problem | Fix |
|---|------|---------|-----|
| 22 | `/circles/:id` | Only first 10 member avatars shown, no inline list | Add expandable member list |
| 23 | `/wallet` | No real balance display, no send/receive | Connect to Horizon for balance |
| 24 | `/notifications` | No grouping, no bulk actions | Add grouping by type/circle |
| 25 | `/settings` | No password, 2FA, session management | Future V2 feature |
| 26 | Error pages | Nav/footer removed but styling could be tighter | Polish error page layouts |

## 🏗️ Backend Infrastructure Missing

| # | Area | Problem | Fix |
|---|------|---------|-----|
| 27 | `WalletService.setTrustline` | Empty — needs sponsored transaction | Implement Stellar `ChangeTrust` operation |
| 28 | `WalletService.SignTransaction` | Returns "not implemented" | Wire encrypted key decryption + signing |
| 29 | `migrate` command | `cmd/migrate/main.go` is a stub (just logs and exits) | Implement SQL file reader + executor |
| 30 | Soroban bindings to production code | No contract calls wired in production handlers | Wire `soroban.CircleClient` into circle service |
| 31 | Contribute flow end-to-end | User needs to sign USDC tx with passkey | Wire encrypted key decrypt → sign → submit |
