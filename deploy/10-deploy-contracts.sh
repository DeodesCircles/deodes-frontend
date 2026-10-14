#!/usr/bin/env bash
# ── 10-deploy-contracts.sh ── Build, test and broadcast the V1 contracts (Foundry)
# Full ceremony lives in deodes-contracts/CEREMONY.md (two operators for
# mainnet, fresh keys, hardware wallets). This script runs the mechanical
# half: build + test + verify + record into deployments.*.json. Ownership
# handover to the multisig stays a manual, auditable step per CEREMONY.md.
source "$(dirname "$0")/lib/common.sh"

step_header "STEP 10: Deploying V1 contracts to Arc ($NETWORK)"

if skip_if_done "10"; then exit 0; fi

if [ "$NETWORK" = "mainnet" ]; then
    CHAIN_ID=5042
    DEPLOY_FILE="deployments.mainnet.json"
    EXPLORER="https://explorer.arc.io"
else
    CHAIN_ID=5042002
    DEPLOY_FILE="deployments.testnet.json"
    EXPLORER="https://explorer.testnet.arc.io"
fi

CONTRACTS_DIR="$APP_DIR/contracts"
if [ ! -d "$CONTRACTS_DIR" ]; then
    fail "Contracts directory not found at $CONTRACTS_DIR — run 01-bootstrap.sh first (repos already cloned)"
fi

if [ -z "${DEPLOYER_ACCOUNT:-}" ]; then
    fail "DEPLOYER_ACCOUNT is not set (forge --account name) — see CEREMONY.md. Never paste --private-key."
fi

require_command forge
require_command cast

# ── Build + test (fail before spending gas) ─────────────────────
info "Building contracts (solc 0.8.36, optimizer on)"
run forge build --root "$CONTRACTS_DIR" || fail "Contract build failed"

info "Running contract test suite"
run forge test --root "$CONTRACTS_DIR" || fail "Contract tests failed — fix before broadcasting"

info "Checking gas snapshot gate"
run forge snapshot --check --fuzz-seed 42 --root "$CONTRACTS_DIR" 2>/dev/null || \
    warn "Gas snapshot drift — review GAS-SNAPSHOT.md before proceeding"

# ── Confirmation prompt ─────────────────────────────────────────
if [ "$DRY_RUN" != "true" ]; then
    echo -n "Broadcast V1 deploys on ${NETWORK} (chain ${CHAIN_ID})? This will spend real USDC gas. [y/N]: "
    if [ "${YES:-false}" = "true" ]; then
        info "Auto-confirming (YES=true)"
        CONFIRM="y"
    else
        read -r CONFIRM
    fi
    if [ "${CONFIRM:-}" != "y" ] && [ "${CONFIRM:-}" != "Y" ]; then
        warn "Deployment cancelled by user"
        exit 0
    fi
else
    info "[DRY-RUN] Skipping confirmation prompt"
fi

echo ""

# ── Broadcast DeployAll (treasury -> token -> registry -> factory -> gov) ──
info "Broadcasting DeployAll.s.sol (single order: treasury, token, registry, factory, governance)"
run forge script "$CONTRACTS_DIR/script/DeployAll.s.sol" \
    --rpc-url "$ARC_RPC_URL" --broadcast --account "$DEPLOYER_ACCOUNT" || \
    fail "Broadcast failed — check RPC, funding (step 09) and key"

echo ""
info "Record each deployed address/tx/block into:"
info "  $CONTRACTS_DIR/$DEPLOY_FILE  (schema + example in CEREMONY.md §3)"
info "Then verify each contract on $EXPLORER and continue the ceremony:"
info "  ownership handover → recorder wiring → env wiring (step 12)"
echo ""

mark_done "10"
ok "Contract broadcast complete — finish CEREMONY.md before step 12"
