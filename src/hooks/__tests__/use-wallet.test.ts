import { beforeEach, describe, expect, it } from "vitest";
import { renderHook } from "@testing-library/react";
import { useWallet } from "@/hooks/use-wallet";
import { useMultiWalletStore } from "@/stores/multi-wallet-store";

describe("useWallet", () => {
  beforeEach(() => {
    useMultiWalletStore.setState({
      activeWalletId: null,
      wallets: {},
    });
  });

  it("returns disconnected state by default", () => {
    const { result } = renderHook(() => useWallet());

    expect(result.current.isConnected).toBe(false);
    expect(result.current.address).toBeNull();
    expect(result.current.balance).toBeNull();
    expect(result.current.isConnecting).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("reflects connected wallet state", () => {
    useMultiWalletStore.setState({
      activeWalletId: "freighter",
      wallets: {
        freighter: {
          adapter: {} as never,
          publicKey: "GABC123",
          network: "testnet",
          balance: { xlm: "100.5", usdc: "25.0" },
          lastConnected: Date.now(),
          error: null,
          status: "connected",
        },
      },
    });

    const { result } = renderHook(() => useWallet());

    expect(result.current.isConnected).toBe(true);
    expect(result.current.address).toBe("GABC123");
    expect(result.current.balance).toEqual({ xlm: "100.5", usdc: "25.0" });
  });

  it("exposes connect and disconnect actions", () => {
    const { result } = renderHook(() => useWallet());

    expect(typeof result.current.connect).toBe("function");
    expect(typeof result.current.disconnect).toBe("function");
    expect(typeof result.current.refreshBalance).toBe("function");
  });

  it("reflects connecting state", () => {
    useMultiWalletStore.setState({
      activeWalletId: "freighter",
      wallets: {
        freighter: {
          adapter: {} as never,
          publicKey: "",
          network: "testnet",
          balance: null,
          lastConnected: Date.now(),
          error: null,
          status: "connecting",
        },
      },
    });

    const { result } = renderHook(() => useWallet());

    expect(result.current.isConnecting).toBe(true);
    expect(result.current.isConnected).toBe(false);
  });

  it("reflects error state", () => {
    useMultiWalletStore.setState({
      activeWalletId: "freighter",
      wallets: {
        freighter: {
          adapter: {} as never,
          publicKey: "",
          network: "testnet",
          balance: null,
          lastConnected: Date.now(),
          error: { adapter: "freighter", code: "timeout", message: "Connection timed out" },
          status: "error",
        },
      },
    });

    const { result } = renderHook(() => useWallet());

    expect(result.current.error).toBe("Connection timed out");
  });

  it("returns null balance when active wallet has no balance", () => {
    useMultiWalletStore.setState({
      activeWalletId: "freighter",
      wallets: {
        freighter: {
          adapter: {} as never,
          publicKey: "GABC123",
          network: "testnet",
          balance: null,
          lastConnected: Date.now(),
          error: null,
          status: "connected",
        },
      },
    });

    const { result } = renderHook(() => useWallet());

    expect(result.current.balance).toBeNull();
  });

  it("returns null balance when no active wallet", () => {
    useMultiWalletStore.setState({
      activeWalletId: null,
      wallets: {},
    });

    const { result } = renderHook(() => useWallet());
    expect(result.current.balance).toBeNull();
  });
});
