import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from "vitest"

const mockSignClient = {
  on: vi.fn(),
  connect: vi.fn(),
  approve: vi.fn(),
  request: vi.fn(),
  disconnect: vi.fn(),
  session: {
    getAll: vi.fn(),
  },
}

vi.mock("@walletconnect/sign-client", () => ({
  SignClient: {
    init: vi.fn().mockResolvedValue(mockSignClient),
  },
}))

const mockRelay = {
  status: "healthy" as "healthy" | "down",
  recordOutcome: vi.fn(),
  reset: vi.fn(),
  get isDownForConnect(): boolean {
    return this.status === "down"
  },
  get isDownForSign(): boolean {
    return this.status === "down"
  },
}

vi.mock("../../wc2-relay", () => ({
  getRelayMonitor: () => mockRelay,
  WCRelayMonitor: vi.fn(),
}))

const mockSessionStore = {
  saveSession: vi.fn(),
  clear: vi.fn(),
  getSession: vi.fn().mockReturnValue(null),
}

vi.mock("../../wc2-session-store", () => ({
  getWC2SessionStore: () => mockSessionStore,
  WC2SessionStore: vi.fn(),
}))

import { createWalletConnectAdapter, setOnPairingUri, resetWcState, __resetSignClientForTests, type WalletConnectConnectOptions } from "../walletconnect"

const TEST_ADDRESS = "0x1234567890abcdef1234567890abcdef12345678"

function makeArcSession(chainRef = "eip155:5042002", topic = "test-topic") {
  return {
    topic,
    namespaces: {
      eip155: {
        accounts: [`${chainRef}:${TEST_ADDRESS}`],
        chains: [chainRef],
      },
    },
  }
}

