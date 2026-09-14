import { describe, it, expect } from 'vitest';
import { 
  roundCurrency, 
  calculateExpectedYield, 
  calculateExpectedReturn, 
  calculateOwnershipPercentage, 
  calculatePortfolioSummary,
  calculateInvoiceSettlement 
} from '../../src/utils/investmentAccounting';
import { Invoice, Investment } from '../../src/types';
import { FIXTURE_WALLETS } from '../fixtures/stellarFixtures';

describe('Investment Accounting Engine & Financial Invariants', () => {

  describe('Deterministic Cent Rounding (roundCurrency)', () => {
    it('rounds exact halves symmetrically to standard 2 decimal places', () => {
      expect(roundCurrency(10.005)).toBe(10.01);
      expect(roundCurrency(10.004)).toBe(10.0);
      expect(roundCurrency(0.1 + 0.2)).toBe(0.3);
      expect(roundCurrency(1234.5678)).toBe(1234.57);
    });

    it('handles zero and negative amounts predictably', () => {
      expect(roundCurrency(0)).toBe(0);
      expect(roundCurrency(-0.0001)).toBe(-0);
    });
  });

  describe('Expected Yield Calculation (calculateExpectedYield)', () => {
    it('calculates duration-adjusted simple APR accurately based on 365 days', () => {
      // $10,000 at 12% APR for 365 days = $1,200
      const yieldFullYear = calculateExpectedYield(10000, 12.0, 365);
      expect(yieldFullYear).toBe(1200.0);

      // $10,000 at 12% APR for 180 days = 10000 * 0.12 * (180 / 365) = 591.78
      const yieldHalfYear = calculateExpectedYield(10000, 12.0, 180);
      expect(yieldHalfYear).toBe(591.78);
    });

    it('returns 0 yield when duration or principal is zero', () => {
      expect(calculateExpectedYield(0, 15.0, 60)).toBe(0);
      expect(calculateExpectedYield(5000, 15.0, 0)).toBe(0);
      expect(calculateExpectedYield(5000, 0, 60)).toBe(0);
    });

    it('prevents negative yields on invalid negative inputs', () => {
      expect(calculateExpectedYield(-5000, 12.0, 30)).toBe(0);
      expect(calculateExpectedYield(5000, -12.0, 30)).toBe(0);
      expect(calculateExpectedYield(5000, 12.0, -10)).toBe(0);
    });
  });

  describe('Maturity Entitlement & Ownership Percentage', () => {
    it('calculates expected return as exact principal + expected yield', () => {
      const principal = 25000;
      const expectedYield = 850.50;
      expect(calculateExpectedReturn(principal, expectedYield)).toBe(25850.50);
    });

    it('calculates ownership percentage accurately and caps at 100%', () => {
      expect(calculateOwnershipPercentage(25000, 100000)).toBe(25.0);
      expect(calculateOwnershipPercentage(33333.33, 100000)).toBe(33.33);
      expect(calculateOwnershipPercentage(150000, 100000)).toBe(100.0);
      expect(calculateOwnershipPercentage(1000, 0)).toBe(0);
    });
  });

  describe('Portfolio Summary & Weighted APR', () => {
    it('computes capital deployed, projected yields, and weighted average APR correctly', () => {
      const mockInvestments: Investment[] = [
        {
          id: 'INV-1',
          invoiceId: 'CB-1',
          investorWallet: FIXTURE_WALLETS.INVESTOR,
          amount: 10000,
          capturedApr: 10.0,
          expectedYield: 500,
          expectedReturn: 10500,
          timestamp: '2026-09-01T00:00:00Z',
          maturityDate: '2026-10-31',
          status: 'Active'
        },
        {
          id: 'INV-2',
          invoiceId: 'CB-2',
          investorWallet: FIXTURE_WALLETS.INVESTOR,
          amount: 30000,
          capturedApr: 14.0,
          expectedYield: 2100,
          expectedReturn: 32100,
          timestamp: '2026-09-01T00:00:00Z',
          maturityDate: '2026-10-31',
          status: 'Active'
        }
      ];

      const summary = calculatePortfolioSummary(mockInvestments);
      expect(summary.totalPrincipalInvested).toBe(40000);
      expect(summary.totalExpectedYield).toBe(2600);
      expect(summary.totalExpectedRepayment).toBe(42600);
      expect(summary.activePositionsCount).toBe(2);
      expect(summary.settledPositionsCount).toBe(0);

      // Weighted APR: (10000 * 10 + 30000 * 14) / 40000 = (100000 + 420000) / 40000 = 520000 / 40000 = 13.0%
      expect(summary.weightedAverageApr).toBe(13.0);
    });

    it('returns zeroes for empty investment portfolio', () => {
      const summary = calculatePortfolioSummary([]);
      expect(summary.totalPrincipalInvested).toBe(0);
      expect(summary.totalExpectedYield).toBe(0);
      expect(summary.weightedAverageApr).toBe(0);
      expect(summary.activePositionsCount).toBe(0);
      expect(summary.settledPositionsCount).toBe(0);
    });
  });

  describe('Multi-Investor Settlement Allocation (calculateInvoiceSettlement)', () => {
    const testInvoice: Invoice = {
      id: 'CB-REC-500',
      partnerName: 'Global Cargo Logistics',
      industry: 'Logistics',
      amount: 100000,
      annualReturn: 12.0,
      dueDate: '2026-10-15',
      fundingProgress: 100,
      targetAmount: 100000,
      daysRemaining: 60,
      status: 'Due Soon',
      risk: 'Low Risk',
      creatorWallet: FIXTURE_WALLETS.BORROWER_LOGISTICS
    };

    it('accurately divides entitlements proportionally among multiple investors', () => {
      const investments: Investment[] = [
        {
          id: 'INV-A',
          invoiceId: 'CB-REC-500',
          investorWallet: FIXTURE_WALLETS.INVESTOR_A,
          amount: 60000,
          capturedApr: 12.0,
          expectedYield: 1183.56,
          expectedReturn: 61183.56,
          timestamp: '2026-08-16T00:00:00Z',
          maturityDate: '2026-10-15',
          status: 'Active'
        },
        {
          id: 'INV-B',
          invoiceId: 'CB-REC-500',
          investorWallet: FIXTURE_WALLETS.INVESTOR_B,
          amount: 40000,
          capturedApr: 12.0,
          expectedYield: 789.04,
          expectedReturn: 40789.04,
          timestamp: '2026-08-16T00:00:00Z',
          maturityDate: '2026-10-15',
          status: 'Active'
        }
      ];

      const settlement = calculateInvoiceSettlement(testInvoice, investments);

      expect(settlement.invoiceId).toBe('CB-REC-500');
      expect(settlement.invoiceAmount).toBe(100000);
      expect(settlement.totalPrincipalAllocated).toBe(100000);
      expect(settlement.activeInvestorCount).toBe(2);

      // Investor A (60% ownership)
      const entA = settlement.entitlements.find(e => e.investorWallet === FIXTURE_WALLETS.INVESTOR_A);
      expect(entA).toBeDefined();
      expect(entA?.ownershipPercentage).toBe(60.0);
      expect(entA?.principal).toBe(60000);
      expect(entA?.totalEntitlement).toBe(61183.56);

      // Investor B (40% ownership)
      const entB = settlement.entitlements.find(e => e.investorWallet === FIXTURE_WALLETS.INVESTOR_B);
      expect(entB).toBeDefined();
      expect(entB?.ownershipPercentage).toBe(40.0);
      expect(entB?.principal).toBe(40000);
      expect(entB?.totalEntitlement).toBe(40789.04);

      // Total distribution obligation must equal sum of entitlements
      expect(settlement.totalDistributionObligation).toBe(roundCurrency(61183.56 + 40789.04));
    });

    it('ignores already-settled investments in future calculations', () => {
      const mixedInvestments: Investment[] = [
        {
          id: 'INV-ACTIVE',
          invoiceId: 'CB-REC-500',
          investorWallet: FIXTURE_WALLETS.INVESTOR_A,
          amount: 50000,
          capturedApr: 12.0,
          expectedYield: 986.30,
          expectedReturn: 50986.30,
          timestamp: '2026-08-16T00:00:00Z',
          maturityDate: '2026-10-15',
          status: 'Active'
        },
        {
          id: 'INV-OLD-SETTLED',
          invoiceId: 'CB-REC-500',
          investorWallet: FIXTURE_WALLETS.INVESTOR_B,
          amount: 50000,
          capturedApr: 12.0,
          expectedYield: 986.30,
          expectedReturn: 50986.30,
          timestamp: '2026-08-16T00:00:00Z',
          maturityDate: '2026-10-15',
          status: 'Settled'
        }
      ];

      const settlement = calculateInvoiceSettlement(testInvoice, mixedInvestments);
      expect(settlement.activeInvestorCount).toBe(1);
      expect(settlement.totalPrincipalAllocated).toBe(50000);
    });
  });

});
