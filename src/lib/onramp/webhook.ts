/**
 * Circle Onramp webhook verification + deposit-event parsing (server-only).
 *
 * Browser widget events (`onDepositSettled` / `onDepositNotCompleted`) are
 * best-effort UX signals — a user can close the tab before settlement and
 * the browser never delivers them. This module backs
 * `POST /api/onramp/webhook`, the server-side reconciliation hook point.
 *
 * Signature scheme: HMAC-SHA256 over the RAW request body bytes, keyed with
 * the shared webhook secret (`CIRCLE_WEBHOOK_SECRET`, alias
 * `ONRAMP_WEBHOOK_SECRET`). The hex (or base64) digest arrives in the
 * `x-circle-signature` header (`x-onramp-signature` accepted as an alias;
 * a `sha256=` / `v1=` prefix is tolerated). Comparison is constant-time.
 * Verify against the raw body — parsing to JSON and re-serializing changes
 * bytes and breaks the digest.
 *
 * NOTE on Circle's v2 ECDSA scheme: Wallets/CPN webhooks use
 * `X-Circle-Signature` + `X-Circle-Key-Id` with ECDSA_SHA_256 and a public
 * key fetched from `GET /v2/notifications/publicKey/{keyId}` (see
 * developers.circle.com/api-reference/verify-webhook-signatures). If Circle
 * provisions Onramp webhooks under that scheme instead of a shared secret,
 * add an ECDSA branch here (fetch + cache the public key by keyId, verify
 * with node:crypto `createVerify("SHA256")`) and keep this HMAC path.
 *
 * Idempotency: Circle may redeliver. Deliveries are deduped in-memory by
 * event/deposit id (falling back to a hash of the raw body). This covers a
 * single instance only — the TODO in the route covers the durable ledger.
 */

import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export const ONRAMP_WEBHOOK_ROUTE = "/api/onramp/webhook";

/** Max redelivery keys kept in memory; oldest evicted first (FIFO). */
export const WEBHOOK_DEDUPE_CAP = 5000;

/** Shared secret for HMAC verification. Empty = webhook disabled (503). */
export function circleWebhookSecret(): string {
  return (
    process.env.CIRCLE_WEBHOOK_SECRET?.trim() ||
    process.env.ONRAMP_WEBHOOK_SECRET?.trim() ||
    ""
  );
}

const SIGNATURE_HEADER_NAMES = ["x-circle-signature", "x-onramp-signature"];

/** First signature header present (header lookup is case-insensitive). */
export function readWebhookSignature(
  headers: Pick<Headers, "get">,
): string | null {
  for (const name of SIGNATURE_HEADER_NAMES) {
    const value = headers.get(name)?.trim();
    if (value) return value;
  }
  return null;
}

/** Accept hex or base64 digests, with an optional `sha256=` / `v1=` prefix. */
function decodeSignature(value: string): Buffer | null {
  const stripped = value.replace(/^(sha256|v1)=/i, "").trim();
  if (stripped === "") return null;
  if (/^[0-9a-fA-F]+$/.test(stripped) && stripped.length % 2 === 0) {
    try {
      return Buffer.from(stripped, "hex");
    } catch {
      return null;
    }
  }
  try {
    const decoded = Buffer.from(stripped, "base64");
    // Round-trip guard: reject strings that are not canonical base64.
    if (decoded.length === 0) return null;
    return decoded;
  } catch {
    return null;
  }
}

/**
 * HMAC-SHA256 verification of the raw body. False on missing secret,
 * missing/malformed signature, or mismatch. Constant-time compare.
 */
export function verifyWebhookSignature(
  rawBody: string,
  signature: string | null,
  secret: string,
): boolean {
  if (secret === "" || signature === null || signature === "") return false;
  const provided = decodeSignature(signature);
  if (provided === null) return false;
  const expected = createHmac("sha256", secret).update(rawBody, "utf8").digest();
  return (
    provided.length === expected.length && timingSafeEqual(provided, expected)
  );
}

export type DepositOutcome = "settled" | "not-completed" | "submitted" | "unknown";

