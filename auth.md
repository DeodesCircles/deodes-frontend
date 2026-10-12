# Auth System Rebuild Plan (auth.md)

## 1. Executive Summary

### 1.1 Current State
The existing authentication system is spread across 3 monolithic pages (login: 557 lines, register: 914 lines) with 3 redundant Zustand stores, 0% test coverage, a known passkey early-return bug, 220 lines of copy-pasted code between login and register, and a completely unused auth-flow-store (186 lines) that was designed as a proper state machine but was never wired up.

### 1.2 Why Rebuild, Not Refactor
- State management is the root problem, not UI layout. Untangling 3 stores from 1,471 lines of inline state is harder than writing clean code from scratch.
- auth-flow-store already exists and is well-designed — rebuilds would actually use it.
- 0% test coverage means no regression harness to protect during refactoring.
- Fixing the passkey early-return bug alone requires touching every flow; might as well do it in clean code.
- 220 deduplicatable lines is only 15% savings; the remaining 85% is tangled conditional rendering.
- Rebuild eliminates 1,471 lines of auth page code into approximately 230 lines across 2 pages.
- Effort: 2 days either way (rebuild vs refactor). Rebuild produces cleaner output with less risk.

### 1.3 Target State
- login/page.tsx: ~80 lines (3 steps orchestrated by components)
- register/page.tsx: ~150 lines (4 steps orchestrated by components)
- 12 reusable components in src/components/auth/
- auth-flow-store properly wired as the single source of truth
- 100% test coverage on all auth flows (unit + integration + e2e)
- Email verification before passkey creation
- Wallet connection working for all adapter types (Freighter, Rabet, xBull, Albedo, WalletConnect, Ledger, Passkey)
- Playwright e2e tests running against live https://moistello.com

---

## 2. Architecture Overview

### 2.1 Component Tree

```
src/app/(auth)/
├── layout.tsx                          # Shared layout (redirect if authenticated)
├── login/
│   └── page.tsx                        # ~80 lines — orchestrates 3 steps
├── register/
│   └── page.tsx                        # ~150 lines — orchestrates 4 steps
├── verify-email/
│   └── page.tsx                        # Standalone email verification page
└── passkey-setup/
    └── page.tsx                        # Passkey creation after email verified

src/components/auth/
├── index.ts                            # Barrel export
├── auth-layout.tsx                     # Shared card wrapper, logo, footer, nav links
├── auth-step-indicator.tsx             # Step progress bar (already exists, will reuse)
├── auth-error-boundary.tsx             # Error boundary (already exists)
├── auth-flow-context.tsx               # React context wrapper around auth-flow-store
│
├── choose-wallet-step.tsx              # Step 1 for login + register — wallet drawer
│   ├── components/
│   │   ├── wallet-grid.tsx             # Reusable wallet button grid
│   │   ├── wallet-card.tsx             # Individual wallet button (already exists: auth-wallet-card.tsx)
│   │   ├── passkey-shortcut.tsx        # Quick passkey login button
│   │   └── wc2-connection-state.tsx    # QR code / deep link for WalletConnect (already exists: auth-connection-state.tsx)
│   └── hooks/
│       └── use-wallet-connection.ts    # Encapsulates connect/disconnect/WC2 logic
│
├── verify-email-step.tsx               # Step 1 for register passkey path — email input + verification code
│   ├── components/
│   │   ├── email-input.tsx             # Email field with validation
│   │   └── verification-code-input.tsx  # 6-digit code input
│   └── hooks/
│       └── use-email-verification.ts   # API calls for sending + verifying code
│
├── profile-step.tsx                    # Step 2 (register) or step 1 (login alternative) — display name, email, country, language
│   └── hooks/
│       └── use-profile-form.ts        # Validation + field error tracking
│
├── sign-step.tsx                       # Step 3 for register / step 2 for login — review, sign message, submit
│   └── hooks/
│       └── use-sign-message.ts        # Nonce fetch, sign, submit to /auth/verify or /auth/register
│
├── connected-badge.tsx                # Small "Connected ✓" badge with wallet name + shortened address
├── error-display.tsx                  # Consistent error display with retry
└── loading-overlay.tsx                # Full-page loading state

src/hooks/
├── use-auth-flow.ts                   # Existing hook (will be rewritten to use auth-flow-store)
└── use-redirect-if-authenticated.ts   # Redirect to dashboard if already logged in
```

### 2.2 State Architecture (Single Source of Truth)

```
auth-flow-store.ts  ←── THE ONLY store used by auth pages
    │
    ├── mode: "login" | "register"
    ├── status: AuthFlowStatus (discriminated union)
    ├── connection: { walletId, address, pairingUri, protocol, relayStatus }
    ├── profile: { displayName, email, countryCode, language, fieldErrors }
    ├── auth: { nonce, signature }
    ├── emailVerification: { email, codeSent, codeVerified, verificationId }
    │
    ├── Actions:
    │   ├── setMode, reset
    │   ├── connectStart, connectSuccess, awaitingApproval, connected
    │   ├── signStart, signSuccess, authenticated
    │   ├── updateProfileField, setFieldError
    │   ├── setPairingUri, setRelayStatus
    │   ├── setEmail, setCodeSent, setCodeVerified
    │   └── setError, clearError
    └── Middleware:
        ├── devtools (Redux DevTools integration)
        └── persist (sessionStorage for recovery on refresh)
```

multi-wallet-store and auth-store continue to exist for non-auth pages (dashboard, wallet, etc.), but auth pages interact ONLY with auth-flow-store. A sync layer in auth-flow-context.tsx bridges auth-flow-store → multi-wallet-store when wallet connections succeed.

### 2.3 Data Flow Diagram

```
User Action  →  Component  →  auth-flow-store Action  →  API Call / Wallet Adapter
                     │                                        │
                     │                                        ▼
                     │                                   Response / Event
                     │                                        │
                     ▼                                        ▼
                 Re-render  ←────  auth-flow-store State Update
```

Authentication flow:
```
Component calls auth-flow-store.connect(walletId)
    → auth-flow-store sets status: "connecting"
    → multi-wallet-store.connect(walletId) is called internally
    → Wallet adapter scans / opens QR / requests approval
    → On success: auth-flow-store sets status: "connected", saves address
    → On error: auth-flow-store sets status: "error", saves error message
    → Component re-renders based on new status
```

---

## 3. Email Verification Flow (Passkey Registration)

### 3.1 User Journey

```
Step 1: User clicks "Passkey" on register page
Step 2: Email input screen appears
    ┌─────────────────────────────────────┐
    │                                     │
    │    ◀ Back to wallet options         │
    │                                     │
    │        🔒 [fingerprint icon]        │
    │                                     │
    │    Create Your Account              │
    │    Enter your email to get started  │
    │                                     │
    │    ┌─────────────────────────────┐  │
    │    │ Email address          [✉] │  │
    │    └─────────────────────────────┘  │
    │                                     │
    │    [       Confirm Email        ]   │
    │                                     │
    │    ┌─────────────────────────────┐  │
    │    │ Already have an account?   │  │
    │    │ Sign in                    │  │
    │    └─────────────────────────────┘  │
    └─────────────────────────────────────┘

Step 3: User enters email, clicks "Confirm Email"
    → POST /auth/verification/send { email }
    → Server sends 6-digit code to email
    → Input morphs to show code entry

Step 4: Verification code input appears
    ┌─────────────────────────────────────┐
    │                                     │
    │    ◀ Back to email                  │
    │                                     │
    │    Check your inbox                 │
    │    We sent a code to user@email.com │
    │                                     │
    │    ┌─┐ ┌─┐ ┌─┐ ┌─┐ ┌─┐ ┌─┐       │
    │    │ │ │ │ │ │ │ │ │ │ │ │         │
    │    └─┘ └─┘ └─┘ └─┘ └─┘ └─┘       │
    │                                     │
    │    [       Verify Code          ]   │
    │                                     │
    │    Didn't receive it?  [Resend]     │
    │                                     │
    └─────────────────────────────────────┘

Step 5: Code verified → proceed to passkey creation
    → WebAuthn navigator.credentials.create()
    → Browser prompts for biometric / PIN
    → On success: derive Stellar keypair from passkey
    → Save public key in auth-flow-store
    → Proceed to profile step
```

### 3.2 API Endpoints

| Method | Path | Request | Response | Error Codes |
|--------|------|---------|----------|-------------|
| POST | /auth/verification/send | `{ email }` | `{ verificationId, expiresIn: 600 }` | 400 (invalid email), 429 (rate limited) |
| POST | /auth/verification/verify | `{ verificationId, code }` | `{ verified: true }` | 400 (wrong code), 410 (expired) |
| POST | /auth/verification/resend | `{ verificationId }` | `{ expiresIn: 600 }` | 429 (rate limited), 404 (not found) |

### 3.3 Rate Limiting
- Max 3 code sends per email per 10 minutes
- Max 5 verification attempts per verificationId
- Code expires after 10 minutes
- Cooldown of 60 seconds between resends

### 3.4 Passkey Key Derivation

```
email + deviceCredentialID → PBKDF2 → seed → Ed25519 keypair
     │                              │
     │                              ▼
     │                      Stellar public key
     │                              │
     ▼                              ▼
  Stored in                      Stored in
  localStorage                   auth-flow-store
  (for recovery)                 (for current session)
```

Derivation algorithm:
```typescript
// pseudocode
async function deriveStellarKeypair(email: string, credentialId: string): Promise<Keypair> {
  const encoder = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(email),
    "PBKDF2",
    false,
    ["deriveBits", "deriveKey"]
  )
  const salt = encoder.encode(credentialId.slice(0, 16))
  const derivedBits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" },
    keyMaterial,
    256
  )
  return Keypair.fromRawEd25519Seed(new Uint8Array(derivedBits))
}
```

---

## 4. Wallet Connection Fixes

### 4.1 Issues Found in Original Code (Must Fix)

| # | Issue | Location | Root Cause | Fix |
|---|-------|----------|------------|-----|
| 1 | Passkey early return | login/page.tsx:151-152 | `if (walletId === "passkey") { return }` exits without connecting | Remove early return; passkey flows through handlePasskeyConnect instead |
| 2 | WC2 state race condition | login/page.tsx:172 | `setWc2PairingState("approved")` called before user actually approves | Wait for WC2 session event `session_update` before setting state |
| 3 | Missing loading states | register/page.tsx | No visual feedback during nonce fetch or signing | Use auth-flow-store status for precise loading states |
| 4 | Inconsistent error handling | Both pages | `signError` vs `submitError` vs `loginError` vs `registerError` all tracked separately | Single `auth-flow-store.error` for all auth errors |
| 5 | No retry for WC2 timeout | Both pages | No timeout handler; QR sits forever | Add 120s QR expiry countdown with auto-retry button |
| 6 | Hardcoded testnet Horizon URL | multi-wallet-store.ts:369 | `horizon-testnet.stellar.org` hardcoded | Read network from env or wallet adapter |
| 7 | Dead network mismatch detection | Both pages | Network mismatch creates silent failures | Add explicit network check before connection |

### 4.2 Wallet Adapter Connection Sequence (Fixed)