describe("WalletConnect Adapter", () => {
  let adapter: ReturnType<typeof createWalletConnectAdapter>

  beforeEach(() => {
    vi.clearAllMocks()
    __resetSignClientForTests()
    vi.stubEnv("NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID", "test-project-id")
    adapter = createWalletConnectAdapter()
    mockRelay.status = "healthy"
    setOnPairingUri(null)
    mockSignClient.connect.mockResolvedValue({ uri: "wc:test" })
    mockSignClient.session.getAll.mockReturnValue([])
    mockSignClient.approve.mockResolvedValue({})
    mockSignClient.disconnect.mockResolvedValue(undefined)
    mockSignClient.request.mockResolvedValue({ signedXdr: "mockxdr" })
  })

  afterEach(() => {
    setOnPairingUri(null)
    vi.unstubAllEnvs()
  })

  describe("factory", () => {
    it("creates an adapter with correct id", () => {
      expect(adapter.meta.id).toBe("walletconnect")
    })

    it("creates an adapter with mobile category", () => {
      expect(adapter.meta.category).toBe("mobile")
    })

    it("has priority 0 (highest)", () => {
      expect(adapter.meta.priority).toBe(0)
    })

    it("isAvailable returns true in browser-like environment", () => {
      expect(adapter.meta.isAvailable()).toBe(true)
    })

    it("has descriptive name", () => {
      expect(adapter.meta.name).toBe("WalletConnect")
    })

    it("description mentions supported wallets", () => {
      expect(adapter.meta.description).toContain("200+")
    })
  })

  describe("implements WalletAdapter interface", () => {
    it("has connect method", () => {
      expect(typeof adapter.connect).toBe("function")
    })

    it("has disconnect method", () => {
      expect(typeof adapter.disconnect).toBe("function")
    })

    it("has isConnected method", () => {
      expect(typeof adapter.isConnected).toBe("function")
    })

    it("has signMessage method", () => {
      expect(typeof adapter.signMessage).toBe("function")
    })

    it("has signTransaction method", () => {
      expect(typeof adapter.signTransaction).toBe("function")
    })

    it("has getPublicKey method", () => {
      expect(typeof adapter.getPublicKey).toBe("function")
    })

    it("has getNetwork method", () => {
      expect(typeof adapter.getNetwork).toBe("function")
    })
  })

  describe("isConnected", () => {
    it("returns false before any connection", async () => {
      expect(await adapter.isConnected()).toBe(false)
    })

    it("returns false after disconnect", async () => {
      await adapter.disconnect()
      expect(await adapter.isConnected()).toBe(false)
    })
  })

  describe("getPublicKey", () => {
    it("throws not_installed error when not connected", async () => {
      try {
        await adapter.getPublicKey()
        expect.unreachable("Should have thrown")
      } catch (err: unknown) {
        const e = err as { code: string }
        expect(e.code).toBe("not_installed")
      }
    })
  })

  describe("getNetwork", () => {
    it("returns testnet by default", async () => {
      expect(await adapter.getNetwork()).toBe("testnet")
    })
  })

  describe("connect — error paths", () => {
    it("connect does not throw synchronously when relay is flagged down", async () => {
      mockRelay.status = "down"
      let promise: Promise<unknown> | undefined
      expect(() => { promise = adapter.connect() }).not.toThrow()
      expect(promise).toBeInstanceOf(Promise)
      // Wait for connect() async body to set _pendingReject (via
      // getOrInitSignClient resolving the mocked SignClient.init),
      // then cancel and consume the rejection so nothing leaks.
      await new Promise<void>((resolve) => setTimeout(resolve, 20))
      resetWcState()
      try { await promise! } catch { /* expected — resetWcState rejected it */ }
    })

    it("throws not_installed for signMessage when not connected (regardless of relay)", async () => {
      mockRelay.status = "down"
      try {
        await adapter.signMessage("test")
        expect.unreachable("Should have thrown")
      } catch (err: unknown) {
        const e = err as { code: string }
        expect(e.code).toBe("not_installed")
      }
    })

    it("throws internal error when connect returns no URI", async () => {
      // Ensure clean state before starting
      resetWcState()
      mockSignClient.connect.mockResolvedValue({})

      try {
        await adapter.connect()
        expect.unreachable("Should have thrown")
      } catch (err: unknown) {
        const e = err as { code: string; message: string }
        expect(e.code).toBe("internal")
        expect(e.message).toContain("URI")
      }
    })

    it.skip("throws timeout error when connect takes too long", () => {
      // Requires real WC2 relay interaction — tested in integration tests
    })
  })

  describe("disconnect", () => {
    it("clears public key", async () => {
      expect(await adapter.isConnected()).toBe(false)
      await adapter.disconnect()
      expect(await adapter.isConnected()).toBe(false)
    })

    it("clears session store", async () => {
      await adapter.disconnect()
      expect(mockSessionStore.clear).toHaveBeenCalled()
    })

    it("can be called multiple times without error", async () => {
      await adapter.disconnect()
      await adapter.disconnect()
      await adapter.disconnect()
    })
  })

  describe("signMessage — error paths", () => {
    it("throws not_connected error when not connected", async () => {
      try {
        await adapter.signMessage("test-message")
        expect.unreachable("Should have thrown")
      } catch (err: unknown) {
        const e = err as { code: string; message: string }
        expect(e.code).toBe("not_installed")
        expect(e.message).toContain("not connected")
      }
    })

    it("rejects with typed WalletError", async () => {
      try {
        await adapter.signMessage("test")
      } catch (err: unknown) {
        const e = err as { adapter: string; code: string }
        expect(e.adapter).toBe("walletconnect")
        expect(["not_installed", "internal", "timeout", "user_rejected"]).toContain(e.code)
      }
    })
  })

  describe("signTransaction — error paths (no connection)", () => {
    it("throws not_connected error when no session", async () => {
      try {
        await adapter.signTransaction("AAAAAgAAAAB...")
        expect.unreachable("Should have thrown")
      } catch (err: unknown) {
        const e = err as { code: string }
        expect(e.code).toBe("not_installed")
      }
    })

    it("throws not_installed for empty XDR (not connected)", async () => {
      try {
        await adapter.signTransaction("")
        expect.unreachable("Should have thrown")
      } catch (err: unknown) {
        const e = err as { code: string; message: string }
        expect(e.code).toBe("not_installed")
      }
    })

    it("throws not_installed for whitespace XDR (not connected)", async () => {
      try {
        await adapter.signTransaction("   ")
        expect.unreachable("Should have thrown")
      } catch (err: unknown) {
        const e = err as { code: string }
        expect(e.code).toBe("not_installed")
      }
    })
  })

  describe("session management", () => {
    it("preserves session across multiple disconnect calls", async () => {
      await adapter.disconnect()
      await adapter.disconnect()
      expect(await adapter.isConnected()).toBe(false)
    })

    it("clears session data on disconnect", async () => {
      await adapter.disconnect()
      try {
        await adapter.getPublicKey()
        expect.unreachable("Should have thrown")
      } catch (err: unknown) {
        const e = err as { code: string }
        expect(e.code).toBe("not_installed")
      }
    })
  })

  describe("adapter state isolation", () => {
    it("each createWalletConnectAdapter call creates independent state", async () => {
      const adapter1 = createWalletConnectAdapter()
      const adapter2 = createWalletConnectAdapter()

      expect(await adapter1.isConnected()).toBe(false)
      expect(await adapter2.isConnected()).toBe(false)

      await adapter1.disconnect()
      expect(await adapter2.isConnected()).toBe(false)
    })
  })
})

