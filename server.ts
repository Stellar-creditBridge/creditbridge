import express from "express";
import dotenv from "dotenv";
dotenv.config();

import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import * as db from "./db";
import { z } from "zod";
import jwt from "jsonwebtoken";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import { StrKey } from "@stellar/stellar-sdk";
import { STELLAR_DEMO_KEYS } from "./src/utils/stellar";
import { 
  roundCurrency, 
  calculateExpectedYield, 
  calculateExpectedReturn, 
  calculateOwnershipPercentage, 
  calculatePortfolioSummary 
} from "./src/utils/investmentAccounting";
import { Investment, InvestmentWithInvoice } from "./src/types";

// --- Stellar Public Key Zod Validator ---
const stellarAddressSchema = z.string().refine((val) => {
  try {
    return StrKey.isValidEd25519PublicKey(val.trim());
  } catch {
    return false;
  }
}, {
  message: "Invalid Stellar Ed25519 public key (must be a valid 56-character G... address)"
});

// --- Zod Schemas ---
const riskScoringSchema = z.object({
  partnerName: z.string().min(1),
  industry: z.string().min(1),
  amount: z.number().positive(),
  annualReturn: z.number().positive(),
  daysRemaining: z.number().int().nonnegative(),
  riskRating: z.string().optional(),
});

const invoiceSchema = z.object({
  id: z.string().min(1),
  partnerName: z.string().min(1),
  industry: z.enum(['Logistics', 'Technology', 'Healthcare', 'Energy', 'Retail']),
  amount: z.number().positive(),
  annualReturn: z.number().positive(),
  dueDate: z.string().min(1),
  fundingProgress: z.number().min(0).max(100),
  targetAmount: z.number().positive(),
  daysRemaining: z.number().int().nonnegative(),
  status: z.enum(['Funded', 'Pending', 'Due Soon', 'Paid']),
  risk: z.enum(['Low Risk', 'Moderate', 'Stable']),
  creatorWallet: stellarAddressSchema
});

const investSchema = z.object({
  investAmount: z.number().positive(),
  operatorWallet: stellarAddressSchema
});

const repaySchema = z.object({
  operatorWallet: stellarAddressSchema.optional()
});

const riskUpdateSchema = z.object({
  newRisk: z.enum(['Low Risk', 'Moderate', 'Stable']),
  oldRisk: z.enum(['Low Risk', 'Moderate', 'Stable']),
  operatorWallet: stellarAddressSchema.optional()
});

const userSettingsSchema = z.object({
  theme: z.enum(['light', 'dark', 'midnight', 'system']).optional(),
  riskAlertsEnabled: z.boolean().optional(),
  notificationEmail: z.string().email().optional().or(z.literal(''))
});

