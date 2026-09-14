import { describe, it, expect, beforeEach } from 'vitest';
import * as db from '../../db';
import { Investment, SettlementRecord, Invoice } from '../../src/types';
import { FIXTURE_WALLETS } from '../fixtures/stellarFixtures';

describe('Database Ledger & State Machine Isolation', () => {

  const testInvoiceId = 'CB-INV-TEST-DB';
  const sampleInvoice: Invoice = {
    id: testInvoiceId,
    partnerName: 'Test Global Logistics Corp',
    industry: 'Logistics',
    amount: 100000,
    annualReturn: 12.0,
    dueDate: '2026-11-30',
    fundingProgress: 0,
    targetAmount: 100000,
    daysRemaining: 60,
    status: 'Pending',
    risk: 'Low Risk',
    creatorWallet: FIXTURE_WALLETS.BORROWER_LOGISTICS
  };

  beforeEach(() => {
    // Ensure test invoice exists or reset
    db.createInvoice(sampleInvoice);
  });

  describe('Investment Position Ledger', () => {
    it('creates an investment and updates funding progress atomically', () => {
      const investment: Investment = {
        id: `INV-TEST-1-${Date.now()}`,
        invoiceId: testInvoiceId,
        investorWallet: FIXTURE_WALLETS.INVESTOR_A,
        amount: 25000,
        capturedApr: 12.0,
        expectedYield: 493.15,
        expectedReturn: 25493.15,
        timestamp: new Date().toISOString(),
        maturityDate: '2026-11-30',
        status: 'Active'
      };

      const success = db.investInInvoice(investment, 25, 'Pending');
      expect(success).toBe(true);

      const retrieved = db.getInvestmentsByInvoice(testInvoiceId);
      const found = retrieved.find(i => i.id === investment.id);
      expect(found).toBeDefined();
      expect(found?.amount).toBe(25000);
      expect(found?.status).toBe('Active');

      const updatedInvoice = db.getInvoiceById(testInvoiceId);
      expect(updatedInvoice?.fundingProgress).toBe(25);
    });

    it('retrieves user portfolio by investor wallet address', () => {
      const invList = db.getInvestmentsByUser(FIXTURE_WALLETS.INVESTOR_A);
      expect(Array.isArray(invList)).toBe(true);
      expect(invList.some(inv => inv.investorWallet === FIXTURE_WALLETS.INVESTOR_A)).toBe(true);
    });
  });

  describe('Settlement Lifecycle & Idempotency', () => {
    it('records a settlement record and updates invoice status to Paid/Settled', () => {
      const txHash = 'a'.repeat(64);
      const settlementRecord: SettlementRecord = {
        id: `SETTLE-TEST-${Date.now()}`,
        invoiceId: testInvoiceId,
        debtorWallet: FIXTURE_WALLETS.BORROWER_LOGISTICS,
        amountDue: 100000,
        totalDistributed: 102000,
        status: 'Settled',
        network: 'testnet',
        stellarTxHash: txHash,
        entitlements: [],
        createdAt: new Date().toISOString(),
        settledAt: new Date().toISOString()
      };

      // Repay invoice
      const repaySuccess = db.repayInvoice(testInvoiceId, txHash);
      expect(repaySuccess).toBe(true);

      // Create settlement record
      const recordSuccess = db.createSettlementRecord(settlementRecord);
      expect(recordSuccess).toBe(true);

      // Check invoice status
      const settledInvoice = db.getInvoiceById(testInvoiceId);
      expect(settledInvoice?.status).toBe('Paid');
      expect(settledInvoice?.fundingProgress).toBe(100);

      // Check settlement record retrieval
      const settlements = db.getSettlementsByInvoice(testInvoiceId);
      expect(settlements.length).toBeGreaterThan(0);
      expect(settlements[0].stellarTxHash).toBe(txHash);
    });
  });

  describe('User Settings Isolation', () => {
    it('stores and retrieves user settings by Stellar address', () => {
      const testWallet = FIXTURE_WALLETS.INVESTOR_B;
      db.updateUserSettings(testWallet, 'midnight', true, 'investor-b@test.creditbridge.org');

      const settings = db.getUserSettings(testWallet);
      expect(settings).toBeDefined();
      expect(settings.theme).toBe('midnight');
      expect(settings.risk_alerts_enabled).toBe(1);
      expect(settings.notification_email).toBe('investor-b@test.creditbridge.org');
    });
  });

});
