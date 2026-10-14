#!/usr/bin/env bash
# ── 08-secrets.sh ── Generate all application secrets
source "$(dirname "$0")/lib/common.sh"

step_header "STEP 08: Generating secrets"

if skip_if_done "08"; then exit 0; fi

require_command openssl

SECRETS_DIR="$APP_DIR/secrets"
ENV_FILE="$SECRETS_DIR/.env"
JWT_PRIVATE="$SECRETS_DIR/jwt-private.pem"
JWT_PUBLIC="$SECRETS_DIR/jwt-public.pem"

run mkdir -p "$SECRETS_DIR"

# ── Backup existing files if re-running ────────────────────────
backup_file "$ENV_FILE"
backup_file "$JWT_PRIVATE"
backup_file "$JWT_PUBLIC"

# ── Generate infrastructure passwords ──────────────────────────
info "Generating infrastructure passwords"
PG_PW=$(run openssl rand -base64 32 | tr -d '+/=')
RD_PW=$(run openssl rand -base64 32 | tr -d '+/=')
MQ_PW=$(run openssl rand -base64 32 | tr -d '+/=')
JWT_PASSPHRASE=$(run openssl rand -base64 32 | tr -d '+/=')
HMAC_KEY=$(run openssl rand -hex 32 | tr -d '\n')
ok "Passwords generated (base64, URL-safe)"

# ── Generate JWT RSA keys ──────────────────────────────────────
info "Generating JWT RSA-2048 keypair"
run openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:2048 \
    -aes-256-cbc -pass "pass:$JWT_PASSPHRASE" \
    -out "$JWT_PRIVATE" 2>/dev/null
run openssl rsa -pubout -in "$JWT_PRIVATE" \
    -passin "pass:$JWT_PASSPHRASE" \
    -out "$JWT_PUBLIC" 2>/dev/null
run chmod 600 "$JWT_PRIVATE"
run chmod 644 "$JWT_PUBLIC"
ok "JWT RSA-2048 keys generated"

# ── Write .env file ────────────────────────────────────────────
info "Writing secrets to $ENV_FILE"
cat > "$ENV_FILE" << ENVEOF
# ── Infrastructure ──────────────────────────────────────────
POSTGRES_PW=${PG_PW}
REDIS_PW=${RD_PW}
RABBITMQ_PW=${MQ_PW}

# ── Arc (EVM, primary chain) + Keeper ─────────────────────────
# 12-backend-env.sh applies NETWORK-based defaults for RPC/chain ID; the
# backend mainnet guard rejects empty USDC/escrow in mainnet mode, so
# mainnet deploys MUST fill those before step 12.
ARC_RPC_URL=${ARC_RPC_URL:-}
ARC_CHAIN_ID=${ARC_CHAIN_ID:-}
ARC_USDC_CONTRACT=${ARC_USDC_CONTRACT:-}
DEODES_CONTRACT_ID=${DEODES_CONTRACT_ID:-}
KEEPER_ESCROW_ADDRESS=${KEEPER_ESCROW_ADDRESS:-}
KEEPER_INTERVAL_MINUTES=${KEEPER_INTERVAL_MINUTES:-15}

# ── Frontend (Arc UI + Onramp) ────────────────────────────────
# Server-only secrets consumed at runtime via frontend/.env.server (written
# by 17-build-frontend.sh, loaded by 18-systemd.sh EnvironmentFile).
# Empty Circle keys = onramp 503s (fail-closed). Empty WALLETCONNECT_PROJECT_ID
# = WalletConnect adapter refuses to init (fail-closed).
WALLET_HMAC_KEY=${WALLET_HMAC_KEY:-${HMAC_KEY}}
WALLETCONNECT_PROJECT_ID=${WALLETCONNECT_PROJECT_ID:-}
CIRCLE_ENV=${CIRCLE_ENV:-sandbox}
CIRCLE_API_KEY=${CIRCLE_API_KEY:-}
CIRCLE_TEST_API_KEY=${CIRCLE_TEST_API_KEY:-}
ONRAMP_REFERRER_DOMAIN=${ONRAMP_REFERRER_DOMAIN:-}
ONRAMP_ENABLED=${ONRAMP_ENABLED:-true}
EXPLORE_SOURCE=${EXPLORE_SOURCE:-auto}
GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID:-}
GOOGLE_CLIENT_SECRET=${GOOGLE_CLIENT_SECRET:-}
PASSKEY_SERVER_PEPPER=${PASSKEY_SERVER_PEPPER:-}

# ── JWT ─────────────────────────────────────────────────────
JWT_PRIVATE=${JWT_PRIVATE}
JWT_PUBLIC=${JWT_PUBLIC}
JWT_PASSPHRASE=${JWT_PASSPHRASE}
ENVEOF

run chmod 600 "$ENV_FILE"
run chown deploy:deploy "$SECRETS_DIR" 2>/dev/null || true
ok ".env written and permissions set"

# ── Summary ────────────────────────────────────────────────────
echo ""
info "═══ SECRETS GENERATED ═══"
info "Secrets file:    $ENV_FILE"
info "JWT private:     $JWT_PRIVATE"
info "JWT public:      $JWT_PUBLIC"
echo ""
mark_done "08"
ok "Secrets generation complete"
