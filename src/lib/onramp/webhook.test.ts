// @vitest-environment node
/**
 * webhook.test.ts — HMAC verification, deposit-event parsing, redelivery
 * dedupe for the Onramp reconciliation endpoint. Pure-function level; the
 * Next route wiring (401/503/200) is covered in route.test.ts.
 */
import { createHmac } from "node:crypto";
import { describe, expect, it, beforeEach, vi } from "vitest";
import {
  circleWebhookSecret,
  dedupeKeyFor,
  isDuplicateDelivery,
  parseDepositEvent,
  readWebhookSignature,
  resetWebhookDedupeForTests,
  verifyWebhookSignature,
} from "./webhook";

const SECRET = "whsec-test-123";

function signHex(body: string, secret = SECRET): string {
  return createHmac("sha256", secret).update(body, "utf8").digest("hex");
}

function signB64(body: string, secret = SECRET): string {
  return createHmac("sha256", secret).update(body, "utf8").digest("base64");
}

describe("circleWebhookSecret", () => {
  beforeEach(() => vi.unstubAllEnvs());

  it("prefers CIRCLE_WEBHOOK_SECRET, falls back to ONRAMP_WEBHOOK_SECRET", () => {
    vi.stubEnv("CIRCLE_WEBHOOK_SECRET", "primary");
    vi.stubEnv("ONRAMP_WEBHOOK_SECRET", "alias");
    expect(circleWebhookSecret()).toBe("primary");
    vi.stubEnv("CIRCLE_WEBHOOK_SECRET", "");
    expect(circleWebhookSecret()).toBe("alias");
  });

  it("returns empty when neither var is set", () => {
    vi.stubEnv("CIRCLE_WEBHOOK_SECRET", "");
    vi.stubEnv("ONRAMP_WEBHOOK_SECRET", "");
    expect(circleWebhookSecret()).toBe("");
  });
});

describe("verifyWebhookSignature", () => {
  const body = JSON.stringify({ event: "DEPOSIT_SETTLED", code: "DEPOSIT_SETTLED" });

  it("accepts a valid hex digest", () => {
    expect(verifyWebhookSignature(body, signHex(body), SECRET)).toBe(true);
  });

  it("accepts a valid base64 digest", () => {
    expect(verifyWebhookSignature(body, signB64(body), SECRET)).toBe(true);
  });

  it("accepts the x-circle-signature and x-onramp-signature headers", () => {
    const sig = signHex(body);
    expect(readWebhookSignature(new Headers({ "x-circle-signature": sig }))).toBe(sig);
    expect(readWebhookSignature(new Headers({ "X-Onramp-Signature": sig }))).toBe(sig);
    expect(readWebhookSignature(new Headers())).toBeNull();
  });

  it("tolerates a sha256= prefix", () => {
    expect(verifyWebhookSignature(body, `sha256=${signHex(body)}`, SECRET)).toBe(true);
  });

  it("rejects a tampered body", () => {
    const tampered = body.replace("SETTLED", "SUBMITTED");
    expect(verifyWebhookSignature(tampered, signHex(body), SECRET)).toBe(false);
  });

  it("rejects the wrong secret", () => {
    expect(verifyWebhookSignature(body, signHex(body, "other"), SECRET)).toBe(false);
  });

  it("rejects missing, empty, and malformed signatures", () => {
    expect(verifyWebhookSignature(body, null, SECRET)).toBe(false);
    expect(verifyWebhookSignature(body, "", SECRET)).toBe(false);
    expect(verifyWebhookSignature(body, "not-a-digest!!!", SECRET)).toBe(false);
  });

  it("fail-closes on an empty secret", () => {
    expect(verifyWebhookSignature(body, signHex(body), "")).toBe(false);
  });
});

describe("parseDepositEvent", () => {
  it("parses a widget-style DEPOSIT_SETTLED envelope", () => {
    const parsed = parseDepositEvent({
      event: "DEPOSIT_SETTLED",
      code: "DEPOSIT_SETTLED",
      payload: {
        orderId: "ord-1",
        amount: 50,
        tokenSymbol: "USDC",
        transactionHash: "0xabc",
      },
    });
    expect(parsed.outcome).toBe("settled");
    expect(parsed.depositId).toBe("ord-1");
    expect(parsed.tokenSymbol).toBe("USDC");
    expect(parsed.transactionHash).toBe("0xabc");
  });

  it("parses DEPOSIT_NOT_COMPLETED with its code", () => {
    const parsed = parseDepositEvent({
      event: "DEPOSIT_NOT_COMPLETED",
      code: "CANCELED_BY_CUSTOMER",
      payload: {},
    });
    expect(parsed.outcome).toBe("not-completed");
    expect(parsed.code).toBe("CANCELED_BY_CUSTOMER");
  });

  it("parses DEPOSIT_SUBMITTED", () => {
    expect(
      parseDepositEvent({ event: "DEPOSIT_SUBMITTED", payload: {} }).outcome,
    ).toBe("submitted");
  });

  it("parses generic webhook shapes (type/id/status/data)", () => {
    const settled = parseDepositEvent({
      type: "onramp.deposit.settled",
      id: "evt-9",
      data: { paymentId: "pay-7", amount: 10 },
    });
    expect(settled.outcome).toBe("settled");
    expect(settled.eventId).toBe("evt-9");
    expect(settled.depositId).toBe("pay-7");

    const failed = parseDepositEvent({ status: "failed", depositId: "d-1" });
    expect(failed.outcome).toBe("not-completed");
  });

  it("classifies not-completed before completed (substring guard)", () => {
    expect(
      parseDepositEvent({ event: "DEPOSIT_NOT_COMPLETED" }).outcome,
    ).toBe("not-completed");
  });

  it("returns unknown for unrecognized or non-object bodies", () => {
    expect(parseDepositEvent({ hello: "world" }).outcome).toBe("unknown");
    expect(parseDepositEvent(null).outcome).toBe("unknown");
    expect(parseDepositEvent("string").outcome).toBe("unknown");
    expect(parseDepositEvent([1, 2]).outcome).toBe("unknown");
  });
});

describe("isDuplicateDelivery", () => {
  beforeEach(() => resetWebhookDedupeForTests());

  it("flags the second delivery of the same event id", () => {
    const parsed = parseDepositEvent({ event: "DEPOSIT_SETTLED", id: "evt-1" });
    const key = dedupeKeyFor(parsed, "{}");
    expect(isDuplicateDelivery(key)).toBe(false);
    expect(isDuplicateDelivery(key)).toBe(true);
  });

  it("treats distinct events independently", () => {
    expect(isDuplicateDelivery("event:a")).toBe(false);
    expect(isDuplicateDelivery("event:b")).toBe(false);
  });

  it("falls back to deposit+outcome, then body hash", () => {
    const byDeposit = dedupeKeyFor(
      parseDepositEvent({ event: "DEPOSIT_SETTLED", payload: { orderId: "o-1" } }),
      "{}",
    );
    expect(byDeposit).toBe("deposit:o-1:settled");
    const byHash = dedupeKeyFor(parseDepositEvent({}), "raw");
    expect(byHash.startsWith("body:")).toBe(true);
    expect(isDuplicateDelivery(byHash)).toBe(false);
    expect(isDuplicateDelivery(byHash)).toBe(true);
  });
});
