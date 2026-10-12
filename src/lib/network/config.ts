export type SupportedNetwork = "testnet" | "mainnet";
export type SupportedChain = "arc";

export interface NetworkConfig {
  chain: SupportedChain;
  network: SupportedNetwork;
  /** Arc chain ID: 5042 mainnet, 5042002 testnet. */
  chainId: number;
  rpcUrl: string;
  explorerUrl: string;
  /** @deprecated Stellar legacy — kept for migration reference only */
  horizonUrl?: string;
  /** @deprecated Stellar passphrase — not used on Arc (EVM) */
  networkPassphrase?: string;
  contractIds: Record<string, string>;
}

const configuredContractId = (name: string): string =>
  process.env[name] ?? `UNCONFIGURED_${name}`;

const chainId = (fallback: number, ...names: string[]): number => {
  for (const name of names) {
    const raw = process.env[name];
    if (raw !== undefined && raw !== "") {
      const parsed = Number(raw);
      if (Number.isInteger(parsed) && parsed > 0) return parsed;
    }
  }
  return fallback;
};

export const NETWORK_CONFIG: Record<SupportedNetwork, NetworkConfig> = {
  testnet: {
    chain: "arc",
    network: "testnet",
    chainId: chainId(5042002, "NEXT_PUBLIC_ARC_TESTNET_CHAIN_ID", "NEXT_PUBLIC_ARC_CHAIN_ID"),
    rpcUrl:
      process.env.NEXT_PUBLIC_ARC_TESTNET_RPC_URL ??
      process.env.NEXT_PUBLIC_ARC_RPC_URL ??
      "https://rpc.testnet.arc.io",
    explorerUrl:
      process.env.NEXT_PUBLIC_ARC_TESTNET_EXPLORER_URL ??
      "https://explorer.testnet.arc.io",
    horizonUrl:
      process.env.NEXT_PUBLIC_STELLAR_TESTNET_HORIZON_URL ??
      "https://horizon-testnet.stellar.org",
    networkPassphrase: "Test SDF Network ; September 2015",
    contractIds: {
      primary: configuredContractId(
        "NEXT_PUBLIC_TESTNET_PRIMARY_CONTRACT_ID",
      ),
      deodes: configuredContractId("NEXT_PUBLIC_DEODES_CONTRACT_ID"),
    },
  },
  mainnet: {
    chain: "arc",
    network: "mainnet",
    chainId: chainId(5042, "NEXT_PUBLIC_ARC_MAINNET_CHAIN_ID", "NEXT_PUBLIC_ARC_CHAIN_ID"),
    rpcUrl:
      process.env.NEXT_PUBLIC_ARC_MAINNET_RPC_URL ??
      process.env.NEXT_PUBLIC_ARC_RPC_URL ??
      "https://rpc.mainnet.arc.io",
    explorerUrl:
      process.env.NEXT_PUBLIC_ARC_MAINNET_EXPLORER_URL ??
      "https://explorer.arc.io",
    horizonUrl: process.env.NEXT_PUBLIC_STELLAR_MAINNET_HORIZON_URL,
    networkPassphrase: "Public Global Stellar Network ; September 2015",
    contractIds: {
      primary: configuredContractId(
        "NEXT_PUBLIC_MAINNET_PRIMARY_CONTRACT_ID",
      ),
      deodes: configuredContractId("NEXT_PUBLIC_DEODES_CONTRACT_ID"),
    },
  },
};

export const getNetworkConfig = (
  network: SupportedNetwork,
): NetworkConfig => NETWORK_CONFIG[network];
