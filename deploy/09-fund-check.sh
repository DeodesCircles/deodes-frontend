#!/usr/bin/env bash
# ── 09-fund-check.sh ── Verify the operator address is funded on Arc
source "$(dirname "$0")/lib/common.sh"

step_header "STEP 09: Verifying operator funding on Arc"

if skip_if_done "09"; then exit 0; fi

require_command curl

ENV_FILE="$APP_DIR/secrets/.env"
if [ ! -f "$ENV_FILE" ]; then
    fail "Secrets file not found at $ENV_FILE — run 08-secrets.sh first"
fi

source "$ENV_FILE"

# ── Resolve operator address + RPC ─────────────────────────────
OPERATOR="${KEEPER_ESCROW_ADDRESS:-${OPERATOR_ADDRESS:-}}"
if [ -z "$OPERATOR" ] || [[ "$OPERATOR" == REPLACE_* ]]; then
    warn "No operator address configured (KEEPER_ESCROW_ADDRESS or OPERATOR_ADDRESS)"
    echo ""
    info "Set the operator 0x address in $ENV_FILE, fund it with USDC for"
    info "gas, then re-run this script."
    echo ""
    fail "Cannot proceed without an operator address"
fi

if ! [[ "$OPERATOR" =~ ^0x[0-9a-fA-F]{40}$ ]]; then
    fail "OPERATOR address is not 0x + 40 hex: $OPERATOR"
fi

RPC_URL="${ARC_RPC_URL:-$ARC_RPC}"
info "Checking $OPERATOR on $NETWORK ($RPC_URL)..."

# ── Query native (USDC) balance via JSON-RPC ────────────────────
BALANCE_HEX=$(run curl -sf -X POST "$RPC_URL" \
    -H "Content-Type: application/json" \
    -d "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"eth_getBalance\",\"params\":[\"$OPERATOR\",\"latest\"]}" 2>&1 | \
    python3 -c "import json,sys; print(json.load(sys.stdin).get('result','0x0'))" 2>/dev/null || echo "0x0")

BALANCE_WEI=$(python3 -c "print(int('$BALANCE_HEX', 16))" 2>/dev/null || echo "0")
# Minimum: 1 USDC (1e18 wei) for deploy gas buffer.
MIN_WEI=1000000000000000000

info "Operator balance: $BALANCE_WEI wei"

if [ "$BALANCE_WEI" = "0" ]; then
    warn "Operator address has zero balance on $NETWORK"
    echo ""
    info "Fund this address before proceeding:"
    info "  Address: $OPERATOR"
    info "  Minimum: 1 USDC (recommended: 10 USDC for ~5 contract deployments)"
    echo ""
    info "Re-run this script after funding."
    echo ""
    fail "Operator $OPERATOR not funded on $NETWORK"
fi

INSUFFICIENT=$(python3 -c "print('1' if $BALANCE_WEI < $MIN_WEI else '0')" 2>/dev/null || echo "1")

if [ "$INSUFFICIENT" = "1" ]; then
    warn "Operator balance is below minimum (1 USDC)"
    echo ""
    info "  Address: $OPERATOR"
    info "  Required minimum: 1 USDC"
    echo ""
    info "Re-run this script after funding."
    echo ""
    fail "Insufficient balance on $NETWORK"
fi

ok "Operator balance meets minimum requirement"

mark_done "09"
ok "Funding check complete"
