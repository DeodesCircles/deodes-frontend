# Moistello — Wallet Creation & Yellow Card Integration Flow

## Overview

| Component | What It Does | Who Runs It |
|-----------|-------------|-------------|
| Backend WalletService | Generates Stellar keypair, funds account, sets trustlines | You |
| Master XLM Pool | Holds XLM reserve for funding new accounts | You (self-custodied Stellar key) |
| User Encrypted Wallet | Private key encrypted with passkey seed, stored in PostgreSQL | You (encrypted — cannot decrypt) |
| Yellow Card API | Converts NGN ↔ USDC, sends USDC directly to user's Stellar wallet | Yellow Card (licensed) |
| Soroban Contracts | Handles circle contributions, payouts, escrow | Stellar blockchain |

---

## Phase 1: Wallet Creation (During Signup)

### Step-by-Step

```
User clicks "Create Wallet" on /register
        │
        ▼
1. Generate Stellar Keypair
   │  └─ Public key: G... (starts with G)
   │  └─ Secret key: S... (starts with S)
   │
   ▼
2. Fund Account from Master Pool
   │  └─ 2 XLM sent from master wallet → user's public key
   │  └─ Master pool key stored in env (not in DB)
   │  └─ Cost: ~$0.20 per user at current XLM prices
   │
   ▼
3. Set USDC Trustline
   │  └─ ChangeTrust operation: USDC issuer on Stellar
   │  └─ Required so the wallet can hold and send USDC
   │
   ▼
4. Hash & Encrypt Secret Key
   │  └─ Derive encryption key from passkey seed (SHA-256)
   │  └─ Encrypt secret key using AES-256-GCM
   │  └─ Plaintext secret key is zeroed from memory
   │
   ▼
5. Store in `wallets` Table
   │  └─ user_id, public_key (plaintext), encrypted_secret_key, 
   │     encryption_nonce, created_at
   │
   ▼
6. Return Public Key to Frontend
   │  └─ User sees wallet address
   │  └─ Frontend never sees the secret key
   ▼
Done — wallet ready for deposits
```

### New Database Table: `wallets`

```sql
CREATE TABLE wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    public_key VARCHAR(56) NOT NULL UNIQUE,       -- Stellar G address
    encrypted_secret_key BYTEA NOT NULL,            -- AES-256-GCM encrypted
    encryption_nonce BYTEA NOT NULL,                -- nonce used for AES
    wallet_type VARCHAR(20) DEFAULT 'auto',         -- 'auto' | 'freighter' | 'passkey'
    is_primary BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, wallet_type)
);
```

### Master XLM Pool Setup

```env
# .env
MASTER_XLM_SECRET=SDDBM2MKQSV2ZPEDKTSI3IWNEUSJU5DAWW5NSRWNKJ4FABXSYGYW72FO
MASTER_XLM_PUBLIC=GAAAA...
```

- Load with enough XLM to fund ~1000 users initially (~2000 XLM ≈ $200)
- Refill periodically
- This is YOUR money, not user money — operational expense

### Key Encryption Flow

```
User's passkey seed (during registration)
        │
        ▼
SHA-256(passkey_seed) → 256-bit encryption key
        │
        ▼
AES-256-GCM.encrypt(Stellar_secret_key, encryption_key)
        │
        ▼
{ encrypted_data, nonce } → stored in wallets table
        │
        ▼
Stellar_secret_key → zeroed from memory
```

- Backend NEVER stores the encryption key
- Encryption key is derived from passkey seed during login
- To sign a transaction: passkey seed → encryption key → decrypt secret key → sign → zero
- Backend cannot move funds without the user's passkey

---

## Phase 2: NGN Deposit (Yellow Card On-Ramp)

### User Journey

```
1. User goes to /wallet/deposit
   ├── Enters amount in NGN (e.g. ₦50,000)
   ├── Sees estimated USDC output (after spread)
   └── Clicks "Deposit"

2. Backend calls Yellow Card API
   ├── POST /quotes → get NGN→USDC rate
   ├── POST /receive → create payment request
   └── Returns payment instructions to frontend

3. User sees bank transfer details
   ├── Bank name, account number, amount in NGN
   ├── Reference code to include
   └── User initiates bank transfer from their banking app

4. User receives USDC
   ├── Yellow Card detects bank transfer
   ├── Converts NGN to USDC at quoted rate
   └── Sends USDC to user's Stellar wallet (public key from step 1)

5. Frontend shows confirmation
   ├── USDC balance updated
   └── Transaction in history
```

