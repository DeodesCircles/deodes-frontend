import { ARC_CHAIN_ID } from "@/lib/constants";
import { isArcAddress, isArcTxHash, toWeiHex } from "./validation";

interface EthereumProvider {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
}

function getEthereumProvider(): EthereumProvider | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as Record<string, unknown>;
  const eth = w.ethereum as EthereumProvider | undefined;
  if (eth && typeof eth.request === "function") return eth;
  return null;
}

export interface ArcTransferParams {
  from: string;
  to: string;
  amount: number;
}

export class ArcTransferError extends Error {
  code: "no_provider" | "user_rejected" | "invalid" | "failed";
  constructor(code: ArcTransferError["code"], message: string) {
    super(message);
    this.name = "ArcTransferError";
    this.code = code;
  }
}

/**
 * Send native USDC on Arc (USDC is the gas token, 18 decimals) via the
 * injected EIP-1193 provider. Returns the EVM transaction hash (0x + 64 hex).
 *
 * This helper intentionally talks to `window.ethereum` directly instead of
 * going through the wallet adapters: the adapters expose `signMessage` /
 * legacy XDR signing only, and the Arc EVM adapter documents
 * `sendTransaction via window.ethereum directly`.
 */
export async function sendArcUSDCTransfer({
  from,
  to,
  amount,
}: ArcTransferParams): Promise<string> {
  if (!isArcAddress(from)) {
    throw new ArcTransferError("invalid", "Invalid sender: expected an Arc 0x address.");
  }
  if (!isArcAddress(to)) {
    throw new ArcTransferError("invalid", "Invalid recipient: expected an Arc 0x address.");
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new ArcTransferError("invalid", "Transfer amount must be greater than 0.");
  }
  const provider = getEthereumProvider();
  if (!provider) {
    throw new ArcTransferError(
      "no_provider",
      "No EVM wallet found. Install MetaMask, Rabby or Coinbase Wallet to pay on Arc.",
    );
  }
  const valueHex = toWeiHex(amount);
  const chainHex = `0x${ARC_CHAIN_ID.toString(16)}`;
  try {
    const hash = (await provider.request({
      method: "eth_sendTransaction",
      params: [{ from, to, value: valueHex, chainId: chainHex }],
    })) as string;
    if (!isArcTxHash(hash)) {
      throw new ArcTransferError("failed", "Wallet returned an invalid transaction hash.");
    }
    return hash;
  } catch (err: unknown) {
    if (err instanceof ArcTransferError) throw err;
    const code = (err as { code?: number })?.code;
    if (code === 4001) {
      throw new ArcTransferError("user_rejected", "Transaction rejected in wallet.");
    }
    throw new ArcTransferError(
      "failed",
      err instanceof Error ? err.message : "Failed to send Arc transaction.",
    );
  }
}

export function hasEvmProvider(): boolean {
  return getEthereumProvider() !== null;
}
