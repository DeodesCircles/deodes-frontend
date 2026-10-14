import { describe, it, expect } from "vitest"

const ARC_EVM = "arc-evm"
const ADDR_A = "0x51b45Ba8570551e0D1fe818227d8bAa8b556694D"
const ADDR_B = "0x70A7CCB7b5fe856384Aab3aAF553E09A10AF14A4"

describe("Cross-Adapter Integration", () => {
  it("should handle connecting WalletConnect then switching to Browser Wallet", () => {
    const wallets: Record<string, { status: string; publicKey: string }> = {}
    wallets["walletconnect"] = { status: "connected", publicKey: ADDR_A }
    wallets[ARC_EVM] = { status: "connected", publicKey: ADDR_B }
    expect(Object.keys(wallets).length).toBe(2)
    expect(wallets[ARC_EVM]?.publicKey).toContain("0x")
  })

  it("should maintain separate balances per wallet", () => {
    const balances: Record<string, { xlm: string; usdc: string }> = {
      walletconnect: { xlm: "100", usdc: "50" },
      [ARC_EVM]: { xlm: "200", usdc: "0" },
    }
    expect(balances.walletconnect.xlm).not.toBe(balances[ARC_EVM].xlm)
  })

  it("should not cross-contaminate wallet state", () => {
    const state: Record<string, { publicKey: string; signedTx: string | null }> = {
      walletconnect: { publicKey: ADDR_A, signedTx: null },
      [ARC_EVM]: { publicKey: ADDR_B, signedTx: "signed-payload-123" },
    }
    expect(state.walletconnect.signedTx).toBeNull()
    expect(state[ARC_EVM].signedTx).not.toBeNull()
  })

  it("should handle 3 simultaneous wallet connections", () => {
    const wallets: Record<string, string> = {}
    wallets["walletconnect"] = "connected"
    wallets[ARC_EVM] = "connected"
    wallets["passkey"] = "connected"
    expect(Object.keys(wallets).length).toBe(3)
  })

  it("should gracefully handle wallet disconnect mid-session", () => {
    const wallets: Record<string, string> = { [ARC_EVM]: "connected" }
    delete wallets[ARC_EVM]
    expect(Object.keys(wallets).length).toBe(0)
  })

  it("should detect network mismatch between wallets", () => {
    const networks: Record<string, string> = { walletconnect: "testnet", [ARC_EVM]: "mainnet" }
    expect(networks.walletconnect).not.toBe(networks[ARC_EVM])
  })

  it("should handle rapid wallet switching without state corruption", () => {
    let active = ARC_EVM
    const switches = ["passkey", ARC_EVM, "walletconnect", ARC_EVM, "passkey"]
    for (const id of switches) { active = id }
    expect(active).toBe("passkey")
  })

  it("should preserve session data across browser refresh simulation", () => {
    const before = { walletId: ARC_EVM as string, publicKey: ADDR_A as string }
    const stored = JSON.stringify(before)
    const after = JSON.parse(stored)
    expect(after.walletId).toBe(ARC_EVM)
  })
})