### Backend API Endpoints

```go
// Request
POST /api/v1/wallet/deposit
{
    "userId": "uuid",
    "amountNgn": 50000.00,
    "walletAddress": "GABCDEF..."
}

// Response
{
    "quoteId": "yc-q-xxx",
    "paymentRef": "MOIST-20260604-001",
    "bankDetails": {
        "bankName": "Access Bank",
        "accountNumber": "1234567890",
        "amount": 50000.00
    },
    "estimatedUsdc": 31.25,
    "spread": 1.5,
    "expiresAt": "2026-06-04T18:30:00Z"
}
```

### Yellow Card API Integration

```go
type YellowCardService struct {
    apiKey     string
    apiSecret  string
    baseURL    string // https://api.yellowcard.io/v1
}

func (s *YellowCardService) GetQuote(ctx context.Context, from, to string, amount float64) (*Quote, error)
// GET /v1/quotes?from=NGN&to=USDC&amount=50000

func (s *YellowCardService) CreateReceive(ctx context.Context, req ReceiveRequest) (*ReceiveResponse, error)
// POST /v1/receive
// Body: { "amount": 50000, "currency": "NGN", "destinationCurrency": "USDC",
//         "destinationAddress": "G...", "paymentReference": "MOIST-001" }

func (s *YellowCardService) GetTransactionStatus(ctx context.Context, txnId string) (*Transaction, error)
// GET /v1/transactions/{id}

func (s *YellowCardService) CreateSend(ctx context.Context, req SendRequest) (*SendResponse, error)
// POST /v1/send
// Body: { "amount": 31.25, "currency": "USDC", "destinationCurrency": "NGN",
//         "destinationAddress": "user_bank_account", "paymentReference": "MOIST-002" }
```

---

## Phase 3: Internal Circle Activity (No Fees)

```
User's Wallet ($USDC)
        │
        ▼
Contribute to Soroban Circle Contract
        │
        ├── Round 1: pays out to Member C
        ├── Round 2: pays out to Member A
        ├── Round 3: pays out to Member B
        └── ... (all on-chain, zero platform fee)
        │
        ▼
Payout received back to User's Wallet
        │
        ▼
Idle USDC between rounds
        │
        ├── Optional: Deposit to Blend (user signs)
        └── Optional: Leave in wallet (no yield but no loss)
```

All internal transactions are:
- **On Stellar**: transparent and verifiable
- **Zero platform fee**: contract now uses `apply_fee(pool, 0)`
- **Near-zero network fee**: ~0.00001 XLM per transaction
- **Instant**: Stellar settles in 3-5 seconds

---

## Phase 4: NGN Withdrawal (Yellow Card Off-Ramp)

### User Journey

```
1. User goes to /wallet/withdraw
   ├── Enters amount in USDC
   ├── Enters bank account details
   └── Clicks "Withdraw"

2. Backend validates:
   ├── User has sufficient USDC balance
   └── User's wallet can sign the transfer

3. User signs the transaction (passkey prompt)
   ├── Decrypts their Stellar secret key
   ├── Signs a USDC transfer: user_wallet → Yellow Card's Stellar address
   └── Transaction submitted to Stellar

4. Yellow Card receives USDC
   ├── Detects incoming USDC at their address
   ├── Converts USDC → NGN at agreed rate
   └── Sends NGN to user's bank account (instant bank transfer)

5. Frontend shows confirmation
   ├── NGN amount credited
   └── Transaction in history
```

### Backend Withdraw Endpoint

```go
// Request
POST /api/v1/wallet/withdraw
{
    "userId": "uuid",
    "amountUsdc": 31.25,
    "bankCode": "044",          // Access Bank code
    "accountNumber": "1234567890",
    "accountName": "John Doe"
}

// Response
{
    "withdrawId": "yc-s-xxx",
    "yellowCardAddress": "GABCDEF...",   // Send USDC here
    "estimatedNgn": 49218.75,             // After spread
    "spread": 1.5,
    "status": "awaiting_user_signature"
}
```