```
handleSelectWallet(walletId)
    │
    ├── walletId === "passkey"
    │       ├── login:    call handlePasskeyConnect (skip email, use stored passkey)
    │       └── register: setStep("verify-email") → after verification → call handlePasskeyCreate
    │
    ├── wallet.category === "hardware" (Ledger)
    │       └── setShowLedgerPrompt(true) — no change needed
    │
    ├── walletId === "walletconnect"
    │       ├── setIsWc2Active(true)
    │       ├── Dynamically import WC2 adapter
    │       ├── Register pairing URI callback BEFORE calling connect
    │       ├── Call connect("walletconnect")
    │       ├── WAIT for session_update event (NOT set state immediately)
    │       ├── On session_update → setWc2PairingState("approved")
    │       ├── On 120s timeout → setWc2PairingState("timeout") + show retry button
    │       └── On user reject → setWc2PairingState("rejected")
    │
    └── wallet.category === "extension" (Freighter, Rabet, xBull, Albedo)
            ├── Call connect(walletId)
            ├── On success → auto-advance to sign step
            ├── On error → show error, enable retry
            └── POST-connect: verify network matches expected
```

### 4.3 WC2 Pairing Race Condition Fix

**Problem:** Original code at login/page.tsx:172 calls `setWc2PairingState("approved")` immediately after `connect("walletconnect")` without waiting for the actual wallet approval.

**Fix:**
```typescript
// Before calling connect, register a one-time session listener
const sessionHandler = (session: SessionTypes.Struct) => {
  setWc2PairingState("approved")
  setWc2PairingUri(null)  // QR no longer needed
  // Remove listener after first event
  web3wallet?.core?.pairing?.events?.off("pairing:approve", sessionHandler)
}

// Register listener BEFORE connect
web3wallet?.on("session_proposal", sessionHandler)  // or session_approve

// Then call connect
await connect("walletconnect")

// Set timeout
const timeout = setTimeout(() => {
  setWc2PairingState("timeout")
  sessionHandler = null
}, 120000)
```

### 4.4 Desktop vs Mobile Detection

```typescript
// Keep existing detection but extract to a utility
export function isMobileDevice(): boolean {
  if (typeof navigator === "undefined") return false
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
}

export function isDesktopDevice(): boolean {
  return !isMobileDevice()
}
```

---

## 5. Page Structures (Post-Rebuild)

### 5.1 login/page.tsx (~80 lines)

```typescript
"use client"
import { useAuthFlow } from "@/components/auth/auth-flow-context"
import { AuthLayout } from "@/components/auth/auth-layout"
import { ChooseWalletStep } from "@/components/auth/choose-wallet-step"
import { SignStep } from "@/components/auth/sign-step"
import { LoadingOverlay } from "@/components/auth/loading-overlay"
import { useRedirectIfAuthenticated } from "@/hooks/use-redirect-if-authenticated"

export default function LoginPage() {
  const { mode, status, startLoginFlow } = useAuthFlow()
  useRedirectIfAuthenticated()

  // Initialize on mount
  useEffect(() => {
    mode !== "login" && startLoginFlow()
  }, [mode, startLoginFlow])

  return (
    <AuthLayout title="Moistello">
      {status.status === "connecting" || status.status === "signing" ? (
        <LoadingOverlay message="Signing you in..." />
      ) : status.status === "connected" ? (
        <SignStep mode="login" />
      ) : status.status === "authenticated" ? (
        <RedirectingToDashboard />
      ) : (
        <ChooseWalletStep mode="login" />
      )}
    </AuthLayout>
  )
}
```

### 5.2 register/page.tsx (~150 lines)

```typescript
"use client"
import { useAuthFlow } from "@/components/auth/auth-flow-context"
import { AuthLayout } from "@/components/auth/auth-layout"
import { AuthStepIndicator } from "@/components/auth/auth-step-indicator"
import { ChooseWalletStep } from "@/components/auth/choose-wallet-step"
import { VerifyEmailStep } from "@/components/auth/verify-email-step"
import { ProfileStep } from "@/components/auth/profile-step"
import { SignStep } from "@/components/auth/sign-step"
import { LoadingOverlay } from "@/components/auth/loading-overlay"
import { useRedirectIfAuthenticated } from "@/hooks/use-redirect-if-authenticated"

const STEPS = [
  { num: 1, label: "Choose", key: "choose" },
  { num: 2, label: "Verify", key: "verify-email" },
  { num: 3, label: "Profile", key: "profile" },
  { num: 4, label: "Verify", key: "sign" },
]

export default function RegisterPage() {
  const { mode, status, step, startRegisterFlow } = useAuthFlow()
  useRedirectIfAuthenticated()

  useEffect(() => {
    mode !== "register" && startRegisterFlow()
  }, [mode, startRegisterFlow])

  return (
    <AuthLayout title="Moistello">
      <AuthStepIndicator steps={STEPS} currentStep={step} />
      
      {step === "choose" && <ChooseWalletStep mode="register" />}
      {step === "verify-email" && <VerifyEmailStep />}
      {step === "profile" && <ProfileStep />}
      {step === "sign" && <SignStep mode="register" />}
      
      {status.status === "authenticated" && <RedirectingToDashboard />}
    </AuthLayout>
  )
}
```

---

## 6. Component Specifications

### 6.1 auth-layout.tsx

**Purpose:** Shared card wrapper used by both login and register pages. Eliminates the 30-line duplicated card markup found in both pages.

**Props:**
```typescript
interface AuthLayoutProps {
  title: string        // Brand title (always "Moistello")
  children: ReactNode
  footerLinks?: { label: string; href: string; text: string }[]
}
```

**States:**
- Default: Card centered on screen with gradient/glass background
- The footer links vary:
  - Login: "Don't have an account? Create one" + "← Back to home"
  - Register: "Already have an account? Sign in" + "← Back to home"

### 6.2 choose-wallet-step.tsx

**Purpose:** Wallet/detection and selection for both login and register.

**Props:**
```typescript
interface ChooseWalletStepProps {
  mode: "login" | "register"
}
```

**Sub-components:**
- `WalletGrid` — Grid of detected wallets
- `WalletCard` — Individual wallet button (existing, renamed from auth-wallet-card)
- `PasskeyShortcut` — Quick passkey button (login only shows if passkey exists)
- `Wc2ConnectionState` — QR code / deep link for WalletConnect (existing: auth-connection-state)
- `LedgerPrompt` — Ledger connection modal (existing)

**Wallet detection order (by priority):**
1. Passkey (if stored)
2. Freighter
3. xBull
4. Rabet
5. Albedo
6. WalletConnect
7. Ledger

**States:**
- Scanning: `useMultiWalletStore.isScanning` → show loader
- Wallets detected: Show grid with detected/not_detected status
- No wallets: Fallback message "Install a Stellar wallet like Freighter"
- Connecting: Overlay loader on the selected wallet card
- WC2 active: Show QR code or deep link component
- WC2 timeout: Show error with retry button
- Ledger active: Show LedgerPrompt modal

**Edge cases:**
- User opens page, closes wallet extension without approving → error state
- WC2 QR expires → show retry
- User switches browser tab during WC2 → state preserved
- Extension not installed → greyed out with "Not installed" label

### 6.3 verify-email-step.tsx

**Purpose:** Email input + verification code entry for passkey registration.

**Sub-states:**
```typescript
type EmailVerificationState = 
  | { phase: "input" }
  | { phase: "sending" }
  | { phase: "sent"; verificationId: string; expiresAt: number }
  | { phase: "verifying" }
  | { phase: "verified" }
  | { phase: "error"; message: string; canRetry: boolean }
```

**Phase: input**
```
┌─────────────────────────────────────┐
│                                     │
│    [back button]                    │
│                                     │
│        🔒 [fingerprint icon]        │
│                                     │
│    Create Your Account              │
│    Enter your email to get started  │
│                                     │
│    ┌─────────────────────────────┐  │
│    │ [email input field]         │  │
│    └─────────────────────────────┘  │
│    [error message if validation]    │
│                                     │
│    [       Confirm Email        ]   │
│                                     │
│    Security note about key          │
│    derivation and device storage    │
└─────────────────────────────────────┘
```

**Phase: sent**
```
┌─────────────────────────────────────┐
│                                     │
│    [back button]                    │
│                                     │
│    Check your inbox                 │
│    We sent a code to {email}        │
│                                     │
│    ┌─┐ ┌─┐ ┌─┐ ┌─┐ ┌─┐ ┌─┐       │
│    │0│ │0│ │0│ │0│ │0│ │0│         │
│    └─┘ └─┘ └─┘ └─┘ └─┘ └─┘       │
│    [error message if wrong code]   │
│                                     │
│    [       Verify Code          ]   │
│                                     │
│    Didn't receive it?  [Resend]     │
│    Code expires in 8:32             │
└─────────────────────────────────────┘
```

**Phase: verifying**
- All inputs disabled
- Button shows spinning loader
- "Verifying code..."

**Phase: verified**
- Auto-advance to passkey creation
- "Email verified! Creating your passkey..."
- Triggers WebAuthn navigator.credentials.create()

**Phase: error**
- Show error message
- If canRetry is true: show "Try Again" button
- If expired: return to phase "input" with email pre-filled

**Validation rules:**
- Email must match /^[^\s@]+@[^\s@]+\.[^\s@]+$/
- Max length 254 characters
- 6-digit code must be exactly 6 digits
- Code must be entered within 10 minutes
- Max 3 sends per 10 minutes

### 6.4 profile-step.tsx

**Purpose:** Display name, email (optional), country, language selection.

**Already exists in register page — will extract to component.**

**Fields:**
| Field | Type | Required | Validation | Default |
|-------|------|----------|-----------|---------|
| displayName | text | Yes | 2-64 chars, trimmed | "" |
| email | email | No | valid format if provided | "" |
| countryCode | select | No | from allowed list | "" |
| language | select | No | from allowed list | "en" |

**States:**
- Editing: All fields enabled, validation on blur
- Submitting: Fields disabled, button shows loader
- Error: Field-level errors highlighted, form-level error displayed

### 6.5 sign-step.tsx

**Purpose:** Review connection, sign nonce, submit to server.

**Flow:**
1. Show connected wallet badge (name + shortened address)
2. Show profile summary (if register)
3. Fetch nonce from /auth/nonce
4. Sign nonce via wallet adapter
5. Submit signature + profile to /auth/verify or /auth/register
6. On success: store tokens, set authenticated, redirect to dashboard

**States:**
```
idle → fetching_nonce → signing → submitting → success (redirect)
  │                       │          │
  │                       │          └── error → show error + retry
  │                       └── error → show error + retry
  └── error → show error + retry
```

**Already signed state:** If user refreshes at this step, nonce and signature are preserved (stored in auth-flow-store, persisted to sessionStorage) so they don't need to re-sign.

---

## 7. Store Refactoring Plan

### 7.1 Current Store Overlap

| State | multi-wallet-store | auth-store | auth-flow-store | Conflict? |
|-------|:------------------:|:----------:|:---------------:|:---------:|
| Wallet connection | ✓ | ✗ | ✓ | auth-flow duplicates multi-wallet |
| isConnected | ✓ | ✗ | ✓ | auth-flow duplicates multi-wallet |
| address | ✓ | ✗ | ✓ | auth-flow duplicates multi-wallet |
| JWT token | ✗ | ✓ | ✗ | No conflict |
| isAuthenticated | ✗ | ✓ | ✓ | auth-flow duplicates auth-store |
| user profile | ✗ | ✓ | ✓ | auth-flow duplicates auth-store |
| WC2 state | ✓ | ✗ | ✓ | auth-flow duplicates multi-wallet |
| Passkey state | ✓ | ✗ | ✓ | auth-flow duplicates multi-wallet |
| Error state | ✓ | ✗ | ✓ | auth-flow duplicates multi-wallet |
| Step/flow progress | ✗ | ✗ | ✓ | Only in auth-flow |

