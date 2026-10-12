import { NextResponse } from "next/server"
import { sha256 } from "@noble/hashes/sha2.js"
import { bytesToHex } from "@noble/hashes/utils.js"

/**
 * Deterministic development key (never used in production).
 *
 * The key is derived from a fixed constant so every dev instance and every
 * request serves the same key: sessions survive page reloads, HMACs stay
 * stable across tests, and nothing depends on a per-request random value.
 */
const DEV_HMAC_KEY_HEX = bytesToHex(
  sha256(new TextEncoder().encode("moistello-dev-hmac-key")),
)

/**
 * Serves the session HMAC key to the client.
 *
 * The key MUST be set via WALLET_HMAC_KEY in production. Without it, HMACs
 * would differ on every server instance, invalidating all stored sessions.
 *
 * In development the endpoint falls back to the deterministic key above so
 * the client always gets a key while local sessions remain stable.
 */
export async function GET() {
  const fromEnv = process.env.WALLET_HMAC_KEY

  if (fromEnv && fromEnv.length >= 32) {
    return NextResponse.json({ keyHex: fromEnv })
  }

  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "Server misconfiguration: WALLET_HMAC_KEY is not set" },
      { status: 500 },
    )
  }

  // Development fallback — deterministic so local sessions survive reloads.
  return NextResponse.json({ keyHex: DEV_HMAC_KEY_HEX })
}
