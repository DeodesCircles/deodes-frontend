import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { sendArcUSDCTransfer, ArcTransferError } from "../arc-transfer";

const FROM = "0x742d35Cc6634C0532925a3b844Bc454e4438f44e";
const TO = "0x1111111111111111111111111111111111111111";
const HASH = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";

describe("sendArcUSDCTransfer", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    (window as unknown as Record<string, unknown>).ethereum = undefined;
  });

  it("rejects non-0x sender/recipient before touching the provider", async () => {
    await expect(sendArcUSDCTransfer({ from: "GABC", to: TO, amount: 10 })).rejects.toMatchObject({
      code: "invalid",
    });
    await expect(sendArcUSDCTransfer({ from: FROM, to: "bad", amount: 10 })).rejects.toMatchObject({
      code: "invalid",
    });
  });

  it("errors clearly with no EVM provider", async () => {
    (window as unknown as Record<string, unknown>).ethereum = undefined;
    await expect(sendArcUSDCTransfer({ from: FROM, to: TO, amount: 10 })).rejects.toMatchObject({
      code: "no_provider",
    });
  });

  it("sends value in wei hex and returns the tx hash", async () => {
    const request = vi.fn().mockResolvedValue(HASH);
    (window as unknown as Record<string, unknown>).ethereum = { request };
    const hash = await sendArcUSDCTransfer({ from: FROM, to: TO, amount: 1.5 });
    expect(hash).toBe(HASH);
    expect(request).toHaveBeenCalledWith({
      method: "eth_sendTransaction",
      params: expect.arrayContaining([expect.objectContaining({ from: FROM, to: TO })]),
    });
    const sent = request.mock.calls[0][0].params[0];
    expect(sent.value).toMatch(/^0x[0-9a-f]+$/);
  });

  it("maps user rejection (4001) to a friendly error", async () => {
    const request = vi.fn().mockRejectedValue({ code: 4001 });
    (window as unknown as Record<string, unknown>).ethereum = { request };
    const err = await sendArcUSDCTransfer({ from: FROM, to: TO, amount: 10 }).catch((e) => e);
    expect(err).toBeInstanceOf(ArcTransferError);
    expect((err as ArcTransferError).code).toBe("user_rejected");
  });

  it("rejects invalid hashes returned by the wallet", async () => {
    const request = vi.fn().mockResolvedValue("not-a-hash");
    (window as unknown as Record<string, unknown>).ethereum = { request };
    await expect(sendArcUSDCTransfer({ from: FROM, to: TO, amount: 10 })).rejects.toMatchObject({
      code: "failed",
    });
  });
});
