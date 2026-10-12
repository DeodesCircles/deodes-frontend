#!/usr/bin/env bash
#
# deodes-env — interactive env setup for DEODES.
#
# Usage (the phrase to run):
#   deodes-env            # prompt for every missing variable, store to .env.production.local
#   deodes-env --check    # report what's missing (values never printed)
#   deodes-env --help     # this help
#
# Rules:
# - Source of truth is .env.example (same directory as this repo's env file).
# - Secrets are read silently, never echoed, never logged.
# - Missing report masks everything (set vs missing only).
# - File is written atomically with 0600 permissions; git-ignored (.env*).
#
set -euo pipefail

APP_DIR="${APP_DIR:-/root/DEODES}"
EXAMPLE="$APP_DIR/.env.example"
TARGET="$APP_DIR/.env.production.local"

# Vars that must have a real value for production.
REQUIRED_VARS="WALLET_HMAC_KEY PASSKEY_SERVER_PEPPER GOOGLE_CLIENT_ID GOOGLE_CLIENT_SECRET"
# Vars the script may auto-generate (crypto-random hex) on request.
GENERATABLE_VARS="WALLET_HMAC_KEY PASSKEY_SERVER_PEPPER"

usage() {
  sed -n '2,14p' "$0"
}

die() { echo "deodes-env: $*" >&2; exit 1; }

# Ordered VAR list straight from .env.example (comment + blank lines skipped).
example_vars() {
  grep -E '^[A-Za-z_][A-Za-z0-9_]*=' "$EXAMPLE" | cut -d= -f1
}

is_secret() {
  case "$1" in
    *SECRET*|*KEY*|*PASSWORD*|*TOKEN*|*PEPPER*) return 0 ;;
    *) return 1 ;;
  esac
}

is_required() {
  case " $REQUIRED_VARS " in *" $1 "*) return 0;; *) return 1;; esac
}

is_generatable() {
  case " $GENERATABLE_VARS " in *" $1 "*) return 0;; *) return 1;; esac
}

# Existing value from TARGET (empty when unset). Never printed by callers.
current_value() {
  local var="$1" line
  [ -f "$TARGET" ] || return 0
  line=$(grep -E "^${var}=" "$TARGET" | tail -n 1 || true)
  [ -n "$line" ] || return 0
  printf '%s' "${line#*=}"
}

mask() { [ -n "${1:-}" ] && printf 'set' || printf 'missing'; }

do_check() {
  [ -f "$EXAMPLE" ] || die "$EXAMPLE not found"
  local missing=0 total=0 var
  while IFS= read -r var; do
    [ -n "$var" ] || continue
    total=$((total + 1))
    if [ -z "$(current_value "$var")" ]; then
      if is_required "$var"; then
        echo "MISSING (required): $var"
      else
        echo "missing (optional): $var"
      fi
      missing=$((missing + 1))
    fi
  done < <(example_vars)
  echo "---"
  echo "$total checked, $missing missing."
  echo "Configured values: $(grep -c -E '^[A-Za-z_][A-Za-z0-9_]*=[^[:space:]]' "$TARGET" 2>/dev/null || true) set (values never shown)."
}

do_setup() {
  [ -f "$EXAMPLE" ] || die "$EXAMPLE not found"
  command -v openssl >/dev/null 2>&1 || die "openssl is required"
  touch "$TARGET"
  chmod 600 "$TARGET"

  local var val answer changed input
  while IFS= read -r var; do
    [ -n "$var" ] || continue
    val="$(current_value "$var")"
    changed=0
    if [ -n "$val" ]; then
      echo "[$var] already set — Enter keeps it, or type a new value."
    else
      if is_required "$var"; then
        echo "[$var] REQUIRED and missing."
      else
        echo "[$var] optional and missing (Enter skips)."
      fi
    fi
# NOTE: prompts read from /dev/tty (your keyboard), never from this loop's
# stdin — the variable list streams through stdin and must not be consumed.
    if is_generatable "$var" && [ -z "$val" ]; then
      printf 'Generate a random value instead? [y/N]: '
      read -r answer </dev/tty || answer=""
      if [ "$answer" = "y" ] || [ "$answer" = "Y" ]; then
        val="$(openssl rand -hex 32)"
        changed=1
        echo "[$var] generated."
      fi
      unset answer
    fi
    # Ask every time: Enter keeps the existing value, typing replaces it.
    if is_secret "$var"; then
      printf '%s: ' "$var"
      read -rs input </dev/tty || input=""
      echo ""
    else
      printf '%s: ' "$var"
      read -r input </dev/tty || input=""
    fi
    if [ -n "${input:-}" ]; then
      val="$input"
      changed=1
    else
      changed=0
    fi
    unset input
    if [ -z "$val" ]; then
      if is_required "$var"; then
        echo "[$var] still missing — required. Run deodes-env again to set it."
      else
        echo "[$var] skipped."
      fi
      continue
    fi
    if [ "$changed" = "0" ]; then
      echo "[$var] kept."
      unset val
      continue
    fi
    # Atomic upsert into TARGET.
    tmp="$(mktemp)"
    chmod 600 "$tmp"
    grep -v -E "^${var}=" "$TARGET" > "$tmp" || true
    printf '%s=%s\n' "$var" "$val" >> "$tmp"
    mv "$tmp" "$TARGET"
    chmod 600 "$TARGET"
    unset val
    echo "[$var] saved."
  done < <(example_vars)

  echo "---"
  echo "Stored in $TARGET (0600, git-ignored)."
  echo "Restart the app to apply: systemctl restart deodes-frontend"
}

case "${1:-}" in
  "" ) do_setup ;;
  --check) do_check ;;
  -h|--help|help) usage ;;
  *) die "unknown argument '$1' (try --help)" ;;
esac
