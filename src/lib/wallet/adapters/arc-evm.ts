import { WalletAdapter, WalletMeta, NetworkType } from "../types"
import { ARC_CHAIN_ID, ARC_NETWORK } from "@/lib/constants"

interface EthereumProvider {
  isMetaMask?: boolean
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>
  on?: (event: string, cb: (...args: unknown[]) => void) => void
  removeListener?: (event: string, cb: (...args: unknown[]) => void) => void
}

function getEthereumProvider(): EthereumProvider | null {
  if (typeof window === "undefined") return null
  const w = window as unknown as Record<string, unknown>
  // MetaMask / Rabby / Coinbase / Brave all inject window.ethereum (EIP-1193)
  const eth = w.ethereum as EthereumProvider | undefined
  if (eth && typeof eth.request === "function") return eth
  return null
}

function toHexChainId(id: number): string {
  return `0x${id.toString(16)}`
}

export function isArcAddress(address: string): boolean {
  return /^0x[0-9a-fA-F]{40}$/.test(address)
}

export function createArcEvmAdapter(): WalletAdapter {
  const meta: WalletMeta = {
    id: "arc-evm",
    name: "Arc Wallet (MetaMask / Rabby / Coinbase)",
    category: "extension",
    icon: "arc-evm-icon",
    installUrl: "https://metamask.io/download/",
    description: "EVM browser wallet on Arc (0x address, personal_sign auth)",
    priority: 0,
    isAvailable: () => getEthereumProvider() !== null,
  }

  let cachedAddress: string | null = null

  async function ensureChain(provider: EthereumProvider): Promise<void> {
    const expected = toHexChainId(ARC_CHAIN_ID)
    let current: string | null = null
    try {
      current = (await provider.request({ method: "eth_chainId" })) as string
    } catch {
      current = null
    }
    if (current && current.toLowerCase() === expected.toLowerCase()) return
    // Try to switch, fall back to add chain for Arc testnet/mainnet
    try {
      await provider.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: expected }],
      })
    } catch (switchErr: unknown) {
      const code = (switchErr as { code?: number })?.code
      if (code === 4902) {
        const rpcUrl =
          process.env.NEXT_PUBLIC_ARC_RPC_URL ||
          (ARC_NETWORK === "mainnet" ? "https://rpc.mainnet.arc.io" : "https://rpc.testnet.arc.io")
        const explorer =
          process.env.NEXT_PUBLIC_ARC_EXPLORER_URL ||
          (ARC_NETWORK === "mainnet" ? "https://explorer.arc.io" : "https://explorer.testnet.arc.io")
        await provider.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: expected,
              chainName: ARC_NETWORK === "mainnet" ? "Arc" : "Arc Testnet",
              nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 },
              rpcUrls: [rpcUrl],
              blockExplorerUrls: [explorer],
            },
          ],
        })
      } else {
        throw switchErr
      }
    }
  }

  return {
    meta,

    async connect() {
      const provider = getEthereumProvider()
      if (!provider) {
        throw {
          adapter: "arc-evm" as const,
          code: "not_installed" as const,
          message: "No EVM wallet found. Install MetaMask, Rabby or Coinbase Wallet.",
        }
      }
      let accounts: string[]
      try {
        accounts = (await provider.request({ method: "eth_requestAccounts" })) as string[]
      } catch (err: unknown) {
        const e = err as { code?: number; message?: string }
        if (e?.code === 4001) {
          throw { adapter: "arc-evm" as const, code: "user_rejected" as const, message: "Connection rejected in wallet." }
        }
        throw { adapter: "arc-evm" as const, code: "internal" as const, message: "Failed to connect EVM wallet", cause: String(err) }
      }
      const address = accounts?.[0]
      if (!address || !isArcAddress(address)) {
        throw { adapter: "arc-evm" as const, code: "internal" as const, message: "Wallet returned invalid address", cause: String(address) }
      }
      cachedAddress = address
      try {
        await ensureChain(provider)
      } catch {
        throw { adapter: "arc-evm" as const, code: "network_mismatch" as const, message: `Please switch to Arc (chain ${ARC_CHAIN_ID})`, expected: ARC_NETWORK, actual: ARC_NETWORK }
      }
      return { publicKey: address }
    },

    async disconnect() {
      cachedAddress = null
    },

    async isConnected() {
      const provider = getEthereumProvider()
      if (!provider) return false
      try {
        const accounts = (await provider.request({ method: "eth_accounts" })) as string[]
        return Array.isArray(accounts) && accounts.length > 0 && isArcAddress(accounts[0])
      } catch {
        return false
      }
    },

    async getPublicKey() {
      if (cachedAddress) return cachedAddress
      const provider = getEthereumProvider()
      if (!provider) throw { adapter: "arc-evm" as const, code: "not_installed" as const, message: "EVM wallet not installed" }
      const accounts = (await provider.request({ method: "eth_accounts" })) as string[]
      if (!accounts?.[0]) throw { adapter: "arc-evm" as const, code: "internal" as const, message: "No accounts", cause: "empty" }
      cachedAddress = accounts[0]
      return accounts[0]
    },

    async signMessage(message: string) {
      const provider = getEthereumProvider()
      if (!provider) throw { adapter: "arc-evm" as const, code: "not_installed" as const, message: "EVM wallet not installed" }
      const address = await this.getPublicKey()
      try {
        // EIP-191 personal_sign — backend recovers via ecrecover
        const signature = (await provider.request({
          method: "personal_sign",
          params: [message, address],
        })) as string
        return { signature, publicKey: address }
      } catch (err: unknown) {
        const e = err as { code?: number }
        if (e?.code === 4001) {
          throw { adapter: "arc-evm" as const, code: "user_rejected" as const, message: "Signature rejected." }
        }
        throw { adapter: "arc-evm" as const, code: "internal" as const, message: "Failed to sign message", cause: String(err) }
      }
    },

    async signTransaction() {
      // Arc is EVM — legacy XDR path is unsupported. Callers should use
      // sendTransaction via window.ethereum directly.
      throw {
        adapter: "arc-evm" as const,
        code: "not_supported" as const,
        message: "XDR signing is Stellar-only and removed. Use EVM sendTransaction on Arc.",
      }
    },

    async getNetwork(): Promise<NetworkType> {
      return ARC_NETWORK
    },
  }
}