### 7.2 New Store Architecture

```
auth-flow-store.ts (PAGES LAYER — auth pages ONLY)
    │
    ├── Reads from: multi-wallet-store (login/register read wallet state through here)
    ├── Writes to: multi-wallet-store (on successful connect, delegates wallet state)
    ├── Reads from: auth-store (reads isAuthenticated, token)
    ├── Writes to: auth-store (on successful auth, sets tokens)
    └── Owns: step progression, email verification, profile form

multi-wallet-store.ts (WALLET LAYER — wallet management for all pages)
    │
    ├── Owns: wallet connections, WC2 state, Ledger state, passkey state
    ├── Unchanged from current state
    └── Consumed by: auth pages (through bridge), dashboard, wallet page

auth-store.ts (SESSION LAYER — authentication for all pages)
    │
    ├── Owns: JWT tokens, user profile, isAuthenticated, checkAuth, logout
    ├── Unchanged from current state
    └── Consumed by: auth pages (through bridge), dashboard, API client
```

### 7.3 Bridge Layer (auth-flow-context.tsx)

```typescript
// This is the GLUE CODE that syncs the 3 stores.
// auth pages call ONLY this context; never access stores directly.

function AuthFlowProvider({ children }) {
  // Proxy reads through bridge
  const address = useMultiWalletStore(s => s.address)
  const isConnected = useMultiWalletStore(s => s.isConnected)
  const isAuthenticated = useAuthStore(s => s.isAuthenticated)
  const [flowState, flowActions] = useAuthFlowStore()

  // Sync actions: when flow says connect, delegate to multi-wallet
  const connect = async (walletId: string) => {
    flowActions.connectStart(walletId)
    try {
      await useMultiWalletStore.getState().connect(walletId)
      const addr = useMultiWalletStore.getState().address
      flowActions.connectSuccess(walletId, addr!)
    } catch (err) {
      flowActions.setError("connection_rejected", err.message)
    }
  }

  // Sync auth: when flow says sign success, delegate to auth-store
  const authenticate = (token: string, refreshToken: string) => {
    useAuthStore.getState().setTokens(token, refreshToken)
    useAuthStore.setState({ isAuthenticated: true })
    flowActions.authenticated()
  }

  return (
    <AuthFlowContext.Provider value={{ ...flowState, ...flowActions, connect, authenticate }}>
      {children}
    </AuthFlowContext.Provider>
  )
}
```

---

## 8. Testing Strategy

### 8.1 Test Pyramid

```
         ╱╲
        ╱  ╲
       ╱ E2E ╲                 3 Playwright tests (live site)
      ╱────────╲
     ╱          ╲
    ╱ Integration ╲            8 API + store + component interaction tests
   ╱────────────────╲
  ╱                  ╲
 ╱    Unit Tests      ╲         35+ tests for individual components, hooks, utils
╱────────────────────────╲
```

### 8.2 Unit Tests (35+ tests)

**Directory structure:**
```
src/components/auth/__tests__/
├── auth-layout.test.tsx
├── choose-wallet-step.test.tsx
├── verify-email-step.test.tsx
├── profile-step.test.tsx
├── sign-step.test.tsx
├── wallet-grid.test.tsx
├── wallet-card.test.tsx
├── passkey-shortcut.test.tsx
├── wc2-connection-state.test.tsx
├── connected-badge.test.tsx
├── error-display.test.tsx
├── loading-overlay.test.tsx

src/hooks/__tests__/
├── use-auth-flow.test.ts
├── use-email-verification.test.ts
├── use-redirect-if-authenticated.test.ts
├── use-wallet-connection.test.ts
├── use-sign-message.test.ts
├── use-profile-form.test.ts

src/stores/__tests__/
├── auth-flow-store.test.ts
├── multi-wallet-store.test.ts  (existing)
└── auth-store.test.ts
```

**Test categories and count:**

| Category | Count | What We Test |
|----------|:-----:|-------------|
| Rendering | 10 | Each component renders correctly in all states |
| User interaction | 8 | Button clicks, input changes, form submits |
| State transitions | 6 | auth-flow-store transitions are valid |
| Edge cases | 6 | Empty states, error states, timeouts, network failures |
| Validation | 5 | Email validation, code validation, display name validation |

**Coverage targets per component:**

| Component | Unit Tests | Lines | Coverage Target |
|-----------|:----------:|:-----:|:--------------:|
| auth-layout | 2 | ~40 | 100% |
| choose-wallet-step | 5 | ~120 | 95% |
| verify-email-step | 6 | ~180 | 95% |
| profile-step | 4 | ~100 | 95% |
| sign-step | 4 | ~100 | 95% |
| wallet-grid | 3 | ~60 | 100% |
| wallet-card | 3 | ~90 | 100% |
| auth-flow-store | 4 | ~190 | 90% |
| Hooks (6 hooks) | 8 | ~200 total | 85% |

### 8.3 Integration Tests (8 tests)

| Test | What It Validates | Key Assertions |
|------|------------------|----------------|
| 1. Login with Freighter | Full login flow | 1. Wallet detected → 2. Connected → 3. Nonce fetched → 4. Signed → 5. Token stored → 6. Redirected |
| 2. Register with Freighter | Full register flow | 1. Wallet detected → 2. Connected → 3. Profile filled → 4. Nonce signed → 5. Account created → 6. Redirected |
| 3. Passkey login | Passkey auth flow | 1. Passkey exists → 2. Biometric prompt → 3. Signed → 4. Token stored |
| 4. Passkey registration with email verification | Full passkey reg | 1. Email entered → 2. Code sent → 3. Code verified → 4. Passkey created → 5. Profile → 6. Account created |
| 5. WC2 login | WalletConnect on desktop | 1. QR code displayed → 2. Awaiting approval → 3. Approved → 4. Signed |
| 6. WC2 login on mobile | WalletConnect on mobile | 1. Deep link triggered → 2. Awaiting approval → 3. Approved → 4. Signed |
| 7. Login error handling | All error paths | 1. Connection rejected → 2. Sign rejected → 3. Network mismatch → 4. Timeout → each shows correct error |
| 8. Registration validation | Form validation | 1. Empty display name → 2. Invalid email → 3. Too long name → each shows field error |

### 8.4 End-to-End Tests (E2E — Playwright on Live Site)

**Test environment:**
- Playwright with Chromium, Firefox, WebKit
- Headless mode for CI, headed mode for debugging
- Run against https://moistello.com (LIVE PRODUCTION)
- Mobile emulation via Playwright's device profiles (iPhone 14, Pixel 7)
- Desktop viewport: 1440×900, 1024×768 (iPad)
- Slow network simulation: 3G throttling for timeout tests

**Test configuration:**
```typescript
// playwright.config.ts (e2e/)
import { defineConfig, devices } from "@playwright/test"

export default defineConfig({
  testDir: "./tests",
  timeout: 60000,          // 60s per test (WC2 QR can be slow)
  retries: 2,
  use: {
    baseURL: "https://moistello.com",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium-desktop",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "firefox-desktop",
      use: { ...devices["Desktop Firefox"] },
    },
    {
      name: "webkit-desktop",
      use: { ...devices["Desktop Safari"] },
    },
    {
      name: "chromium-mobile",
      use: { ...devices["Pixel 7"] },
    },
    {
      name: "safari-mobile",
      use: { ...devices["iPhone 14"] },
    },
  ],
  webServer: {
    command: "npm run build && npm run start",  // Only if testing local build
    port: 1110,
    reuseExistingServer: !process.env.CI,
  },
})
```

**E2E Test 1: Login Page Loads Correctly (all browsers)**
```typescript
test("login page renders wallet grid on desktop, detects QR on mobile", async ({ page, isMobile }) => {
  await page.goto("/login")

  // Common: page loaded
  await expect(page).toHaveTitle(/Moistello/)
  await expect(page.locator("text=Moistello")).toBeVisible()

  if (isMobile) {
    // Mobile: should see WalletConnect as primary option
    await expect(page.locator("text=WalletConnect")).toBeVisible()
    await expect(page.locator("text=Mobile wallets")).toBeVisible()
  } else {
    // Desktop: should see extension wallets
    await expect(page.locator("text=Freighter")).toBeVisible()
    await expect(page.locator("text=WalletConnect")).toBeVisible()
  }

  // Navigation links present
  await expect(page.locator('a[href="/register"]')).toBeVisible()
  await expect(page.locator('a[href="/"]')).toBeVisible()
})
```

**E2E Test 2: Register Page Shows Passkey First**
```typescript
test("register page shows passkey as recommended option", async ({ page }) => {
  await page.goto("/register")

  // Passkey should be prominently displayed
  await expect(page.locator("text=Passkey")).toBeVisible()
  await expect(page.locator("text=Recommended")).toBeVisible()
  await expect(page.locator("text=Email + Biometric")).toBeVisible()

  // Wallet grid visible
  await expect(page.locator("text=Freighter")).toBeVisible()

  // Click passkey should navigate to email step
  await page.click("text=Passkey")
  await expect(page.locator("text=Create Your Account")).toBeVisible()
  await expect(page.locator('input[type="email"]')).toBeVisible()
})
```

**E2E Test 3: Email Verification Flow (Full Integration with Backend)**
```typescript
test("email verification sends code, accepts code, creates passkey", async ({ page }) => {
  await page.goto("/register")
  await page.click("text=Passkey")

  // Phase: input
  const emailInput = page.locator('input[type="email"]')
  await emailInput.fill("test-user@moistello-test.com")
  await page.click("text=Confirm Email")

  // Phase: sending (brief)
  await expect(page.locator("text=Sending verification code...")).toBeVisible({ timeout: 1000 })

  // Phase: sent — verification code input appears
  await expect(page.locator("text=Check your inbox")).toBeVisible({ timeout: 10000 })
  await expect(page.locator("text=Enter the 6-digit code")).toBeVisible()

  // Fill verification code (get from API or test DB)
  const code = await getVerificationCodeForEmail("test-user@moistello-test.com")
  const codeInputs = page.locator('input[inputmode="numeric"]')
  for (let i = 0; i < 6; i++) {
    await codeInputs.nth(i).fill(code[i])
  }

  await page.click("text=Verify Code")

  // Phase: verified → passkey creation
  await expect(page.locator("text=Email verified!")).toBeVisible()
  // WebAuthn will fail in headless, but we verify the WebAuthn API is called
  // by checking mock or if browser supports it
})
```

**E2E Test 4: WalletConnect QR Code Appears on Desktop**
```typescript
test("WC2 QR code renders on desktop when WalletConnect is selected", async ({ page }) => {
  test.skip(!!page.context()._options?.isMobile, "Desktop-only test")

  await page.goto("/login")
  await page.click("text=WalletConnect")

  // Should show QR code container
  await expect(page.locator("text=Connect with WalletConnect")).toBeVisible()
  await expect(page.locator("text=Scan the QR code with your mobile wallet")).toBeVisible()

  // QR code image or canvas should be rendered
  await expect(page.locator("canvas, img[alt*='QR']")).toBeVisible({ timeout: 15000 })

  // Cancel button should work
  await page.click("text=Cancel")
  await expect(page.locator("text=Welcome back")).toBeVisible()
})
```

