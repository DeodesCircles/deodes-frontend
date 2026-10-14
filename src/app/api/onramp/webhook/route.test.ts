// @vitest-environment node
/**
 * webhook/route.test.ts — POST /api/onramp/webhook wiring: fail-closed
 * without a secret (503), unsigned rejection (401), verified accept (200),
 * redelivery dedupe, and malformed bodies (400). Signature math itself is
 * covered in src/lib/onramp/webhook.test.ts.
 */
import { createHmac } from "node:crypto";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const SECRET = "whsec-route-test";

function signHex(body: string): string {
  return createHmac("sha256", SECRET).update(body, "utf8").digest("hex");
}

function makeRequest(body: string, signature?: string): NextRequest {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (signature !== undefined) headers["x-circle-signature"] = signature;
  return new NextRequest("http://localhost/api/onramp/webhook", {
    method: "POST",
    headers,
    body,
  });
}

const SETTLED = JSON.stringify({
  event: "DEPOSIT_SETTLED",
  code: "DEPOSIT_SETTLED",
  payload: { orderId: "ord-route-1", amount: 25, tokenSymbol: "USDC" },
});

describe("POST /api/onramp/webhook", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("returns 503 when no webhook secret is configured (fail-closed)", async () => {
    vi.stubEnv("CIRCLE_WEBHOOK_SECRET", "");
    vi.stubEnv("ONRAMP_WEBHOOK_SECRET", "");
    const { POST } = await import("./route");
    const res = await POST(makeRequest(SETTLED, signHex(SETTLED)));
    expect(res.status).toBe(503);
  });

  it("returns 401 for unsigned requests", async () => {
    vi.stubEnv("CIRCLE_WEBHOOK_SECRET", SECRET);
    const { POST } = await import("./route");
    const res = await POST(makeRequest(SETTLED));
    expect(res.status).toBe(401);
  });

  it("returns 401 for a bad signature", async () => {
    vi.stubEnv("CIRCLE_WEBHOOK_SECRET", SECRET);
    const { POST } = await import("./route");
    const res = await POST(makeRequest(SETTLED, signHex("tampered")));
    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toMatchObject({
      error: "Invalid webhook signature",
    });
  });

  it("accepts a verified DEPOSIT_SETTLED event with 200", async () => {
    vi.stubEnv("CIRCLE_WEBHOOK_SECRET", SECRET);
    const { POST } = await import("./route");
    const res = await POST(makeRequest(SETTLED, signHex(SETTLED)));
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({
      ok: true,
      status: "settled",
      deduped: false,
    });
  });

  it("acks redeliveries as deduped without re-processing", async () => {
    vi.stubEnv("CIRCLE_WEBHOOK_SECRET", SECRET);
    const { POST } = await import("./route");
    const first = await POST(makeRequest(SETTLED, signHex(SETTLED)));
    await expect(first.json()).resolves.toMatchObject({ deduped: false });
    const second = await POST(makeRequest(SETTLED, signHex(SETTLED)));
    expect(second.status).toBe(200);
    await expect(second.json()).resolves.toMatchObject({
      ok: true,
      deduped: true,
    });
  });

  it("accepts not-completed events (reconciles failures too)", async () => {
    vi.stubEnv("CIRCLE_WEBHOOK_SECRET", SECRET);
    const { POST } = await import("./route");
    const body = JSON.stringify({
      event: "DEPOSIT_NOT_COMPLETED",
      code: "CUSTOMER_REJECTED",
      payload: {},
    });
    const res = await POST(makeRequest(body, signHex(body)));
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({ status: "not-completed" });
  });

  it("returns 400 for a signed but invalid JSON body", async () => {
    vi.stubEnv("CIRCLE_WEBHOOK_SECRET", SECRET);
    const { POST } = await import("./route");
    const res = await POST(makeRequest("{not json", signHex("{not json")));
    expect(res.status).toBe(400);
  });

  it("GET returns 405 (POST-only)", async () => {
    const { GET } = await import("./route");
    const res = await GET();
    expect(res.status).toBe(405);
  });
});

describe("POST /api/onramp/webhook — Circle v2 ECDSA (Gateway)", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("accepts an ECDSA-signed gateway.deposit.finalized envelope", async () => {
    const { generateKeyPairSync, sign } = await import("node:crypto");
    const { publicKey, privateKey } = generateKeyPairSync("ec", { namedCurve: "P-256" });
    const derB64 = publicKey.export({ format: "der", type: "spki" }).toString("base64");
    const body = JSON.stringify({
      subscriptionId: "sub-route",
      notificationId: "notif-route-1",
      notificationType: "gateway.deposit.finalized",
      notification: { amount: "10" },
      timestamp: "2026-01-01T00:00:00Z",
      version: 2,
    });
    const sig = sign("sha256", Buffer.from(body, "utf8"), privateKey).toString("base64");

    vi.stubEnv("CIRCLE_ENV", "sandbox");
    vi.stubEnv("CIRCLE_TEST_API_KEY", "TEST_ROUTE_KEY");
    vi.stubEnv("CIRCLE_WEBHOOK_SECRET", "");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json({ data: { publicKey: derB64 } })),
    );
    try {
      const { POST } = await import("./route");
      const req = new NextRequest("http://localhost/api/onramp/webhook", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-circle-signature": sig,
          "x-circle-key-id": "key-route-1",
        },
        body,
      });
      const res = await POST(req);
      expect(res.status).toBe(200);
      await expect(res.json()).resolves.toMatchObject({ status: "settled" });
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