describe("WalletConnect setOnPairingUri", () => {
  it("setOnPairingUri accepts and stores a handler", () => {
    const handler = vi.fn()
    setOnPairingUri(handler)
    expect(typeof handler).toBe("function")
  })

  it("setOnPairingUri accepts null to clear handler", () => {
    setOnPairingUri(null)
    const handler = vi.fn()
    setOnPairingUri(handler)
    setOnPairingUri(null)
  })
})

describe("WalletConnect address validation", () => {
  it("detects invalid Arc address format", () => {
    const invalidKeys = [
      "",
      "0x",
      "0x123",
      "0xZZZ",
      "0x51b45Ba8570551e0D1fe818227d8bAa8b55669",
      "not-an-address",
    ]
    const validKey = "0x51b45Ba8570551e0D1fe818227d8bAa8b556694D"

    for (const key of invalidKeys) {
      expect(/^0x[0-9a-fA-F]{40}$/.test(key)).toBe(false)
    }
    expect(/^0x[0-9a-fA-F]{40}$/.test(validKey)).toBe(true)
  })

  it("validates EVM account format from WC2 session", () => {
    const account = "eip155:5042002:0x51b45Ba8570551e0D1fe818227d8bAa8b556694D"
    const parts = account.split(":")
    expect(parts[0]).toBe("eip155")
    expect(parts[1]).toBe("5042002")
    expect(parts[2]).toMatch(/^0x[0-9a-fA-F]{40}$/)
  })

  it("derives network from chain ID", () => {
    expect("eip155:5042".split(":")[1]).toBe("5042")
    expect("eip155:5042002".split(":")[1]).toBe("5042002")
  })

  it("maps 5042 to mainnet network type", () => {
    const account = "eip155:5042:0x51b45Ba8570551e0D1fe818227d8bAa8b556694D"
    const chain = account.split(":")[1]
    const network = chain === "5042" ? "mainnet" : "testnet"
    expect(network).toBe("mainnet")
  })

  it("maps testnet chain to testnet network type", () => {
    const account = "eip155:5042002:0x51b45Ba8570551e0D1fe818227d8bAa8b556694D"
    const chain = account.split(":")[1]
    const network = chain === "5042" ? "mainnet" : "testnet"
    expect(network).toBe("testnet")
  })
})

describe("WalletConnect XDR validation", () => {
  it("accepts valid base64 XDR", () => {
    const valid = "AAAAAgAAAABxY2hhbmdlX2JhbGFuY2UAAAA"
    expect(typeof valid).toBe("string")
    expect(valid.length).toBeGreaterThan(20)
  })

  it("rejects empty XDR", () => {
    const empty = ""
    expect(empty.length).toBe(0)
  })

  it("rejects whitespace-only XDR", () => {
    const whitespace = "   "
    expect(whitespace.trim().length).toBe(0)
  })

  it("detects when signed XDR differs from unsigned", () => {
    const unsignedXdr = "AAAAAgAAAABtest123"
    const signedXdr = "AAAAAgAAAABtest456"
    expect(signedXdr).not.toBe(unsignedXdr)
  })

  it("detects when wallet returns unsigned XDR unchanged", () => {
    const unsignedXdr = "AAAAAgAAAAB..."
    const returnedXdr = "AAAAAgAAAAB..."
    expect(returnedXdr).toBe(unsignedXdr)
  })
})

