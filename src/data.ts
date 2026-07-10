import { Invoice, Activity, AuditTrailEntry } from './types';

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
    creatorWallet: '0x4b...4e2a'
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
    creatorWallet: '0x4b...4e2a'
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
    creatorWallet: '0x4b...4e2a'
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
    creatorWallet: '0x9a...3f1c'
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
    creatorWallet: '0x6c...11a2'
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
    creatorWallet: '0x5b...829a'
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
    operatorWallet: "GA5W32...RK6M"
  },
  {
    id: "trail-2",
    timestamp: new Date(Date.now() - 3600000 * 24).toISOString(), // 24 hours ago
    eventId: "CB-8890",
    eventName: "Aries Manufacturing",
    actionType: "Settlement",
    details: "Invoice fully settled. Stellar trustline closed and $42,000 USDC distributed to backers.",
    txHash: "cf89320e4b8aef9120c850fe8841da5093e8e2193b2aefc6109f2ba9e7388890",
    operatorWallet: "GB3N27...LQ9A"
  },
  {
    id: "trail-3",
    timestamp: new Date(Date.now() - 3600000 * 48).toISOString(), // 2 days ago
    eventId: "CB-7124",
    eventName: "BioPath Research Inst",
    actionType: "Risk Mutation",
    details: "Institutional health check trigger: Risk profile adjusted from Stable to Moderate due to credit facility renewals.",
    txHash: "5f9e20a4b3d1789c629f104d88e0251bb4c00037a90b41da7e3137e90c87124f",
    operatorWallet: "GD4K27...9X1C"
  },
  {
    id: "trail-4",
    timestamp: new Date(Date.now() - 3600000 * 72).toISOString(), // 3 days ago
    eventId: "CB-8892",
    eventName: "TechNova Systems",
    actionType: "Tokenization",
    details: "Commercial receivable worth $128,500 tokenized on the Stellar blockchain. Created asset representation.",
    txHash: "acdf980e123498be74d0a1b9201ef54210cfde38127efab01923cefa9d78892d",
    operatorWallet: "GA5W32...RK6M"
  }
];

