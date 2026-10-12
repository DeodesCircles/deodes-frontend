---
title: Smart Contracts
order: 2
---

# Smart Contracts

Moistello's smart contracts are built on Soroban (Stellar's smart contract platform). The system consists of three contracts deployed on-chain.

## Contract Architecture

### Circle Contract

Each savings circle is a separate contract instance that manages:
- Member joining and contributions in USDC
- Round-based payouts with different distribution modes
- On-chain dispute resolution
- Membership status tracking

**Zero platform fees** — the Circle contract applies `apply_fee(pool, 0)`, ensuring the entire contribution pool is distributed to members.

### Reputation Contract

Tracks and stores MoiScore data for each member, including:
- Contribution streaks
- Circle completions
- Total contributed volume
- Recency timestamps

### Wallet Contract

Manages the on-chain wallet lifecycle:
- Creates new Stellar wallets for each member
- Funds new wallets with 2 XLM from the master pool
- Tracks wallet ownership and encryption metadata

## Integration

Contracts are deployed using the Soroban CLI. Contact support for SDK access and integration guidelines.

```bash
# Soroban CLI installation
cargo install --locked soroban-cli
```