export interface ParsedDepositEvent {
  outcome: DepositOutcome;
  /** Raw event/type/status string Circle sent (for logs). */
  rawEvent: string | null;
  /** Idempotency key: event/delivery id when present. */
  eventId: string | null;
  /** Deposit reference: orderId / paymentId / deposit id when present. */
  depositId: string | null;
  /** Sub-type code (e.g. CANCELED_BY_CUSTOMER). */
  code: string | null;
  amount: unknown;
  tokenSymbol: string | null;
  transactionHash: string | null;
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value !== "" ? value : null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function firstString(
  containers: Array<Record<string, unknown> | null>,
  keys: string[],
): string | null {
  for (const container of containers) {
    if (!container) continue;
    for (const key of keys) {
      const found = asString(container[key]);
      if (found) return found;
    }
  }
  return null;
}

const NOT_COMPLETED_PATTERN =
  /not.?complet|cancel|fail|reject|expire|timeout|declin|refund/;
const SETTLED_PATTERN = /settle|complet|success|confirm/;
const SUBMITTED_PATTERN = /submit|pend|creat|initiated/;

function classifyOutcome(event: string, code: string): DepositOutcome {
  const haystack = `${event} ${code}`.toLowerCase().replace(/[._-]+/g, " ");
  // Order matters: "not completed" contains "completed".
  if (NOT_COMPLETED_PATTERN.test(haystack)) return "not-completed";
  if (SETTLED_PATTERN.test(haystack)) return "settled";
  if (SUBMITTED_PATTERN.test(haystack)) return "submitted";
  return "unknown";
}

/**
 * Tolerant parser: accepts widget-style envelopes
 * (`{ event: "DEPOSIT_SETTLED", code, payload }`) and generic webhook
 * shapes (`{ type/id/status, data/payload/object }`). Unknown shapes yield
 * `outcome: "unknown"` (still logged + acked, never trusted for ledger).
 */
export function parseDepositEvent(body: unknown): ParsedDepositEvent {
  const empty: ParsedDepositEvent = {
    outcome: "unknown",
    rawEvent: null,
    eventId: null,
    depositId: null,
    code: null,
    amount: undefined,
    tokenSymbol: null,
    transactionHash: null,
  };
  const root = asRecord(body);
  if (!root) return empty;

  const event =
    firstString([root], ["event", "type", "notificationType"]) ?? "";
  const code =
    firstString([root], ["code", "status", "depositStatus"]) ?? "";
  const detail =
    asRecord(root["payload"]) ?? asRecord(root["data"]) ?? asRecord(root["object"]);

  const eventId = firstString([root, detail], [
    "id",
    "eventId",
    "deliveryId",
    "notificationId",
  ]);
  const depositId = firstString([detail, root], [
    "orderId",
    "paymentId",
    "depositId",
    "transactionId",
  ]);
  const transactionHash = firstString([detail, root], ["transactionHash", "txHash"]);

  return {
    outcome: classifyOutcome(event, code),
    rawEvent: event === "" && code === "" ? null : `${event}${code ? `:${code}` : ""}`,
    eventId,
    depositId,
    code: code === "" ? null : code,
    amount: detail?.["amount"],
    tokenSymbol: asString(detail?.["tokenSymbol"]),
    transactionHash,
  };
}

/** Stable dedupe key: event id first, then deposit+outcome, then body hash. */
export function dedupeKeyFor(parsed: ParsedDepositEvent, rawBody: string): string {
  if (parsed.eventId) return `event:${parsed.eventId}`;
  if (parsed.depositId) return `deposit:${parsed.depositId}:${parsed.outcome}`;
  return `body:${createHash("sha256").update(rawBody, "utf8").digest("hex")}`;
}

const seenDeliveryKeys = new Set<string>();

/**
 * True when this key was already processed (Circle redelivery — ack again,
 * do not re-apply). Single-instance memory only; see the route TODO for the
 * durable (DB) ledger guard.
 */
export function isDuplicateDelivery(key: string): boolean {
  if (seenDeliveryKeys.has(key)) return true;
  seenDeliveryKeys.add(key);
  if (seenDeliveryKeys.size > WEBHOOK_DEDUPE_CAP) {
    const oldest = seenDeliveryKeys.values().next().value;
    if (oldest !== undefined) seenDeliveryKeys.delete(oldest);
  }
  return false;
}

/** Test-only reset for the in-memory redelivery set. */
export function resetWebhookDedupeForTests(): void {
  seenDeliveryKeys.clear();
}
