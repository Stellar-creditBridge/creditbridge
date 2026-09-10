import { Invoice, Activity, AuditTrailEntry, Investment } from './types';
import { STELLAR_DEMO_KEYS } from './utils/stellar';

export const INITIAL_INVOICES: Invoice[] = [
  {
    id: 'CB-9021',
    partnerName: 'Global Logistics Inc.',
    industry: 'Logistics',
    amount: 45000,
    annualReturn: 12.5,
    dueDate: 'Nov 12, 2023',
    fundingProgress: 78,
    targetAmount: 45000,
    daysRemaining: 12,
    status: 'Funded',
    risk: 'Low Risk',
    creatorWallet: STELLAR_DEMO_KEYS.MAIN_USER
  },
  {
    id: 'CB-8892',
    partnerName: 'TechNova Systems',
    industry: 'Technology',
    amount: 128500,
    annualReturn: 11.0,
    dueDate: 'Nov 28, 2023',
    fundingProgress: 42,
    targetAmount: 128500,
    daysRemaining: 24,
    status: 'Pending',
    risk: 'Low Risk',
    creatorWallet: STELLAR_DEMO_KEYS.MAIN_USER
  },
  {
    id: 'CB-8890',
    partnerName: 'Aries Manufacturing',
    industry: 'Logistics', // Mapped to Logistics for simplicity
    amount: 42000,
    annualReturn: 13.5,
    dueDate: 'Oct 26, 2023',
    fundingProgress: 100, // Fully funded
    targetAmount: 42000,
    daysRemaining: 0,
    status: 'Due Soon',
    risk: 'Moderate',
    creatorWallet: STELLAR_DEMO_KEYS.MAIN_USER
  },
  {
    id: 'CB-7124',
    partnerName: 'BioPath Research Inst',
    industry: 'Healthcare',
    amount: 21200,
    annualReturn: 14.2,
    dueDate: 'Nov 15, 2023',
    fundingProgress: 92,
    targetAmount: 21200,
    daysRemaining: 3,
    status: 'Pending',
    risk: 'Moderate',
    creatorWallet: STELLAR_DEMO_KEYS.BORROWER_RETAIL
  },
  {
    id: 'CB-6512',
    partnerName: 'EcoGrid Renewables',
    industry: 'Energy',
    amount: 72400,
    annualReturn: 10.5,
    dueDate: 'Dec 15, 2023',
    fundingProgress: 15,
    targetAmount: 72400,
    daysRemaining: 45,
    status: 'Pending',
    risk: 'Low Risk',
    creatorWallet: STELLAR_DEMO_KEYS.BORROWER_LOGISTICS
  },
  {
    id: 'CB-5541',
    partnerName: 'Prime Retail Group',
    industry: 'Retail',
    amount: 15000,
    annualReturn: 13.0,
    dueDate: 'Nov 18, 2023',
    fundingProgress: 60,
    targetAmount: 15000,
    daysRemaining: 18,
    status: 'Pending',
    risk: 'Stable',
    creatorWallet: STELLAR_DEMO_KEYS.BORROWER_TECH
  }
];

export const INITIAL_ACTIVITIES: Activity[] = [
  {
    id: 'act-1',
    title: 'Invoice #CB-9021 Approved',
    timestamp: '2 hours ago',
    amount: '$12,400',
    type: 'approval'
  },
  {
    id: 'act-2',
    title: 'Repayment Received',
    timestamp: 'Yesterday',
    amount: '$4,500',
    type: 'repayment'
  },
  {
    id: 'act-3',
    title: 'Limits Updated',
    timestamp: '3 days ago',
    type: 'limit_update'
  }
];

export const INITIAL_AUDIT_TRAIL: AuditTrailEntry[] = [
  {
    id: "trail-1",
    timestamp: new Date(Date.now() - 3600000 * 2).toISOString(), // 2 hours ago
    eventId: "CB-9021",
    eventName: "Global Logistics Inc.",
    actionType: "Asset Funding",
    details: "Allocated $35,100 (78% of target $45,000) under on-chain escrow pool.",
    txHash: "8dbf03b22c7a8293910c2f829a99ef83b27bcfb92c481923cd27fa4bfde19021",
    operatorWallet: STELLAR_DEMO_KEYS.INVESTOR
  },
  {
    id: "trail-2",
    timestamp: new Date(Date.now() - 3600000 * 24).toISOString(), // 24 hours ago
    eventId: "CB-8890",
    eventName: "Aries Manufacturing",
    actionType: "Settlement",
    details: "Invoice fully settled. Stellar trustline closed and $42,000 USDC distributed to backers.",
    txHash: "cf89320e4b8aef9120c850fe8841da5093e8e2193b2aefc6109f2ba9e7388890",
    operatorWallet: STELLAR_DEMO_KEYS.BORROWER_LOGISTICS
  },
  {
    id: "trail-3",
    timestamp: new Date(Date.now() - 3600000 * 48).toISOString(), // 2 days ago
    eventId: "CB-7124",
    eventName: "BioPath Research Inst",
    actionType: "Risk Mutation",
    details: "Institutional health check trigger: Risk profile adjusted from Stable to Moderate due to credit facility renewals.",
    txHash: "5f9e20a4b3d1789c629f104d88e0251bb4c00037a90b41da7e3137e90c87124f",
    operatorWallet: STELLAR_DEMO_KEYS.ADMIN
  },
  {
    id: "trail-4",
    timestamp: new Date(Date.now() - 3600000 * 72).toISOString(), // 3 days ago
    eventId: "CB-8892",
    eventName: "TechNova Systems",
    actionType: "Tokenization",
    details: "Commercial receivable worth $128,500 tokenized on the Stellar blockchain. Created asset representation.",
    txHash: "acdf980e123498be74d0a1b9201ef54210cfde38127efab01923cefa9d78892d",
    operatorWallet: STELLAR_DEMO_KEYS.MAIN_USER
  }
];

