---
title: Security
order: 5
---

# Security

How Moistello keeps your funds and data secure.

## Authentication Security

Moistello uses **passkey authentication** (WebAuthn) as the sole sign-in method:

- **Biometric verification** — Sign in with Face ID, Touch ID, Windows Hello, or fingerprint. No passwords to leak or phish.
- **On-device key generation** — Your private key never leaves your device.
- **No shared secrets** — No passwords, no email verification, no recovery phrases to steal.
- **Phishing resistant** — Passkeys are scoped to the origin, preventing credential reuse on fake sites.

## Smart Contract Security

All circle funds are managed by Soroban smart contracts on the Stellar blockchain:

- **Open source** — Contract code is publicly auditable on GitHub
- **Immutable rules** — Once deployed, contract rules cannot be changed
- **No custodial risk** — Moistello never holds your funds
- **Reentrancy protection** — Contracts include guards against common attack vectors
- **Access control** — Only the passkey-authenticated member can trigger authorized actions

## Wallet Key Encryption

Stellar wallet keys are encrypted using **AES-256-GCM** before being stored in PostgreSQL:

- **Encrypted at rest** — Private keys are never stored in plaintext
- **Unique nonce per key** — Each encryption uses a fresh random nonce
- **Server-side key derivation** — Encryption keys are derived from passkey seeds, never transmitted
- **Zero-knowledge design** — The server cannot decrypt wallet keys without the passkey seed

## Platform Security

| Measure | Implementation |
|---|---|
| Transport encryption | TLS 1.3, HSTS |
| Authentication | Passkey (WebAuthn) — no passwords |
| API security | Rate limiting, CSRF protection, input validation |
| Data storage | Wallet keys encrypted with AES-256-GCM at rest |
| DDoS protection | Cloudflare WAF + CDN |

## Best Practices for Members

1. **Start small** — Test with small amounts before committing more
2. **Verify the circle** — Check member identities and organizer reputation
3. **Understand the rules** — Read the circle's settings before joining
4. **Set reminders** — Don't miss contribution deadlines
5. **Report issues** — If you see suspicious activity, report it immediately

## Reporting Security Issues

If you discover a security vulnerability, please:

1. **Do not** disclose it publicly
2. **Open a private issue** on our GitHub repository
3. Or contact us directly through the Drips Discord

We take security seriously and will respond promptly.

## Audit Status

Smart contracts are pending external audit. This documentation will be updated with audit results once available.
