import { STELLAR_NETWORK } from "./constants"
import { fetchBalanceWithBackoff } from "./wallet/balance-cache"

const TESTNET_PASSPHRASE = "Test SDF Network ; September 2015"
const PUBLIC_PASSPHRASE = "Public Global Stellar Network ; September 2015"

interface FreighterApi {
  isConnected: () => Promise<{ isConnected: boolean; error?: unknown }>
  getPublicKey: () => Promise<{ publicKey: string; error?: unknown }>
  signTransaction: (
    xdr: string,
    opts?: { network?: string; networkPassphrase?: string; accountToSign?: string }
  ) => Promise<{ signedTxXdr: string; error?: unknown }>
  signAuthEntry?: (
    entryXdr: string,
    opts?: { accountToSign?: string }
  ) => Promise<{ signedAuthEntry: string; error?: unknown }>
}

function getFreighter(): FreighterApi | null {
  if (typeof window === "undefined") return null

  const win = window as Window & { freighterApi?: FreighterApi }
  if (win.freighterApi) {
    return win.freighterApi
  }

  return null
}

export function isFreighterInstalled(): boolean {
  if (typeof window === "undefined") return false

  const win = window as Window & { freighterApi?: FreighterApi }
  return "freighterApi" in win
}

export async function connectFreighter(): Promise<string> {
  const freighter = getFreighter()
  if (!freighter) {
    throw new Error(
      "Freighter wallet is not installed. Please install Freighter to continue."
    )
  }

  const connected = await freighter.isConnected()
  if (connected.error) {
    throw new Error(`Freighter connection error: ${connected.error}`)
  }

  const pubKey = await freighter.getPublicKey()
  if (pubKey.error) {
    throw new Error(`Failed to get Freighter public key: ${pubKey.error}`)
  }

  return pubKey.publicKey
}

export async function getFreighterPublicKey(): Promise<string> {
  const freighter = getFreighter()
  if (!freighter) {
    throw new Error("Freighter wallet is not installed.")
  }

  const pubKey = await freighter.getPublicKey()
  if (pubKey.error) {
    throw new Error(`Failed to get Freighter public key: ${pubKey.error}`)
  }

  return pubKey.publicKey
}

export async function signMessage(message: string): Promise<string> {
  const freighter = getFreighter()
  if (!freighter) {
    throw new Error("Freighter wallet is not installed.")
  }

  const encoder = new TextEncoder()
  const data = encoder.encode(message)
  const encodedMessage = btoa(
    Array.from(data)
      .map((byte) => String.fromCharCode(byte))
      .join("")
  )

  const xdr = `AAAAAgAAAAB...${encodedMessage}`

  const networkPassphrase =
    (STELLAR_NETWORK as string) === "mainnet" ? PUBLIC_PASSPHRASE : TESTNET_PASSPHRASE

  const result = await freighter.signTransaction(xdr, {
    network: STELLAR_NETWORK,
    networkPassphrase,
  })

  if (result.error) {
    throw new Error(`Failed to sign message: ${result.error}`)
  }

  return result.signedTxXdr
}

export async function getNetworkDetails(): Promise<{
  network: string
  networkPassphrase: string
}> {
  const networkPassphrase =
    (STELLAR_NETWORK as string) === "public" ? PUBLIC_PASSPHRASE : TESTNET_PASSPHRASE

  return {
    network: STELLAR_NETWORK,
    networkPassphrase,
  }
}

export async function getAccountBalance(
  address: string
): Promise<{ xlm: string; usdc: string }> {
  return fetchBalanceWithBackoff(address)
}

export function formatStroopsToXLM(stroops: string): string {
  const xlm = BigInt(stroops)
  const whole = xlm / BigInt(10_000_000)
  const fraction = xlm % BigInt(10_000_000)
  const fractionStr = fraction.toString().padStart(7, "0")
  return `${whole}.${fractionStr}`
}

export function formatXLMToStroops(xlm: string): string {
  if (!xlm.includes(".")) {
    return (BigInt(xlm) * BigInt(10_000_000)).toString()
  }

  const [whole, fraction] = xlm.split(".")
  const paddedFraction = (fraction || "").padEnd(7, "0").slice(0, 7)
  return (BigInt(whole) * BigInt(10_000_000) + BigInt(paddedFraction)).toString()
}
