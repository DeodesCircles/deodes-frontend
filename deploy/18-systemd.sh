#!/usr/bin/env bash
# ── 18-systemd.sh ── Install and start systemd services
source "$(dirname "$0")/lib/common.sh"
set -euo pipefail

step_start "Install systemd services"
skip_if_done "18" && exit 0

require_root

info "Writing systemd unit files..."

backup_file "/etc/systemd/system/deodes-api.service"
cat > /etc/systemd/system/deodes-api.service << 'UNIT'
[Unit]
Description=Deodes API Server
After=network.target docker.service
Requires=docker.service

[Service]
Type=simple
User=deploy
WorkingDirectory=/opt/deodes/backend
EnvironmentFile=/opt/deodes/backend/.env
ExecStart=/opt/deodes/bin/deodes-api
Restart=always
RestartSec=5
StandardOutput=append:/var/log/deodes/api.log
StandardError=append:/var/log/deodes/api-error.log
LimitNOFILE=65536

[Install]
WantedBy=multi-user.target
UNIT
ok "deodes-api.service written"

backup_file "/etc/systemd/system/deodes-frontend.service"
cat > /etc/systemd/system/deodes-frontend.service << 'UNIT'
[Unit]
Description=Deodes Frontend (Next.js)
After=network.target

[Service]
Type=simple
User=deploy
WorkingDirectory=/opt/deodes/frontend
Environment=NODE_ENV=production
Environment=PORT=1110
# Server-only vars (CIRCLE_*, WALLET_HMAC_KEY, GOOGLE_*, PASSKEY_*, REDIS_*)
# written by 17-build-frontend.sh as frontend/.env.server. NEXT_PUBLIC_* are
# inlined at build time and do not need runtime injection.
EnvironmentFile=/opt/deodes/frontend/.env.server
ExecStart=/usr/bin/node /opt/deodes/frontend/node_modules/.bin/next start
Restart=always
RestartSec=5
StandardOutput=append:/var/log/deodes/frontend.log
StandardError=append:/var/log/deodes/frontend-error.log
LimitNOFILE=65536

[Install]
WantedBy=multi-user.target
UNIT
ok "deodes-frontend.service written"

info "Validating unit files with systemd-analyze..."
if command -v systemd-analyze &>/dev/null; then
    systemd-analyze verify /etc/systemd/system/deodes-api.service 2>&1 || warn "systemd-analyze reported warnings for deodes-api (non-fatal)"
    systemd-analyze verify /etc/systemd/system/deodes-frontend.service 2>&1 || warn "systemd-analyze reported warnings for deodes-frontend (non-fatal)"
    ok "Unit files validated"
else
    warn "systemd-analyze not available; skipping validation"
fi

mkdir -p /var/log/deodes
chown deploy:deploy /var/log/deodes 2>/dev/null || true

run systemctl daemon-reload

info "Enabling services..."
run systemctl enable deodes-api deodes-frontend
ok "Services enabled"

info "Starting services (start if new, restart if already running)..."
for svc in deodes-api deodes-frontend; do
    if systemctl is-active --quiet "$svc" 2>/dev/null; then
        info "$svc is already running — restarting"
        run systemctl restart "$svc"
    else
        info "$svc is not running — starting"
        run systemctl start "$svc"
    fi
done

info "Waiting for services to become healthy (up to 60s)..."

# Check backend health endpoint
info "Checking backend: curl http://127.0.0.1:1100/health"
ATTEMPTS=0
while [ $ATTEMPTS -lt 60 ]; do
    if curl -sf http://127.0.0.1:1100/health >/dev/null 2>&1; then
        ok "Backend health endpoint responding"
        break
    fi
    ATTEMPTS=$((ATTEMPTS + 1))
    sleep 1
done
if [ $ATTEMPTS -ge 60 ]; then
    warn "Backend did not respond within 60s — checking journal:"
    systemctl status deodes-api --no-pager -l 2>&1 | tail -10 || true
fi

# Check frontend
info "Checking frontend: curl -I http://127.0.0.1:1110"
ATTEMPTS=0
while [ $ATTEMPTS -lt 60 ]; do
    if curl -sfI http://127.0.0.1:1110 >/dev/null 2>&1; then
        ok "Frontend responding"
        break
    fi
    ATTEMPTS=$((ATTEMPTS + 1))
    sleep 1
done
if [ $ATTEMPTS -ge 60 ]; then
    warn "Frontend did not respond within 60s — checking journal:"
    systemctl status deodes-frontend --no-pager -l 2>&1 | tail -10 || true
fi

mark_done "18"
step_end
