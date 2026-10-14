import { describe, it, expect } from "vitest"
import { getExplorerTxUrl, getExplorerAddressUrl } from "../explorer"
import { ARC_EXPLORER_URL } from "../constants"

describe("explorer utils", () => {
  describe("getExplorerTxUrl", () => {
    it("returns Arc explorer URL for testnet by default", () => {
      const hash = "1234567890abcdef"
      expect(getExplorerTxUrl(hash)).toBe(
        `${ARC_EXPLORER_URL}/tx/1234567890abcdef`
      )
    })

    it("returns Arc explorer URL for testnet when explicitly specified", () => {
      const hash = "1234567890abcdef"
      expect(getExplorerTxUrl(hash, "testnet")).toBe(
        `${ARC_EXPLORER_URL}/tx/1234567890abcdef`
      )
    })

    it("returns Arc explorer URL for mainnet", () => {
      const hash = "1234567890abcdef"
      expect(getExplorerTxUrl(hash, "mainnet")).toBe(
        `${ARC_EXPLORER_URL}/tx/1234567890abcdef`
      )
    })
  })

  describe("getExplorerAddressUrl", () => {
    it("returns Arc explorer URL for testnet by default", () => {
      const address = "0x742d35Cc6634C0532925a3b844Bc454e4438f44e"
      expect(getExplorerAddressUrl(address)).toBe(
        `${ARC_EXPLORER_URL}/address/0x742d35Cc6634C0532925a3b844Bc454e4438f44e`
      )
    })

    it("returns Arc explorer URL for testnet when explicitly specified", () => {
      const address = "0x742d35Cc6634C0532925a3b844Bc454e4438f44e"
      expect(getExplorerAddressUrl(address, "testnet")).toBe(
        `${ARC_EXPLORER_URL}/address/0x742d35Cc6634C0532925a3b844Bc454e4438f44e`
      )
    })

    it("returns Arc explorer URL for mainnet", () => {
      const address = "0x742d35Cc6634C0532925a3b844Bc454e4438f44e"
      expect(getExplorerAddressUrl(address, "mainnet")).toBe(
        `${ARC_EXPLORER_URL}/address/0x742d35Cc6634C0532925a3b844Bc454e4438f44e`
      )
    })
  })
})

describe("arc explorer utils", () => {
  it("builds Arc address and tx URLs from configured explorer", async () => {
    const { getArcExplorerAddressUrl, getArcExplorerTxUrl } = await import("../explorer")
    expect(getArcExplorerAddressUrl("0xabc")).toContain("/address/0xabc")
    expect(getArcExplorerTxUrl("0x123")).toContain("/tx/0x123")
  })

  it("routes 0x addresses to Arc explorer (Arc-only)", async () => {
    const { getSmartExplorerAddressUrl } = await import("../explorer")
    expect(
      getSmartExplorerAddressUrl("0x742d35Cc6634C0532925a3b844Bc454e4438f44e"),
    ).toContain("0x742d35Cc6634C0532925a3b844Bc454e4438f44e")
    expect(
      getSmartExplorerAddressUrl("0x742d35Cc6634C0532925a3b844Bc454e4438f44e"),
    ).not.toContain("stellar.expert")
  })
})
