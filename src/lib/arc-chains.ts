import { defineChain } from "viem"
import {
  ARC_EXPLORER_URL,
  ARC_NETWORK,
  ARC_RPC_URL,
  USDC_DECIMALS,
} from "./constants"

/**
 * Reown AppKit / wagmi chain definitions for Arc.
 *
 * Pure addition for the AppKit foundation step — the legacy wallet system
 * does not import this module. Chain IDs are the canonical Arc values
 * (mainnet 5042, testnet 5042002, see docs.arc.io/arc/references/connect-to-arc
 * and src/lib/constants.ts). USDC (18 decimals) is the native gas token on Arc.
 *
 * RPC / explorer resolution: the chain matching the active ARC_NETWORK uses
 * the deployment-configured ARC_RPC_URL / ARC_EXPLORER_URL (env passthrough);
 * the inactive chain falls back to its canonical public endpoint so both
 * networks stay selectable in the AppKit modal regardless of env.
 */

export const arcTestnet = defineChain({
  id: 5042002,
  name: "Arc Testnet",
  nativeCurrency: {
    name: "USDC",
    symbol: "USDC",
    decimals: USDC_DECIMALS,
  },
  rpcUrls: {
    default: {
      http: [
        ARC_NETWORK === "testnet"
          ? ARC_RPC_URL
          : "https://rpc.testnet.arc.io",
      ],
    },
  },
  blockExplorers: {
    default: {
      name: "Arc Testnet Explorer",
      url:
        ARC_NETWORK === "testnet"
          ? ARC_EXPLORER_URL
          : "https://explorer.testnet.arc.io",
    },
  },
  testnet: true,
})

export const arcMainnet = defineChain({
  id: 5042,
  name: "Arc",
  nativeCurrency: {
    name: "USDC",
    symbol: "USDC",
    decimals: USDC_DECIMALS,
  },
  rpcUrls: {
    default: {
      http: [
        ARC_NETWORK === "mainnet"
          ? ARC_RPC_URL
          : "https://rpc.mainnet.arc.io",
      ],
    },
  },
  blockExplorers: {
    default: {
      name: "Arc Explorer",
      url:
        ARC_NETWORK === "mainnet" ? ARC_EXPLORER_URL : "https://explorer.arc.io",
    },
  },
})

/** All Arc networks selectable in the AppKit modal. */
export const arcChains = [arcTestnet, arcMainnet] as const

/** Active chain per NEXT_PUBLIC_ARC_NETWORK (defaults to testnet). */
export const defaultArcChain =
  ARC_NETWORK === "mainnet" ? arcMainnet : arcTestnet

export default defaultArcChain