**E2E Test 5: WalletConnect Deep Link Appears on Mobile**
```typescript
test("WC2 deep link renders on mobile when WalletConnect is selected", async ({ page }) => {
  test.skip(!page.context()._options?.isMobile, "Mobile-only test")

  await page.goto("/login")
  await page.click("text=WalletConnect")

  // Should NOT show QR instructions
  await expect(page.locator("text=Scan the QR code")).not.toBeVisible()

  // Should show deep link instructions
  await expect(page.locator("text=Open your wallet app to connect")).toBeVisible()

  // Should show deep link button (vessel:// or walletconnect://)
  await expect(page.locator('a[href*="walletconnect"], a[href*="vessel"]')).toBeVisible()
})
```

**E2E Test 6: NO Wallets Available State**
```typescript
test("shows no-wallets message when no wallets detected", async ({ page }) => {
  // Block extension injection via CDP
  await page.route("**/webextension/**", (route) => route.abort())
  await page.goto("/login")

  await expect(page.locator("text=No wallets available")).toBeVisible()
  await expect(page.locator("text=Install a Stellar wallet like Freighter")).toBeVisible()
})
```

**E2E Test 7: WC2 QR Expiry and Retry**
```typescript
test("WC2 QR expires after timeout and shows retry", async ({ page }) => {
  await page.goto("/login")
  await page.click("text=WalletConnect")

  // Wait for QR
  await expect(page.locator("canvas, img[alt*='QR']")).toBeVisible({ timeout: 15000 })

  // Fast-forward 130 seconds (QR expires at 120s)
  await page.clock.fastForward(130000)

  // Should show timeout state
  await expect(page.locator("text=Connection expired")).toBeVisible()
  await expect(page.locator("text=Retry")).toBeVisible()

  // Click retry → should generate new QR
  await page.click("text=Retry")
  await expect(page.locator("canvas, img[alt*='QR']")).toBeVisible({ timeout: 15000 })
})
```

**E2E Test 8: Network Error Handling**
```typescript
test("shows error when API is unreachable during login", async ({ page }) => {
  // Block API calls
  await page.route("**/api/**", (route) => route.abort("connectionrefused"))
  await page.goto("/login")

  // If a wallet is detected, clicking it should attempt API call and fail
  const walletButton = page.locator("button:has-text('Freighter')")
  if (await walletButton.isVisible()) {
    await walletButton.click()
    // Should eventually show error toast
    await expect(page.locator("text=Connection Failed").or(page.locator("text=Authentication failed"))).toBeVisible({ timeout: 15000 })
  }
})
```

### 8.5 E2E Test Infrastructure

**Directory:**
```
e2e/
├── playwright.config.ts
├── tests/
│   ├── login.spec.ts
│   ├── register.spec.ts
│   ├── passkey.spec.ts
│   ├── walletconnect.spec.ts
│   └── email-verification.spec.ts
├── fixtures/
│   └── test-accounts.ts      # Test wallet addresses / emails
├── helpers/
│   ├── api.ts                 # Helper to call Moistello API
│   ├── email.ts               # Helper to read verification codes from test inbox
│   └── wallet.ts              # Helper to mock wallet extensions
├── global-setup.ts            # Global beforeAll — create test accounts
└── global-teardown.ts         # Global afterAll — clean up test accounts
```

**Test accounts fixture:**
```typescript
export const TEST_ACCOUNTS = {
  freighter: {
    publicKey: "GB...",       // Known test account on testnet
    secretKey: "S...",        // ONLY for test — never commit real keys
  },
  email: {
    address: "auth-test-001@moistello-test.com",  // Catch-all test domain
    inboxUrl: "https://api.moistello-test.com/inbox/auth-test-001",  // Test inbox API
  },
  passkey: {
    // Passkey is device-bound, so we mock WebAuthn API
    mockCredentialId: "test-credential-id-001",
  },
}
```

**CI Configuration:**
```yaml
# .github/workflows/e2e.yml
name: Auth E2E Tests
on: [deployment_status]
jobs:
  e2e:
    if: github.event.deployment_status.state == 'success'
    runs-on: ubuntu-latest
    strategy:
      matrix:
        browser: [chromium, firefox, webkit]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npx playwright install --with-deps ${{ matrix.browser }}
      - run: npx playwright test --project=${{ matrix.browser }}-desktop
        env:
          BASE_URL: ${{ github.event.deployment_status.environment_url }}
      - run: npx playwright test --project=chromium-mobile
        env:
          BASE_URL: ${{ github.event.deployment_status.environment_url }}
```

---

## 9. Implementation Timeline

### Phase 1: Foundation (4 hours)
| Step | Task | Output | Dependencies |
|:----:|------|--------|:-----------:|
| 1.1 | Refactor auth-flow-store: add email verification fields | Updated store interface | None |
| 1.2 | Create auth-flow-context.tsx with bridge to multi-wallet-store and auth-store | Context + Provider | 1.1 |
| 1.3 | Create auth-layout.tsx | Layout component | None |
| 1.4 | Create wallet-grid.tsx + extract wallet-card from existing code | 2 components | None |
| 1.5 | Create connected-badge.tsx, error-display.tsx, loading-overlay.tsx | 3 utility components | None |

### Phase 2: Core Components (6 hours)
| Step | Task | Output | Dependencies |
|:----:|------|--------|:-----------:|
| 2.1 | Create choose-wallet-step.tsx with WalletConnect orchestration | Step component | 1.2, 1.3, 1.4 |
| 2.2 | Create verify-email-step.tsx with email + code UI + API calls | Step component | 1.2 |
| 2.3 | Create profile-step.tsx (extract from register/page.tsx) | Step component | None |
| 2.4 | Create sign-step.tsx with nonce fetch + sign + submit | Step component | 1.2, 1.4 |
| 2.5 | Create use-email-verification.ts, use-sign-message.ts, use-profile-form.ts hooks | 3 hooks | 2.2, 2.4 |

### Phase 3: Page Rewrites (4 hours)
| Step | Task | Output | Dependencies |
|:----:|------|--------|:-----------:|
| 3.1 | Rewrite login/page.tsx | ~80 lines | All Phase 1 + 2 |
| 3.2 | Rewrite register/page.tsx | ~150 lines | All Phase 1 + 2 |
| 3.3 | Delete unused/dead code: old inline auth UI paths in stores | Clean codebase | 3.1, 3.2 |
| 3.4 | Manual QA on all flows in dev environment | Sign-off | 3.1, 3.2 |

### Phase 4: Testing (6 hours)
| Step | Task | Output | Dependencies |
|:----:|------|--------|:-----------:|
| 4.1 | Write 35 unit tests for all components and hooks | Test suite | All Phase 2 + 3 |
| 4.2 | Write 8 integration tests for auth flows | Test suite | 4.1 |
| 4.3 | Write 8 Playwright E2E tests | Test suite | 4.2, live site access |
| 4.4 | Set up CI pipeline for E2E on deployment | CI workflow | 4.3 |

---

## 10. Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|:----------:|:------:|:----------:|
| WalletConnect API changes | Low | High | Pin SDK version, integration tests catch breakage |
| WebAuthn API not available (old browser) | Medium | Medium | Fallback to "browser not supported" message, suggest extension wallet |
| Stellar testnet downtime during CI | Low | Medium | Retry logic in tests, fallback to mocks for CI |
| Email delivery delays during E2E | Medium | Medium | Poll with timeout (30s max), use test inbox API |
| Passkey tests in headless browser | High | High | Mock WebAuthn API with `page.evaluate()` to inject mock credentials |
| WC2 requires real wallet to approve | Very High | High | Cannot fully automate WC2 approval in headless. Test QR renders (visual), test deep link (structural). Pairing approval requires manual step or sidecar wallet simulator. |
| Freighter/Rabet extensions not available in browser automation | High | Medium | Extensions cannot be loaded in CI Playwright. Test detection message rendering, not actual extension connection. |
| Rate limiting on live site during tests | Medium | Medium | Use dedicated test accounts, disable rate limiting for test API key |
| Sleep/await timing flakiness | Medium | Medium | Use `waitForSelector`, not fixed timeouts; Playwright auto-waits |

### WC2 Automation Strategy
Since WC2 cannot be fully automated (requires a real wallet to approve QR scans), the test strategy is:
1. Test that QR code canvas renders → visual confirmation that pairing is initiated
2. Test that QR expiry triggers timeout state → state machine correctness
3. Test that retry button generates new QR → recovery path correctness
4. Test that deep link URL is correct on mobile → URL format validation
5. Manual approval: document manual test script for QA

---

## 11. Manual QA Script

For the flows that cannot be automated (WC2 pairing, actual passkey biometric, hardware wallet), this manual script must be followed before deployment:

### Pre-QA Checklist
- [ ] Branch deployed to staging environment
- [ ] Backend API running on staging
- [ ] Test Stellar accounts funded with test XLM

### Login Flow
1. [ ] Open https://staging.moistello.com/login in Chrome with Freighter installed
2. [ ] Verify Freighter appears in wallet grid as "detected"
3. [ ] Verify Rabet appears as "not detected" (if not installed)
4. [ ] Click Freighter — verify Freighter popup opens
5. [ ] Approve in Freighter — verify advances to "Signing you in..."
6. [ ] Verify toast "Welcome back!" appears
7. [ ] Verify redirected to dashboard
8. [ ] Repeat steps 1-7 on Firefox
9. [ ] Repeat steps 1-7 on Safari (WebKit)

### Passkey Login
1. [ ] Open https://staging.moistello.com/login in Chrome
2. [ ] Click "Sign in with Passkey"
3. [ ] Verify browser biometric prompt appears
4. [ ] Authenticate via fingerprint/face
5. [ ] Verify signed in and redirected

### Register Flow (Extension Wallet)
1. [ ] Open https://staging.moistello.com/register in Chrome with Freighter
2. [ ] Verify passkey is shown as "Recommended"
3. [ ] Click Freighter — verify Freighter popup opens
4. [ ] Approve — verify advances to Profile step
5. [ ] Fill display name, email, country, language
6. [ ] Click "Continue" — verify advances to Verify step
7. [ ] Review profile summary
8. [ ] Click "Create Account" — verify Freighter requests signature
9. [ ] Sign — verify toast "Welcome to Moistello!"
10. [ ] Verify redirected to dashboard

### Register Flow (Passkey + Email Verification)
1. [ ] Open https://staging.moistello.com/register in Chrome
2. [ ] Click "Passkey"
3. [ ] Enter email "test@example.com"
4. [ ] Click "Confirm Email"
5. [ ] Check test inbox for verification code
6. [ ] Enter 6-digit code
7. [ ] Click "Verify Code"
8. [ ] Verify browser biometric prompt appears
9. [ ] Authenticate via biometric
10. [ ] Verify advances to Profile step with "Connected ✓ Passkey"
11. [ ] Fill profile details
12. [ ] Click "Continue"
13. [ ] Click "Create Account"
14. [ ] Verify toast "Welcome to Moistello!"
15. [ ] Verify redirected to dashboard

### WalletConnect QR Generation
1. [ ] Open https://staging.moistello.com/login in Chrome (desktop mode)
2. [ ] Click "WalletConnect"
3. [ ] Verify QR code renders
4. [ ] Verify "Scan the QR code with your mobile wallet" text appears
5. [ ] Click "Cancel" — verify returns to wallet selection

### WalletConnect Mobile Detection
1. [ ] Open https://staging.moistello.com/login in Chrome DevTools (mobile mode: Pixel 7)
2. [ ] Click "WalletConnect"
3. [ ] Verify QR code does NOT render
4. [ ] Verify "Open your wallet app to connect" text appears
5. [ ] Verify deep link URL is present (hidden or as link)

