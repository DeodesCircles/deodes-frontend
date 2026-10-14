import { beforeEach, describe, expect, it, vi } from "vitest";
import type { WalletAdapter, WalletId, WalletSession } from "@/lib/wallet/types";

const { detect, getAdapter, sessionConnect, getAll, getActive, fetchBalanceWithBackoff } = vi.hoisted(() => ({
  detect: vi.fn(() => []),
  getAdapter: vi.fn(),
  sessionConnect: vi.fn(),
  getAll: vi.fn<() => WalletSession[]>(() => []),
  getActive: vi.fn<() => WalletSession | null>(() => null),
  fetchBalanceWithBackoff: vi.fn(),
}));

vi.mock("@/lib/wallet/registry", () => ({
  getWalletRegistry: () => ({
    detect,
    getAdapter,
  }),
}));

vi.mock("@/lib/wallet/session-manager", () => ({
  getSessionManager: () => ({
    connect: sessionConnect,
    disconnect: vi.fn(),
    switchTo: vi.fn(),
    getAll,
    getActive,
  }),
}));

vi.mock("@/lib/wallet/adapters", () => ({
  initializeWalletAdapters: vi.fn(),
}));

vi.mock("@/lib/wallet/balance-cache", () => ({
  fetchBalanceWithBackoff,
}));

import { useMultiWalletStore } from "@/stores/multi-wallet-store";

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

function createAdapter(
  connect: WalletAdapter["connect"]
): WalletAdapter {
  return {
    meta: {
      id: "arc-evm",
      name: "Browser Wallet",
      category: "extension",
      icon: "",
      installUrl: "",
      description: "",
      priority: 1,
      isAvailable: () => true,
    },
    connect,
    disconnect: vi.fn(),
    isConnected: vi.fn(),
    signMessage: vi.fn(),
    signTransaction: vi.fn(),
    getPublicKey: vi.fn(),
    getNetwork: vi.fn().mockResolvedValue("testnet"),
  };
}

describe("multi-wallet-store connect concurrency", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    detect.mockReturnValue([]);
    getAll.mockReturnValue([]);
    getActive.mockReturnValue(null);
    useMultiWalletStore.setState({
      activeWalletId: null,
      wallets: {},
      connectingWalletId: null,
    });
  });

  it("ignores a double-click while the same wallet is connecting", async () => {
    const pendingConnection = deferred<{ publicKey: string }>();
    const adapter = createAdapter(
      vi.fn().mockReturnValue(pendingConnection.promise)
    );
    getAdapter.mockReturnValue(adapter);

    const first = useMultiWalletStore.getState().connect("arc-evm");
    const second = useMultiWalletStore.getState().connect("arc-evm");

    expect(adapter.connect).toHaveBeenCalledTimes(1);
    await expect(second).resolves.toBeUndefined();

    pendingConnection.resolve({ publicKey: "0x51b45Ba8570551e0D1fe818227d8bAa8b556694D" });
    await first;
  });

  it("still connects a wallet with a single call", async () => {
    const adapter = createAdapter(
      vi.fn().mockResolvedValue({ publicKey: "0x70A7CCB7b5fe856384Aab3aAF553E09A10AF14A4" })
    );
    getAdapter.mockReturnValue(adapter);

    await useMultiWalletStore.getState().connect("arc-evm");

    expect(adapter.connect).toHaveBeenCalledTimes(1);
    expect(sessionConnect).toHaveBeenCalledWith(adapter, "0x70A7CCB7b5fe856384Aab3aAF553E09A10AF14A4");
    expect(useMultiWalletStore.getState().wallets["arc-evm"]).toMatchObject({
      publicKey: "0x70A7CCB7b5fe856384Aab3aAF553E09A10AF14A4",
      network: "testnet",
      status: "connected",
      error: null,
    });
  });

  it("keeps state consistent after rapid duplicate calls", async () => {
    const pendingConnection = deferred<{ publicKey: string }>();
    const adapter = createAdapter(
      vi.fn().mockReturnValue(pendingConnection.promise)
    );
    getAdapter.mockReturnValue(adapter);

    const attempts = [
      useMultiWalletStore.getState().connect("arc-evm"),
      useMultiWalletStore.getState().connect("arc-evm"),
      useMultiWalletStore.getState().connect("arc-evm"),
    ];

    expect(useMultiWalletStore.getState()).toMatchObject({
      activeWalletId: "arc-evm",
      connectingWalletId: "arc-evm",
    });

    pendingConnection.resolve({ publicKey: "0x0000000000000000000000000000000000000001" });
    await Promise.all(attempts);

    expect(adapter.connect).toHaveBeenCalledTimes(1);
    expect(sessionConnect).toHaveBeenCalledTimes(1);
    expect(useMultiWalletStore.getState()).toMatchObject({
      activeWalletId: "arc-evm",
      connectingWalletId: null,
    });
    expect(Object.keys(useMultiWalletStore.getState().wallets)).toEqual([
      "arc-evm",
    ]);
  });

  it("checks saved wallet sessions with bounded parallel probes during init", async () => {
    const slowProbe = deferred<boolean>();
    const fastAdapter = createAdapter(vi.fn());
    const slowAdapter = createAdapter(vi.fn());
    fastAdapter.isConnected = vi.fn().mockResolvedValue(true);
    slowAdapter.isConnected = vi.fn().mockReturnValue(slowProbe.promise);
    getAll.mockReturnValue([
      {
        walletId: "arc-evm",
        publicKey: "0x51b45Ba8570551e0D1fe818227d8bAa8b556694D",
        network: "testnet",
        lastConnected: 2,
      },
      {
        walletId: "walletconnect",
        publicKey: "0x70A7CCB7b5fe856384Aab3aAF553E09A10AF14A4",
        network: "testnet",
        lastConnected: 1,
      },
    ]);
    getActive.mockReturnValue({
      walletId: "arc-evm",
      publicKey: "0x51b45Ba8570551e0D1fe818227d8bAa8b556694D",
      network: "testnet",
      lastConnected: 2,
    });
    getAdapter.mockImplementation((walletId: string) =>
      walletId === "arc-evm" ? fastAdapter : slowAdapter
    );

    const initPromise = useMultiWalletStore.getState().init();
    await vi.waitFor(() => {
      expect(fastAdapter.isConnected).toHaveBeenCalled();
      expect(slowAdapter.isConnected).toHaveBeenCalled();
    });

    slowProbe.resolve(false);
    await initPromise;

    expect(useMultiWalletStore.getState().wallets["arc-evm"].status).toBe("connected");
    expect(useMultiWalletStore.getState().wallets["walletconnect"].status).toBe("disconnected");
    expect(useMultiWalletStore.getState()).toMatchObject({
      activeWalletId: "arc-evm",
    });
  });

  it("refreshes balance for an active wallet", async () => {
    const adapter = createAdapter(vi.fn());
    fetchBalanceWithBackoff.mockResolvedValue({ xlm: "42", usdc: "7" });
    useMultiWalletStore.setState({
      activeWalletId: "arc-evm",
      wallets: {
        "arc-evm": {
          adapter,
          publicKey: "0x51b45Ba8570551e0D1fe818227d8bAa8b556694D",
          network: "testnet",
          balance: null,
          lastConnected: Date.now(),
          error: null,
          status: "connected",
        },
      },
    });

    await useMultiWalletStore.getState().refreshBalance("arc-evm");

    expect(fetchBalanceWithBackoff).toHaveBeenCalledWith("0x51b45Ba8570551e0D1fe818227d8bAa8b556694D", {
      forceRefresh: false,
    });
    expect(useMultiWalletStore.getState().wallets["arc-evm"].balance).toEqual({
      xlm: "42",
      usdc: "7",
    });
  });
});

