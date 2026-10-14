import { describe, expect, it, vi } from "vitest";
import { ensureHostedArcWallet } from "./ensure-hosted";

vi.mock("@/lib/api-client", () => ({
  post: vi.fn(),
  get: vi.fn(),
}));

import { post } from "@/lib/api-client";

const ARC_ADDR = "0x742d35Cc6634C0532925a3b844Bc454e4438f44e";

describe("ensureHostedArcWallet", () => {
  it("returns the hosted address on success", async () => {
    vi.mocked(post).mockResolvedValue({
      data: { wallet: { publicKey: ARC_ADDR, walletType: "hosted" } },
    });
    await expect(ensureHostedArcWallet()).resolves.toEqual({
      publicKey: ARC_ADDR,
      walletType: "hosted",
    });
    expect(post).toHaveBeenCalledWith("/wallets/hosted-arc/ensure");
  });

  it("returns null on backend failure (never blocks auth)", async () => {
    vi.mocked(post).mockRejectedValue(new Error("down"));
    await expect(ensureHostedArcWallet()).resolves.toBeNull();
  });

  it("returns null for non-0x addresses", async () => {
    vi.mocked(post).mockResolvedValue({
      data: { wallet: { publicKey: "GABC123", walletType: "auto" } },
    });
    await expect(ensureHostedArcWallet()).resolves.toBeNull();
  });
});