### Error Handling
1. [ ] Open https://staging.moistello.com/login, click Freighter → reject in Freighter
2. [ ] Verify error message "User rejected the request" appears
3. [ ] Open https://staging.moistello.com/login, click WalletConnect
4. [ ] Wait 2 minutes — verify "Connection expired" appears
5. [ ] Click "Retry" — verify new QR code generates
6. [ ] Open https://staging.moistello.com/register, click "Create Account" without filling display name
7. [ ] Verify field error "Display name is required"

### Regression Checks
1. [ ] Dashboard still loads after login
2. [ ] Circles page still loads
3. [ ] Wallet page still shows balance
4. [ ] Settings page still loads
5. [ ] Logout works
6. [ ] Refresh token still works (close tab, reopen → still logged in)

---

## 12. Success Criteria

### Must Pass (Gate to Production)
- [ ] login/page.tsx ≤ 100 lines
- [ ] register/page.tsx ≤ 200 lines
- [ ] All 35 unit tests passing
- [ ] All 8 integration tests passing
- [ ] All 8 Playwright E2E tests passing on desktop Chrome
- [ ] Playwright E2E tests passing on mobile Chrome (emulated)
- [ ] Manual QA script fully signed off by developer
- [ ] No regressions in dashboard, wallet, circles, settings pages
- [ ] Passkey login works end-to-end
- [ ] Passkey registration with email verification works end-to-end
- [ ] Freighter login works end-to-end
- [ ] WC2 QR code renders on desktop
- [ ] WC2 deep link triggers on mobile
- [ ] All error states display correctly
- [ ] Login and register each handle all 8 conditional states without crash

### Should Pass (Quality Gates)
- [ ] 95%+ code coverage on auth components
- [ ] auth-flow-store used as single source of truth (no direct useState in pages)
- [ ] No duplicate code between login and register pages
- [ ] WalletConnect adapter refactored to fix race condition
- [ ] All UI states render without layout shift
- [ ] No console errors during any flow
- [ ] Lighthouse performance score ≥ 90 on login and register pages

### Nice to Have
- [ ] Playwright E2E tests passing on Firefox and WebKit
- [ ] Passkey tests with actual WebAuthn (not mocked)
- [ ] WC2 pairing fully automated with wallet simulator sidecar
- [ ] Visual regression tests (screenshot diffing)
- [ ] Accessibility score ≥ 95 (axe-core audit)

---

## 13. Deletion Checklist (What to Remove After Rebuild)

After the rebuild, the following old code must be deleted to prevent confusion:

- [ ] `login/page.tsx` — Replace with new 80-line version
- [ ] `register/page.tsx` — Replace with new 150-line version
- [ ] `stores/auth-flow-store.ts` — Keep it (this IS the new store); do NOT delete
- [ ] `hooks/use-auth-flow.ts` — Rewrite to use new context (or delete if context replaces it)
- [ ] `components/auth/auth-connection-state.tsx` — Keep if reused by choose-wallet-step
- [ ] Old WC2 inline code in login/register — Deleted automatically when pages are replaced

**Files that remain untouched:**
- multi-wallet-store.ts
- auth-store.ts
- All wallet adapters in lib/wallet/
- All tests in lib/wallet/__tests__/

---

## 14. Appendix: auth-flow-store Complete Interface

```typescript
// ==== auth-flow-store.ts — SINGLE SOURCE OF TRUTH ====

export type AuthFlowMode = "login" | "register"

export type AuthFlowStatus =
  | { status: "idle" }
  | { status: "detecting_wallets" }
  | { status: "connecting"; walletId: string | null }
  | { status: "awaiting_approval"; pairingUri: string | null; protocol: "qr" | "deeplink" | null }
  | { status: "connected"; walletId: string; address: string }
  | { status: "signing"; address: string }
  | { status: "signed"; signature: string; nonce: string }
  | { status: "error"; code: AuthErrorCode; message: string; canRetry: boolean }
  | { status: "authenticated" }

export type AuthErrorCode =
  | "connection_timeout"
  | "connection_rejected"
  | "relay_down"
  | "network_mismatch"
  | "auth_server_error"
  | "validation_error"
  | "email_send_failed"
  | "email_code_expired"
  | "email_code_invalid"
  | "email_rate_limited"
  | "internal_error"

export type AuthStep = "choose" | "verify-email" | "profile" | "sign"

interface EmailVerification {
  email: string
  verificationId: string | null
  codeSent: boolean
  codeVerified: boolean
  expiresAt: number | null
  remainingAttempts: number
}

interface AuthFlowState {
  mode: AuthFlowMode
  step: AuthStep
  status: AuthFlowStatus
  error: { code: AuthErrorCode | null; message: string | null } | null
  connection: {
    walletId: string | null
    address: string | null
    pairingUri: string | null
    protocol: "qr" | "deeplink" | null
    relayStatus: "healthy" | "degraded" | "down"
  }
  profile: {
    displayName: string
    email: string
    countryCode: string
    language: string
    fieldErrors: Record<string, string>
  }
  auth: {
    nonce: string | null
    signature: string | null
  }
  emailVerification: EmailVerification
}

interface AuthFlowActions {
  // Lifecycle
  startLoginFlow: () => void
  startRegisterFlow: () => void
  reset: () => void
  
  // Step navigation
  setStep: (step: AuthStep) => void
  goBack: () => void
  
  // Error
  setError: (code: AuthErrorCode, message: string) => void
  clearError: () => void
  
  // Wallet connection
  connect: (walletId: string) => Promise<void>
  connectStart: (walletId: string) => void
  connectSuccess: (walletId: string, address: string) => void
  awaitingApproval: (pairingUri: string, protocol: "qr" | "deeplink") => void
  onConnectionTimeout: () => void
  onConnectionRejected: () => void
  setPairingUri: (uri: string | null) => void
  setRelayStatus: (status: "healthy" | "degraded" | "down") => void
  
  // Email verification
  sendVerificationCode: (email: string) => Promise<void>
  verifyCode: (code: string) => Promise<void>
  resendCode: () => Promise<void>
  clearEmailVerification: () => void
  
  // Profile
  updateProfileField: (field: keyof AuthFlowState["profile"], value: string) => void
  setFieldError: (field: string, error: string | null) => void
  validateProfile: () => boolean
  
  // Signing
  signAndSubmit: () => Promise<void>
  signStart: (address: string) => void
  signSuccess: (signature: string, nonce: string) => void
  authenticated: () => void
  
  // State queries
  isEmailVerified: () => boolean
  isWalletConnected: () => boolean
  canProceed: () => boolean
  currentStepIndex: () => number
  totalSteps: () => number
}

type AuthFlowStore = AuthFlowState & AuthFlowActions
```

---

## 15. Zustand Persistence Middleware

```typescript
// auth-flow-store uses sessionStorage persistence so that:
// 1. If user refreshes during sign step, nonce/signature are preserved (no re-sign)
// 2. If user refreshes during email verification, code state is preserved
// 3. If user navigates away and back, wallet connection state is preserved
// 4. Storage is cleared on logout or successful auth

export const useAuthFlowStore = create<AuthFlowStore>()(
  persist(
    devtools(
      (set, get) => ({
        // ... state and actions as defined in section 14
      }),
      { name: "auth-flow-store" }
    ),
    {
      name: "moistello-auth-flow",
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        // Only persist what's needed for recovery
        step: state.step,
        emailVerification: state.emailVerification,
        auth: state.auth,
        profile: state.profile,
      }),
    }
  )
)
```

---

## 16. Agent Rules — What Agents Must Never Do

Derived from the 30 common agent mistakes identified during the deep audit.

### 16.1 Store & State Violations

| # | Rule | Violates Mistake |
|---|------|:----------------:|
| 1 | NEVER access `useMultiWalletStore.getState()` or `useAuthStore.getState()` directly in auth pages. Go through `useAuthFlow()` context only. | 2 |
| 2 | NEVER add a new `useState` in login/page.tsx or register/page.tsx. All state belongs in `auth-flow-store`. | 2 |
| 3 | NEVER leave a discriminated union variant unhandled. Every `AuthFlowStatus` variant must have an explicit render path. | 3 |
| 4 | NEVER forget to clear `auth-flow-store` on logout. Always call `reset()` before `auth-store.logout()`. | 4 |
| 5 | NEVER use `localStorage` for auth-flow persistence. Use `sessionStorage` only. | 5 |

### 16.2 Wallet Connection Violations

| # | Rule | Violates Mistake |
|---|------|:----------------:|
| 6 | NEVER call `setWc2PairingState("approved")` before the `session_proposal` event fires. The fix is mandatory. | 6 |
| 7 | NEVER import WalletConnect adapter at module scope. Use dynamic `import()` inside the handler only. | 7 |
| 8 | NEVER assume only `extension`, `hardware`, `walletconnect`, and `passkey` categories exist. Default unknown categories to graceful fallback. | 8 |
| 9 | NEVER leave a WC2 session alive when user navigates back. Call `disconnectWc()` and `resetWcState()` before changing steps. | 9 |
| 10 | NEVER replace the existing QR canvas component without verifying it renders at non-zero dimensions. | 10 |

### 16.3 Email Verification Violations

| # | Rule | Violates Mistake |
|---|------|:----------------:|
| 11 | NEVER use a single text input for verification codes. Always use 6 individual digit inputs with auto-focus. | 11 |
| 12 | NEVER call the send-code API before client-side email validation passes. | 12 |
| 13 | NEVER show a generic error on 429. Show "Try again in N seconds" with a countdown. | 13 |
| 14 | NEVER exclude `emailVerification.verificationId` from sessionStorage persist. Without it, refresh breaks the flow. | 14 |
| 15 | NEVER allow resend without a 60-second client-side cooldown. Disable the button and show countdown. | 15 |

### 16.4 Passkey Violations

| # | Rule | Violates Mistake |
|---|------|:----------------:|
| 16 | NEVER call `navigator.credentials.create()` before checking `PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()`. | 16 |
| 17 | NEVER change salt, iterations, or hash parameters between register and login. Derivation must be deterministic. | 17 |
| 18 | NEVER store the raw 256-bit Ed25519 seed in localStorage. Store only the public key. | 18 |
| 19 | NEVER show "Sign in with Passkey" if the passkey was deleted from browser settings. Check existence first. | 19 |
| 20 | NEVER hardcode WebAuthn relying party ID. Read from `NEXT_PUBLIC_PASSKEY_RP_ID` env var. | 20 |

### 16.5 Testing Violations

| # | Rule | Violates Mistake |
|---|------|:----------------:|
| 21 | NEVER write a Playwright test that expects a browser extension to be installed. Guard with `test.skip()`. | 21 |
| 22 | NEVER commit real API keys, secret keys, or test account private keys to the repository. Use env vars. | 22 |
| 23 | NEVER test passkey flows without mocking the WebAuthn API via `page.evaluate()`. | 23 |
| 24 | NEVER wait real time for WC2 timeout in tests. Use `page.clock.fastForward()`. | 24 |
| 25 | NEVER run tests without clearing sessionStorage/persisted state between each test. | 25 |

### 16.6 Build & Deployment Violations

| # | Rule | Violates Mistake |
|---|------|:----------------:|
| 26 | NEVER use `export` with dynamic `import()` patterns that break Turbopack tree-shaking. | 26 |
| 27 | NEVER add a `"use client"` page without also ensuring its imported components have it. | 27 |
| 28 | NEVER leave old page files in the `(auth)` directory after rewrite. Remove them immediately. | 28 |
| 29 | NEVER add a new component to `src/components/auth/` without updating the barrel `index.ts`. | 29 |
| 30 | NEVER create `__tests__` directories without verifying tsconfig includes them. | 30 |

