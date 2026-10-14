# Multi-network operations

## Network identity

Each network must carry:
- RPC endpoint
- Arc chain ID (5042002 testnet, 5042 mainnet)
- Explorer URL
- Contract IDs deployed on that network

Mainnet and testnet contract IDs must never be reused interchangeably.

## Switching procedure

1. Request the target network.
2. Load the target network configuration.
3. Construct the target RPC adapter.
4. Call `getNetwork`.
5. Compare the returned chain ID with the configured chain ID.
6. Update the active network only after validation succeeds.