export const INITIAL_INVESTMENTS: Investment[] = [
  {
    id: 'inv-pos-1',
    invoiceId: 'CB-9021',
    investorWallet: STELLAR_DEMO_KEYS.MAIN_USER,
    amount: 15000,
    capturedApr: 12.5,
    expectedYield: 61.64,
    expectedReturn: 15061.64,
    timestamp: new Date(Date.now() - 3600000 * 5).toISOString(),
    maturityDate: 'Nov 12, 2023',
    status: 'Active'
  },
  {
    id: 'inv-pos-2',
    invoiceId: 'CB-9021',
    investorWallet: STELLAR_DEMO_KEYS.INVESTOR,
    amount: 20100,
    capturedApr: 12.5,
    expectedYield: 82.60,
    expectedReturn: 20182.60,
    timestamp: new Date(Date.now() - 3600000 * 8).toISOString(),
    maturityDate: 'Nov 12, 2023',
    status: 'Active'
  },
  {
    id: 'inv-pos-3',
    invoiceId: 'CB-8890',
    investorWallet: STELLAR_DEMO_KEYS.MAIN_USER,
    amount: 25000,
    capturedApr: 13.5,
    expectedYield: 277.40,
    expectedReturn: 25277.40,
    timestamp: new Date(Date.now() - 3600000 * 24 * 30).toISOString(),
    maturityDate: 'Oct 26, 2023',
    status: 'Active'
  },
  {
    id: 'inv-pos-4',
    invoiceId: 'CB-8890',
    investorWallet: STELLAR_DEMO_KEYS.INVESTOR,
    amount: 17000,
    capturedApr: 13.5,
    expectedYield: 188.63,
    expectedReturn: 17188.63,
    timestamp: new Date(Date.now() - 3600000 * 24 * 28).toISOString(),
    maturityDate: 'Oct 26, 2023',
    status: 'Active'
  },
  {
    id: 'inv-pos-5',
    invoiceId: 'CB-7124',
    investorWallet: STELLAR_DEMO_KEYS.MAIN_USER,
    amount: 10000,
    capturedApr: 14.2,
    expectedYield: 11.67,
    expectedReturn: 10011.67,
    timestamp: new Date(Date.now() - 3600000 * 20).toISOString(),
    maturityDate: 'Nov 15, 2023',
    status: 'Active'
  },
  {
    id: 'inv-pos-6',
    invoiceId: 'CB-7124',
    investorWallet: STELLAR_DEMO_KEYS.INVESTOR,
    amount: 9504,
    capturedApr: 14.2,
    expectedYield: 11.09,
    expectedReturn: 9515.09,
    timestamp: new Date(Date.now() - 3600000 * 25).toISOString(),
    maturityDate: 'Nov 15, 2023',
    status: 'Active'
  },
  {
    id: 'inv-pos-7',
    invoiceId: 'CB-5541',
    investorWallet: STELLAR_DEMO_KEYS.MAIN_USER,
    amount: 9000,
    capturedApr: 13.0,
    expectedYield: 57.70,
    expectedReturn: 9057.70,
    timestamp: new Date(Date.now() - 3600000 * 12).toISOString(),
    maturityDate: 'Nov 18, 2023',
    status: 'Active'
  },
  {
    id: 'inv-pos-8',
    invoiceId: 'CB-8892',
    investorWallet: STELLAR_DEMO_KEYS.INVESTOR,
    amount: 53970,
    capturedApr: 11.0,
    expectedYield: 390.37,
    expectedReturn: 54360.37,
    timestamp: new Date(Date.now() - 3600000 * 15).toISOString(),
    maturityDate: 'Nov 28, 2023',
    status: 'Active'
  },
  {
    id: 'inv-pos-9',
    invoiceId: 'CB-6512',
    investorWallet: STELLAR_DEMO_KEYS.INVESTOR,
    amount: 10860,
    capturedApr: 10.5,
    expectedYield: 140.67,
    expectedReturn: 11000.67,
    timestamp: new Date(Date.now() - 3600000 * 6).toISOString(),
    maturityDate: 'Dec 15, 2023',
    status: 'Active'
  }
];

