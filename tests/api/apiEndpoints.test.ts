import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createExpressApp } from '../../src/serverApp';
import { FIXTURE_WALLETS } from '../fixtures/stellarFixtures';
import * as db from '../../db';
import { Application } from 'express';

describe('CreditBridge API Integration & Financial Endpoints', () => {
  let app: Application;
  let adminToken: string;
  let userToken: string;

  beforeAll(async () => {
    app = createExpressApp();

    // Acquire test JWTs via /api/auth/login
    const adminLogin = await request(app)
      .post('/api/auth/login')
      .send({ walletAddress: FIXTURE_WALLETS.ADMIN });
    adminToken = adminLogin.body.token;

    const userLogin = await request(app)
      .post('/api/auth/login')
      .send({ walletAddress: FIXTURE_WALLETS.INVESTOR });
    userToken = userLogin.body.token;
  });

  describe('GET /api/health', () => {
    it('returns 200 OK with protocol info', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(res.body.protocol).toBe('CreditBridge');
    });
  });

  describe('POST /api/auth/login (Stellar Ed25519 Address Validation)', () => {
    it('issues JWT token for valid Stellar public key', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ walletAddress: FIXTURE_WALLETS.MAIN_USER });

      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();
      expect(res.body.walletAddress).toBe(FIXTURE_WALLETS.MAIN_USER);
      expect(res.body.role).toBe('investor');
    });

    it('identifies admin role correctly for admin wallet', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ walletAddress: FIXTURE_WALLETS.ADMIN });

      expect(res.status).toBe(200);
      expect(res.body.role).toBe('admin');
    });

    it('rejects EVM (0x...) addresses with 400 Bad Request', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ walletAddress: FIXTURE_WALLETS.INVALID_EVM });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Invalid Stellar Ed25519 public key');
    });

    it('rejects missing or malformed address parameters', async () => {
      const res1 = await request(app).post('/api/auth/login').send({});
      expect(res1.status).toBe(400);

      const res2 = await request(app)
        .post('/api/auth/login')
        .send({ walletAddress: FIXTURE_WALLETS.INVALID_LENGTH });
      expect(res2.status).toBe(400);
    });
  });

  describe('Investment Invariants (/api/invoices/:id/invest)', () => {
    const targetInvoiceId = 'CB-API-INV-TEST';

    beforeAll(() => {
      // Seed an unbonded test invoice with $10,000 target
      db.createInvoice({
        id: targetInvoiceId,
        partnerName: 'Test Wholesale Logistics',
        industry: 'Logistics',
        amount: 10000,
        annualReturn: 12.0,
        dueDate: '2026-12-31',
        fundingProgress: 0,
        targetAmount: 10000,
        daysRemaining: 90,
        status: 'Pending',
        risk: 'Low Risk',
        creatorWallet: FIXTURE_WALLETS.BORROWER_LOGISTICS
      });
    });

    it('accepts valid partial investment and updates funding progress', async () => {
      const res = await request(app)
        .post(`/api/invoices/${targetInvoiceId}/invest`)
        .send({
          investAmount: 4000,
          operatorWallet: FIXTURE_WALLETS.INVESTOR_A
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.investment.amount).toBe(4000);
      expect(res.body.invoice.fundingProgress).toBe(40);
    });

    it('rejects investment exceeding remaining funding capacity (overfunding protection)', async () => {
      // Invoice was $10,000 with $4,000 funded, so remaining is $6,000
      const res = await request(app)
        .post(`/api/invoices/${targetInvoiceId}/invest`)
        .send({
          investAmount: 7000, // Exceeds remaining $6,000!
          operatorWallet: FIXTURE_WALLETS.INVESTOR_B
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('exceeds remaining target');
      expect(res.body.error).toContain('Overfunding rejected');
    });

    it('rejects zero or negative investment amounts via Zod validation', async () => {
      const resZero = await request(app)
        .post(`/api/invoices/${targetInvoiceId}/invest`)
        .send({
          investAmount: 0,
          operatorWallet: FIXTURE_WALLETS.INVESTOR_B
        });
      expect(resZero.status).toBe(400);

      const resNeg = await request(app)
        .post(`/api/invoices/${targetInvoiceId}/invest`)
        .send({
          investAmount: -500,
          operatorWallet: FIXTURE_WALLETS.INVESTOR_B
        });
      expect(resNeg.status).toBe(400);
    });

    it('rejects non-Stellar investor wallet addresses', async () => {
      const res = await request(app)
        .post(`/api/invoices/${targetInvoiceId}/invest`)
        .send({
          investAmount: 1000,
          operatorWallet: FIXTURE_WALLETS.INVALID_EVM
        });
      expect(res.status).toBe(400);
    });
  });

  describe('Authoritative Settlement Calculation (/api/invoices/:id/settlement-calculation)', () => {
    it('returns calculated investor entitlements and total distribution obligation', async () => {
      const res = await request(app).get('/api/invoices/CB-API-INV-TEST/settlement-calculation');
      expect(res.status).toBe(200);
      expect(res.body.calculation).toBeDefined();
      expect(res.body.calculation.invoiceId).toBe('CB-API-INV-TEST');
      expect(res.body.calculation.invoiceAmount).toBe(10000);
      expect(Array.isArray(res.body.calculation.entitlements)).toBe(true);
    });

    it('returns 404 for non-existent invoice', async () => {
      const res = await request(app).get('/api/invoices/NON-EXISTENT-ID/settlement-calculation');
      expect(res.status).toBe(404);
    });
  });

  describe('Settlement Execution & Double-Settlement Prevention (/api/invoices/:id/repay)', () => {
    const settleInvoiceId = 'CB-API-REPAY-TEST';

    beforeAll(() => {
      // Create an invoice ready for repayment
      db.createInvoice({
        id: settleInvoiceId,
        partnerName: 'Test Repay Logistics',
        industry: 'Logistics',
        amount: 20000,
        annualReturn: 10.0,
        dueDate: '2026-11-15',
        fundingProgress: 100,
        targetAmount: 20000,
        daysRemaining: 15,
        status: 'Due Soon',
        risk: 'Stable',
        creatorWallet: FIXTURE_WALLETS.BORROWER_LOGISTICS
      });
    });

    it('executes repayment and records cryptographic settlement ledger entry', async () => {
      const res = await request(app)
        .post(`/api/invoices/${settleInvoiceId}/repay`)
        .send({
          operatorWallet: FIXTURE_WALLETS.BORROWER_LOGISTICS,
          simulationMode: true
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.settlementRecord).toBeDefined();
      expect(res.body.settlementRecord.status).toBe('Settled');
      expect(res.body.settlementRecord.stellarTxHash).toBeDefined();
    });

    it('blocks double-settlement on already settled invoices', async () => {
      // Attempt to repay the exact same invoice again
      const res = await request(app)
        .post(`/api/invoices/${settleInvoiceId}/repay`)
        .send({
          operatorWallet: FIXTURE_WALLETS.BORROWER_LOGISTICS,
          simulationMode: true
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('already been settled');
      expect(res.body.error).toContain('Double-settlement rejected');
    });
  });

  describe('User Settings Protection (/api/user/:walletAddress)', () => {
    it('requires JWT authorization for PUT settings', async () => {
      const res = await request(app)
        .put(`/api/user/${FIXTURE_WALLETS.MAIN_USER}`)
        .send({ theme: 'dark' });

      expect(res.status).toBe(401);
    });

    it('updates user settings when authorized with valid token', async () => {
      const res = await request(app)
        .put(`/api/user/${FIXTURE_WALLETS.MAIN_USER}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          theme: 'midnight',
          riskAlertsEnabled: true,
          notificationEmail: 'user@creditbridge.org'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

});