### 16.7 Golden Rule

If a task is not explicitly listed in this plan file, do not implement it. If you are unsure, ask. Never add features, UI elements, API calls, or dependencies that are not specified here.

---

## 17. Enterprise Standards & Approaches

These standards apply to every file created or modified during this implementation.

### 17.1 Type Safety Standards

```
- Every function must have explicit return type annotation (no inference for public APIs)
- Every React component must have explicit Props interface exported
- Every Zustand action must return void or Promise<void>
- Every API response must be typed via generics (never `as` casting)
- Discriminated unions must have exhaustiveness checked via `switch` with `default: assertNever()`
- `any` is forbidden. Use `unknown` with type guards.
- `!` non-null assertion is forbidden. Use early return or `if` guard.
```

### 17.2 Error Handling Standards

```
- Every async function must have try/catch with typed error handling
- User-facing errors must be strings (never Error objects)
- Internal errors must be logged with context (never shown to user)
- API errors must be parsed from response envelope, not thrown as-is
- Network errors must be mapped to user-friendly messages before display
- Toast notifications must always accompany auth state failures
- Errors must never contain stack traces, internal paths, or secrets
```

### 17.3 Component Standards

```
- Every component must be a named export (no default exports except pages)
- Every component must have a single responsibility (if it does 2 things, split it)
- Conditional rendering must use ternary, not && (prevents rendering 0/false)
- Loading states must be explicit, not inferred
- Error states must be part of the component's normal rendering, not a separate wrapper
- Empty states must be handled (no blank pages)
- Components must not access stores directly — use context or props
- useEffect dependencies must be exhaustive (no eslint-disable comments)
```

### 17.4 Testing Standards

```
- Every component must have at least one render test per state variant
- Every hook must have tests for success, error, loading, and edge cases
- Every Zustand store must have tests for every action
- Integration tests must mock API at network layer (MSW or route interception)
- E2E tests must run against the live production URL
- Test names must follow the pattern: "should [expected behavior] when [condition]"
- Coverage minimum: 95% for components, 90% for stores, 85% for hooks
- Flaky tests must be quarantined, not ignored
```

### 17.5 Security Standards

```
- No secrets, keys, or tokens in code — all from environment variables
- No raw seeds or private keys in storage or logs
- API keys for test accounts must be injected at CI runtime
- Email verification codes must never be logged or exposed in URLs
- Wallet signatures must never be stored beyond the current session
- Nonce must be single-use with 5-minute TTL
- Rate limiting must be enforced client-side AND server-side
```

### 17.6 Performance Standards

```
- Wallet adapter imports must be dynamic (code-split) — never static imports
- Zustand selectors must select primitive values, not entire objects
- Re-renders must be scoped: use individual selectors, not the whole store
- Images must use Next.js Image component with explicit width/height
- Fonts must be preloaded with `next/font`
- No `useEffect` chains — prefer derived state or sync actions
```

### 17.7 Code Review Standards

Before submitting any code:
```
- Run `npm run lint` — zero warnings
- Run `npm run typecheck` — zero errors
- Run `npm run test` — all passing
- Check for console.log, debugger, TODO, FIXME — none committed
- Check for hardcoded URLs, keys, secrets — none in code
- Verify new files are in the correct directory with correct barrel exports
- Verify old files are deleted (not left orphaned)
```

---

## 18. Enterprise Upgrades

All 19 upgrades specified below. Each includes: description, enterprise approach, dependencies, phase assignment, and agent batch size.

### 18.1 Upgrade Index

| # | Upgrade | Phase | Agent Batches | Depends On |
|:-:|---------|:-----:|:-------------:|:----------:|
| 1 | Error Monitoring (Sentry) | P1 | 1 | None |
| 2 | Loading Skeleton | P1 | 1 | None |
| 3 | Password Manager Hints | P1 | 1 | None |
| 4 | Offline Detection | P1 | 1 | None |
| 5 | Multi-Tab Sync | P2 | 1 | P1.4 (auth-flow-store) |
| 6 | Error Recovery for Stale Nonce | P2 | 1 | P1.4 (auth-flow-store) |
| 7 | CSRF Protection | P2 | 1 | P1.1 (API client) |
| 8 | CAPTCHA for Email Send | P2 | 1 | P1.2 (email API) |
| 9 | Accessibility Audit | P2 | 1 | P1.3 (skeleton) |
| 10 | i18n for Auth Pages | P2 | 2 (structure + translations) | P1.3, P1.4 |
| 11 | Session Timeout UX | P3 | 1 | P2.1 (multi-tab sync) |
| 12 | Rate Limit UI for Login | P3 | 1 | P2.3 (CSRF) |
| 13 | WebAuthn Conditional Mediation | P3 | 1 | P2.5 (passkey flow) |
| 14 | Passkey Revocation List | P3 | 1 | P2.5 (passkey flow) |
| 15 | Account Recovery Flow | P4 | 2 (recovery page + email) | P3.1-3.4 |
| 16 | Native Share API for Deep Links | P4 | 1 | P3.5 (WC2 fix) |
| 17 | Analytics Events | P4 | 1 | P3, P4.1-4.3 |
| 18 | WalletConnect v1 Fallback | P5 | 1 | P4.5 (WC2 stable) |
| 19 | Error Monitoring Dashboard | P5 | 1 | P1.1 (Sentry) |

### 18.2 Phase Map

```
Phase 1 (Foundation):     Upgrades 1-4   — 4 agent batches, 0 dependencies
Phase 2 (Infrastructure): Upgrades 5-10  — 7 agent batches, depends on P1
Phase 3 (Security+UX):    Upgrades 11-14 — 4 agent batches, depends on P2
Phase 4 (Polish):         Upgrades 15-17 — 4 agent batches, depends on P3
Phase 5 (Future-Ready):   Upgrades 18-19 — 2 agent batches, depends on P4
                                            ──────────────────
                            Total:         21 agent batches
```

### 18.3 Phase 1 Upgrades — Foundation (Zero Dependencies)

#### 18.3.1 Upgrade 1: Error Monitoring (Sentry/Rollbar)
**Phase:** P1 | **Agent batches:** 1 | **Dependencies:** None

**Enterprise approach:**
```typescript
// src/lib/monitoring.ts
// Sentry is initialized once at app root. Auth errors are breadcrumbed.
// No secrets, no PII, no wallet addresses in Sentry events.
// Error context includes: step name, auth flow mode, error code (never message).
// Rate-limited to 1 event per 10 seconds per user session.

import * as Sentry from "@sentry/nextjs"

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,  // 10% sampling
  beforeSend(event) {
    // Strip PII before sending
    if (event.request?.headers) event.request.headers = {}
    if (event.user) event.user = { id: "redacted" }
    return event
  }
})

// Usage minimum in auth:
export function captureAuthError(code: string, step: string, mode: string) {
  Sentry.addBreadcrumb({
    category: "auth",
    message: `auth.${mode}.${step}: ${code}`,
    level: "error",
  })
}
```

**Implementation:** Add Sentry SDK to package.json, create `src/lib/monitoring.ts`, wrap root layout with Sentry provider, add `captureAuthError` calls in auth-flow-store error handler.

**Agent must not:** Log wallet addresses, signatures, nonces, or email addresses to Sentry.

#### 18.3.2 Upgrade 2: Loading Skeleton
**Phase:** P1 | **Agent batches:** 1 | **Dependencies:** None

**Enterprise approach:**
```typescript
// src/components/auth/auth-skeleton.tsx
// Skeleton matches the exact dimensions of the auth card to prevent layout shift.
// Uses CSS-only shimmer animation (no JS).
// Three variants: card (default), qr-placeholder, wallet-grid.

export function AuthSkeleton({ variant = "card" }: { variant?: "card" | "qr" | "grid" }) {
  // ... renders glass card with animated pulse bars
}
```

**Implementation:** Create `auth-skeleton.tsx`, add to `auth-layout.tsx` as initial render before JS loads, use in `loading-overlay.tsx` instead of spinner.

**Agent must not:** Add JS-based animation libraries. Use pure CSS `animate-pulse` from Tailwind.

#### 18.3.3 Upgrade 3: Password Manager Hints
**Phase:** P1 | **Agent batches:** 1 | **Dependencies:** None

**Enterprise approach:**
Add proper `autoComplete` and `name` attributes to all form fields so browser password managers and autofill work correctly:
```typescript
// email-input.tsx
<input
  name="email"
  autoComplete="email"
  inputMode="email"
/>

// verification-code-input.tsx
<input
  name="verification-code"
  autoComplete="one-time-code"
  inputMode="numeric"
  pattern="[0-9]*"
/>

// profile-step.tsx
<input name="display-name" autoComplete="name" />
```

**Implementation:** Add attributes to all 3 Input components and 6 code inputs.

**Agent must not:** Add `autoComplete="off"` anywhere. Use `webauthn` where appropriate.

#### 18.3.4 Upgrade 4: Offline Detection
**Phase:** P1 | **Agent batches:** 1 | **Dependencies:** None

**Enterprise approach:**
```typescript
// src/hooks/use-online-status.ts
// Listens to window online/offline events.
// Shows persistent banner at top of auth card when offline.
// Blocks API calls when offline (prevents generic "network error").
// Clears banner when back online.

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(true)
  useEffect(() => {
    const goOnline = () => setIsOnline(true)
    const goOffline = () => setIsOnline(false)
    window.addEventListener("online", goOnline)
    window.addEventListener("offline", goOffline)
    return () => {
      window.removeEventListener("online", goOnline)
      window.removeEventListener("offline", goOffline)
    }
  }, [])
  return isOnline
}
```

**Implementation:** Create hook, add to `auth-layout.tsx`, render banner when offline. Wrap all API calls in `useAuthFlow` with offline pre-check.

**Agent must not:** Poll the server to check connectivity. Use browser events only.

### 18.4 Phase 2 Upgrades — Infrastructure

#### 18.4.1 Upgrade 5: Multi-Tab Sync
**Phase:** P2 | **Agent batches:** 1 | **Dependencies:** P1 auth-flow-store

**Enterprise approach:**
```typescript
// In auth-flow-context.tsx or auth-store.ts
// When auth state changes in one tab, all other tabs must react.

useEffect(() => {
  const handleStorage = (e: StorageEvent) => {
    if (e.key === "moistello-auth-flow" && e.newValue) {
      // Another tab changed auth state — rehydrate
      const parsed = JSON.parse(e.newValue)
      if (parsed.state?.status?.status === "authenticated") {
        // Another tab logged in — follow
        useAuthStore.getState().checkAuth()
      }
      if (e.newValue === null) {
        // Another tab logged out — follow
        useAuthStore.getState().logout()
      }
    }
  }
  window.addEventListener("storage", handleStorage)
  return () => window.removeEventListener("storage", handleStorage)
}, [])
```

**Implementation:** Add storage event listener in `AuthFlowProvider`. When a tab detects login from another tab, auto-redirect. When a tab detects logout, clear local state.

**Agent must not:** Poll storage every N seconds. Use the native `storage` event only.

#### 18.4.2 Upgrade 6: Error Recovery for Stale Nonce
**Phase:** P2 | **Agent batches:** 1 | **Dependencies:** P1 auth-flow-store

