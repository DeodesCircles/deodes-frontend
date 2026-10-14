#!/usr/bin/env bash
# ── 17-build-frontend.sh ── Build Next.js frontend
source "$(dirname "$0")/lib/common.sh"
set -euo pipefail

step_start "Build frontend"
skip_if_done "17" && exit 0

require_command "node"
require_command "npm"

# ── Source secrets (Arc/Keeper/Circle pipeline home) ───────────
SECRETS_FILE="${APP_DIR}/secrets/.env"
if [ -f "$SECRETS_FILE" ]; then
    # shellcheck source=/dev/null
    source "$SECRETS_FILE"
else
    warn "Secrets file not found: $SECRETS_FILE — using environment/defaults only"
fi

# ── Arc network derivation (NETWORK=mainnet → Arc mainnet 5042) ─
if [ "$NETWORK" = "mainnet" ]; then
    ARC_NETWORK_DEFAULT="mainnet"
    ARC_CHAIN_DEFAULT="5042"
    ARC_RPC_DEFAULT="https://rpc.mainnet.arc.io"
    ARC_EXPLORER_DEFAULT="https://explorer.arc.io"
else
    ARC_NETWORK_DEFAULT="testnet"
    ARC_CHAIN_DEFAULT="5042002"
    ARC_RPC_DEFAULT="https://rpc.testnet.arc.io"
    ARC_EXPLORER_DEFAULT="https://explorer.testnet.arc.io"
fi
ARC_NETWORK="${ARC_NETWORK:-$ARC_NETWORK_DEFAULT}"
ARC_CHAIN_ID="${ARC_CHAIN_ID:-$ARC_CHAIN_DEFAULT}"
ARC_RPC_URL="${ARC_RPC_URL:-$ARC_RPC_DEFAULT}"
ARC_EXPLORER_URL="${ARC_EXPLORER_URL:-$ARC_EXPLORER_DEFAULT}"
DEODES_CONTRACT_ID="${DEODES_CONTRACT_ID:-}"
ONRAMP_ENABLED="${ONRAMP_ENABLED:-true}"
EXPLORE_SOURCE="${EXPLORE_SOURCE:-auto}"

# ── Frontend Redis (same instance as the backend, when known) ───
FRONTEND_REDIS_URL="${REDIS_URL:-}"
if [ -z "$FRONTEND_REDIS_URL" ] && [ -n "${REDIS_PW:-}" ]; then
    FRONTEND_REDIS_URL="redis://:${REDIS_PW}@127.0.0.1:9808"
fi
FRONTEND_REDIS_URL="${FRONTEND_REDIS_URL:-redis://127.0.0.1:6379}"
FRONTEND_REDIS_PASSWORD="${REDIS_PASSWORD:-${REDIS_PW:-}}"

info "Writing .env.local..."
cat > "$APP_DIR/frontend/.env.local" << ENVEOF
NEXT_PUBLIC_API_URL=https://${DOMAIN}/v1
NEXT_PUBLIC_WS_URL=wss://${DOMAIN}/ws
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=${WALLETCONNECT_PROJECT_ID:-}
NEXT_PUBLIC_ARC_NETWORK=${ARC_NETWORK}
NEXT_PUBLIC_ARC_CHAIN_ID=${ARC_CHAIN_ID}
NEXT_PUBLIC_ARC_RPC_URL=${ARC_RPC_URL}
NEXT_PUBLIC_ARC_EXPLORER_URL=${ARC_EXPLORER_URL}
NEXT_PUBLIC_DEODES_CONTRACT_ID=${DEODES_CONTRACT_ID}
NEXT_PUBLIC_ONRAMP_ENABLED=${ONRAMP_ENABLED}
NEXT_PUBLIC_EXPLORE_SOURCE=${EXPLORE_SOURCE}
NEXT_PUBLIC_PASSKEY_RP_ID=${DOMAIN}
NEXT_PUBLIC_PASSKEY_PEPPER=${PASSKEY_PEPPER:-deodes-passkey-pepper-v1}
NEXT_PUBLIC_FEATURE_MULTI_WALLET=true
NEXT_PUBLIC_FEATURE_PASSKEY=true
NEXT_PUBLIC_FEATURE_HARDWARE_WALLET=true
NEXT_PUBLIC_FEATURE_GOVERNANCE=true
NEXT_PUBLIC_FEATURE_REPUTATION_TIERS=true
ENVEOF
ok ".env.local written"