describe("multi-wallet-store deterministic disconnect", () => {
  function walletEntry(
    overrides: Partial<ReturnType<typeof useMultiWalletStore.getState>["wallets"][WalletId]> = {}
  ) {
    return {
      adapter: createAdapter(vi.fn()),
      publicKey: "GPUBLICKEY",
      network: "testnet" as const,
      balance: null,
      lastConnected: 0,
      error: null,
      status: "connected" as const,
      ...overrides,
    };
  }

  beforeEach(() => {
    vi.clearAllMocks();
    detect.mockReturnValue([]);
    getAll.mockReturnValue([]);
    getActive.mockReturnValue(null);
    useMultiWalletStore.setState({
      activeWalletId: null,
      wallets: {},
      connectingWalletId: null,
    });
  });

  it("selects the most recently connected remaining wallet after disconnecting the active one", () => {
    useMultiWalletStore.setState({
      activeWalletId: "arc-evm",
      wallets: {
        "arc-evm": walletEntry({ lastConnected: 3 }),
        walletconnect: walletEntry({ lastConnected: 1 }),
        passkey: walletEntry({ lastConnected: 2 }),
      },
    });

    useMultiWalletStore.getState().disconnect("arc-evm");

    expect(useMultiWalletStore.getState().wallets["arc-evm"]).toBeUndefined();
    expect(useMultiWalletStore.getState().activeWalletId).toBe("passkey");
  });

  it("breaks lastConnected ties deterministically by wallet id", () => {
    useMultiWalletStore.setState({
      activeWalletId: "arc-evm",
      wallets: {
        "arc-evm": walletEntry({ lastConnected: 3 }),
        walletconnect: walletEntry({ lastConnected: 3 }),
        passkey: walletEntry({ lastConnected: 3 }),
      },
    });

    useMultiWalletStore.getState().disconnect("arc-evm");

    // All remaining wallets tie; lexicographically smallest id wins.
    expect(useMultiWalletStore.getState().activeWalletId).toBe("passkey");
  });

  it("sets activeWalletId to null when the last wallet is disconnected", () => {
    useMultiWalletStore.setState({
      activeWalletId: "arc-evm",
      wallets: {
        "arc-evm": walletEntry({ lastConnected: 3 }),
      },
    });

    useMultiWalletStore.getState().disconnect("arc-evm");

    expect(useMultiWalletStore.getState().wallets).toEqual({});
    expect(useMultiWalletStore.getState().activeWalletId).toBeNull();
  });

  it("keeps the current active wallet when a non-active wallet is disconnected", () => {
    useMultiWalletStore.setState({
      activeWalletId: "arc-evm",
      wallets: {
        "arc-evm": walletEntry({ lastConnected: 3 }),
        walletconnect: walletEntry({ lastConnected: 5 }),
      },
    });

    useMultiWalletStore.getState().disconnect("walletconnect");

    expect(useMultiWalletStore.getState().wallets["walletconnect"]).toBeUndefined();
    expect(useMultiWalletStore.getState().activeWalletId).toBe("arc-evm");
  });
});