**Enterprise approach:**
```typescript
// In use-sign-message.ts or sign-step.tsx
// Nonce has 5-minute TTL. If user spends too long on profile step, nonce may expire.

useEffect(() => {
  if (status.status !== "signing") return
  const nonceTimestamp = authFlowStore.getState().auth.nonceTimestamp
  if (!nonceTimestamp) return
  const FIVE_MINUTES = 5 * 60 * 1000
  if (Date.now() - nonceTimestamp > FIVE_MINUTES) {
    // Nonce expired — auto-refresh
    fetchNewNonce(address)
  }
}, [status.status])
```

**Implementation:** Add `nonceTimestamp` to auth-flow-store `auth` object. Before signing, check if nonce is stale. If expired, fetch new nonce silently and re-attach. Show toast "Session refreshed" only if the user was idle.

**Agent must not:** Silently fail sign because of expired nonce. Always attempt refresh first.

#### 18.4.3 Upgrade 7: CSRF Protection
**Phase:** P2 | **Agent batches:** 1 | **Dependencies:** P1 API client

**Enterprise approach:**
```typescript
// In src/lib/api-client.ts
// Every state-changing request includes a CSRF token header.
// Token is generated once per session and stored in meta tag.

function getCsrfToken(): string {
  const meta = document.querySelector('meta[name="csrf-token"]')
  return meta?.getAttribute("content") ?? ""
}

// All POST/PATCH/DELETE requests include:
headers: {
  "X-CSRF-Token": getCsrfToken(),
}

// Server validates token matches session. Rejects with 403 if mismatch.
```

**Implementation:** Add CSRF meta tag to root layout. Add token extraction to api-client interceptor. All auth API calls automatically include the header.

**Agent must not:** Bypass CSRF for any endpoint. Every state-changing call needs it.

#### 18.4.4 Upgrade 8: CAPTCHA for Email Send
**Phase:** P2 | **Agent batches:** 1 | **Dependencies:** P1 email verification API

**Enterprise approach:**
```typescript
// In verify-email-step.tsx
// Before sending verification code, show Cloudflare Turnstile or hCaptcha.
// Token is included in POST /auth/verification/send request body.
// Server verifies token before sending email.

import Turnstile from "react-turnstile"

function VerifyEmailStep() {
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)
  
  const handleSend = async () => {
    if (!captchaToken) return // prevent send without captcha
    await sendVerificationCode(email, captchaToken)
  }

  return (
    <>
      <Turnstile
        sitekey={process.env.NEXT_PUBLIC_TURNSTILE_SITEKEY!}
        onVerify={setCaptchaToken}
        theme="dark"
      />
      <button onClick={handleSend} disabled={!captchaToken}>
        Confirm Email
      </button>
    </>
  )
}
```

**Implementation:** Add Turnstile react package. Add widget before "Confirm Email" button. Wire captcha token into API call. Add env vars.

**Agent must not:** Disable CAPTCHA for any email flow. Always require it.

#### 18.4.5 Upgrade 9: Accessibility Audit
**Phase:** P2 | **Agent batches:** 1 | **Dependencies:** P1 skeleton, P1 layout

**Enterprise approach:**
```
Required ARIA attributes on every auth component:

- auth-layout: role="main" aria-label="Authentication"
- auth-step-indicator: role="progressbar" aria-valuenow aria-valuemin aria-valuemax aria-label="Step N of M"
- wallet-grid: role="listbox" aria-label="Select a wallet"
- wallet-card: role="option" aria-selected aria-label="Wallet name"
- passkey-shortcut: aria-label="Sign in with passkey using your device biometrics"
- wc2-connection-state: role="status" aria-live="polite"
- verify-email-step: aria-label="Email verification form"
- verification-code-input: aria-label="6-digit verification code" inputMode="numeric" autoComplete="one-time-code"
- error-display: role="alert" aria-live="assertive"
- loading-overlay: role="progressbar" aria-label="Loading"
- connected-badge: role="status" aria-label="Connected to {wallet name}"
```

Additionally:
- All interactive elements must be keyboard-navigable (tabIndex, onKeyDown for Enter/Escape)
- Focus trap inside modals (LedgerPrompt, WC2)
- Skip-to-content link at top of auth card
- Color contrast ratio ≥ 4.5:1 for all text (verify with axe-core)
- Screen reader announcements on step transitions

**Implementation:** Add ARIA attributes to all 12 components. Run axe-core audit. Fix all violations. Test with VoiceOver (macOS) and NVDA (Windows).

**Agent must not:** Use `aria-hidden="true"` on any interactive element. Add `role="button"` to non-interactive elements.

#### 18.4.6 Upgrade 10: i18n for Auth Pages
**Phase:** P2 | **Agent batches:** 2 (structure + translations) | **Dependencies:** P1 skeleton, P1 layout

**Enterprise approach:**
```typescript
// Using next-intl for i18n. Auth strings are separated into auth-specific namespace.

// messages/en/auth.json
{
  "login.title": "Welcome back",
  "login.passkeyButton": "Sign in with Passkey",
  "register.title": "Create your account",
  "register.passkeyRecommended": "Recommended",
  "email.placeholder": "Email address",
  "email.confirmButton": "Confirm Email",
  "code.placeholder": "Verification code",
  "code.verifyButton": "Verify Code",
  "code.resend": "Didn't receive it? Resend",
  "error.generic": "Something went wrong",
  // ... all auth strings
}
```

**Implementation:** Install next-intl. Create auth namespace JSON per locale. Wrap all user-facing strings in `t()` calls. Include en, fr, es, pt, sw, hi (matching existing profile language options).

**Agent must not:** Hardcode any user-facing string. Every string must go through i18n. Only exception: technical error messages that users never see.

### 18.5 Phase 3 Upgrades — Security & UX

#### 18.5.1 Upgrade 11: Session Timeout UX
**Phase:** P3 | **Agent batches:** 1 | **Dependencies:** P2 multi-tab sync

**Enterprise approach:**
```typescript
// In sign-step.tsx
// Access token expires in 15 minutes. Refresh token in 7 days.
// Show countdown badge when < 5 minutes remaining.
// Auto-refresh token silently when < 2 minutes remaining.
// If refresh fails, show warning "Your session will expire soon. Please save your progress."
// Save form state to sessionStorage before redirect to login.
// On return, restore form state (nonce must be re-fetched though).

function SessionTimeoutBanner() {
  const { expiresAt } = useAuthStore(s => ({ expiresAt: s.tokenExpiresAt }))
  const [timeLeft, setTimeLeft] = useState<number | null>(null)

  useEffect(() => {
    if (!expiresAt) return
    const update = () => setTimeLeft(Math.max(0, Math.floor((expiresAt - Date.now()) / 1000)))
    update()
    const interval = setInterval(update, 10000) // every 10s, not every 1s
    return () => clearInterval(interval)
  }, [expiresAt])

  if (timeLeft === null || timeLeft > 300) return null // >5min: no banner
  if (timeLeft <= 0) return <div role="alert">Session expired. Please sign in again.</div>
  return <div role="status">Session expires in {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, "0")}</div>
}
```

**Implementation:** Add `tokenExpiresAt` to auth-store. Create `SessionTimeoutBanner` component. Add to sign-step and profile-step. Auto-save form fields to sessionStorage on expiry.

**Agent must not:** Show timeout banner on login/register steps that don't have a session yet (choose-wallet, verify-email).

#### 18.5.2 Upgrade 12: Rate Limit UI for Login
**Phase:** P3 | **Agent batches:** 1 | **Dependencies:** P2 CSRF

**Enterprise approach:**
```typescript
// In sign-step.tsx
// After 3 failed sign attempts, server returns remainingAttempts in error response.
// Show countdown: "Too many attempts. Try again in 12:34."
// Disable submit button during cooldown.
// Reset count on successful sign.

interface RateLimitState {
  remainingAttempts: number
  cooldownUntil: number | null
}

// In auth-flow-store:
rateLimit: {
  remainingAttempts: 5,
  cooldownUntil: null,
  lastAttemptAt: null,
}
```

**Implementation:** Add `rateLimit` to auth-flow-store state. Parse `Retry-After` header from 429 responses. Show countdown timer. Disable button while cooling down.

**Agent must not:** Rely only on server-side rate limiting. Enforce client-side as well.

#### 18.5.3 Upgrade 13: WebAuthn Conditional Mediation
**Phase:** P3 | **Agent batches:** 1 | **Dependencies:** P2 passkey flow

**Enterprise approach:**
```typescript
// On login page mount, attempt silent passkey authentication.
// Uses `mediation: "conditional"` so browser shows passkey autofill UI.
// Only for returning users who have a passkey stored.

useEffect(() => {
  if (!PublicKeyCredential?.isConditionalMediationAvailable) return
  PublicKeyCredential.isConditionalMediationAvailable().then(available => {
    if (!available) return
    // Browser supports conditional mediation
    // Navigator.credentials.get() with mediation: "conditional"
    // will show the passkey autofill dropdown without user clicking anything
  })
}, [])
```

**Implementation:** Add conditional mediation check on login page mount. If available, show passkey as an autofill suggestion in the email/username field.

**Agent must not:** Remove the explicit "Sign in with Passkey" button. Conditional mediation is additive.

#### 18.5.4 Upgrade 14: Passkey Revocation List
**Phase:** P3 | **Agent batches:** 1 | **Dependencies:** P2 passkey flow

**Enterprise approach:**
```
On the server, maintain a passkey_version per user account.
Each passkey registration increments the version.
Client sends passkey_version with each authentication request.
Server rejects if version < expected (passkey was revoked).
If passkey compromised, admin can bump version to invalidate all existing passkeys.
User must re-register with email verification.
```

**Implementation:** Auth-flow-store stores `passkeyVersion`. Server returns `expectedPasskeyVersion` on `/auth/verify`. If mismatch, show "Your passkey has been revoked. Please set up a new one." and redirect to passkey re-registration.

**Agent must not:** Store passkey version in localStorage. Store in auth-flow-store sessionStorage only.

### 18.6 Phase 4 Upgrades — Polish

#### 18.6.1 Upgrade 15: Account Recovery Flow
**Phase:** P4 | **Agent batches:** 2 (recovery page + email flow) | **Dependencies:** P3 passkey revocation

**Enterprise approach:**
```
When user clicks "Lost passkey?" on login page:

1. Show email input (same as verify-email-step)
2. Send verification code to email
3. User enters code
4. On verified: generate new passkey credential (WebAuthn create)
5. Derive new Stellar keypair from new credential + same email
6. Call POST /auth/passkey/recover with new public key + verificationId
7. Server verifies email ownership, updates public key, invalidates old passkey version
8. User proceeds to sign in with new passkey
```

**Separate page:** `src/app/(auth)/recover/page.tsx` (~60 lines)

**Agent must not:** Allow recovery without email verification. Never allow recovery if user has no verified email.

#### 18.6.2 Upgrade 16: Native Share API for Deep Links
**Phase:** P4 | **Agent batches:** 1 | **Dependencies:** P3 WC2 fix

**Enterprise approach:**
```typescript
// In wc2-connection-state.tsx
// On mobile, after generating WC2 URI, show a "Share" button.
// Uses navigator.share() API to share the deep link with wallet apps.
// Fallback: copy to clipboard with toast confirmation.

const handleShare = async () => {
  if (navigator.share) {
    await navigator.share({
      title: "Connect to Moistello",
      text: "Open this link in your Stellar wallet to connect:",
      url: wc2PairingUri,
    })
  } else {
    await navigator.clipboard.writeText(wc2PairingUri!)
    addToast({ type: "success", title: "Link copied!" })
  }
}
```

