import { SupportedNetwork } from "./network/config"
import { ARC_EXPLORER_URL } from "./constants"

/**
 * Returns the Arc explorer URL for a given transaction hash.
 * @param txnHash - The transaction hash.
 * @param network - "testnet" | "mainnet", defaults to "testnet".
 */
export function getExplorerTxUrl(
  txnHash: string,
  network: SupportedNetwork = "testnet"
): string {
  void network
  return `${ARC_EXPLORER_URL}/tx/${txnHash}`
}

/**
 * Returns the Arc explorer URL for a given account address.
 * @param address - The Arc account address.
 * @param network - "testnet" | "mainnet", defaults to "testnet".
 */
export function getExplorerAddressUrl(
  address: string,
  network: SupportedNetwork = "testnet"
): string {
  void network
  return `${ARC_EXPLORER_URL}/address/${address}`
}

/**
 * Returns the Arc explorer URL for a given account address.
 */
export function getArcExplorerAddressUrl(address: string): string {
  return `${ARC_EXPLORER_URL}/address/${address}`
}

/**
 * Returns the Arc explorer URL for a given transaction hash.
 */
export function getArcExplorerTxUrl(txnHash: string): string {
  return `${ARC_EXPLORER_URL}/tx/${txnHash}`
}

/**
 * Address-aware explorer link: Arc addresses (0x...) open the Arc explorer.
 * Non-Arc addresses also resolve to the Arc explorer (Arc-only product).
 */
export function getSmartExplorerAddressUrl(
  address: string,
  network: SupportedNetwork = "testnet",
): string {
  void network
  const trimmed = address.trim()
  if (/^0x[0-9a-fA-F]{40}$/.test(trimmed)) {
    return getArcExplorerAddressUrl(trimmed)
  }
  return getArcExplorerAddressUrl(trimmed)
}
