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
  creatorWallet: string;
}

export interface Activity {
  id: string;
  title: string;
  timestamp: string;
  amount?: string;
  type: 'approval' | 'repayment' | 'limit_update';
}

export interface WalletState {
  address: string | null;
  provider: 'freighter' | 'albedo' | 'rabe' | null;
  connected: boolean;
}

export interface AuditTrailEntry {
  id: string;
  timestamp: string; // ISO string format
  eventId: string; // e.g. "CB-9021"
  eventName: string; // e.g. "Global Logistics Inc."
  actionType: 'Tokenization' | 'Risk Mutation' | 'Asset Funding' | 'Settlement';
  details: string;
  txHash?: string; // Simulated Stellar tx hash
  operatorWallet: string; // Wallet that executed the action
}

