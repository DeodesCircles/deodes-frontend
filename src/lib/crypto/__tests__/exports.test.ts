import { describe, it, expect } from "vitest"

describe("crypto/index.ts re-exports", () => {
  it("re-exports deriveEd25519Keypair", async () => {
    const mod = await import("@/lib/crypto/index")
    expect(mod.deriveEd25519Keypair).toBeDefined()
    expect(typeof mod.deriveEd25519Keypair).toBe("function")
  })

  it("re-exports publicKeyToLegacyAddress", async () => {
    const mod = await import("@/lib/crypto/index")
    expect(mod.publicKeyToLegacyAddress).toBeDefined()
    expect(typeof mod.publicKeyToLegacyAddress).toBe("function")
  })

  it("re-exports secureZeroMemory", async () => {
    const mod = await import("@/lib/crypto/index")
    expect(mod.secureZeroMemory).toBeDefined()
    expect(typeof mod.secureZeroMemory).toBe("function")
  })

  it("re-exports hexEncode", async () => {
    const mod = await import("@/lib/crypto/index")
    expect(mod.hexEncode).toBeDefined()
    expect(typeof mod.hexEncode).toBe("function")
    const result = mod.hexEncode(new Uint8Array([0xde, 0xad, 0xbe, 0xef]))
    expect(result).toBe("deadbeef")
  })
})

describe("key-derivation.ts direct exports", () => {
  it("exports hexEncode from key-derivation.ts", async () => {
    const mod = await import("@/lib/crypto/key-derivation")
    expect(mod.hexEncode).toBeDefined()
    expect(typeof mod.hexEncode).toBe("function")
  })
})
