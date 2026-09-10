import { Investment, InvestmentWithInvoice, InvestorPortfolioSummary } from '../types';

/**
 * INVESTMENT ACCOUNTING ENGINE
 * 
 * Centralized financial and accounting utilities for CreditBridge's investment ledger.
 * 
 * ACCOUNTING FORMULAS & ASSUMPTIONS:
 * 1. Monetary Precision: All dollar calculations are rounded to 2 decimal places using
 *    cent-precision arithmetic (`roundCurrency`) to prevent floating-point representation drift.
 * 2. Day-Count Convention: Uses the standard 365-day actual/365 commercial convention
 *    common to short-term trade receivables and commercial paper.
 * 3. Projected Interest Yield: Calculated as simple annualized interest prorated for tenure:
 *      expectedYield = principal * (capturedApr / 100) * (durationDays / 365)
 *    DISCLOSURE: This is projected unearned interest that matures upon settlement by the debtor;
 *    it is NOT recognized as earned income at the time of allocation.
 * 4. Expected Total Repayment: The sum of principal plus projected interest yield:
 *      expectedReturn = principal + expectedYield
 * 5. Allocation / Ownership Share: The fraction of the total invoice receivable funded:
 *      ownershipPercentage = (principal / targetAmount) * 100
 * 6. Weighted Average APR: Calculated weighted by active capital principal:
 *      weightedApr = sum(principal_i * apr_i) / sum(principal_i)
 */

/**
 * Rounds a monetary amount to 2 decimal places (cents), avoiding floating-point drift.
 */
export function roundCurrency(amount: number): number {
  if (isNaN(amount) || !isFinite(amount)) return 0;
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

/**
 * Calculates projected interest yield for an allocation.
 * 
 * @param principal The USD amount invested.
 * @param apr The annual percentage rate (e.g. 12.5 for 12.5%).
 * @param durationDays The duration in days remaining until maturity (minimum 1 day).
 * @returns Projected interest yield in USD, rounded to 2 decimal places.
 */
export function calculateExpectedYield(principal: number, apr: number, durationDays: number): number {
  if (principal <= 0 || apr <= 0) return 0;
  const days = Math.max(1, Math.round(durationDays));
  const rawYield = principal * (apr / 100) * (days / 365);
  return roundCurrency(rawYield);
}

/**
 * Calculates the total expected repayment at maturity (Principal + Yield).
 */
export function calculateExpectedReturn(principal: number, expectedYield: number): number {
  return roundCurrency(principal + expectedYield);
}

/**
 * Calculates the investor's ownership percentage of the total invoice facility.
 */
export function calculateOwnershipPercentage(principal: number, targetAmount: number): number {
  if (targetAmount <= 0 || principal <= 0) return 0;
  const pct = (principal / targetAmount) * 100;
  return Math.min(100, roundCurrency(pct));
}

/**
 * Computes aggregate portfolio accounting metrics for a set of positions.
 */
export function calculatePortfolioSummary(investments: (Investment | InvestmentWithInvoice)[]): InvestorPortfolioSummary {
  if (!investments || investments.length === 0) {
    return {
      totalPrincipalInvested: 0,
      totalExpectedYield: 0,
      totalExpectedRepayment: 0,
      weightedAverageApr: 0,
      activePositionsCount: 0,
      settledPositionsCount: 0
    };
  }

  let totalPrincipalInvested = 0;
  let totalExpectedYield = 0;
  let totalExpectedRepayment = 0;
  let totalWeightedAprSum = 0;
  let activePositionsCount = 0;
  let settledPositionsCount = 0;

  for (const pos of investments) {
    if (pos.status === 'Active') {
      activePositionsCount++;
      totalPrincipalInvested += pos.amount;
      totalExpectedYield += pos.expectedYield;
      totalExpectedRepayment += pos.expectedReturn;
      totalWeightedAprSum += pos.amount * pos.capturedApr;
    } else if (pos.status === 'Settled') {
      settledPositionsCount++;
    }
  }

  totalPrincipalInvested = roundCurrency(totalPrincipalInvested);
  totalExpectedYield = roundCurrency(totalExpectedYield);
  totalExpectedRepayment = roundCurrency(totalExpectedRepayment);

  const weightedAverageApr = totalPrincipalInvested > 0
    ? roundCurrency(totalWeightedAprSum / totalPrincipalInvested)
    : 0;

  return {
    totalPrincipalInvested,
    totalExpectedYield,
    totalExpectedRepayment,
    weightedAverageApr,
    activePositionsCount,
    settledPositionsCount
  };
}
