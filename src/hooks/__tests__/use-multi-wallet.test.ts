import { beforeEach, describe, expect, it, vi } from "vitest";
import { useMultiWalletStore } from "@/stores/multi-wallet-store";
import { useWalletConnectStore } from "@/stores/walletconnect-store";
import { usePasskeyWalletStore } from "@/stores/passkey-wallet-store";
import { useLedgerStore } from "@/stores/ledger-store";
import type { WalletAdapter } from "@/lib/wallet/types";

const mockGetAdapter = vi.fn();

vi.mock("@/lib/wallet/registry", () => ({
  getWalletRegistry: () => ({
    getAdapter: mockGetAdapter,
    detect: vi.fn().mockReturnValue([]),
  }),
}));

vi.mock("@/lib/wallet/session-manager", () => ({
  getSessionManager: () => ({
    connect: vi.fn(),
    disconnect: vi.fn(),
    switchTo: vi.fn(),
    getAll: vi.fn().mockReturnValue([]),
    getActive: vi.fn().mockReturnValue(null),
  }),
}));

vi.mock("@/lib/wallet/balance-cache", () => ({
  fetchBalanceWithBackoff: vi.fn(),
}));

vi.mock("@/lib/constants", () => ({
  WC2_QR_EXPIRATION_MS: 300000,
  STELLAR_NETWORK: "testnet",
}));

function createMockAdapter(): WalletAdapter {
  return {
    meta: {
      id: "freighter",
      name: "Freighter",
      category: "extension",
      icon: "",
      installUrl: "",
      description: "",
      priority: 1,
      isAvailable: () => true,
    },
    connect: vi.fn().mockResolvedValue({ publicKey: "GTEST123" }),
    disconnect: vi.fn(),
    isConnected: vi.fn().mockResolvedValue(false),
    signMessage: vi.fn(),
    signTransaction: vi.fn(),
    getPublicKey: vi.fn(),
    getNetwork: vi.fn().mockResolvedValue("testnet"),
  };
}

