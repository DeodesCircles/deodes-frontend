---
title: Wallet Setup
order: 6
---

# Wallet Setup

How your Stellar wallet works on Moistello.

## Auto-Created Wallet

Moistello creates a Stellar wallet for you automatically when you sign in with your passkey. There is no manual wallet setup, no Freighter extension, and no seed phrase to manage.

- **Wallet created on first sign-in** — authenticating with your passkey triggers wallet creation on-chain
- **Funded from the master pool** — each new wallet receives 2 XLM to cover transaction fees
- **Encrypted key storage** — your wallet's private key is encrypted with AES-256-GCM and stored in PostgreSQL. It can only be decrypted using your passkey seed, which never leaves your device.

## How It Works

1. You sign in with your passkey (Face ID, fingerprint, etc.)
2. The passkey generates a seed that is used to derive your Stellar wallet key
3. A new Stellar wallet is created and funded with 2 XLM from the master pool
4. The wallet key is encrypted with AES-256-GCM and stored server-side
5. Each time you sign in, the passkey seed decrypts your key locally to sign transactions

## Funding Your Wallet

Since all circle contributions are in USDC, you'll need to fund your wallet:

1. Navigate to **Wallet** in the app
2. Use the **Yellow Card** integration to convert NGN to USDC deposited directly to your wallet
3. Or send USDC from any external Stellar wallet to your auto-generated address

## No Freighter, No Seed Phrases

- **No browser extension** — everything works in the browser with your device biometrics
- **No seed phrase to write down** — your passkey is your recovery mechanism. As long as you have access to your device's biometric auth, you can access your wallet
- **No passwords** — your biometrics are your credentials

## Wallet Address

Your Stellar wallet address is displayed on the Wallet page. Share this address to receive USDC from other users or external wallets.

## Best Practices

- Keep your device's biometric authentication enrolled and up to date
- If you switch devices, sign in with your passkey on the new device — 2FA or platform passkey sync will handle the handoff
- Start with small amounts before committing more to a circle
- Monitor your wallet balance on the Wallet page
