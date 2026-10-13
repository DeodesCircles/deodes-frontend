import { describe, expect, it } from "vitest"
import {
  ARC_EXPLORER_URL,
  ARC_NETWORK,
  ARC_RPC_URL,
  USDC_DECIMALS,
} from "./constants"
import {
  arcMainnet,
  arcTestnet,
  defaultArcChain,
  default as defaultExport,
} from "./arc-chains"

describe("arc-chains (Reown AppKit foundation)", () => {
  it("defines Arc Testnet with chain id 5042002", () => {
    expect(arcTestnet.id).toBe(5042002)
  })

  it("defines Arc Mainnet with chain id 5042", () => {
    expect(arcMainnet.id).toBe(5042)
  })

  it("uses USDC (18 decimals) as the native gas currency on both chains", () => {
    expect(USDC_DECIMALS).toBe(18)
    for (const chain of [arcTestnet, arcMainnet]) {
      expect(chain.nativeCurrency.symbol).toBe("USDC")
      expect(chain.nativeCurrency.decimals).toBe(18)
      expect(chain.nativeCurrency.decimals).toBe(USDC_DECIMALS)
    }
  })

  it("passes through the configured RPC URL on the active chain", () => {
    expect(defaultArcChain.rpcUrls.default.http[0]).toBe(ARC_RPC_URL)
  })

  it("passes through the configured explorer URL on the active chain", () => {
    expect(defaultArcChain.blockExplorers?.default.url).toBe(ARC_EXPLORER_URL)
  })

  it("exports the default chain per ARC_NETWORK", () => {
    const expected = ARC_NETWORK === "mainnet" ? arcMainnet : arcTestnet
    expect(defaultArcChain.id).toBe(expected.id)
    expect(defaultExport.id).toBe(expected.id)
  })
})
