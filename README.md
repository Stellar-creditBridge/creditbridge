<div align="center">

<br />

# ⬡ CreditBridge

### Institutional Invoice Financing & Receivables Protocol on Stellar

**Tokenize corporate receivables. Fund fractional positions. Settle on Stellar Testnet.**

<br />

[![Stellar Testnet](https://img.shields.io/badge/Stellar-Testnet-7C3AED?style=flat-square&logo=stellar&logoColor=white)](https://stellar.org)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://typescriptlang.org)
[![Node.js](https://img.shields.io/badge/Node.js-Express-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org)
[![SQLite](https://img.shields.io/badge/SQLite-better--sqlite3-003B57?style=flat-square&logo=sqlite&logoColor=white)](https://sqlite.org)
[![Tests](https://img.shields.io/badge/Tests-43%20passed-brightgreen?style=flat-square&logo=vitest&logoColor=white)](https://vitest.dev)
[![CI](https://img.shields.io/badge/CI-GitHub%20Actions-2088FF?style=flat-square&logo=githubactions&logoColor=white)](.github/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-black?style=flat-square)](LICENSE)

<br />

</div>

---

## Overview

CreditBridge is an institutional receivables financing platform designed around the **Stellar network**. It allows corporate debtors and originators to register verified trade receivables, source non-bank liquidity from capital allocators, track granular investor entitlements, and execute repayment settlement on **Stellar Testnet** backed by an internal double-entry accounting ledger.

> **Operational Status**: CreditBridge is currently operating on **Stellar Testnet** with off-chain double-entry accounting persistence. It is **not** connected to Stellar Mainnet, does not move production funds or live fiat-backed USDC, and does not custody user assets.

---

## Real vs. Off-Chain vs. Future Architecture

To ensure complete transparency regarding protocol capabilities, CreditBridge strictly distinguishes between what is live on-chain, what is managed in the server database, and what remains future roadmap:

### 🟢 REAL / IMPLEMENTED
- **Stellar Ed25519 Identity**: Strict validation of 56-character Stellar public keys (`G...`) using `@stellar/stellar-sdk` StrKey verification. Rejects EVM (`0x...`) and malformed keys at both API boundaries and client forms.
- **Freighter Non-Custodial Wallet Integration**: Connection and genuine transaction signing through the Freighter browser extension (`@stellar/freighter-api`).
- **Live Horizon Network Telemetry**: Server-side client querying official Stellar Horizon Testnet endpoints for ledger sequence numbers, average close times, base reserve, and base fee statistics, featuring an in-memory cache and graceful offline degradation.
- **Stellar Testnet Transaction Construction**: Backend generation of valid Stellar payment and memo transaction envelopes (XDR) for both account funding proofs and receivable settlement.
- **On-Chain Testnet Submission**: Ability to broadcast signed transaction envelopes to Horizon Testnet, capturing genuine transaction hashes and linking directly to StellarExpert Testnet explorer.
- **Persistent Investment Ledger**: Relational SQLite schema (`investments` and `settlements` tables) tracking fractional allocations, ownership percentages, locked APRs, and repayment status.
- **Server-Authoritative Financial Accounting**: Deterministic, cent-accurate mathematical engine enforcing 365-day commercial yield calculation, unearned interest accounting, and proportional capital distribution.
- **Repayment & Settlement Lifecycle**: Full debtor repayment flow with idempotent settlement safeguards, anti-double-settlement checks, and per-investor payout reconciliation.
- **Gemini AI Credit Risk Scoring**: Structured corporate risk evaluations via Google Gen AI SDK (`@google/genai`), backed by a deterministic local scoring algorithm when an API key is not present.
- **Automated Testing Suite**: 43 automated unit and API integration tests running on Vitest with process-isolated SQLite databases.
- **GitHub Actions CI**: Automated verification pipeline running dependencies installation, TypeScript typecheck, automated tests, and production build on every push and pull request to `main`.

### 🟡 OFF-CHAIN / INTERNAL
- **Application Database**: Master state for invoices, user profiles, activities, and audit trail records stored locally in SQLite (`creditbridge.db`) via `better-sqlite3`.
- **Investment Positions**: Fractional allocations and investor entitlements recorded and reconciled in the application database rather than via smart tokens or tokenized liquidity pools.
- **Audit Trail Records**: System event history (tokenization proposals, risk updates, settlement timestamps) maintained in the local SQLite audit table with associated operator wallets and transaction hashes.
- **Risk & Portfolio Analytics**: Aggregation of funded capital, average APRs, industry distributions, and historical settlements calculated off-chain.

### ⚪ NOT YET IMPLEMENTED / ROADMAP
- **Stellar Mainnet Settlement**: Moving live commercial capital on the public Stellar network.
- **Production USDC Liquidity**: Integration with regulated fiat on/off-ramps or live Circle USDC trustlines on Stellar Mainnet.
- **Full Soroban Smart Contract Escrow**: Decentralized, multi-party smart contract escrows with trustless on-chain collateral locking.
- **Cryptographic Ownership Authentication (SEP-0010)**: Formal challenge-transaction challenge/response authentication. Currently, wallet address submission establishes an application session token without requiring a signed cryptographic challenge.
- **Institutional KYC/AML Verification**: Integration with regulated identity verification or sanction-screening providers.
- **Secondary Market**: On-chain order book or AMM for trading fractional receivable positions before maturity.

---

## The Receivables Lifecycle

CreditBridge organizes corporate receivable financing into a clear five-stage operational flow:

```
1. Submit Receivable ──► 2. Risk Assessment ──► 3. Marketplace Listing
   (Corporate debtor        (Gemini AI score &      (Investors allocate
    registers invoice)       deterministic check)    capital positions)
                                                            │
                                                            ▼
5. Investor Reconciliation ◄── 4. Repayment Settlement ◄────┘
   (Server-authoritative          (Debtor signs Stellar
    entitlement distribution)      Testnet transaction)
```

1. **Submit Receivable**: The corporate receiver enters counterparty details, invoice face value, maturity date, and yield terms.
2. **Risk Assessment**: The invoice is evaluated by Gemini AI (or the fallback credit engine) to assign a credit risk tier (Low Risk, Stable, Moderate).
3. **Marketplace Listing**: The receivable appears in the marketplace where investors fund fractional shares. Each position is immutably recorded in the relational database.
4. **Repayment Settlement**: At maturity, the debtor initiates settlement. The backend prepares an unsigned Stellar Testnet payment envelope with an invoice reference memo. The debtor signs via Freighter and submits it to Horizon.
5. **Investor Reconciliation**: The server-authoritative accounting engine verifies payment, transitions the invoice to `Paid`, marks the settlement record as `Settled`, and reconciles exact principal and accrued yield entitlements for each participating investor.

---

## Architecture & Tech Stack

```
┌────────────────────────────────────────────────────────┐
│               React 19 Frontend (Vite)                │
│  - Editorial Minimalist UI (Tailwind CSS v4)           │
│  - Non-Custodial Freighter Wallet Signing              │
│  - Real-time Socket.IO Ledger Updates                  │
│  - D3.js Yield Curves & Interactive Schedules          │
└───────────────────────────┬────────────────────────────┘
                            │ HTTP / WebSocket
┌───────────────────────────▼────────────────────────────┐
│             Node.js / Express Backend                  │
│  - Strict Stellar Ed25519 Key Validation               │
│  - JWT Session Issuance & Protected Routes             │
│  - Deterministic Investment Accounting Engine          │
│  - Idempotent Repayment & Settlement Controller        │
│  - Horizon Telemetry Poller & Failover Cache           │
│  - Google Gen AI SDK Integration (@google/genai)       │
└─────────────┬────────────────────────────┬─────────────┘
              │ SQLite Queries             │ Stellar Horizon API
┌─────────────▼─────────────┐ ┌────────────▼─────────────┐
│  SQLite (better-sqlite3)  │ │  Stellar Testnet Horizon  │
│  - invoices               │ │  - Network Fee Telemetry  │
│  - investments            │ │  - Ledger Sequence Status │
│  - settlements            │ │  - Account Funding Proofs │
│  - audit_trail            │ │  - Settlement Submissions │
│  - activities, users      │ │  - StellarExpert Explorer │
└───────────────────────────┘ └───────────────────────────┘
```

| Component | Technology | Description |
|---|---|---|
| **Frontend Framework** | React 19, TypeScript 5.8 | Functional components with client-side routing and state machines |
| **Styling & Animation** | Tailwind CSS v4, Motion | High-contrast brutalist editorial design system |
| **Visualizations** | D3.js v7 | Custom yield curve visualizer and analytics charts |
| **Server Runtime** | Node.js, Express, tsx | REST API server with Socket.IO real-time event broadcasting |
| **Database** | SQLite via `better-sqlite3` | Local relational database with atomic transaction support |
| **Blockchain Client** | `@stellar/stellar-sdk` | Stellar SDK for key validation, XDR building, and Horizon calls |
| **Wallet Connector** | `@stellar/freighter-api` | Non-custodial Freighter extension bridge for signing transactions |
| **AI Risk Scoring** | Google Gen AI (`@google/genai`) | Gemini models with structured JSON schemas and offline fallback |
| **Build & Bundling** | Vite 6, esbuild | Fast client bundling and self-contained CommonJS server compilation |
| **Testing** | Vitest, Supertest | Unit and integration testing with PID-isolated test databases |

---

## Project Structure

```
creditbridge/
├── .github/
│   └── workflows/
│       └── ci.yml                 # GitHub Actions CI pipeline (Node.js 22, lint, test, build)
├── server.ts                      # Express + Socket.IO server and API route handlers
├── db.ts                          # SQLite database layer (better-sqlite3) with relational schema
├── src/
│   ├── App.tsx                    # Root application component and view router
│   ├── main.tsx                   # React DOM entry point
│   ├── types.ts                   # Authoritative TypeScript types and data models
│   ├── data.ts                    # Default seed receivables and protocol metadata
│   ├── index.css                  # Tailwind CSS entry file
│   ├── serverApp.ts               # Express application factory for test harnesses
│   ├── components/
│   │   ├── LandingPage.tsx        # Institutional landing and framework explainer
│   │   ├── WalletAuth.tsx         # Stellar Ed25519 wallet connection dialog
│   │   ├── Dashboard.tsx          # Corporate receiver & portfolio management dashboard
│   │   ├── Marketplace.tsx        # Receivables marketplace with live investment modal
│   │   ├── SafeTransactionPanel.tsx # Stellar Testnet transaction inspection & proof tool
│   │   ├── RepaymentSettlementModal.tsx # Multi-step settlement review, signing & payout flow
│   │   ├── Analytics.tsx          # Portfolio analytics and yield metrics
│   │   ├── Admin.tsx              # Protocol admin panel (requires G... admin public key)
│   │   ├── D3LineChart.tsx        # D3.js yield performance chart
│   │   ├── ErrorBoundary.tsx      # React error boundary component
│   │   └── Toast.tsx              # Toast notification provider
│   ├── hooks/
│   │   └── useStellarNetwork.ts   # Live Horizon network telemetry polling hook
│   ├── services/
│   │   ├── stellarClient.ts       # Stellar SDK Horizon server singleton
│   │   ├── stellarNetworkService.ts # Server Horizon polling, caching, and transaction submission
│   │   └── stellarWalletService.ts  # Non-custodial wallet provider abstraction (Freighter)
│   └── utils/
│       ├── investmentAccounting.ts # Server-authoritative financial calculation engine
│       ├── pdfExport.ts           # jsPDF invoice export utility
│       └── stellar.ts             # Address formatters, testnet explorer links, demo fixtures
├── tests/
│   ├── api/
│   │   └── apiEndpoints.test.ts   # Integration tests for auth, invoices, investments, settlements
│   ├── fixtures/
│   │   └── stellarFixtures.ts     # Valid and invalid Ed25519 test fixtures
│   ├── setup.ts                   # Vitest setup with PID-isolated SQLite databases
│   └── unit/
│       ├── accounting.test.ts     # Financial precision, yield, and distribution unit tests
│       ├── dbLedger.test.ts       # Database transactional upsert and ledger integrity tests
│       ├── stellarIdentity.test.ts# Ed25519 public key validation and role verification tests
│       └── stellarNetworkService.test.ts # Horizon telemetry caching and graceful degradation tests
├── package.json
├── package-lock.json
├── tsconfig.json
├── vite.config.ts
└── vitest.config.ts
```

---

## API Reference

All protected routes require a `Bearer <token>` HTTP header containing a valid JWT issued by `/api/auth/login`.

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/health` | — | Health check and protocol status |
| `POST` | `/api/auth/login` | — | Authenticate Stellar Ed25519 address (`G...`) and issue JWT |
| `GET` | `/api/stellar/network` | — | Real-time Horizon telemetry (ledger sequence, base fee, close time) |
| `GET` | `/api/stellar/account/:address` | — | Query account funding and subentry status from Horizon Testnet |
| `POST` | `/api/stellar/tx/prepare-proof` | ✓ | Generate unsigned testnet proof transaction envelope (XDR) |
| `POST` | `/api/stellar/tx/submit` | ✓ | Broadcast signed transaction envelope to Stellar Horizon Testnet |
| `GET` | `/api/invoices` | — | List all registered invoices with current funding progress |
| `POST` | `/api/invoices` | ✓ | Register a new trade receivable on the protocol |
| `POST` | `/api/invoices/:id/invest` | ✓ | Allocate capital to a receivable and create investment record |
| `GET` | `/api/investments` | — | Fetch all recorded investment positions across the platform |
| `GET` | `/api/investments/investor/:walletAddress` | — | Fetch all investment positions for a specific investor wallet |
| `GET` | `/api/investments/invoice/:invoiceId` | — | Fetch all investor allocations for a specific invoice |
| `GET` | `/api/investments/:id` | — | Fetch a single investment position by ID |
| `GET` | `/api/invoices/:id/settlement-calculation` | — | Server-authoritative distribution and entitlement calculation |
| `POST` | `/api/invoices/:id/prepare-repayment` | ✓ | Construct unsigned settlement payment transaction envelope |
| `POST` | `/api/invoices/:id/repay` | ✓ | Submit signed repayment or execute settlement; atomic ledger update |
| `GET` | `/api/settlements` | — | List all permanent settlement records |
| `GET` | `/api/settlements/invoice/:invoiceId` | — | Fetch settlement record for a specific invoice |
| `POST` | `/api/invoices/:id/risk` | ✓ | Mutate invoice risk rating (requires admin authorization) |
| `POST` | `/api/risk-scoring` | — | Request Gemini AI credit risk scoring for an invoice |
| `GET` | `/api/market-sentiment` | — | Fetch Gemini AI market intelligence and yield trends |
| `GET` | `/api/activities` | — | Retrieve recent protocol activity stream |
| `GET` | `/api/audit-trail` | — | Retrieve internal audit trail records |
| `POST` | `/api/audit-trail/restore` | — | Reset audit trail to default baseline records |
| `POST` | `/api/audit-trail/clear` | — | Clear all audit trail entries |
| `GET` | `/api/user/:walletAddress` | — | Retrieve user settings (theme, risk alerts) |
| `PUT` | `/api/user/:walletAddress` | ✓ | Update user profile and notification preferences |

Real-time events are broadcast over **Socket.IO** on the `invoice_updated` channel whenever an invoice is created, funded, settled, or updated.

---

## Getting Started

### Prerequisites

- **Node.js**: `v22.x` recommended (`v18+` minimum)
- **npm**: `v9+`
- **Freighter Wallet Extension** (optional, for genuine on-chain signing on Stellar Testnet)
- **Gemini API Key** (optional, fallback deterministic credit scoring runs automatically if not provided)

### 1. Installation

```bash
# Clone the repository
git clone https://github.com/Stellar-CreditBridge/creditbridge.git
cd creditbridge

# Install dependencies
npm ci
```

### 2. Environment Configuration

Copy the example configuration file:

```bash
cp .env.example .env
```

Review and configure variables in `.env`:

```env
# JWT signing key for authenticated sessions
JWT_SECRET=your-secure-random-jwt-secret

# Google Gemini API key for live AI risk scoring (optional)
GEMINI_API_KEY=your-gemini-api-key

# Stellar network configuration (defaults to Testnet)
STELLAR_NETWORK=testnet
STELLAR_HORIZON_URL=https://horizon-testnet.stellar.org
```

### 3. Running Locally

Start the development server:

```bash
npm run dev
```

Visit `http://localhost:3000` to interact with CreditBridge.

---

## Testing & CI

CreditBridge includes an automated test suite verifying core accounting calculations, database transactions, Stellar identity validation, and API endpoints.

### Verified Test Results

```
Test Files  5 passed (5)
     Tests  43 passed (43)
  Duration  ~8s
```

The test suite covers:
- `tests/unit/accounting.test.ts`: 11 tests verifying cent-accurate rounding, 365-day day-count yield formulas, unearned interest accounting, ownership share math, and settlement entitlement sums.
- `tests/unit/dbLedger.test.ts`: 4 tests verifying SQLite schema creation, atomic `ON CONFLICT` updates, and relational integrity.
- `tests/unit/stellarIdentity.test.ts`: 9 tests verifying Ed25519 validation, EVM address rejection, and admin role attribution.
- `tests/unit/stellarNetworkService.test.ts`: 4 tests verifying Horizon network telemetry polling, in-memory caching, and graceful offline failover.
- `tests/api/apiEndpoints.test.ts`: 15 tests verifying JWT authentication, invoice registration, capital allocation limits, anti-double-settlement protection, and user profile persistence.

### Verification Commands

```bash
# Run TypeScript typecheck
npm run lint

# Run all automated tests
npm test

# Run tests in watch mode
npm run test:watch

# Run test coverage report
npm run test:coverage

# Run production build (Vite + esbuild)
npm run build

# Start production server
npm start
```

### Continuous Integration (GitHub Actions)

Continuous integration is configured in `.github/workflows/ci.yml`. On every push or pull request to `main`, GitHub Actions automatically:
1. Checks out the repository using `actions/checkout@v4`
2. Sets up Node.js 22 using `actions/setup-node@v4` with npm caching
3. Installs clean dependencies via `npm ci`
4. Runs static TypeScript verification via `npm run lint` (`tsc --noEmit`)
5. Runs the automated test suite via `npm test` (`vitest run`)
6. Executes the full production build via `npm run build`

All steps are configured without error suppression (`|| true`) to ensure that any typecheck, test, or build regression immediately fails the pipeline.

---

## Security Boundaries & Disclaimers

1. **Testnet Only**: All on-chain operations target the public **Stellar Testnet**. Do not submit Mainnet secret keys or attempt to settle real-world funds.
2. **Non-Custodial Design**: CreditBridge does not store, transmit, or custody private keys or seed phrases. When signing transactions, payloads are passed to the user's browser wallet (such as Freighter) via standard XDR envelopes.
3. **Session Authentication Boundary**: Submitting a public key to `/api/auth/login` issues an application JWT session for UI convenience. While this verifies that the key is a syntactically valid Stellar Ed25519 public key, it does **not** cryptographically prove ownership of the private key. Production deployments should implement **SEP-0010** Web Authentication before handling live capital.
4. **Internal Double-Entry Ledger**: Balances, allocations, and repayment entitlements are maintained in the local SQLite database. They do not constitute an on-chain tokenized fund or secondary asset contract.

---

## Contributing

Contributions are welcome. Please ensure that all changes pass the verification suite before opening a pull request:

```bash
npm run lint && npm test && npm run build
```

---

## License

This project is licensed under the [MIT License](LICENSE).
