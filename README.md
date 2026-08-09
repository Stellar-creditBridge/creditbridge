<div align="center">

<br />

# ⬡ CreditBridge

### Institutional Invoice Financing & Tokenization Protocol

**Tokenize corporate receivables. Fund them on-chain. Settle on Stellar.**

<br />

[![Stellar](https://img.shields.io/badge/Stellar-Powered-7C3AED?style=flat-square&logo=stellar&logoColor=white)](https://stellar.org)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://typescriptlang.org)
[![Node.js](https://img.shields.io/badge/Node.js-Express-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org)
[![Gemini AI](https://img.shields.io/badge/Gemini-AI%20Powered-4285F4?style=flat-square&logo=google&logoColor=white)](https://ai.google.dev)
[![License: MIT](https://img.shields.io/badge/License-MIT-black?style=flat-square)](LICENSE)

<br />

</div>

---

## What is CreditBridge?

CreditBridge is a **decentralized invoice financing protocol** built on the Stellar blockchain. It bridges the gap between corporate cash flow needs and institutional yield-seeking capital — without banks, without delays, and without borders.

Businesses tokenize their outstanding invoices as on-chain receivables. Investors fund those receivables in real time, earning fixed APR yields. When the invoice matures, the Stellar smart escrow settles automatically and returns principal plus yield to backers.

> Think of it as trade finance — rebuilt from scratch on a programmable ledger.

---

## Core Features

### 🔗 Invoice Tokenization
Submit corporate receivables directly to the Stellar ledger. Each invoice is minted as a unique asset representation with cryptographic proof of ownership, immutable audit trail, and simulated transaction hashes.

### 💼 Investor Marketplace
Browse a live marketplace of tokenized receivables across 5 industries — Logistics, Technology, Healthcare, Energy, and Retail. Filter by industry, risk level, APR, and duration. Fund any open invoice with a single click.

### 🤖 AI Risk Scoring (Gemini)
Every invoice can be analyzed by Google's Gemini AI model. The engine returns a structured credit report including:
- Corporate credit score (300–850 scale)
- Industry-specific risk factors
- Payment history rating
- Recommended investor allocation action

Falls back to high-fidelity deterministic scoring when no API key is configured — the app always works.

### 📡 Live Market Sentiment
A Google Search-grounded sentiment feed powered by Gemini provides real-time institutional DeFi and RWA market intelligence — sentiment index, top 3 trends, and regulatory clarity signals.

### 📊 Analytics Dashboard
Interactive D3.js line charts, monthly funding volume bars, yield calculator, and a live Stellar network monitor (ledger height, close time, base fee) — all updating in real time.

### 🔒 Stellar Wallet Authentication
Connect via **Freighter**, **Albedo**, or **Rabe** wallet providers. Your wallet address is your identity — no passwords, no email, no custody handoff. JWT tokens are issued on the backend for secure API access.

### 🛡️ Admin Protocol Panel
Admin wallets (`0xADMIN...`) gain access to a protected risk management console for approving, flagging, and mutating invoice risk profiles across the protocol.

### 📋 Immutable Audit Trail
Every action — tokenization, funding allocation, risk mutation, settlement — is logged to a tamper-evident on-chain audit trail with simulated Stellar transaction hashes and operator wallet attribution.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript, Tailwind CSS v4, Motion |
| Backend | Node.js, Express, Socket.IO |
| Database | SQLite via `better-sqlite3` |
| Blockchain | Stellar Network (simulated), USDC settlement |
| AI | Google Gemini (`gemini-2.5-flash`, `gemini-3.5-flash`) |
| Charts | D3.js v7 |
| Auth | JWT (jsonwebtoken), Stellar wallet providers |
| Validation | Zod |
| PDF/Export | jsPDF, jsPDF-AutoTable |
| QR Codes | qrcode.react |
| Dev Tooling | Vite 6, tsx, esbuild, TypeScript 5.8 |

---

## Getting Started

### Prerequisites

- **Node.js** v18 or higher
- **npm** v9 or higher
- A **Gemini API key** (optional — the app runs fully without one)

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/Stellar-CreditBridge/creditbridge.git
cd creditbridge

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env
```

Open `.env` and fill in your values:

```env
GEMINI_API_KEY=your_gemini_api_key_here
JWT_SECRET=your_secure_random_secret_here
PORT=3000
```

> The `GEMINI_API_KEY` is optional. Without it, the app uses high-fidelity simulated AI responses so every feature remains fully functional.

### Run Locally

```bash
npm run dev
```

Visit `http://localhost:3000` — the Express server serves both the API and the Vite frontend in development mode.

---

## Project Structure

```
creditbridge/
├── server.ts              # Express + Socket.IO backend, all API routes
├── db.ts                  # SQLite database layer (better-sqlite3)
├── src/
│   ├── App.tsx            # Root app component, global state, socket listeners
│   ├── main.tsx           # React entry point
│   ├── types.ts           # TypeScript interfaces (Invoice, Activity, AuditTrail...)
│   ├── data.ts            # Seed data for invoices, activities, audit trail
│   ├── index.css          # Global styles (Tailwind CSS)
│   ├── components/
│   │   ├── LandingPage.tsx    # Marketing landing page
│   │   ├── WalletAuth.tsx     # Stellar wallet connection flow
│   │   ├── Dashboard.tsx      # Main account dashboard
│   │   ├── Marketplace.tsx    # Invoice funding marketplace
│   │   ├── Analytics.tsx      # Charts, audit trail, analytics
│   │   ├── Admin.tsx          # Admin risk management panel
│   │   ├── D3LineChart.tsx    # D3.js yield performance chart
│   │   ├── ErrorBoundary.tsx  # React error boundary
│   │   └── Toast.tsx          # Toast notification system
│   └── utils/
│       └── pdfExport.ts       # jsPDF invoice export utility
├── vite.config.ts         # Vite build configuration
├── tsconfig.json          # TypeScript configuration
└── package.json
```

---

## API Reference

All protected routes require a `Bearer <token>` header (JWT issued via `/api/auth/login`).

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/auth/login` | — | Issue JWT from wallet address |
| `GET` | `/api/invoices` | — | Fetch all invoices |
| `POST` | `/api/invoices` | ✓ | Tokenize a new invoice |
| `POST` | `/api/invoices/:id/invest` | ✓ | Allocate capital to an invoice |
| `POST` | `/api/invoices/:id/repay` | ✓ | Settle a matured invoice |
| `POST` | `/api/invoices/:id/risk` | ✓ | Mutate invoice risk profile |
| `GET` | `/api/activities` | — | Fetch activity feed |
| `GET` | `/api/audit-trail` | — | Fetch full audit trail |
| `POST` | `/api/audit-trail/clear` | — | Clear audit trail entries |
| `POST` | `/api/audit-trail/restore` | — | Restore default audit entries |
| `GET` | `/api/user/:walletAddress` | — | Get user settings |
| `PUT` | `/api/user/:walletAddress` | ✓ | Update user settings |
| `POST` | `/api/risk-scoring` | — | AI credit risk analysis (Gemini) |
| `GET` | `/api/market-sentiment` | — | AI market sentiment feed (Gemini + Google Search) |

Real-time events are broadcast over **Socket.IO** on the `invoice_updated` channel whenever an invoice is created, funded, repaid, or risk-mutated.

---

## Build for Production

```bash
# Build the React frontend and bundle the server
npm run build

# Start the production server
npm start
```

The build step compiles the Vite frontend to `dist/` and bundles `server.ts` to `dist/server.cjs` via esbuild.

---

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `GEMINI_API_KEY` | No | — | Google Gemini API key for AI features |
| `JWT_SECRET` | No | `super-secret-creditbridge-key` | Secret for signing JWTs — **change this in production** |
| `PORT` | No | `3000` | Server port |
| `NODE_ENV` | No | — | Set to `production` to serve static files from `dist/` |

---

## Wallet Providers

CreditBridge supports three Stellar wallet integration methods:

| Provider | Type | Description |
|----------|------|-------------|
| **Freighter** | Browser Extension | Stellar's official browser wallet |
| **Albedo** | Web Link | Permission-based web wallet, no extension needed |
| **Rabe** | Mobile | Mobile wallet with QR-based signing |

---

## Rate Limiting

The server applies rate limiting to protect API endpoints:

- **Global:** 100 requests per 15 minutes per IP
- **AI Endpoints** (`/api/risk-scoring`, `/api/market-sentiment`): 20 requests per 15 minutes per IP

---

## Roadmap

- [ ] Live Stellar testnet integration (replace simulated tx hashes)
- [ ] Real Freighter / Albedo / Rabe SDK integration
- [ ] Multi-currency support (EURC, USDC, XLM)
- [ ] On-chain governance for risk scoring thresholds
- [ ] Mobile-responsive PWA
- [ ] Institutional KYC/AML pipeline
- [ ] Secondary market for trading funded invoice positions

---

## Contributing

Pull requests are welcome. For major changes, open an issue first to discuss what you'd like to change.

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -m 'feat: add your feature'`
4. Push to the branch: `git push origin feature/your-feature`
5. Open a pull request

---

## License

MIT © [Stellar CreditBridge](https://github.com/Stellar-CreditBridge)

---

<div align="center">



</div>