const generateSimTxHash = () => {
  const chars = '0123456789abcdef';
  let hash = '';
  for (let i = 0; i < 64; i++) {
    hash += chars[Math.floor(Math.random() * 16)];
  }
  return hash;
};

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;
  const httpServer = http.createServer(app);
  const io = new Server(httpServer, {
    cors: { origin: "*" }
  });
  
  const JWT_SECRET = process.env.JWT_SECRET || "super-secret-creditbridge-key";

  const requireAuth = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
      next();
    } catch (err) {
      return res.status(401).json({ error: "Invalid token" });
    }
  };

  // Middleware
  app.use(express.json());
  app.use(cors());
  app.use(morgan('dev'));

  // Rate Limiting
  const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { error: 'Too many requests, please try again later.' }
  });
  
  const aiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    message: { error: 'Too many AI analysis requests, please try again later.' }
  });

  app.use(globalLimiter);
  app.use('/api/risk-scoring', aiLimiter);
  app.use('/api/market-sentiment', aiLimiter);

  if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === "MY_GEMINI_API_KEY") {
    console.warn("⚠️  WARNING: GEMINI_API_KEY is not set. The app will use high-fidelity simulated local responses for AI endpoints.");
  }

  // API Route: Login / Issue JWT
  app.post("/api/auth/login", (req, res) => {
    const { walletAddress } = req.body;
    if (!walletAddress || typeof walletAddress !== 'string') {
      return res.status(400).json({ error: "Missing or invalid walletAddress parameter" });
    }
    const trimmed = walletAddress.trim();
    if (!StrKey.isValidEd25519PublicKey(trimmed)) {
      return res.status(400).json({ 
        error: "Invalid Stellar Ed25519 public key. Address must start with 'G' and be exactly 56 characters long." 
      });
    }
    const adminAddress = process.env.ADMIN_STELLAR_ADDRESS || STELLAR_DEMO_KEYS.ADMIN;
    const role = (trimmed === adminAddress) ? 'admin' : 'investor';
    const token = jwt.sign({ walletAddress: trimmed, role }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ token, walletAddress: trimmed, role });
  });

  // API Route: Risk Scoring via Gemini
  app.post("/api/risk-scoring", async (req, res) => {
    try {
      const parseResult = riskScoringSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: "Invalid request parameters", details: parseResult.error.issues });
      }
      const { partnerName, industry, amount, annualReturn, daysRemaining, riskRating } = parseResult.data;

      const apiKey = process.env.GEMINI_API_KEY;
      
      // If API key is missing or is the placeholder, use high-fidelity simulated response
      if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
        // Deterministic but dynamic credit score based on industry and risk assessment
        let baseScore = 710;
        if (riskRating === "Low Risk") baseScore = 780;
        if (riskRating === "Stable") baseScore = 740;
        if (riskRating === "Moderate") baseScore = 670;
        
        const randomBonus = Math.floor((Math.sin(partnerName.length) + 1) * 20); // semi-stable fake variation
        const finalScore = baseScore + randomBonus;

        return res.json({
          creditScore: finalScore,
          riskLevel: riskRating || "Moderate",
          summary: `${partnerName} shows stable liquidity profiles inside the ${industry} sector. Institutional indices reflect healthy debt-to-equity ratios with some minor macroeconomic supply chain headwinds typical for this quarter.`,
          industryRiskFactor: `Operational supply cycles and short-term capital turnaround times in ${industry}.`,
          paymentHistoryRating: `${(95 + (finalScore % 5)).toFixed(1)}% verified on-time ledger settlement track record.`,
          recommendedAction: "Approved. Recommended for standard micro-escrow portfolio diversification.",
          warning: "GEMINI_API_KEY environment variable is not configured. Displaying local high-fidelity simulated ledger analysis."
        });
      }

      // Lazy-load GoogleGenAI to ensure it doesn't crash on boot if key is invalid
      const ai = new GoogleGenAI({
        apiKey: apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: `Analyze credit risk for an invoice receivable listed on our decentralized invoice financing platform (CreditBridge):
- Debtor/Partner Company Name: "${partnerName}"
- Industry Domain: ${industry}
- Receivable Amount: $${amount}
- Asset Yield: ${annualReturn}% APR
- Maturity Timeline: ${daysRemaining} Days Remaining
- Current Initial Risk Assessment: ${riskRating}

Provide a professional, realistic corporate credit risk summary including a credit score (300 to 850 scale) and an analysis of this industry domain. Ensure the tone is financial, institutional, objective, and expert.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              creditScore: { type: Type.INTEGER, description: "A corporate credit score between 300 and 850." },
              riskLevel: { type: Type.STRING, description: "Risk classification level (e.g. 'Low Risk', 'Moderate', 'High Risk')." },
              summary: { type: Type.STRING, description: "A brief professional credit analysis of 2-3 sentences." },
              industryRiskFactor: { type: Type.STRING, description: "The single primary industry risk factor identified." },
              paymentHistoryRating: { type: Type.STRING, description: "Specific payment reliability indicator (e.g. '98.2% on-time settlement rate')." },
              recommendedAction: { type: Type.STRING, description: "Recommended investor allocation guidance." }
            },
            required: ["creditScore", "riskLevel", "summary", "industryRiskFactor", "paymentHistoryRating", "recommendedAction"]
          }
        }
      });

      if (!response.text) {
        throw new Error("Received an empty response text from the Gemini model.");
      }

      const parsedData = JSON.parse(response.text.trim());
      res.json(parsedData);
    } catch (error: any) {
      console.error("Gemini risk-scoring analysis error:", error);
      res.status(500).json({ 
        error: "Failed to generate risk analysis using Gemini API.",
        details: error?.message || String(error)
      });
    }
  });

  // API Route: Market Sentiment via Google Search Grounding
  app.get("/api/market-sentiment", async (req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;

      const fallbackData = {
        sentimentIndex: 84,
        sentimentLabel: "Institutional RWA Expansion",
        lastUpdated: "July 2026",
        trends: [
          "Private corporate credit debt tokenization volume hits historical highs on open-ledger protocols.",
          "Stellar network private-credit pools see double-digit enterprise asset velocity increases in mid-2026.",
          "Standardized institutional risk score index frameworks gain regulatory traction for cross-border escrows."
        ],
        summary: "Decentralized trade finance and Real World Asset (RWA) backing continue to experience high capital allocation rates. Multi-signature atomic settlement protocols are successfully replacing archaic bank underwriting timelines.",
        regulatoryClarity: "Regulatory clarity for tokenized private securities and trade credit has significantly improved globally, boosting commercial lender confidence.",
        groundingSources: [
          { title: "Stellar Real World Asset private credit statistics", url: "https://stellar.org" },
          { title: "DefiLlama Private Credit yield analysis", url: "https://defillama.com" }
        ],
        isSimulated: true
      };

      if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
        return res.json(fallbackData);
      }

      // Lazy-load GoogleGenAI to ensure no startup crashes
      const ai = new GoogleGenAI({
        apiKey: apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: "Research and analyze current (year 2026) trends, indices, and sentiments of institutional adoption of decentralized finance (DeFi), trade credit tokenization, and real-world asset (RWA) backing. Detail the market sentiment index, top 3 key institutional trends, and an expert summary of global corporate yield entries.",
        config: {
          tools: [{ googleSearch: {} }],
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              sentimentIndex: { type: Type.INTEGER, description: "A market index value between 0 (very bearish) and 100 (very bullish)." },
              sentimentLabel: { type: Type.STRING, description: "A brief label describing the current institutional atmosphere, e.g. 'Strong RWA Expansion'." },
              lastUpdated: { type: Type.STRING, description: "Current date label (e.g. 'July 2026')." },
              trends: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "List of exactly 3 major key active institutional DeFi/RWA trends."
              },
              summary: { type: Type.STRING, description: "A professional, expert summary of 2-3 sentences regarding institutional private credit." },
              regulatoryClarity: { type: Type.STRING, description: "A brief description of current regulatory outlook." }
            },
            required: ["sentimentIndex", "sentimentLabel", "lastUpdated", "trends", "summary", "regulatoryClarity"]
          }
        }
      });

      if (!response.text) {
        return res.json(fallbackData);
      }

      const parsedData = JSON.parse(response.text.trim());

      // Try to extract grounding sources if available
      let groundingSources: any[] = [];
      const candidate = response.candidates?.[0];
      if (candidate?.groundingMetadata?.groundingChunks) {
        const chunks = candidate.groundingMetadata.groundingChunks;
        groundingSources = chunks
          .map((chunk: any) => ({
            title: chunk.web?.title || "Search Reference",
            url: chunk.web?.uri || "#"
          }))
          .filter((item: any, idx: number, self: any[]) => item.url && self.findIndex(t => t.url === item.url) === idx)
          .slice(0, 3);
      }

      if (groundingSources.length === 0) {
        groundingSources = fallbackData.groundingSources;
      }

      res.json({
        ...parsedData,
        groundingSources,
        isSimulated: false
      });

    } catch (error: any) {
      console.error("Gemini market-sentiment search grounding error:", error);
      // Fail gracefully and return high-fidelity fallback
      res.json({
        sentimentIndex: 82,
        sentimentLabel: "Robust Institutional Sentiment",
        lastUpdated: "July 2026",
        trends: [
          "Steady enterprise onboarding into decentralized corporate invoice lending protocols.",
          "Stellar ledger liquidity pools maintain high security compliance with zero-slashing histories.",
          "Private credit smart vaults become preferred vehicle for international cargo and invoice factoring."
        ],
        summary: "Decentralized trade finance continues to outperform legacy systems. Faster turnaround times on smart escrow smart-contracts are bridging the gap between cash flows and high-yield liquidity pools.",
        regulatoryClarity: "Cross-border compliance framework standards have matured, reducing investment risk.",
        groundingSources: [
          { title: "Stellar private credit reports", url: "https://stellar.org" },
          { title: "DeFi private credit yields", url: "https://defillama.com" }
        ],
        isSimulated: true,
        errorMsg: error?.message || String(error)
      });
    }
  });

  // API Route: Get Invoices
  app.get("/api/invoices", (req, res) => {
    try {
      const invoices = db.getInvoices();
      res.json(invoices);
    } catch (err: any) {
      res.status(500).json({ error: "Failed to retrieve invoices", details: err.message });
    }
  });

  // API Route: Create Invoice
  app.post("/api/invoices", requireAuth, (req, res) => {
    try {
      const parseResult = invoiceSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: "Invalid invoice data", details: parseResult.error.issues });
      }
      const invoice = parseResult.data as any; // Allow cast back to db entity
      db.addInvoice(invoice);
      
      // Also write activity and audit entry for tokenization
      const activityId = `act-${Date.now()}`;
      const activity = {
        id: activityId,
        title: `Invoice #${invoice.id} Submitted`,
        timestamp: 'Just now',
        amount: `$${invoice.amount.toLocaleString()}`,
        type: 'approval' as const
      };
      db.addActivity(activity);

      const auditId = `trail-${Date.now()}`;
      const auditEntry = {
        id: auditId,
        timestamp: new Date().toISOString(),
        eventId: invoice.id,
        eventName: invoice.partnerName,
        actionType: 'Tokenization' as const,
        details: `Asset representative initialized on-chain. Invoice of $${invoice.amount.toLocaleString()} for ${invoice.partnerName} successfully tokenized.`,
        txHash: generateSimTxHash(),
        operatorWallet: invoice.creatorWallet || STELLAR_DEMO_KEYS.MAIN_USER
      };
      db.addAuditEntry(auditEntry);
      io.emit("invoice_updated", { type: "create", invoiceId: invoice.id });
      res.status(201).json({ success: true, invoice, activity, auditEntry });
    } catch (err: any) {
      res.status(500).json({ error: "Failed to create invoice", details: err.message });
    }
  });

  // API Route: Invest in Invoice (creates relational investment position & updates invoice funding atomically)
  app.post("/api/invoices/:id/invest", requireAuth, (req, res) => {
    try {
      const { id } = req.params;
      const parseResult = investSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: "Invalid investment parameters", details: parseResult.error.issues });
      }
      const { investAmount, operatorWallet } = parseResult.data;

      // Validate positive non-zero amount
      if (typeof investAmount !== 'number' || isNaN(investAmount) || !isFinite(investAmount) || investAmount <= 0) {
        return res.status(400).json({ error: "Investment amount must be a positive number greater than zero." });
      }

      // Validate Stellar investor public key
      const investorKey = operatorWallet.trim();
      if (!StrKey.isValidEd25519PublicKey(investorKey)) {
        return res.status(400).json({ 
          error: "Invalid Stellar Ed25519 public key. Address must be exactly 56 characters and start with 'G'." 
        });
      }

      // Verify invoice exists
      const invoices = db.getInvoices();
      const targetInvoice = invoices.find(inv => inv.id === id);
      if (!targetInvoice) {
        return res.status(404).json({ error: `Invoice #${id} not found.` });
      }

      // Check eligibility
      if (targetInvoice.status === 'Paid') {
        return res.status(400).json({ error: `Invoice #${id} has already been settled and cannot accept investments.` });
      }

      if (targetInvoice.fundingProgress >= 100) {
        return res.status(400).json({ error: `Invoice #${id} is already 100% funded.` });
      }

      // Calculate remaining funding capacity
      const currentFunded = roundCurrency((targetInvoice.amount * targetInvoice.fundingProgress) / 100);
      const remainingCapacity = roundCurrency(Math.max(0, targetInvoice.amount - currentFunded));

      if (roundCurrency(investAmount) > remainingCapacity + 0.009) {
        return res.status(400).json({ 
          error: `Investment amount ($${investAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}) exceeds remaining funding capacity ($${remainingCapacity.toLocaleString('en-US', { minimumFractionDigits: 2 })}).` 
        });
      }

      // Investment accounting calculations (server-authoritative)
      const cleanPrincipal = roundCurrency(investAmount);
      const capturedApr = targetInvoice.annualReturn;
      const durationDays = Math.max(1, targetInvoice.daysRemaining);
      const expectedYield = calculateExpectedYield(cleanPrincipal, capturedApr, durationDays);
      const expectedReturn = calculateExpectedReturn(cleanPrincipal, expectedYield);
      const maturityDate = targetInvoice.dueDate;

      // Unique investment record ID (supports multiple distinct allocations by same investor into same invoice)
      const investmentId = `INV-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
      
      const newInvestment: Investment = {
        id: investmentId,
        invoiceId: id,
        investorWallet: investorKey,
        amount: cleanPrincipal,
        capturedApr,
        expectedYield,
        expectedReturn,
        timestamp: new Date().toISOString(),
        maturityDate,
        status: 'Active'
      };

      // Compute new invoice funding progress
      const addedProgress = (cleanPrincipal / targetInvoice.amount) * 100;
      const newProgress = Math.min(100, roundCurrency(targetInvoice.fundingProgress + addedProgress));
      const status = newProgress >= 100 ? (targetInvoice.daysRemaining <= 0 ? 'Due Soon' : 'Funded') : targetInvoice.status;

      // Activity and Audit entries
      const activityId = `act-${Date.now()}`;
      const activity = {
        id: activityId,
        title: `Allocated $${cleanPrincipal.toLocaleString()} to #${id}`,
        timestamp: 'Just now',
        amount: `$${cleanPrincipal.toLocaleString()}`,
        type: 'approval' as const
      };

      const auditId = `trail-${Date.now()}`;
      const auditEntry = {
        id: auditId,
        timestamp: new Date().toISOString(),
        eventId: id,
        eventName: targetInvoice.partnerName,
        actionType: 'Asset Funding' as const,
        details: `Capital allocation: Position ${investmentId} created for $${cleanPrincipal.toLocaleString()} USD (${capturedApr}% APR, projected yield $${expectedYield.toFixed(2)}). New invoice progress: ${newProgress.toFixed(1)}%.`,
        txHash: generateSimTxHash(),
        operatorWallet: investorKey
      };

      // Execute atomic transaction in persistence layer
      db.recordInvestment(newInvestment, parseFloat(newProgress.toFixed(1)), status, activity, auditEntry);

      // Real-time notification
      io.emit("invoice_updated", { type: "invest", invoiceId: id, fundingProgress: newProgress, status });
      io.emit("investment_created", newInvestment);

      res.status(201).json({
        success: true,
        investment: newInvestment,
        fundingProgress: newProgress,
        status,
        activity,
        auditEntry
      });
    } catch (err: any) {
      console.error("Investment allocation error:", err);
      res.status(500).json({ error: "Failed to allocate investment", details: err.message });
    }
  });

  // API Route: Get all investments with optional filtering
  app.get("/api/investments", (req, res) => {
    try {
      const { investor, invoiceId } = req.query;
      let investments = db.getInvestments();

      if (investor && typeof investor === 'string') {
        const trimmed = investor.trim();
        if (!StrKey.isValidEd25519PublicKey(trimmed)) {
          return res.status(400).json({ error: "Invalid investor Stellar public key filter." });
        }
        investments = investments.filter(inv => inv.investorWallet === trimmed);
      }

      if (invoiceId && typeof invoiceId === 'string') {
        investments = investments.filter(inv => inv.invoiceId === invoiceId.trim());
      }

      res.json(investments);
    } catch (err: any) {
      res.status(500).json({ error: "Failed to retrieve investments", details: err.message });
    }
  });

  // API Route: Get investments by investor Stellar public key with joined invoice details & portfolio summary
  app.get("/api/investments/investor/:walletAddress", (req, res) => {
    try {
      const { walletAddress } = req.params;
      if (!walletAddress || !StrKey.isValidEd25519PublicKey(walletAddress.trim())) {
        return res.status(400).json({ 
          error: "Invalid Stellar Ed25519 public key. Address must start with 'G' and be exactly 56 characters long." 
        });
      }

      const investorKey = walletAddress.trim();
      const rawInvestments = db.getInvestmentsByInvestor(investorKey);
      const invoices = db.getInvoices();
      const invoiceMap = new Map(invoices.map(inv => [inv.id, inv]));

      // Enrich with invoice metadata and ownership share
      const enriched: InvestmentWithInvoice[] = rawInvestments.map(inv => {
        const invoice = invoiceMap.get(inv.invoiceId);
        return {
          ...inv,
          partnerName: invoice?.partnerName || 'Unknown Partner',
          industry: invoice?.industry || 'Logistics',
          daysRemaining: invoice?.daysRemaining ?? 0,
          invoiceStatus: invoice?.status,
          invoiceAmount: invoice?.amount,
          ownershipPercentage: invoice ? calculateOwnershipPercentage(inv.amount, invoice.amount) : 0
        };
      });

      const portfolioSummary = calculatePortfolioSummary(enriched);

      res.json({
        walletAddress: investorKey,
        investments: enriched,
        portfolioSummary
      });
    } catch (err: any) {
      res.status(500).json({ error: "Failed to retrieve investor positions", details: err.message });
    }
  });

  // API Route: Get investments by invoice ID
  app.get("/api/investments/invoice/:invoiceId", (req, res) => {
    try {
      const { invoiceId } = req.params;
      const invoices = db.getInvoices();
      const targetInvoice = invoices.find(inv => inv.id === invoiceId);
      if (!targetInvoice) {
        return res.status(404).json({ error: `Invoice #${invoiceId} not found.` });
      }

      const investments = db.getInvestmentsByInvoice(invoiceId);
      res.json({
        invoiceId,
        partnerName: targetInvoice.partnerName,
        targetAmount: targetInvoice.amount,
        fundingProgress: targetInvoice.fundingProgress,
        investments
      });
    } catch (err: any) {
      res.status(500).json({ error: "Failed to retrieve invoice investments", details: err.message });
    }
  });

  // API Route: Get single investment position by ID
  app.get("/api/investments/:id", (req, res) => {
    try {
      const { id } = req.params;
      const investment = db.getInvestmentById(id);
      if (!investment) {
        return res.status(404).json({ error: `Investment position #${id} not found.` });
      }

      const invoice = db.getInvoices().find(inv => inv.id === investment.invoiceId);
      res.json({
        ...investment,
        partnerName: invoice?.partnerName,
        industry: invoice?.industry,
        daysRemaining: invoice?.daysRemaining,
        invoiceStatus: invoice?.status,
        ownershipPercentage: invoice ? calculateOwnershipPercentage(investment.amount, invoice.amount) : 0
      });
    } catch (err: any) {
      res.status(500).json({ error: "Failed to retrieve investment", details: err.message });
    }
  });

  // API Route: Repay Invoice
  app.post("/api/invoices/:id/repay", requireAuth, (req, res) => {
    try {
      const { id } = req.params;
      const parseResult = repaySchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: "Invalid repayment parameters", details: parseResult.error.issues });
      }
      const operatorWallet = parseResult.data.operatorWallet || STELLAR_DEMO_KEYS.MAIN_USER;

      const invoices = db.getInvoices();
      const targetInvoice = invoices.find(inv => inv.id === id);
      if (!targetInvoice) {
        return res.status(404).json({ error: `Invoice #${id} not found.` });
      }

      db.repayInvoice(id);

      // Create activity
      const activityId = `act-${Date.now()}`;
      const activity = {
        id: activityId,
        title: `Repayment of #${id} Settled`,
        timestamp: 'Just now',
        amount: `$${targetInvoice.amount.toLocaleString()}`,
        type: 'repayment' as const
      };
      db.addActivity(activity);

      // Create audit entry
      const auditId = `trail-${Date.now()}`;
      const auditEntry = {
        id: auditId,
        timestamp: new Date().toISOString(),
        eventId: id,
        eventName: targetInvoice.partnerName,
        actionType: 'Settlement' as const,
        details: `Full mature settlement complete. Deposited $${targetInvoice.amount.toLocaleString()} into ledger contract. Closed corresponding asset trustline.`,
        txHash: generateSimTxHash(),
        operatorWallet: operatorWallet
      };
      db.addAuditEntry(auditEntry);
      io.emit("invoice_updated", { type: "repay", invoiceId: id });
      res.json({ success: true, activity, auditEntry });
    } catch (err: any) {
      res.status(500).json({ error: "Failed to repay invoice", details: err.message });
    }
  });

  // API Route: Mutate Risk Level
  app.post("/api/invoices/:id/risk", requireAuth, (req, res) => {
    try {
      const { id } = req.params;
      const parseResult = riskUpdateSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: "Invalid risk update parameters", details: parseResult.error.issues });
      }
      const { newRisk, oldRisk, operatorWallet } = parseResult.data;

      const invoices = db.getInvoices();
      const targetInvoice = invoices.find(inv => inv.id === id);
      if (!targetInvoice) {
        return res.status(404).json({ error: `Invoice #${id} not found.` });
      }

      db.updateInvoiceRisk(id, newRisk);

      // Create activity
      const activityId = `act-${Date.now()}`;
      const activity = {
        id: activityId,
        title: `Risk level of #${id} updated: ${oldRisk} → ${newRisk}`,
        timestamp: 'Just now',
        type: 'limit_update' as const
      };
      db.addActivity(activity);

      // Create audit entry
      const auditId = `trail-${Date.now()}`;
      const auditEntry = {
        id: auditId,
        timestamp: new Date().toISOString(),
        eventId: id,
        eventName: targetInvoice.partnerName,
        actionType: 'Risk Mutation' as const,
        details: `Institutional credit watch: Risk profile altered from ${oldRisk} to ${newRisk} following periodic risk evaluation.`,
        txHash: generateSimTxHash(),
        operatorWallet: operatorWallet || STELLAR_DEMO_KEYS.ADMIN
      };
      db.addAuditEntry(auditEntry);
      io.emit("invoice_updated", { type: "risk", invoiceId: id });
      res.json({ success: true, activity, auditEntry });
    } catch (err: any) {
      res.status(500).json({ error: "Failed to update risk rating", details: err.message });
    }
  });

  // API Route: Get Activities
  app.get("/api/activities", (req, res) => {
    try {
      const activities = db.getActivities();
      res.json(activities);
    } catch (err: any) {
      res.status(500).json({ error: "Failed to retrieve activities", details: err.message });
    }
  });

  // API Route: Get Audit Trail
  app.get("/api/audit-trail", (req, res) => {
    try {
      const auditTrail = db.getAuditTrail();
      res.json(auditTrail);
    } catch (err: any) {
      res.status(500).json({ error: "Failed to retrieve audit trail", details: err.message });
    }
  });

  // API Route: Restore Audit Trail
  app.post("/api/audit-trail/restore", (req, res) => {
    try {
      db.restoreAuditTrail();
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: "Failed to restore audit trail", details: err.message });
    }
  });

  // API Route: Clear Audit Trail
  app.post("/api/audit-trail/clear", (req, res) => {
    try {
      db.clearAuditTrail();
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: "Failed to clear audit trail", details: err.message });
    }
  });

  // API Route: Get or Create User settings
  app.get("/api/user/:walletAddress", (req, res) => {
    try {
      const { walletAddress } = req.params;
      if (!StrKey.isValidEd25519PublicKey(walletAddress)) {
        return res.status(400).json({ error: "Invalid Stellar Ed25519 public key" });
      }
      const settings = db.getUserSettings(walletAddress);
      res.json(settings);
    } catch (err: any) {
      res.status(500).json({ error: "Failed to retrieve user settings", details: err.message });
    }
  });

  // API Route: Update User settings
  app.put("/api/user/:walletAddress", requireAuth, (req, res) => {
    try {
      const { walletAddress } = req.params;
      if (!StrKey.isValidEd25519PublicKey(walletAddress)) {
        return res.status(400).json({ error: "Invalid Stellar Ed25519 public key" });
      }
      const parseResult = userSettingsSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: "Invalid user settings parameters", details: parseResult.error.issues });
      }
      const { theme, riskAlertsEnabled, notificationEmail } = parseResult.data;
      db.updateUserSettings(walletAddress, theme, riskAlertsEnabled, notificationEmail);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: "Failed to update user settings", details: err.message });
    }
  });

  // Serve static assets in production, otherwise mount Vite Dev Middleware
  if (process.env.NODE_ENV !== "production") {
    console.log("Starting server in DEVELOPMENT mode with Vite Middleware.");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Starting server in PRODUCTION mode.");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`CreditBridge Server running at http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start CreditBridge Server:", err);
  process.exit(1);
});
