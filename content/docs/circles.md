---
title: Circles
order: 3
---

# Savings Circles

A deep dive into how savings circles (ROSCAs) work on Moistello.

## Circle Lifecycle

Every circle goes through these stages:

| Stage | Description |
|---|---|
| **Pending** | Circle created, waiting for members to join |
| **Active** | All members joined, contributions and payouts in progress |
| **Completed** | All members received their payout, circle archived |
| **Cancelled** | Circle cancelled before starting (organizer only) |
| **Disputed** | A dispute has been raised, under review |

## Circle Types

### Public
Open to anyone meeting the minimum MoiScore requirement. Good for discovering new circles.

### Private
Invite-only via link. Members must be explicitly invited. The organizer controls who joins.

## Payout Types

### Random (VRF)
The smart contract uses a verifiable random function to determine the payout order. Every member gets exactly one payout — the order is unpredictable and provably fair.

### Fixed Order
The organizer pre-defines the payout order when creating the circle. Everyone knows their position from day one. Common for seniority-based or need-based circles.

### Auction (Chit Fund)
Each round, members bid a discount amount. The lowest bidder (highest discount) receives the payout at a reduced amount. The discount is distributed among all other members as additional earnings.

Example: $100 pool. Alice bids 5%, Bob bids 8%.
- Bob wins with 8% discount
- Bob receives: $100 - $8 = $92
- $8 is split among other members

## Contribution Rules

- Members must contribute the full amount in USDC each cycle
- Contributions are held in a Soroban smart contract escrow
- Late payments incur a penalty (default 5%)
- After max strikes (default 3), a member is removed
- **Zero platform fees** — the contract calls `apply_fee(pool, 0)`, so the full contribution pool is distributed

## Penalties & Enforcement

| Rule | Default | Configurable |
|---|---|---|
| Late Fee | 5% of contribution | Yes |
| Grace Period | 24 hours | Yes (1-168h) |
| Max Strikes | 3 | Yes (1-10) |

## Smart Contract Security

All circle funds are held in Soroban smart contracts deployed on the Stellar blockchain. Key security features:

- **No single point of failure** — funds are on-chain, not held by Moistello
- **Transparent rules** — anyone can verify the smart contract code
- **Immutable execution** — payouts happen automatically when conditions are met
- **Open source** — available under Apache 2.0 license