# ── Server-only runtime env (loaded by 18-systemd.sh EnvironmentFile)
# NEXT_PUBLIC_* above are inlined at build time; these stay server-side and
# are read by API routes at runtime (Circle onramp, HMAC key, Google OAuth).
info "Writing frontend server env (.env.server)..."
cat > "$APP_DIR/frontend/.env.server" << ENVEOF
WALLET_HMAC_KEY=${WALLET_HMAC_KEY:-}
CIRCLE_ENV=${CIRCLE_ENV:-sandbox}
CIRCLE_API_KEY=${CIRCLE_API_KEY:-}
CIRCLE_TEST_API_KEY=${CIRCLE_TEST_API_KEY:-}
CIRCLE_BASE_URL=${CIRCLE_BASE_URL:-}
CIRCLE_WIDGET_BASE_URL=${CIRCLE_WIDGET_BASE_URL:-}
CIRCLE_WEBHOOK_SECRET=${CIRCLE_WEBHOOK_SECRET:-}
ONRAMP_API_BASE_URL=${ONRAMP_API_BASE_URL:-}
ONRAMP_WIDGET_BASE_URL=${ONRAMP_WIDGET_BASE_URL:-}
ONRAMP_WEBHOOK_SECRET=${ONRAMP_WEBHOOK_SECRET:-}
ONRAMP_REFERRER_DOMAIN=${ONRAMP_REFERRER_DOMAIN:-${DOMAIN}}
GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID:-}
GOOGLE_CLIENT_SECRET=${GOOGLE_CLIENT_SECRET:-}
PASSKEY_SERVER_PEPPER=${PASSKEY_SERVER_PEPPER:-}
PASSKEY_EXPECTED_ORIGIN=${PASSKEY_EXPECTED_ORIGIN:-https://${DOMAIN}}
REDIS_URL=${FRONTEND_REDIS_URL}
REDIS_PASSWORD=${FRONTEND_REDIS_PASSWORD}
ENVEOF
chmod 600 "$APP_DIR/frontend/.env.server"
ok ".env.server written"

# ── Frontend env safety checks (systemd-safe, like step 12) ─────
if grep -q '[`]' "$APP_DIR/frontend/.env.local" "$APP_DIR/frontend/.env.server"; then
    fail "Frontend env contains unescaped backticks (unsafe for systemd EnvironmentFile)"
fi
if grep -Pq '[\x00-\x08\x0b\x0c\x0e-\x1f]' "$APP_DIR/frontend/.env.local" "$APP_DIR/frontend/.env.server"; then
    fail "Frontend env contains control characters (unsafe for systemd EnvironmentFile)"
fi

# Warn-only mainnet sanity: the step-12 backend guard is the hard gate. The
# frontend builds fine without a contract ID, so never fail the build here.
if [ "$ARC_NETWORK" = "mainnet" ]; then
    if [ "$ARC_CHAIN_ID" != "5042" ]; then
        warn "NEXT_PUBLIC_ARC_CHAIN_ID is ${ARC_CHAIN_ID} but Arc mainnet is 5042"
    fi
    case "$ARC_RPC_URL" in
        *[Tt][Ee][Ss][Tt][Nn][Ee][Tt]*) warn "NEXT_PUBLIC_ARC_RPC_URL still points to testnet: $ARC_RPC_URL" ;;
    esac
    if [ -z "$DEODES_CONTRACT_ID" ]; then
        warn "NEXT_PUBLIC_DEODES_CONTRACT_ID is empty on mainnet — contract calls will be unconfigured"
    fi
    if [ -z "${WALLETCONNECT_PROJECT_ID:-}" ]; then
        warn "WALLETCONNECT_PROJECT_ID is empty — WalletConnect adapter will refuse to init"
    fi
fi

info "Installing dependencies (npm ci — all dependencies, including dev)..."
cd "$APP_DIR/frontend"
BUILD_LOG=$(mktemp)
if ! npm ci 2>&1 | tee "$BUILD_LOG"; then
    fail "npm ci failed — last 50 lines:"
    tail -50 "$BUILD_LOG"
    exit 1
fi
ok "npm ci complete"

info "Building (npm run build)..."
> "$BUILD_LOG"
if ! npm run build 2>&1 | tee "$BUILD_LOG"; then
    fail "npm run build failed — last 50 lines:"
    tail -50 "$BUILD_LOG"
    exit 1
fi
rm -f "$BUILD_LOG"

if [ ! -d "$APP_DIR/frontend/.next" ]; then
    fail ".next directory not found after build"
fi
ok ".next directory verified"

chown -R deploy:deploy "$APP_DIR/frontend/.next" "$APP_DIR/frontend/.env.local" "$APP_DIR/frontend/.env.server" 2>/dev/null || true
mark_done "17"
step_end
