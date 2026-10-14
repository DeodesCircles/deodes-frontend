// @vitest-environment node
/**
 * webhook.test.ts — HMAC verification, deposit-event parsing, redelivery
 * dedupe for the Onramp reconciliation endpoint. Pure-function level; the
 * Next route wiring (401/503/200) is covered in route.test.ts.
 */
import { createHmac, generateKeyPairSync, sign } from "node:crypto";
import { describe, expect, it, beforeEach, vi } from "vitest";
import {
  circleWebhookSecret,
  dedupeKeyFor,
  fetchCirclePublicKey,
  isDuplicateDelivery,
  parseDepositEvent,
  readWebhookKeyId,
  readWebhookSignature,
  resetEcdsaKeyCacheForTests,
  resetWebhookDedupeForTests,
  verifyCircleWebhook,
  verifyEcdsaSignature,
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

describe("Circle v2 ECDSA verification (Gateway scheme)", () => {
  const BODY = JSON.stringify({
    subscriptionId: "sub-1",
    notificationId: "notif-1",
    notificationType: "gateway.deposit.finalized",
    notification: { amount: "25" },
    timestamp: "2026-01-01T00:00:00Z",
    version: 2,
  });

  function makeKeypair() {
    const { publicKey, privateKey } = generateKeyPairSync("ec", {
      namedCurve: "P-256",
    });
    const derB64 = publicKey.export({ format: "der", type: "spki" }).toString("base64");
    const signBody = (text: string) =>
      sign("sha256", Buffer.from(text, "utf8"), privateKey).toString("base64");
    return { publicKey, derB64, signBody };
  }

  function keyFetch_ok(derB64: string) {
    return vi.fn(async () =>
      Response.json({ data: { publicKey: derB64 } }),
    );
  }

  beforeEach(() => {
    resetEcdsaKeyCacheForTests();
  });

  it("accepts a valid ECDSA signature via key id", async () => {
    const { publicKey, derB64, signBody } = makeKeypair();
    const sig = signBody(BODY);
    expect(verifyEcdsaSignature(BODY, sig, publicKey)).toBe(true);
    const fetched = await fetchCirclePublicKey(
      "key-1",
      "https://api-test.circle.com",
      "TEST_KEY",
      keyFetch_ok(derB64),
    );
    expect(fetched).not.toBeNull();
    expect(verifyEcdsaSignature(BODY, sig, fetched)).toBe(true);
  });

  it("rejects tampered bodies and wrong keys", () => {
    const { publicKey, signBody } = makeKeypair();
    const other = makeKeypair();
    const sig = signBody(BODY);
    expect(verifyEcdsaSignature(BODY + "x", sig, publicKey)).toBe(false);
    expect(verifyEcdsaSignature(BODY, sig, other.publicKey)).toBe(false);
    expect(verifyEcdsaSignature(BODY, "!!!not-base64!!!", publicKey)).toBe(false);
    expect(verifyEcdsaSignature(BODY, sig, null)).toBe(false);
  });

  it("fetch returns null on non-OK, bad payload, or missing inputs", async () => {
    const failFetch = vi.fn(async () => new Response("nope", { status: 404 }));
    expect(
      await fetchCirclePublicKey("k", "https://x.test", "KEY", failFetch),
    ).toBeNull();
    const badFetch = vi.fn(async () => Response.json({ data: {} }));
    expect(
      await fetchCirclePublicKey("k2", "https://x.test", "KEY", badFetch),
    ).toBeNull();
    expect(await fetchCirclePublicKey("", "https://x.test", "KEY")).toBeNull();
    expect(await fetchCirclePublicKey("k", "", "KEY")).toBeNull();
    expect(await fetchCirclePublicKey("k", "https://x.test", "")).toBeNull();
  });

  it("caches the public key by key id", async () => {
    const { derB64 } = makeKeypair();
    const f = keyFetch_ok(derB64);
    await fetchCirclePublicKey("kc", "https://x.test", "KEY", f);
    await fetchCirclePublicKey("kc", "https://x.test", "KEY", f);
    expect(f).toHaveBeenCalledTimes(1);
  });

  it("verifyCircleWebhook prefers ECDSA, falls back to HMAC", async () => {
    const { derB64, signBody } = makeKeypair();
    const sig = signBody(BODY);
    const cfg = {
      apiBaseUrl: "https://api-test.circle.com",
      apiKey: "TEST_KEY",
      hmacSecret: "whsec-fallback",
    };
    const f = keyFetch_ok(derB64);
    const r1 = await verifyCircleWebhook(BODY, sig, "key-9", cfg, f);
    expect(r1).toEqual({ ok: true, method: "ecdsa" });

    // No key id -> ECDSA skipped, HMAC fallback verifies.
    const { createHmac: ch } = await import("node:crypto");
    const hmacSig = ch("sha256", "whsec-fallback").update(BODY, "utf8").digest("hex");
    const r2 = await verifyCircleWebhook(BODY, hmacSig, null, cfg, f);
    expect(r2).toEqual({ ok: true, method: "hmac" });

    // Neither matches.
    const r3 = await verifyCircleWebhook(BODY, "deadbeef", "key-9", cfg, f);
    expect(r3.ok).toBe(false);
  });

  it("reads the X-Circle-Key-Id header", () => {
    const headers = new Headers({ "X-Circle-Key-Id": "kid-42" });
    expect(readWebhookKeyId(headers)).toBe("kid-42");
    expect(readWebhookKeyId(new Headers())).toBeNull();
  });
});