**Implementation:** Add share button next to "Cancel" in WC2 mobile view. Test on iOS Safari and Android Chrome.

**Agent must not:** Show share button on desktop. Only on mobile where `navigator.share` makes sense.

#### 18.6.3 Upgrade 17: Analytics Events
**Phase:** P4 | **Agent batches:** 1 | **Dependencies:** P3 all auth flows stable

**Enterprise approach:**
```typescript
// In auth-flow-context.tsx — fire event on every meaningful state transition.
// Using PostHog (already available in codebase or provided via env var).

const EVENTS = {
  AUTH_STARTED: "auth.started",
  WALLET_SELECTED: "auth.wallet.selected",
  WALLET_CONNECTED: "auth.wallet.connected",
  WALLET_CONNECTION_FAILED: "auth.wallet.connection_failed",
  EMAIL_VERIFICATION_SENT: "auth.email.verification_sent",
  EMAIL_VERIFIED: "auth.email.verified",
  EMAIL_VERIFICATION_FAILED: "auth.email.verification_failed",
  PROFILE_SUBMITTED: "auth.profile.submitted",
  SIGN_STARTED: "auth.sign.started",
  SIGN_COMPLETED: "auth.sign.completed",
  SIGN_FAILED: "auth.sign.failed",
  AUTH_SUCCESS: "auth.success",
  AUTH_FAILED: "auth.failed",
}

function track(event: string, properties?: Record<string, unknown>) {
  if (typeof window === "undefined") return
  // Only track anonymous events: mode (login/register), step, wallet type
  // NEVER track: email, address, signature, nonce, tokens
  const safeProps = { ...properties }
  delete safeProps.email
  delete safeProps.address
  delete safeProps.signature
  delete safeProps.nonce
  posthog.capture(event, safeProps)
}
```

**Implementation:** Wire `track()` calls into auth-flow-store action handlers. Sanitize all properties before sending. Add PostHog env var.

**Agent must not:** Track PII (email, wallet address, signature, nonce, tokens, IP). Strip all identifying info before sending.

### 18.7 Phase 5 Upgrades — Future-Ready

#### 18.7.1 Upgrade 18: WalletConnect v1 Fallback
**Phase:** P5 | **Agent batches:** 1 | **Dependencies:** P4 WC2 stable

**Enterprise approach:**
```
If WalletConnect v2 relay is down (wc2RelayStatus === "down"), attempt fallback:
1. Show "WalletConnect relay unavailable" message with option to try alternative
2. If user has WC1-compatible wallet installed, offer direct wallet connect
3. If no fallback available, show clear instructions: "Try again later or use another wallet"

This is a low-priority upgrade — WC1 was deprecated in June 2023.
Most wallets have migrated to WC2. This is for edge cases only.
```

**Implementation:** Check `wc2RelayStatus` in choose-wallet-step. If "down", add a note below the WC2 button. Do not attempt to load WC1 SDK (deprecated).

**Agent must not:** Install or import WalletConnect v1 SDK. Only show informational fallback message.

#### 18.7.2 Upgrade 19: Error Monitoring Dashboard
**Phase:** P5 | **Agent batches:** 1 | **Dependencies:** P1 Sentry

**Enterprise approach:**
```
Configure Sentry performance monitoring for auth flows:
- Transaction: "auth.login" and "auth.register"
- Span for each step: wallet_connect, email_verify, profile, sign, submit
- Measure P50, P95, P99 latency per step
- Alert on P95 > 5 seconds for any step
- Alert on auth success rate < 80% in any 5-minute window
- Dashboard for monitoring auth health in production

Because we run on the live deployed server, this is critical for detecting
passkey registration failures, WC2 timeout spikes, and email delivery issues.
```

**Implementation:** Add Sentry transaction/spans to auth-flow-store actions. Create Sentry dashboard. Set up alert rules.

**Agent must not:** Create the Sentry dashboard itself (requires UI access). Only instrument the code with proper spans.

---

## 19. Updated Implementation Timeline

### Phase 1: Foundation (5 hours — 4 agent batches, all parallelizable)
| Batch | Step | Task | Output | Dependencies | Agent Can Do Alone? |
|:-----:|:----:|------|--------|:-----------:|:-------------------:|
| B1 | 1.1 | Refactor auth-flow-store: add email verification fields, nonceTimestamp, rateLimit | Updated store interface | None | Yes |
| B1 | 1.2 | Create auth-flow-context.tsx with bridge to multi-wallet-store and auth-store | Context + Provider | 1.1 | Yes |
| B1 | 1.3 | Create auth-layout.tsx + auth-skeleton.tsx | Layout + Skeleton | None | Yes |
| B2 | 1.4 | Create wallet-grid.tsx + extract wallet-card from existing code | 2 components | None | Yes |
| B2 | 1.5 | Create connected-badge.tsx, error-display.tsx | 2 utility components | None | Yes |
| B3 | 1.6 | Create loading-overlay.tsx + use-online-status.ts + offline banner | Overlay + hook | 1.3 | Yes |
| B3 | 1.7 | Add Sentry monitoring + captureAuthError helper | lib/monitoring.ts | None | Yes |
| B4 | 1.8 | Add password manager hints to all inputs + autoComplete attributes | Updated inputs | None | Yes |
| B4 | 1.9 | Add Turnstile CAPTCHA to verify-email-step | CAPTCHA widget | 1.1 | Yes |

### Phase 2: Core Components (8 hours — 7 agent batches, partially sequential)
| Batch | Step | Task | Output | Dependencies | Agent Can Do Alone? |
|:-----:|:----:|------|--------|:-----------:|:-------------------:|
| B5 | 2.1 | Create choose-wallet-step.tsx with WalletConnect orchestration + WC2 fix | Step component | 1.2, 1.3, 1.4 | Yes |
| B5 | 2.2 | Create verify-email-step.tsx with email + code UI + CAPTCHA + API calls | Step component | 1.2, 1.9 | Yes |
| B6 | 2.3 | Create profile-step.tsx (extract from old register) | Step component | None | Yes |
| B6 | 2.4 | Create sign-step.tsx with nonce fetch + sign + submit + stale nonce recovery | Step component | 1.2, 1.4, 1.7 | Yes |
| B7 | 2.5 | Create use-email-verification.ts, use-sign-message.ts, use-profile-form.ts hooks | 3 hooks | 2.2, 2.4 | Yes |
| B7 | 2.6 | Wire multi-tab sync + storage event listener in AuthFlowProvider | Tab sync | 1.2 | Yes |
| B8 | 2.7 | Add CSRF token to api-client + meta tag to layout | CSRF | 1.2 | Yes |
| B8 | 2.8 | Add i18n setup + auth namespace JSON + wrap all strings in t() | i18n | 1.3, 1.4 | Yes |
| B9 | 2.9 | Add ARIA attributes + keyboard nav to all 12 components | Accessibility | 2.1-2.5 | Yes |
| B9 | 2.10 | Run axe-core audit, fix violations | Audit pass | 2.9 | Yes |

### Phase 3: Page Rewrites + Auth Polish (5 hours — 4 agent batches)
| Batch | Step | Task | Output | Dependencies | Agent Can Do Alone? |
|:-----:|:----:|------|--------|:-----------:|:-------------------:|
| B10 | 3.1 | Rewrite login/page.tsx | ~80 lines | All Phase 1 + 2 | Yes |
| B10 | 3.2 | Rewrite register/page.tsx | ~150 lines | All Phase 1 + 2 | Yes |
| B10 | 3.3 | Delete old code: login/page.tsx, register/page.tsx remnants | Clean codebase | 3.1, 3.2 | Yes |
| B11 | 3.4 | Add SessionTimeoutBanner + token expiry tracking | Session UX | 2.6 | Yes |
| B11 | 3.5 | Add rate limit UI to sign-step + auth-flow-store rateLimit | Rate limit UX | 2.4 | Yes |
| B12 | 3.6 | Add WebAuthn conditional mediation on login page | Conditional passkey | 2.1 | Yes |
| B12 | 3.7 | Add passkey version tracking + revocation check | Passkey revocation | 2.4 | Yes |
| B13 | 3.8 | Manual QA on all flows | Sign-off | 3.1, 3.2 | No (requires human) |

### Phase 4: Testing + Analytics (8 hours — 4 agent batches)
| Batch | Step | Task | Output | Dependencies | Agent Can Do Alone? |
|:-----:|:----:|------|--------|:-----------:|:-------------------:|
| B14 | 4.1 | Write 35 unit tests for all components and hooks | Test suite | All Phase 2 + 3 | Yes |
| B14 | 4.2 | Write 8 integration tests for auth flows (MSW) | Test suite | 4.1 | Yes |
| B15 | 4.3 | Write 8 Playwright E2E tests for live site | Test suite | 4.2 | Yes |
| B15 | 4.4 | Set up GitHub Actions CI pipeline for E2E | CI workflow | 4.3 | Yes |
| B16 | 4.5 | Add analytics events (PostHog) to all auth state transitions | Analytics | 3.1, 3.2 | Yes |
| B16 | 4.6 | Add native share API for WC2 deep links on mobile | Share button | 2.1 | Yes |
| B17 | 4.7 | Create account recovery page + email verification flow | Recovery | 2.2 | Yes |

### Phase 5: Final Polish (3 hours — 2 agent batches)
| Batch | Step | Task | Output | Dependencies | Agent Can Do Alone? |
|:-----:|:----:|------|--------|:-----------:|:-------------------:|
| B18 | 5.1 | Add WC2 relay status check + fallback message | WC2 fallback | 2.1 | Yes |
| B18 | 5.2 | Add Sentry performance spans to auth flow steps | Monitoring | 1.7 | Yes |
| B19 | 5.3 | Run final full test suite + fix flaky tests | Clean CI | All | Yes |
| B19 | 5.4 | Final manual QA + production deployment | Deploy | 5.3 | No (requires human) |

### Agent Batch Guidelines

```
Each "agent batch" is a discrete unit that can be handed to one agent call.
Maximum per agent call: 1 batch (never assign multiple batches to one agent call).

Within a batch, the sequence of file creation/edits matters:
  1. Types/interfaces first (no dependencies)
  2. Store/state second (depends on types)
  3. Hooks third (depends on store)
  4. Components fourth (depends on hooks)
  5. Tests last (depends on all above)

If a batch has sub-steps (e.g., B1 has 1.1, 1.2, 1.3), they must be done
in order within that single agent call. Never skip a sub-step.

Agent must report back after each batch with:
  - Files created/modified
  - Tests passing (if applicable)
  - Any deviations from plan with justification
  - Time taken against estimate
```

---

## 20. Changelog

| Date | Version | Author | Changes |
|------|:-------:|--------|---------|
| 2026-06-01 | 1.0 | Audit | Initial rebuild plan based on deep audit of login (557 lines) and register (914 lines) pages. |
| - | 1.1 | - | Added email verification flow with verification code. |
| - | 1.2 | - | Added Playwright E2E test spec for live site testing. |
| - | 1.3 | - | Added WC2 race condition fix section. |
| - | 1.4 | - | Added manual QA script for flows that cannot be automated. |
| - | 2.0 | - | Massive upgrade: added Agent Rules (Section 16), Enterprise Standards (Section 17), all 19 Enterprise Upgrades with phases and agent batch assignments (Section 18), and updated Implementation Timeline with 19 batches across 5 phases (Section 19). |
