import { NextRequest, NextResponse } from "next/server";
import { ARC_RPC_URL } from "@/lib/constants";

function isArcAddress(address: string): boolean {
  return /^0x[0-9a-fA-F]{40}$/.test(address);
}

async function fetchArcBalance(address: string): Promise<{ xlm: string; usdc: string }> {
  // Arc: USDC is the native gas token (18 decimals). Native == ERC-20 balance.
  const res = await fetch(ARC_RPC_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "eth_getBalance",
      params: [address, "latest"],
    }),
    next: { revalidate: 15 },
  });
  if (!res.ok) throw new Error(`Arc RPC returned ${res.status}`);
  const json = await res.json();
  const weiHex: string = json?.result ?? "0x0";
  const wei = BigInt(weiHex);
  const base = BigInt(10) ** BigInt(18);
  const whole = wei / base;
  const frac = wei % base;
  // Format 18-decimal without float loss, trim trailing zeros, max 6 display decimals.
  const fracStr = frac.toString().padStart(18, "0").slice(0, 6).replace(/0+$/, "");
  const usdc = fracStr ? `${whole.toString()}.${fracStr}` : whole.toString();
  return { xlm: "0", usdc };
}

// Simple in-memory server cache for balance requests to reduce Arc RPC hits
const serverBalanceCache = new Map<
  string,
  { data: { xlm: string; usdc: string }; timestamp: number }
>();

const SERVER_CACHE_TTL_MS = 30_000; // 30 seconds

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get("address");

  if (!address) {
    return NextResponse.json(
      { error: "Missing required 'address' query parameter" },
      { status: 400 }
    );
  }

  // Arc EVM 0x path first (primary rail).
  if (isArcAddress(address)) {
    const cached = serverBalanceCache.get(address);
    if (cached && Date.now() - cached.timestamp < SERVER_CACHE_TTL_MS) {
      return NextResponse.json(cached.data, {
        status: 200,
        headers: {
          "Cache-Control": "public, s-maxage=15, stale-while-revalidate=30",
          "X-Cache": "HIT",
        },
      });
    }
    try {
      const result = await fetchArcBalance(address);
      serverBalanceCache.set(address, { data: result, timestamp: Date.now() });
      return NextResponse.json(result, {
        status: 200,
        headers: {
          "Cache-Control": "public, s-maxage=15, stale-while-revalidate=30",
          "X-Cache": "MISS",
        },
      });
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Failed to fetch Arc balance" },
        { status: 502 }
      );
    }
  }

  // Arc-only rail: anything that is not a 0x address is rejected. Legacy
  // address formats have no chain left to resolve against.
  return NextResponse.json(
    { error: "Invalid wallet address: must be an Arc 0x address." },
    { status: 400 }
  );
}
