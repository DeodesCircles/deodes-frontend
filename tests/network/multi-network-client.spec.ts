import { describe, expect, it } from "vitest";
import { MultiNetworkClient } from "@/lib/network/multi-network-client";
import type { NetworkConfig } from "@/lib/network/config";

const configs: Record<"testnet" | "mainnet", NetworkConfig> = {
  testnet: {
    chain: "arc",
    network: "testnet",
    chainId: 5042002,
    rpcUrl: "https://testnet.example",
    explorerUrl: "https://explorer.example",
    contractIds: { primary: "TESTNET_CONTRACT" },
  },
  mainnet: {
    chain: "arc",
    network: "mainnet",
    chainId: 5042,
    rpcUrl: "https://mainnet.example",
    explorerUrl: "https://explorer.example",
    contractIds: { primary: "MAINNET_CONTRACT" },
  },
};

describe("MultiNetworkClient", () => {
  it("starts on the configured network", () => {
    const client = new MultiNetworkClient({
      initialNetwork: "testnet",
      createAdapter: () => ({
        getNetwork: async () => ({
          chainId: configs.testnet.chainId,
        }),
      }),
    });

    expect(client.network).toBe("testnet");
  });

  it("resolves network-specific contract IDs", () => {
    const client = new MultiNetworkClient({
      initialNetwork: "testnet",
      createAdapter: () => ({
        getNetwork: async () => ({
          chainId: configs.testnet.chainId,
        }),
      }),
    });

    expect(client.getContractId("primary")).toBe("TESTNET_CONTRACT");
  });

  it("switches networks only after RPC validation", async () => {
    let selected: "testnet" | "mainnet" = "testnet";

    const client = new MultiNetworkClient({
      initialNetwork: selected,
      createAdapter: (config) => ({
        getNetwork: async () => ({
          chainId: config.chainId,
        }),
      }),
    });

    // The production implementation should source configs from config.ts.
    // This test documents the expected successful switch contract.
    await client.switchNetwork("mainnet");
    selected = client.network;

    expect(selected).toBe("mainnet");
  });

  it("rejects a network when the RPC chain ID does not match", async () => {
    const client = new MultiNetworkClient({
      initialNetwork: "testnet",
      createAdapter: () => ({
        getNetwork: async () => ({
          chainId: 9999,
        }),
      }),
    });

    await expect(client.switchNetwork("mainnet")).rejects.toThrow(
      "RPC network mismatch",
    );
    expect(client.network).toBe("testnet");
  });
});
