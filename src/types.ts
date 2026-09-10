export type StellarPublicKey = string;

export interface Invoice {
  id: string;
  partnerName: string;
  industry: 'Logistics' | 'Technology' | 'Healthcare' | 'Energy' | 'Retail';
  amount: number;
  annualReturn: number; // as percentage, e.g. 12.5 for 12.5%
  dueDate: string;
  fundingProgress: number; // 0 to 100
  targetAmount: number;
  daysRemaining: number;
  status: 'Funded' | 'Pending' | 'Due Soon' | 'Paid';
  risk: 'Low Risk' | 'Moderate' | 'Stable';
  creatorWallet: StellarPublicKey;
}

export interface Activity {
  id: string;
  title: string;
  timestamp: string;
  amount?: string;
  type: 'approval' | 'repayment' | 'limit_update';
}

export interface WalletState {
  address: StellarPublicKey | null;
  provider: 'freighter' | 'albedo' | 'rabe' | null;
  connected: boolean;
  role?: 'investor' | 'admin';
}

export interface AuditTrailEntry {
  id: string;
  timestamp: string; // ISO string format
  eventId: string; // e.g. "CB-9021"
  eventName: string; // e.g. "Global Logistics Inc."
  actionType: 'Tokenization' | 'Risk Mutation' | 'Asset Funding' | 'Settlement';
  details: string;
  txHash?: string; // Simulated Stellar tx hash
  operatorWallet: StellarPublicKey; // Wallet that executed the action
}

export type InvestmentStatus = 'Active' | 'Settled' | 'Defaulted';

export interface Investment {
  id: string; // Unique position identifier, e.g. "INV-178903-XXXX"
  invoiceId: string; // Relational foreign key referencing Invoice.id
  investorWallet: StellarPublicKey; // Stellar Ed25519 public key
  amount: number; // Principal invested in USD, 2 decimal places precision
  capturedApr: number; // APR % captured from invoice at investment time
  expectedYield: number; // Projected interest yield in USD (not yet earned/paid)
  expectedReturn: number; // Projected total repayment (principal + expectedYield) in USD
  timestamp: string; // ISO 8601 creation timestamp
  maturityDate: string; // Expected maturity date (aligned with invoice dueDate)
  status: InvestmentStatus; // Current position status
}

export interface InvestmentWithInvoice extends Investment {
  partnerName?: string;
  industry?: string;
  daysRemaining?: number;
  invoiceStatus?: 'Funded' | 'Pending' | 'Due Soon' | 'Paid';
  invoiceAmount?: number;
  ownershipPercentage?: number;
}

export interface InvestorPortfolioSummary {
  totalPrincipalInvested: number;
  totalExpectedYield: number;
  totalExpectedRepayment: number;
  weightedAverageApr: number;
  activePositionsCount: number;
  settledPositionsCount: number;
}