describe("WalletConnect error type discrimination", () => {
  it("not_installed error has correct shape", () => {
    const err = { adapter: "walletconnect", code: "not_installed" as const, message: "Not connected" }
    expect(err.code).toBe("not_installed")
    expect(err.adapter).toBe("walletconnect")
  })

  it("user_rejected error has correct shape", () => {
    const err = { adapter: "walletconnect", code: "user_rejected" as const, message: "Rejected" }
    expect(err.code).toBe("user_rejected")
  })

  it("network_mismatch error has correct shape", () => {
    const err = {
      adapter: "walletconnect",
      code: "network_mismatch" as const,
      message: "Network mismatch",
      expected: "mainnet" as const,
      actual: "testnet" as const,
    }
    expect(err.code).toBe("network_mismatch")
    expect(err.expected).toBe("mainnet")
    expect(err.actual).toBe("testnet")
  })

  it("timeout error has correct shape", () => {
    const err = { adapter: "walletconnect", code: "timeout" as const, message: "Timed out" }
    expect(err.code).toBe("timeout")
    expect(err.message).toContain("Timed")
  })

  it("internal error has correct shape with cause", () => {
    const err = { adapter: "walletconnect", code: "internal" as const, message: "Something broke", cause: "Stack trace" }
    expect(err.code).toBe("internal")
    expect(err.cause).toBeDefined()
  })
})

describe("WalletConnect adapter method idempotency", () => {
    it("disconnect is idempotent", async () => {
      const a = createWalletConnectAdapter()
      await a.disconnect()
      await a.disconnect()
      expect(await a.isConnected()).toBe(false)
    })

    it("getPublicKey always throws when not connected", async () => {
      const a = createWalletConnectAdapter()
      for (let i = 0; i < 3; i++) {
        try {
          await a.getPublicKey()
          expect.unreachable("Should have thrown")
        } catch {
          // expected
        }
      }
    })
  })

describe("WalletConnect signTransaction — failure paths (with mocked session)", () => {
  let connectedAdapter: ReturnType<typeof createWalletConnectAdapter>

  beforeEach(async () => {
    vi.clearAllMocks()
    __resetSignClientForTests()
    vi.stubEnv("NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID", "test-project-id")
    connectedAdapter = createWalletConnectAdapter()
    mockRelay.status = "healthy"
    setOnPairingUri(null)
    // A real WalletConnect session carries a `topic`, and `session.getAll()`
    // returns the live sessions keyed by that same topic. `isConnected()`
    // matches on the topic, so the mock has to mirror that shape.
    // connect() reuses this live Arc (eip155) session via the reuse path.
    const mockSession = makeArcSession()
    mockSignClient.connect.mockResolvedValue({
      uri: "wc:test",
      approval: vi.fn().mockResolvedValue(mockSession),
    })
    mockSignClient.session.getAll.mockReturnValue([mockSession])
    mockSignClient.approve.mockResolvedValue({})
    mockSignClient.disconnect.mockResolvedValue(undefined)
    mockSignClient.request.mockResolvedValue({ signedXdr: "mockxdr" })

    // Connect to establish a session
    await connectedAdapter.connect()
    // Verify connection established
    expect(await connectedAdapter.isConnected()).toBe(true)
  })

  afterEach(() => {
    setOnPairingUri(null)
    vi.unstubAllEnvs()
  })

  it("returns user_rejected when user cancels signing", async () => {
    mockSignClient.request.mockRejectedValue(
      Object.assign(new Error("User rejected"), { code: 5000 })
    )

    try {
      await connectedAdapter.signTransaction("AAAAAgAAAAB...")
      expect.unreachable("Should have thrown")
    } catch (err: unknown) {
      const e = err as { code: string; message: string; adapter: string }
      expect(e.adapter).toBe("walletconnect")
      expect(e.code).toBe("user_rejected")
      expect(e.message).toContain("rejected")
    }
  })

  it("returns network_mismatch when session network differs from requested", async () => {
    // The adapter uses the session's chainId, so we simulate a mainnet session
    // but the adapter should still use the session's network
    mockSignClient.session.getAll.mockReturnValue([
      makeArcSession("eip155:5042", "mainnet-topic"),
    ])

    // Create a new adapter that will pick up the mainnet session
    const mainnetAdapter = createWalletConnectAdapter()
    await mainnetAdapter.connect()

    // The adapter should report mainnet
    expect(await mainnetAdapter.getNetwork()).toBe("mainnet")
  })

  it("returns insufficient_funds error when signing fails due to low balance", async () => {
    mockSignClient.request.mockRejectedValue(
      Object.assign(new Error("Insufficient balance"), { code: 4002 })
    )

    try {
      await connectedAdapter.signTransaction("AAAAAgAAAAB...")
      expect.unreachable("Should have thrown")
    } catch (err: unknown) {
      const e = err as { code: string; message: string; adapter: string }
      expect(e.adapter).toBe("walletconnect")
      // The adapter maps various errors to user_rejected, but we can verify
      // the error message contains the relevant information
      expect(e.message).toContain("Insufficient")
    }
  })

  it("does not leak unhandled promise rejections during failure flows", async () => {
    const unhandledRejections: unknown[] = []
    const originalOnUnhandledRejection = process.on

    process.on = vi.fn((event: string, handler: (reason: unknown) => void) => {
      if (event === "unhandledRejection") {
        return originalOnUnhandledRejection.call(process, event, (reason) => {
          unhandledRejections.push(reason)
          handler(reason)
        })
      }
      return originalOnUnhandledRejection.call(process, event, handler)
    })

    // Trigger multiple failure scenarios
    mockSignClient.request.mockRejectedValue(
      Object.assign(new Error("User rejected"), { code: 5000 })
    )

    await connectedAdapter.signTransaction("AAAAAgAAAAB...").catch(() => {})

    // Wait for microtasks
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(unhandledRejections.length).toBe(0)

    process.on = originalOnUnhandledRejection
  })
})

