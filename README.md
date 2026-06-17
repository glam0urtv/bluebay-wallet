# TokenWallet — Virtual Wallet Loyalty System

Closed-ecosystem loyalty reward system with virtual tokens, NFC transfers, QR codes, and merchant redemption.

---

## Architecture

```
┌──────────────────────────────────────────────────┐
│  Admin Web (Next.js :3001)  │  Mobile App (Flutter) │
│  - Mint tokens               │  - Wallet + Balance  │
│  - Manage users/merchants    │  - QR send/receive   │
│  - Settlements               │  - NFC (Android HCE) │
│  - Audit logs                │  - P2P & P2M transfers│
└──────────────┬───────────────┴──────────┬───────────┘
               │                          │
               ▼                          ▼
┌──────────────────────────────────────────────────────┐
│         NestJS API (:3000)                          │
│  Auth (JWT) | Wallets | Transactions | Merchants    │
│  NFC Sessions | QR Sessions | Settlements           │
└──────────────────────┬───────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────┐
│              SQLite (Prisma ORM)                     │
└──────────────────────────────────────────────────────┘
```

---

## Quick Start

### 1. Backend

```bash
cd backend
npm install
npx prisma generate
npx prisma db push
npx ts-node prisma/seed.ts
npm run dev
```

API runs at `http://localhost:3000`
Swagger docs at `http://localhost:3000/api/docs`

### 2. Admin Dashboard

```bash
cd admin-web
npm install
npm run dev
```

Dashboard runs at `http://localhost:3001`

### 3. Mobile App (Flutter)

```bash
cd mobile
flutter pub get
flutter run
```

---

## Demo Accounts (after seeding)

| Role     | Phone        | PIN    |
|----------|--------------|--------|
| Admin    | +1000000000  | 123456 |
| User 1   | +1000000001  | 123456 |
| User 2   | +1000000002  | 123456 |
| Merchant | +1000000003  | 123456 |
| Merchant | +1000000004  | 123456 |

---

## API Endpoints

### Auth
- `POST /api/auth/register` — Register user
- `POST /api/auth/login` — Login
- `GET /api/auth/profile` — Get profile (JWT)

### Wallets
- `GET /api/wallets/me` — My wallet
- `GET /api/wallets/me/balance` — My balance
- `GET /api/wallets/me/transactions` — My transactions
- `POST /api/wallets/mint` — Mint tokens (admin)
- `POST /api/wallets/mint-bulk` — Bulk mint (admin)

### Transactions
- `POST /api/transactions/p2p` — P2P transfer
- `POST /api/transactions/p2m` — Merchant payment
- `POST /api/transactions/nfc/sessions` — Create NFC session
- `POST /api/transactions/nfc/transfer` — Execute NFC transfer
- `POST /api/transactions/qr/sessions` — Create QR session
- `POST /api/transactions/qr/transfer` — Execute QR transfer
- `POST /api/transactions/:id/reverse` — Reverse (admin)

### Merchants
- `GET /api/merchants` — List (admin)
- `POST /api/merchants` — Register
- `PATCH /api/merchants/:id/conversion-rate` — Update rate
- `PATCH /api/merchants/:id/toggle-active` — Toggle active

### Settlements
- `GET /api/settlements` — List (admin)
- `POST /api/settlements` — Create (admin)
- `PATCH /api/settlements/:id/pay` — Mark paid

### Users (Admin)
- `GET /api/users` — List
- `GET /api/users/:id` — Get by ID
- `PATCH /api/users/:id/toggle-active` — Toggle active

---

## NFC Transfer Flow

### Android (HCE + Reader Mode)
1. Sender opens app, enters amount → creates NFC session (API call)
2. Sender activates HCE mode (phone emulates an NFC tag)
3. Receiver taps their phone to sender's phone
4. Receiver reads HCE payload containing `{nonce, amount}`
5. Receiver's app calls `POST /transactions/nfc/transfer`
6. Backend validates session, executes atomic transfer

### iOS (CoreNFC Reader Only)
- iOS only supports NFC tag reading (no HCE)
- For iOS-to-iOS or iOS-to-Android: use QR code fallback

---

## QR Transfer Flow (Universal Fallback)
1. Sender selects amount → app creates QR session
2. QR code displayed (contains session token + amount)
3. Receiver scans QR code
4. Receiver's app calls `POST /transactions/qr/transfer`
5. Backend validates session, executes transfer
6. QR sessions expire after 30 seconds

---

## Cloudflare Tunnel Setup

To expose your local server to the internet:

```bash
# Install cloudflared
# https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/

# Run tunnel for API
cloudflared tunnel --url http://localhost:3000

# Run tunnel for Admin (separate terminal)
cloudflared tunnel --url http://localhost:3001
```

Then update `mobile/lib/config/api_config.dart` with your tunnel URL.

---

## Technical Decisions

| Decision | Choice | Reason |
|---|---|---|
| Database | SQLite (via Prisma) | Zero-setup for local dev, migrate to PostgreSQL later |
| Backend | NestJS + TypeScript | Modular, typed, mature ecosystem |
| Mobile | Flutter | Single codebase, best NFC support |
| Admin | Next.js 14 + Tailwind | Fast, modern, full-stack |
| Auth | JWT + bcrypt PIN | Simple for employee use case |
| Idempotency | Unique keys per transaction | Prevents double-spend on network retry |
| P2P Transfers | QR (primary) + NFC HCE Android (secondary) | iOS limitation (no HCE) |

---

## Project Structure

```
papavasiliou Token/
├── backend/                    # NestJS API
│   ├── prisma/
│   │   ├── schema.prisma       # Database schema
│   │   └── seed.ts             # Demo data seeder
│   └── src/
│       ├── auth/               # JWT auth + login/register
│       ├── users/              # User management (admin)
│       ├── wallets/            # Balance, mint, transactions
│       ├── transactions/       # P2P, P2M, NFC, QR transfers
│       ├── merchants/          # Merchant CRUD + conversion rates
│       ├── settlements/        # Merchant settlement (token->EUR)
│       ├── prisma/             # Prisma service
│       └── common/             # Guards, decorators, filters
├── admin-web/                  # Next.js Admin Dashboard
│   └── src/
│       ├── app/                # Pages (users, merchants, mint, etc.)
│       ├── components/         # AppShell, Sidebar
│       └── lib/                # API client, Auth context
├── mobile/                     # Flutter Mobile App
│   └── lib/
│       ├── config/             # API configuration
│       ├── models/             # User, Wallet, Transaction
│       ├── services/           # API, Auth, Wallet, NFC
│       ├── screens/            # Login, Wallet, Send, Receive
│       └── widgets/            # BalanceCard, TransactionTile
└── README.md
```

---

## Roles & Permissions

| Action | Admin | User | Merchant |
|---|---|---|---|
| View own wallet | Yes | Yes | Yes |
| Mint tokens | Yes | No | No |
| Send tokens (P2P) | Yes | Yes | No |
| Receive tokens | Yes | Yes | Yes |
| Pay merchant (P2M) | No | Yes | No |
| View all users | Yes | No | No |
| Manage merchants | Yes | No | No |
| Create settlements | Yes | No | No |
| Reverse transactions | Yes | No | No |
