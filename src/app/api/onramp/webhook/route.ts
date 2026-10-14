import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import {
  circleApiBaseUrl,
  circleApiKeyFor,
  resolveCircleEnv,
} from "@/lib/onramp/env";
import {
  circleWebhookSecret,
  dedupeKeyFor,
  isDuplicateDelivery,
  parseDepositEvent,
  readWebhookKeyId,
  readWebhookSignature,
  verifyCircleWebhook,
} from "@/lib/onramp/webhook";

/**
 * Circle Onramp/Gateway deposit webhook — server-side reconciliation.
 *
 * POST /api/onramp/webhook (Circle-signed JSON body)
 *
 * Browser `onDepositSettled` / `onDepositNotCompleted` callbacks are
 * best-effort UX only. This endpoint is the source of truth for mainnet
 * deposits: Circle redelivers until it gets a 2xx, so the handler is fast
 * (verify → parse → log → 200) and idempotent.
 *
 * Auth: Circle v2 ECDSA first (`X-Circle-Signature` + `X-Circle-Key-Id`,
 * public key fetched with the active-env API key), HMAC-SHA256 fallback
 * with CIRCLE_WEBHOOK_SECRET. Neither path available = 503 fail-closed
 * (never accept unverified deposits); present-but-invalid = 401.
 */

export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  const env = resolveCircleEnv();
  const config = {
    apiBaseUrl: circleApiBaseUrl(env),
    apiKey: circleApiKeyFor(env),
    hmacSecret: circleWebhookSecret(),
  };
  if (config.apiKey === "" && config.hmacSecret === "") {
    return NextResponse.json(
      { error: "Onramp webhook is not configured (missing API key and secret)" },
      { status: 503 },
    );
  }

  const rawBody = await request.text();
  const signature = readWebhookSignature(request.headers);
  const keyId = readWebhookKeyId(request.headers);
  const { ok, method } = await verifyCircleWebhook(
    rawBody,
    signature,
    keyId,
    config,
  );
  if (!ok) {
    logger.warn("onramp webhook rejected: invalid signature");
    return NextResponse.json(
      { error: "Invalid webhook signature" },
      { status: 401 },
    );
  }

  let body: unknown;
  try {
    body = rawBody === "" ? null : (JSON.parse(rawBody) as unknown);
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = parseDepositEvent(body);
  const key = dedupeKeyFor(parsed, rawBody);
  if (isDuplicateDelivery(key)) {
    return NextResponse.json(
      { ok: true, status: parsed.outcome, deduped: true },
      { status: 200 },
    );
  }

  const context = {
    event: parsed.rawEvent,
    status: parsed.outcome,
    eventId: parsed.eventId,
    depositId: parsed.depositId,
    code: parsed.code,
    amount: parsed.amount,
    asset: parsed.tokenSymbol,
    transactionHash: parsed.transactionHash,
  };
  if (parsed.outcome === "settled") {
    logger.info("onramp webhook: deposit settled", context);
  } else if (parsed.outcome === "not-completed") {
    logger.warn("onramp webhook: deposit not completed", context);
  } else if (parsed.outcome === "submitted") {
    logger.info("onramp webhook: deposit submitted", context);
  } else {
    logger.warn("onramp webhook: unknown event", context);
  }

  // TODO(ledger): reconcile against the deposits ledger here — upsert by
  // eventId (idempotency key) then by depositId/orderId, credit the user's
  // USDC balance exactly once, and alert on unknown outcomes. Must run in
  // the backend/DB transaction, not in this frontend route, before mainnet.

  return NextResponse.json(
    { ok: true, status: parsed.outcome, deduped: false },
    { status: 200 },
  );
}

/** Webhooks are POST-only; fail loudly on browser-style GET probes. */
export async function GET(): Promise<Response> {
  return NextResponse.json(
    { error: "Use POST with a Circle-signed body" },
    { status: 405 },
  );
}