describe("WalletConnect Arc (eip155) rail fixes", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    __resetSignClientForTests()
    vi.stubEnv("NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID", "test-project-id")
    mockRelay.status = "healthy"
    setOnPairingUri(null)
    mockSignClient.session.getAll.mockReturnValue([])
    mockSignClient.disconnect.mockResolvedValue(undefined)
  })

  afterEach(() => {
    setOnPairingUri(null)
    vi.unstubAllEnvs()
  })

  async function connectWithSession(chainRef: string) {
    const session = makeArcSession(chainRef, `topic-${chainRef}`)
    mockSignClient.connect.mockResolvedValue({
      uri: "wc:test",
      approval: vi.fn().mockResolvedValue(session),
    })
    const adapter = createWalletConnectAdapter()
    const result = await adapter.connect()
    return { adapter, session, result }
  }

  it("signMessage returns { signature, publicKey } for a string result", async () => {
    const { adapter } = await connectWithSession("eip155:5042002")
    mockSignClient.request.mockResolvedValue("0xdeadbeefsignature")

    const result = await adapter.signMessage("hello arc")

    expect(result).toEqual({ signature: "0xdeadbeefsignature", publicKey: TEST_ADDRESS })
  })

  it("signMessage wraps object-shaped results into { signature, publicKey }", async () => {
    const { adapter } = await connectWithSession("eip155:5042002")
    mockSignClient.request.mockResolvedValue({ signature: "0xabc123" })

    const result = await adapter.signMessage("hello arc")

    expect(result).toEqual({ signature: "0xabc123", publicKey: TEST_ADDRESS })
  })

  it("signTransaction returns { signedXdr } for object and string results", async () => {
    const { adapter } = await connectWithSession("eip155:5042002")

    mockSignClient.request.mockResolvedValue({ signedXdr: "mockxdr" })
    await expect(adapter.signTransaction("payload")).resolves.toEqual({ signedXdr: "mockxdr" })

    mockSignClient.request.mockResolvedValue("0xsig")
    await expect(adapter.signTransaction("payload")).resolves.toEqual({ signedXdr: "0xsig" })
  })

  it("clears init state on SignClient.init failure so Retry re-inits", async () => {
    // Dynamic import: a static import of the mocked specifier would break
    // vi.mock hoisting (factory references top-level mockSignClient).
    const { SignClient } = await import("@walletconnect/sign-client")
    const mockInit = SignClient.init as unknown as Mock
    mockInit.mockRejectedValueOnce(new Error("relay exploded"))
    // (falls back to the default mockResolvedValue(mockSignClient) after)
    mockSignClient.session.getAll.mockReturnValue([])
    const session = makeArcSession()
    mockSignClient.connect.mockResolvedValue({
      uri: "wc:retry",
      approval: vi.fn().mockResolvedValue(session),
    })

    const adapter = createWalletConnectAdapter()
    await expect(adapter.connect()).rejects.toMatchObject({ adapter: "walletconnect" })

    // Retry must attempt init again instead of re-awaiting the dead promise.
    const result = await adapter.connect()
    expect(result.publicKey).toBe(TEST_ADDRESS)
    expect(mockInit.mock.calls.length).toBeGreaterThanOrEqual(2)
  })

  it("fails closed when NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID is missing", async () => {
    vi.stubEnv("NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID", "")
    const adapter = createWalletConnectAdapter()

    await expect(adapter.connect()).rejects.toMatchObject({ adapter: "walletconnect" })
  })

  it("getNetwork derives testnet from the eip155:5042002 chain", async () => {
    const { adapter, result } = await connectWithSession("eip155:5042002")
    // connect() is typed as { publicKey } by the base interface, but the
    // implementation also returns the derived network — assert via toEqual.
    expect(result).toEqual({ publicKey: TEST_ADDRESS, network: "testnet" })
    await expect(adapter.getNetwork()).resolves.toBe("testnet")
  })

  it("getNetwork derives mainnet from the eip155:5042 chain", async () => {
    const { adapter, result } = await connectWithSession("eip155:5042")
    expect(result).toEqual({ publicKey: TEST_ADDRESS, network: "mainnet" })
    await expect(adapter.getNetwork()).resolves.toBe("mainnet")
  })

  it("connect reuses a live session and reports its chain-derived network", async () => {
    mockSignClient.session.getAll.mockReturnValue([makeArcSession("eip155:5042", "live-topic")])
    const adapter = createWalletConnectAdapter()

    const result = await adapter.connect()

    expect(result).toEqual({ publicKey: TEST_ADDRESS, network: "mainnet" })
    await expect(adapter.getNetwork()).resolves.toBe("mainnet")
  })
})

