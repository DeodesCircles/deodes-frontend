# Moistello V1 — Growth Architecture

## The Problem

- Users expect their savings to grow
- Yellow Card charges 1-3% spread on NGN↔USDC
- DeFi yield (Blend) alone: 2-6% APY — barely covers the spread
- Auction only benefits patient members
- Users are anxious about keeping money in new platforms

## The Solution: Three-Layer Growth Model

```
Layer 1: USDC Preservation (always true)
  ↓
Layer 2: Auction + Blend (user-signed, no custody)
  ↓
Layer 3: Platform-Backed Incentives (your marketing budget)
```

---

## Layer 1 — USDC vs Naira Preservation

This is the foundation. Users gain value just by holding USDC instead of Naira.

| Metric | Naira | USDC |
|--------|-------|------|
| Annual inflation | ~30% | ~2% |
| ₦100K after 1 year | ₦70K value | ₦98K value |
| Effective loss/gain | -30% | **+28% vs Naira** |

**Product feature**: Dashboard widget showing "Your savings grew X% compared to holding Naira."

---

## Layer 2 — Auction + Blend

| Mechanism | How It Works | Typical Return |
|-----------|-------------|----------------|
| **Auction circles** | Patient members earn from impatient members within the same circle. Built into the payout mechanism. | 5-15% effective on late rounds |
| **Blend yield** | User signs a transaction depositing idle USDC directly to Blend protocol. You never touch the funds. | 2-6% APY (variable) |

**Combined**: 3-10% on top of the 28% USDC vs Naira preservation.

---

## Layer 3 — Platform-Backed Incentives

These are **marketing expenses**, not financial products. You spend your own money to incentivize desired user behavior — same model as Uber credits, Robinhood free stock, CashApp referral bonuses.

| Incentive | How It Works | Cost to You | Compliance |
|-----------|-------------|-------------|------------|
| **Referral bonus** | "Invite a friend, you both get $5 USDC" | ~$5 per new user | ✅ Marketing expense |
| **Circle completion reward** | "Complete your first circle, get $2 USDC" | ~$2 per user | ✅ Marketing expense |
| **Contribution match** | "We add 2% to every contribution up to $10/month" | ~$0.50/user/month | ✅ Marketing expense — like a 401k match |
| **Savings streak bonus** | "3 on-time contributions in a row, get $1 USDC" | ~$1 per user/month | ✅ Marketing expense |
| **First deposit bonus** | "Deposit $50 USDC, get $5 USDC" | ~$5 per new user | ✅ Marketing expense |

### Estimated Budget

| Scale | Users | Annual Cost |
|-------|-------|-------------|
| Pilot | 1,000 | $10K-$20K |
| Growth | 10,000 | $100K-$200K |
| Scale | 100,000 | $1M-$2M |

Compare to Nigerian fintech CAC (customer acquisition cost): typically $5-$15 per user. Moistello's blended CAC including all bonuses: $10-$20 per user — competitive.

---

## Why Users Stay

```
User earns:
  ┌─────────────────────────────────────────────┐
  │ 28%  — USDC vs Naira preservation           │ (always true)
  │  3-6% — Auction + Blend yield                │ (variable, user signs)
  │  2-5% — Platform bonuses (your budget)       │ (marketing expense)
  ├─────────────────────────────────────────────┤
  │ 33-39% total effective annual "growth"       │
  └─────────────────────────────────────────────┘

Plus: transparent on-chain history = trust over time
```

## Trust Building

| Feature | Purpose |
|---------|---------|
| On-chain transaction history | Users can verify every contribution and payout independently |
| Public smart contract code | Anyone can audit the circle logic |
| Verifiable balances | Users see their wallet balance on Stellar explorer |
| Badge system | Reputation badges for completed circles, streak milestones |
| Transparent bonus attribution | Every bonus is a verifiable on-chain transaction |

## Implementation Priority

| Priority | Feature | Engineering | Cost |
|----------|---------|-------------|------|
| 1 | USDC vs Naira comparison on dashboard | 1 week frontend | $0 |
| 2 | Referral program | 2 weeks backend + frontend | $5 per referral |
| 3 | Contribution match (2%, capped at $10) | 1 week backend + contract | $0.50/user/month |
| 4 | Circle completion rewards | 1 week backend | $2 per completion |
| 5 | Savings streak bonuses | 1 week backend | $1/user/month |
| 6 | First deposit bonus | 3 days backend | $5 per new user |

## Why This Is Not a Financial Service

- Platform bonuses are **marketing expenses** — you spend your own money, not user money
- The platform never promises a return — bonuses are discretionary and capped
- Users can save and contribute without bonuses — bonuses are only for specific actions
- All bonuses are paid in USDC directly to the user's wallet — you never hold user funds
- The auction mechanism is peer-to-peer — the platform sets no rates and takes no cut
- Blend yield is user-signed — your UI just shows options, you never touch the funds
