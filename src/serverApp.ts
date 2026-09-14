import express from "express";
import { StrKey } from "@stellar/stellar-sdk";
import jwt from "jsonwebtoken";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import * as db from "../db";
import { STELLAR_DEMO_KEYS } from "./utils/stellar";
import { stellarNetworkService } from "./services/stellarNetworkService";
import { 
  roundCurrency, 
  calculateExpectedYield, 
  calculateExpectedReturn, 
  calculateOwnershipPercentage, 
  calculatePortfolioSummary,
  calculateInvoiceSettlement 
} from "./utils/investmentAccounting";

// Stellar Public Key Zod Validator
const stellarAddressSchema = z.string().refine((val) => {
  try {
    return StrKey.isValidEd25519PublicKey(val.trim());
  } catch {
    return false;
  }
}, {
  message: "Invalid Stellar Ed25519 public key (must be a valid 56-character G... address)"
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

const repayPrepareSchema = z.object({
  debtorWallet: stellarAddressSchema
});

const repaySchema = z.object({
  operatorWallet: stellarAddressSchema.optional(),
  signedXdr: z.string().min(10).optional(),
  simulationMode: z.boolean().optional()
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

export function createExpressApp(): express.Application {
  const app = express();
  app.set('trust proxy', 1);

  const JWT_SECRET = process.env.JWT_SECRET || "super-secret-creditbridge-key";

  const requireAuth = (req: any, res: any, next: any) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
      next();
    } catch {
      return res.status(401).json({ error: "Invalid token" });
    }
  };

  app.use(express.json());
  app.use(cors());

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", protocol: "CreditBridge", timestamp: new Date().toISOString() });
  });

  // Auth: Login / Issue JWT
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

  // Get Invoices
  app.get("/api/invoices", (req, res) => {
    try {
      const invoices = db.getInvoices();
      res.json(invoices);
    } catch (err: any) {
      res.status(500).json({ error: "Failed to retrieve invoices", details: err.message });
    }
  });

  // Create Invoice
  app.post("/api/invoices", (req, res) => {
    try {
      const parseResult = invoiceSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: "Invalid invoice parameters", details: parseResult.error.issues });
      }
      const newInvoice = parseResult.data;
      db.createInvoice(newInvoice);

      const opWallet = newInvoice.creatorWallet;
      db.createActivity({
        id: `ACT-${Date.now()}`,
        title: `Invoice #${newInvoice.id} Tokenized`,
        timestamp: new Date().toISOString(),
        amount: `$${newInvoice.amount.toLocaleString()}`,
        type: 'approval'
      });

      db.createAuditTrail({
        id: `AUDIT-${Date.now()}`,
        timestamp: new Date().toISOString(),
        eventId: newInvoice.id,
        eventName: `Tokenization Proposal: ${newInvoice.partnerName}`,
        actionType: 'Tokenization',
        details: `Commercial paper receivable of $${newInvoice.amount.toLocaleString()} tokenized with ${newInvoice.annualReturn}% APR maturing ${newInvoice.dueDate}.`,
        operatorWallet: opWallet,
        isSimulated: true
      });

      res.status(201).json(newInvoice);
    } catch (err: any) {
      res.status(500).json({ error: "Failed to create invoice", details: err.message });
    }
  });

  // Investments: Get by invoice
  app.get("/api/invoices/:id/investments", (req, res) => {
    try {
      const investments = db.getInvestmentsByInvoice(req.params.id);
      res.json(investments);
    } catch (err: any) {
      res.status(500).json({ error: "Failed to load invoice investments", details: err.message });
    }
  });

  // Investments: Create investment (atomic & validated)
  app.post("/api/invoices/:id/invest", (req, res) => {
    try {
      const { id } = req.params;
      const parseResult = investSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: "Invalid investment parameters", details: parseResult.error.issues });
      }

      const { investAmount, operatorWallet } = parseResult.data;
      const invoices = db.getInvoices();
      const targetInvoice = invoices.find(inv => inv.id === id);

      if (!targetInvoice) {
        return res.status(404).json({ error: "Invoice not found" });
      }

      if (targetInvoice.status === 'Paid') {
        return res.status(400).json({ error: "Cannot invest in an invoice that is already Settled/Paid." });
      }

      const currentFunded = roundCurrency(targetInvoice.amount * (targetInvoice.fundingProgress / 100));
      const remainingNeeded = roundCurrency(targetInvoice.amount - currentFunded);

      if (remainingNeeded <= 0 || targetInvoice.fundingProgress >= 100) {
        return res.status(400).json({ error: "Invoice is already 100% fully funded." });
      }

      if (investAmount > remainingNeeded) {
        return res.status(400).json({ 
          error: `Investment amount of $${investAmount} exceeds remaining target of $${remainingNeeded}. Overfunding rejected.` 
        });
      }

      const capturedApr = targetInvoice.annualReturn;
      const expectedYield = calculateExpectedYield(investAmount, capturedApr, targetInvoice.daysRemaining);
      const expectedReturn = calculateExpectedReturn(investAmount, expectedYield);

      const investmentId = `INV-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
      const timestamp = new Date().toISOString();

      const newInvestment = {
        id: investmentId,
        invoiceId: targetInvoice.id,
        investorWallet: operatorWallet,
        amount: investAmount,
        capturedApr: capturedApr,
        expectedYield: expectedYield,
        expectedReturn: expectedReturn,
        timestamp: timestamp,
        maturityDate: targetInvoice.dueDate,
        status: 'Active' as const
      };

      const newFundedTotal = roundCurrency(currentFunded + investAmount);
      const newProgress = Math.min(100, Math.round((newFundedTotal / targetInvoice.amount) * 100));
      const newStatus = (newProgress >= 100) ? 'Due Soon' : targetInvoice.status;

      const success = db.investInInvoice(newInvestment, newProgress, newStatus);
      if (!success) {
        return res.status(500).json({ error: "Transaction failed while recording investment in ledger." });
      }

      res.status(201).json({
        success: true,
        investment: newInvestment,
        invoice: {
          ...targetInvoice,
          fundingProgress: newProgress,
          status: newStatus
        }
      });
    } catch (err: any) {
      res.status(500).json({ error: "Failed to record investment", details: err.message });
    }
  });

  // Settlement: Calculation
  app.get("/api/invoices/:id/settlement-calculation", (req, res) => {
    try {
      const { id } = req.params;
      const invoice = db.getInvoiceById(id);
      if (!invoice) {
        return res.status(404).json({ error: `Invoice #${id} not found.` });
      }

      const investments = db.getInvestmentsByInvoice(id);
      const calculation = calculateInvoiceSettlement(invoice, investments);
      const existingSettlements = db.getSettlementsByInvoice(id);
      const latestSettlement = existingSettlements.length > 0 ? existingSettlements[0] : null;

      res.json({
        calculation,
        settlementRecord: latestSettlement
      });
    } catch (err: any) {
      res.status(500).json({ error: "Failed to calculate settlement obligations", details: err.message });
    }
  });

  // Settlement: Prepare Repayment
  app.post("/api/invoices/:id/prepare-repayment", async (req, res) => {
    try {
      const { id } = req.params;
      const parseResult = repayPrepareSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: "Invalid repayment parameters", details: parseResult.error.issues });
      }

      const { debtorWallet } = parseResult.data;
      const invoice = db.getInvoiceById(id);
      if (!invoice) {
        return res.status(404).json({ error: `Invoice #${id} not found.` });
      }

      if (invoice.status === 'Paid') {
        return res.status(400).json({ error: `Invoice #${id} is already settled and Paid.` });
      }

      const prepResult = await stellarNetworkService.prepareRepaymentTransaction(
        debtorWallet,
        invoice.id,
        invoice.amount
      );

      res.json(prepResult);
    } catch (err: any) {
      res.status(500).json({ error: "Failed to construct repayment transaction", details: err.message });
    }
  });

  // Settlement: Repay / Settle Invoice
  app.post("/api/invoices/:id/repay", async (req, res) => {
    try {
      const { id } = req.params;
      const parseResult = repaySchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: "Invalid repayment parameters", details: parseResult.error.issues });
      }

      const { operatorWallet, signedXdr, simulationMode } = parseResult.data;
      const targetInvoice = db.getInvoiceById(id);

      if (!targetInvoice) {
        return res.status(404).json({ error: `Invoice #${id} not found.` });
      }

      if (targetInvoice.status === 'Paid') {
        return res.status(400).json({ 
          error: `Invoice #${id} has already been settled and marked Paid. Double-settlement rejected.` 
        });
      }

      const investments = db.getInvestmentsByInvoice(id);
      const calculation = calculateInvoiceSettlement(targetInvoice, investments);
      const debtor = operatorWallet || targetInvoice.creatorWallet;
      const settlementId = `SETTLE-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

      let txHash = '';
      let confirmedLedger: number | undefined;
      let explorerUrl = '';
      let isSimulated = false;

      if (signedXdr && !simulationMode) {
        try {
          const submitResult = await stellarNetworkService.submitTransaction(signedXdr);
          txHash = submitResult.hash;
          confirmedLedger = submitResult.ledger;
          explorerUrl = submitResult.explorerUrl;
          isSimulated = false;
        } catch (subErr: any) {
          return res.status(400).json({ 
            error: `Stellar Testnet settlement submission rejected: ${subErr?.message || String(subErr)}` 
          });
        }
      } else {
        txHash = 'SIM-' + Array.from({length: 64}, () => Math.floor(Math.random()*16).toString(16)).join('');
        isSimulated = true;
      }

      const settlementRecord = {
        id: settlementId,
        invoiceId: targetInvoice.id,
        debtorWallet: debtor,
        amountDue: calculation.invoiceAmount,
        totalDistributed: calculation.totalDistributionObligation,
        status: 'Settled' as const,
        network: 'testnet' as const,
        stellarTxHash: txHash,
        ledger: confirmedLedger,
        explorerUrl: explorerUrl || undefined,
        entitlements: calculation.entitlements,
        createdAt: new Date().toISOString(),
        settledAt: new Date().toISOString()
      };

      const success = db.repayInvoice(id, txHash);
      if (!success) {
        return res.status(500).json({ error: "Database transaction failed during settlement execution." });
      }

      db.createSettlementRecord(settlementRecord);

      res.json({
        success: true,
        invoiceId: id,
        settlementRecord,
        investmentsSettledCount: calculation.activeInvestorCount,
        totalEntitlementsDistributed: calculation.totalDistributionObligation,
        isSimulated
      });
    } catch (err: any) {
      res.status(500).json({ error: "Failed to repay invoice", details: err.message });
    }
  });

  // User Settings
  app.get("/api/user/:walletAddress", (req, res) => {
    try {
      const { walletAddress } = req.params;
      if (!StrKey.isValidEd25519PublicKey(walletAddress)) {
        return res.status(400).json({ error: "Invalid Stellar Ed25519 public key" });
      }
      const user = db.getUserSettings(walletAddress);
      res.json(user);
    } catch (err: any) {
      res.status(500).json({ error: "Failed to retrieve user settings", details: err.message });
    }
  });

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

  return app;
}
