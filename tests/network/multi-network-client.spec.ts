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
    networkPassphrase: "Test SDF Network ; September 2015",
    contractIds: { primary: "TESTNET_CONTRACT" },
  },
  mainnet: {
    chain: "arc",
    network: "mainnet",
    chainId: 5042,
    rpcUrl: "https://mainnet.example",
    explorerUrl: "https://explorer.example",
    networkPassphrase: "Public Global Stellar Network ; September 2015",
    contractIds: { primary: "MAINNET_CONTRACT" },
  },
};

describe("MultiNetworkClient", () => {
  it("starts on the configured network", () => {
    const client = new MultiNetworkClient({
      initialNetwork: "testnet",
      createAdapter: () => ({
        getNetwork: async () => ({
          passphrase: configs.testnet.networkPassphrase,
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
          passphrase: configs.testnet.networkPassphrase,
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
          passphrase: config.networkPassphrase,
        }),
      }),
    });

    // The production implementation should source configs from config.ts.
    // This test documents the expected successful switch contract.
    await client.switchNetwork("mainnet");
    selected = client.network;

    expect(selected).toBe("mainnet");
  });

  it("rejects a network when the RPC passphrase does not match", async () => {
    const client = new MultiNetworkClient({
      initialNetwork: "testnet",
      createAdapter: () => ({
        getNetwork: async () => ({
          passphrase: "Incorrect passphrase",
        }),
      }),
    });

    await expect(client.switchNetwork("mainnet")).rejects.toThrow(
      "RPC network mismatch",
    );
    expect(client.network).toBe("testnet");
  });
});