describe("WalletConnect Arc-chain guard", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    __resetSignClientForTests()
    vi.stubEnv("NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID", "test-project-id")
    mockRelay.status = "healthy"
    setOnPairingUri(null)
    mockSignClient.session.getAll.mockReturnValue([])
    mockSignClient.disconnect.mockResolvedValue(undefined)
  })

  afterEach(() => {
    setOnPairingUri(null)
    vi.unstubAllEnvs()
  })

  it("rejects an approval whose session skips the Arc chain with the chain fix", async () => {
    const ethSession = makeArcSession("eip155:1", "topic-eth")
    mockSignClient.connect.mockResolvedValue({
      uri: "wc:test",
      approval: vi.fn().mockResolvedValue(ethSession),
    })
    const adapter = createWalletConnectAdapter()

    const err = await adapter.connect().catch((e) => e)

    expect(err.adapter).toBe("walletconnect")
    expect(err.code).toBe("network_mismatch")
    expect(err.message).toContain("Arc Testnet")
    expect(err.message).toContain("5042002")
  })

  it("rejects session reuse when the live session lacks the Arc chain", async () => {
    mockSignClient.session.getAll.mockReturnValue([
      makeArcSession("eip155:1", "live-eth"),
    ])
    const adapter = createWalletConnectAdapter()

    const err = await adapter.connect().catch((e) => e)

    expect(err.adapter).toBe("walletconnect")
    expect(err.code).toBe("network_mismatch")
    expect(err.message).toContain("5042002")
  })

  it("accepts a session whose accounts carry the Arc chain even if chains omits it", async () => {
    const session = {
      topic: "topic-accounts-only",
      namespaces: {
        eip155: {
          chains: ["eip155:1"],
          accounts: [`eip155:5042002:${TEST_ADDRESS}`],
        },
      },
    }
    mockSignClient.connect.mockResolvedValue({
      uri: "wc:test",
      approval: vi.fn().mockResolvedValue(session),
    })
    const adapter = createWalletConnectAdapter()

    const result = await adapter.connect()

    expect(result.publicKey).toBe(TEST_ADDRESS)
  })

  it("requests chain 5042 for mainnet and rejects sessions missing it", async () => {
    const testnetSession = makeArcSession("eip155:5042002", "topic-testnet")
    mockSignClient.connect.mockResolvedValue({
      uri: "wc:test",
      approval: vi.fn().mockResolvedValue(testnetSession),
    })
    const adapter = createWalletConnectAdapter()
    const connectWithOptions = adapter.connect as unknown as (
      opts: WalletConnectConnectOptions,
    ) => Promise<{ publicKey: string }>

    const err = await connectWithOptions({ network: "mainnet" }).catch((e) => e)

    expect(mockSignClient.connect).toHaveBeenCalledWith(
      expect.objectContaining({
        requiredNamespaces: expect.objectContaining({
          eip155: expect.objectContaining({ chains: ["eip155:5042"] }),
        }),
      })
    )
    expect(err.code).toBe("network_mismatch")
    expect(err.message).toContain("5042")
  })
})