### User Signs the USDC Transfer

```go
// Backend generates the Stellar transaction
txn, _ := buildTransferTx(
    userPublicKey,
    yellowCardUSDCAddress,
    amountInStroops,  // USDC has 7 decimal places on Stellar
    usdcIssuer,
)

// Backend sends the unsigned XDR to frontend
// Frontend calls passkey adapter to decrypt key and sign
// Signed XDR returned to backend
// Backend submits to Stellar network
```

---

## Phase 5: P2P Internal Swaps (Zero Spread)

Optional feature for users who want to avoid Yellow Card entirely.

### Flow

```
User A (wants NGN, has USDC in wallet)
User B (wants USDC, has NGN in bank)

1. A posts offer: "Sell 50 USDC at ₦1,600 per USDC"
2. B accepts offer
3. USDC moved to escrow contract (Soroban)
4. B sends NGN directly to A's bank account (outside app)
5. A confirms receipt on Moistello
6. Escrow releases USDC to B's wallet
7. Moistello charges 0% — peer-to-peer
```

### Escrow Contract Functions

```rust
pub fn create_offer(env, seller, amount_usdc, price_ngn) -> OfferId
pub fn accept_offer(env, buyer, offer_id) // buyer must deposit USDC
pub fn confirm_receipt(env, seller, offer_id) // releases USDC to buyer
pub fn raise_dispute(env, user, offer_id) // freezes offer
pub fn resolve_dispute(env, admin, offer_id, resolution) // admin resolves
```

---

## Complete Data Flow Diagram

```
SIGNUP:
  User → Backend generates wallet → Master pool funds 2 XLM
       → USDC trustline set → Encrypted key stored
       → User sees public key

DEPOSIT (NGN → USDC):
  User enters ₦50K → Backend calls Yellow Card quote
       → User gets bank details → User transfers NGN
       → Yellow Card detects → Sends USDC to user's wallet
       → Balance updates in app

CIRCLE ACTIVITY (all on-chain, 0% fee):
  Contribute USDC → Soroban processes round → Payout USDC
       → Repeat for all rounds

IDLE BETWEEN ROUNDS:
  User optionally deposits to Blend (signs themselves)
       → Earns variable yield → Withdraws when next round starts

WITHDRAW (USDC → NGN):
  User enters amount + bank details → Backend gets Yellow Card quote
       → User signs USDC transfer to Yellow Card
       → Yellow Card receives → Sends NGN to user's bank
       → User gets money in bank (instant in Nigeria)

P2P SWAP (optional, 0%):
  User A posts offer → User B accepts → Escrow holds USDC
       → User B sends NGN to User A's bank → User A confirms
       → Escrow releases USDC to User B
```

---

## Implementation Phases

| Phase | What | Depends On | Timeline |
|-------|------|-----------|----------|
| 1 | Backend WalletService (keypair gen, fund, trustline, encrypt) | Nothing | 1 week |
| 2 | wallets table migration + POST /wallets endpoint | Phase 1 | 2 days |
| 3 | Encrypted key sign flow (passkey seed → decrypt → sign → zero) | Phase 1 | 3 days |
| 4 | Integrate Yellow Card API (sandbox) | Yellow Card account approved | 2 weeks |
| 5 | POST /wallet/deposit + POST /wallet/withdraw endpoints | Phase 4 | 1 week |
| 6 | Frontend: /wallet/deposit and /wallet/withdraw pages | Phase 5 | 1 week |
| 7 | End-to-end test: signup → deposit → contribute → withdraw | All above | 3 days |
| 8 | P2P swap escrow contract (optional) | Phase 7 | 2 weeks |

## Security Considerations

| Concern | Mitigation |
|---------|-----------|
| Master XLM pool key leaked | Store in env, not DB. Use separate key for funding vs operations. |
| Encrypted key brute force | Passkey seed has high entropy (WebAuthn). AES-256-GCM is quantum-resistant. |
| Yellow Card API key leaked | Store in env. Rotate periodically. |
| User loses passkey | Wallet recovery flow (optional). Not in V1. |
| Replay attacks | Each signed transaction includes a unique nonce. |
| Stellar network congestion | Transactions auto-retry. User sees status in UI. |
