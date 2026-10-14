import { getWalletRegistry } from "../registry"
import { isPasskeyEnabled, isWalletConnectEnabled } from "../features"

export { createWalletConnectAdapter } from "./walletconnect"
export { createPasskeyAdapter } from "./passkey"
export { createArcEvmAdapter } from "./arc-evm"

let initialized = false

export async function initializeWalletAdapters(): Promise<void> {
  if (initialized) return
  const registry = getWalletRegistry()

  // Arc EVM (MetaMask/Rabby/Coinbase) — always registered, primary rail.
  const { createArcEvmAdapter } = await import("./arc-evm")
  registry.register(createArcEvmAdapter())

// WalletConnect: gated by feature flag
   if (isWalletConnectEnabled()) {
     const { createWalletConnectAdapter } = await import("./walletconnect")
     registry.register(createWalletConnectAdapter())
   }

  // Passkey: gated by feature flag
  if (isPasskeyEnabled()) {
    const { createPasskeyAdapter } = await import("./passkey")
    registry.register(createPasskeyAdapter())
  }

  initialized = true
}