describe("useMultiWallet store via hooks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useMultiWalletStore.setState({
      activeWalletId: null,
      wallets: {},
      detectedWallets: [],
      isSelectorOpen: false,
    });
  });

  describe("connection state", () => {
    it("starts with no active wallet", () => {
      const state = useMultiWalletStore.getState();
      expect(state.activeWalletId).toBeNull();
      expect(state.wallets).toEqual({});
    });

    it("reflects connected state via wallet entry", () => {
      const adapter = createMockAdapter();
      useMultiWalletStore.setState({
        activeWalletId: "freighter",
        wallets: {
          freighter: {
            adapter,
            publicKey: "GTEST123",
            network: "testnet",
            balance: null,
            lastConnected: Date.now(),
            error: null,
            status: "connected",
          },
        },
      });

      const state = useMultiWalletStore.getState();
      expect(state.activeWalletId).toBe("freighter");
      expect(state.wallets.freighter.publicKey).toBe("GTEST123");
      expect(state.wallets.freighter.adapter).toBe(adapter);
    });
  });

  describe("active wallet", () => {
    it("returns null activeWalletId by default", () => {
      expect(useMultiWalletStore.getState().activeWalletId).toBeNull();
    });

    it("returns active wallet entry", () => {
      const adapter = createMockAdapter();
      useMultiWalletStore.setState({
        activeWalletId: "freighter",
        wallets: {
          freighter: {
            adapter,
            publicKey: "GTEST123",
            network: "testnet",
            balance: null,
            lastConnected: Date.now(),
            error: null,
            status: "connected",
          },
        },
      });

      const state = useMultiWalletStore.getState();
      expect(state.activeWalletId).toBe("freighter");
      expect(state.wallets.freighter).toMatchObject({
        publicKey: "GTEST123",
        status: "connected",
      });
    });
  });

  describe("wallet list", () => {
    it("returns empty detected wallets by default", () => {
      const state = useMultiWalletStore.getState();
      expect(state.detectedWallets).toEqual([]);
      expect(state.isSelectorOpen).toBe(false);
    });

    it("reflects selector open state", () => {
      useMultiWalletStore.setState({ isSelectorOpen: true });
      expect(useMultiWalletStore.getState().isSelectorOpen).toBe(true);
    });
  });

  describe("actions", () => {
    it("setSelectorOpen toggles selector state", () => {
      useMultiWalletStore.getState().setSelectorOpen(true);
      expect(useMultiWalletStore.getState().isSelectorOpen).toBe(true);

      useMultiWalletStore.getState().setSelectorOpen(false);
      expect(useMultiWalletStore.getState().isSelectorOpen).toBe(false);
    });

    it("disconnect removes wallet entry", () => {
      useMultiWalletStore.setState({
        activeWalletId: "freighter",
        wallets: {
          freighter: {
            adapter: createMockAdapter(),
            publicKey: "GABC",
            network: "testnet",
            balance: null,
            lastConnected: Date.now(),
            error: null,
            status: "connected",
          },
        },
      });

      useMultiWalletStore.getState().disconnect("freighter");

      const state = useMultiWalletStore.getState();
      expect(state.wallets.freighter).toBeUndefined();
      expect(state.activeWalletId).toBeNull();
    });

    it("switchWallet changes active wallet", () => {
      useMultiWalletStore.setState({
        activeWalletId: "freighter",
        wallets: {
          freighter: {
            adapter: createMockAdapter(),
            publicKey: "GABC",
            network: "testnet",
            balance: null,
            lastConnected: Date.now(),
            error: null,
            status: "connected",
          },
          lobstr: {
            adapter: createMockAdapter(),
            publicKey: "GDEF",
            network: "testnet",
            balance: null,
            lastConnected: Date.now(),
            error: null,
            status: "connected",
          },
        },
      });

      useMultiWalletStore.getState().switchWallet("lobstr");
      expect(useMultiWalletStore.getState().activeWalletId).toBe("lobstr");
    });

    it("clearError removes error from wallet", () => {
      useMultiWalletStore.setState({
        activeWalletId: "freighter",
        wallets: {
          freighter: {
            adapter: createMockAdapter(),
            publicKey: "",
            network: "testnet",
            balance: null,
            lastConnected: Date.now(),
            error: { adapter: "freighter", code: "timeout", message: "Timed out" },
            status: "error",
          },
        },
      });

      useMultiWalletStore.getState().clearError("freighter");

      const entry = useMultiWalletStore.getState().wallets.freighter;
      expect(entry.error).toBeNull();
      expect(entry.status).toBe("disconnected");
    });

    it("updateWalletStatus changes wallet status", () => {
      useMultiWalletStore.setState({
        wallets: {
          freighter: {
            adapter: createMockAdapter(),
            publicKey: "GABC",
            network: "testnet",
            balance: null,
            lastConnected: Date.now(),
            error: null,
            status: "connecting",
          },
        },
      });

      useMultiWalletStore.getState().updateWalletStatus("freighter", "connected");
      expect(useMultiWalletStore.getState().wallets.freighter.status).toBe("connected");
    });
  });

  describe("connect error handling", () => {
    it("sets error state when connect fails", async () => {
      const adapter = createMockAdapter();
      (adapter.connect as ReturnType<typeof vi.fn>).mockRejectedValue({
        adapter: "freighter",
        code: "rejected",
        message: "User rejected connection",
      });
      mockGetAdapter.mockReturnValue(adapter);

      try {
        await useMultiWalletStore.getState().connect("freighter");
      } catch {
        // expected
      }

      const state = useMultiWalletStore.getState();
      expect(state.wallets.freighter.status).toBe("error");
      expect(state.wallets.freighter.error?.message).toBe("User rejected connection");
    });
  });

  describe("WC2 state", () => {
    it("starts with idle pairing state", () => {
      const state = useWalletConnectStore.getState();
      expect(state.pairingState).toBe("idle");
      expect(state.pairingUri).toBeNull();
      expect(state.relayStatus).toBe("healthy");
    });

    it("setWc2PairingUri updates URI and state", () => {
      useWalletConnectStore.getState().setPairingUri("wc:test");
      expect(useWalletConnectStore.getState().pairingUri).toBe("wc:test");
      expect(useWalletConnectStore.getState().pairingState).toBe("pairing");
    });

    it("resetWc2Pairing clears all WC2 state", () => {
      useWalletConnectStore.getState().setPairingUri("wc:test");
      useWalletConnectStore.getState().reset();

      const state = useWalletConnectStore.getState();
      expect(state.pairingUri).toBeNull();
      expect(state.pairingState).toBe("idle");
      expect(state.pairingError).toBeNull();
    });
  });

  describe("passkey state", () => {
    it("starts with idle passkey state", () => {
      const state = usePasskeyWalletStore.getState();
      expect(state.state).toBe("idle");
      expect(state.error).toBeNull();
      expect(state.publicKey).toBeNull();
    });

    it("resetPasskeyState clears all passkey state", () => {
      usePasskeyWalletStore.setState({ state: "connected", publicKey: "GPK123" });
      usePasskeyWalletStore.getState().reset();

      const state = usePasskeyWalletStore.getState();
      expect(state.state).toBe("idle");
      expect(state.error).toBeNull();
      expect(state.publicKey).toBeNull();
    });
  });

  describe("ledger state", () => {
    it("starts with idle ledger state", () => {
      const state = useLedgerStore.getState();
      expect(state.connectionState).toBe("idle");
      expect(state.firmwareVersion).toBeNull();
    });

    it("resetLedgerState clears all ledger state", () => {
      useLedgerStore.setState({ connectionState: "connected", firmwareVersion: "2.1.0", stellarAppVersion: "5.0.0" });
      useLedgerStore.getState().reset();

      const state = useLedgerStore.getState();
      expect(state.connectionState).toBe("idle");
      expect(state.firmwareVersion).toBeNull();
      expect(state.stellarAppVersion).toBeNull();
      expect(state.firmwareWarnings).toEqual([]);
    });
  });

  describe("route-specific error isolation", () => {
    it("setLoginError and clearLoginError", () => {
      useMultiWalletStore.getState().setLoginError("Invalid credentials");
      expect(useMultiWalletStore.getState().loginError).toBe("Invalid credentials");

      useMultiWalletStore.getState().clearLoginError();
      expect(useMultiWalletStore.getState().loginError).toBeNull();
    });

    it("setRegisterError and clearRegisterError", () => {
      useMultiWalletStore.getState().setRegisterError("Email taken");
      expect(useMultiWalletStore.getState().registerError).toBe("Email taken");

      useMultiWalletStore.getState().clearRegisterError();
      expect(useMultiWalletStore.getState().registerError).toBeNull();
    });
  });
});
