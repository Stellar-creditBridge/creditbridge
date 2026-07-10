import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  PlusCircle, 
  TrendingUp, 
  TrendingDown,
  Building2, 
  Clock, 
  Award, 
  Hourglass, 
  Search, 
  CheckCircle, 
  AlertTriangle, 
  Eye, 
  ChevronRight,
  Upload,
  FileText,
  X,
  CreditCard,
  Check,
  Download,
  Globe,
  ExternalLink,
  Copy,
  QrCode,
  Calculator,
  Calendar,
  Lightbulb,
  Cpu,
  ChevronLeft,
  Info
} from 'lucide-react';
import { Invoice, Activity, WalletState } from '../types';
import { exportInvoiceToPDF } from '../utils/pdfExport';
import { useToast } from './Toast';
import D3LineChart from './D3LineChart';
import { QRCodeSVG } from 'qrcode.react';

const QUICK_TIPS = [
  {
    title: "Stellar Escrow Accounts",
    text: "Escrow accounts on Stellar utilize multi-signature technology, ensuring secure invoice collateralization without relying on any centralized intermediary."
  },
  {
    title: "Early Settlement Rewards",
    text: "Settling outstanding invoices early boosts your on-chain rating, helping you unlock lower APR return terms for future liquidity requests."
  },
  {
    title: "USDC Transaction Speeds",
    text: "Stellar USDC transaction overhead is a fraction of a cent ($0.00001) with sub-second finality, optimizing cash flow and corporate liquidity."
  },
  {
    title: "Autopilot Automation",
    text: "Enabling 'Auto-Pay Maturity Invoices' ensures that invoices are settled instantly on their due date using your connected wallet balance."
  }
];

interface DashboardProps {
  invoices: Invoice[];
  activities: Activity[];
  onSubmitInvoice: (partnerName: string, amount: number, dueDate: string, industry: 'Logistics' | 'Technology' | 'Healthcare' | 'Energy' | 'Retail') => void;
  onRepayInvoice: (invoiceId: string) => void;
  onUpdateRisk?: (invoiceId: string, newRisk: 'Low Risk' | 'Moderate' | 'Stable') => void;
  setView: (view: 'landing' | 'dashboard' | 'marketplace' | 'analytics' | 'admin' | 'connect') => void;
  wallet?: WalletState;
  theme?: string;
}

export default function Dashboard({ invoices, activities, onSubmitInvoice, onRepayInvoice, onUpdateRisk, setView, wallet, theme }: DashboardProps) {
  const { showToast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [timeframe, setTimeframe] = useState<'6m' | '12m'>('6m');
  
  // Submit Invoice Form State
  const [partnerName, setPartnerName] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [industry, setIndustry] = useState<'Logistics' | 'Technology' | 'Healthcare' | 'Energy' | 'Retail'>('Logistics');
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessCheck, setShowSuccessCheck] = useState(false);

  // Market Sentiment State
  const [sentimentData, setSentimentData] = useState<any | null>(null);
  const [isSentimentLoading, setIsSentimentLoading] = useState(false);
  const [sentimentError, setSentimentError] = useState<string | null>(null);

  // Stellar Funding Gateway State
  const [showFundingQr, setShowFundingQr] = useState(false);
  const walletAddress = wallet?.address || '0x4b789123cba7f9e8a512400f912431682494e2a';

  // New states for requested features
  const [isExportConfirmOpen, setIsExportConfirmOpen] = useState(false);
  const [showCalendarView, setShowCalendarView] = useState(false);
  const [calendarYear, setCalendarYear] = useState(2026);
  const [calendarMonth, setCalendarMonth] = useState(6); // 6 = July (0-indexed)
  const [autoSettleMaturity, setAutoSettleMaturity] = useState(false);
  const [autoApproveTerms, setAutoApproveTerms] = useState(false);
  const [currentTipIndex, setCurrentTipIndex] = useState(0);

  // Yield Calculator State
  const [calcAmount, setCalcAmount] = useState('10000');
  const [calcSelectedInvoices, setCalcSelectedInvoices] = useState<string[]>([]);
  const [calcPeriodMonths, setCalcPeriodMonths] = useState(12);

  // Pre-populate calculator with up to first 4 invoices as default on-load
  useEffect(() => {
    if (invoices.length > 0 && calcSelectedInvoices.length === 0) {
      setCalcSelectedInvoices(invoices.slice(0, 4).map(inv => inv.id));
    }
  }, [invoices]);

  // Stellar Network Monitor States
  const [ledgerHeight, setLedgerHeight] = useState(62894204);
  const [closeTime, setCloseTime] = useState(4.2);
  const [baseFee, setBaseFee] = useState(100);

  useEffect(() => {
    const interval = setInterval(() => {
      setLedgerHeight(prev => prev + 1);
      setCloseTime(prev => {
        const diff = (Math.random() - 0.5) * 0.4;
        return Math.max(3.5, Math.min(5.2, +(prev + diff).toFixed(1)));
      });
      if (Math.random() > 0.8) {
        setBaseFee(prev => {
          const change = Math.random() > 0.5 ? 10 : -10;
          return Math.max(100, Math.min(150, prev + change));
        });
      }
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleCopyAddress = () => {
    navigator.clipboard.writeText(walletAddress);
    showToast("Stellar wallet address copied to clipboard!", "success");
  };

  useEffect(() => {
    let active = true;
    const fetchSentiment = async () => {
      setIsSentimentLoading(true);
      setSentimentError(null);
      try {
        const res = await fetch("/api/market-sentiment");
        if (!res.ok) {
          throw new Error("Market sentiment service returned error status.");
        }
        const data = await res.json();
        if (active) {
          setSentimentData(data);
        }
      } catch (err: any) {
        console.error("Error fetching sentiment:", err);
        if (active) {
          setSentimentError(err.message || "Failed to contact search sentiment API.");
        }
      } finally {
        if (active) {
          setIsSentimentLoading(false);
        }
      }
    };
    fetchSentiment();
    return () => {
      active = false;
    };
  }, []);

  // Active user's mock invoice data calculations
  const myInvoices = invoices.filter(inv => inv.creatorWallet === '0x4b...4e2a');
  
  // Total funding received (sum of fully funded or partially funded invoices)
  const totalFundingReceived = invoices
    .reduce((sum, inv) => sum + (inv.amount * (inv.fundingProgress / 100)), 0);

  // Outstanding Loans (Invoices funded/repaid tracking)
  const outstandingInvoices = invoices.filter(inv => inv.status === 'Due Soon');
  const totalOutstanding = outstandingInvoices.reduce((sum, inv) => sum + inv.amount, 0);

  const pendingInvoices = invoices.filter(inv => inv.status === 'Pending');
  const pendingCount = pendingInvoices.length;
  const pendingValue = pendingInvoices.reduce((sum, inv) => sum + inv.amount, 0);

  // Chart Data based on Timeframe
  const chartData6M = [
    { label: 'MAY', value: 120000, height: '40%' },
    { label: 'JUN', value: 165000, height: '55%' },
    { label: 'JUL', value: 135000, height: '45%' },
    { label: 'AUG', value: 225000, height: '75%' },
    { label: 'SEP', value: 270000, height: '90%' },
    { label: 'OCT', value: 195000, height: '65%' },
  ];

  const chartData12M = [
    { label: 'NOV', value: 95000, height: '30%' },
    { label: 'DEC', value: 110000, height: '35%' },
    { label: 'JAN', value: 140000, height: '45%' },
    { label: 'FEB', value: 125000, height: '40%' },
    { label: 'MAR', value: 180000, height: '58%' },
    { label: 'APR', value: 210000, height: '68%' },
    ...chartData6M
  ];

  const activeChartData = timeframe === '6m' ? chartData6M : chartData12M;

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setInvoiceFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setInvoiceFile(e.target.files[0]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!partnerName || !amount || !dueDate) {
      showToast("Please fill out all required fields.", "error");
      return;
    }
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      showToast("Invoice amount must be greater than zero.", "error");
      return;
    }
    if (new Date(dueDate).getTime() <= Date.now()) {
      showToast("Due date must be a future date.", "error");
      return;
    }

    setIsSubmitting(true);

    // Simulate Stellar ledger submission and smart contract validation
    setTimeout(() => {
      setIsSubmitting(false);
      setShowSuccessCheck(true);

      setTimeout(() => {
        onSubmitInvoice(partnerName, numAmount, dueDate, industry);
        // Reset state
        setPartnerName('');
        setAmount('');
        setDueDate('');
        setIndustry('Logistics');
        setInvoiceFile(null);
        setShowSuccessCheck(false);
        setIsSubmitModalOpen(false);
      }, 1000);
    }, 1800);
  };

  // Filter invoices based on search
  const filteredInvoices = invoices.filter(inv => {
    return (
      inv.partnerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.industry.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const handleDownloadCSV = () => {
    // Generate CSV headers
    const headers = [
      'Receivable ID',
      'Partner Debtor',
      'Industry',
      'Amount ($)',
      'Annual Return (%)',
      'Maturity Date',
      'Funding Progress (%)',
      'Target Amount ($)',
      'Days Remaining',
      'Ledger Status',
      'Risk Rating',
      'Creator Wallet'
    ];

    // Generate rows
    const rows = filteredInvoices.map(inv => [
      inv.id,
      // Wrap in double quotes and handle any existing quotes to escape them
      `"${inv.partnerName.replace(/"/g, '""')}"`,
      inv.industry,
      inv.amount,
      inv.annualReturn,
      inv.dueDate,
      inv.fundingProgress,
      inv.targetAmount,
      inv.daysRemaining,
      inv.status,
      inv.risk,
      inv.creatorWallet
    ]);

    // Construct CSV content
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    // Create a Blob and trigger download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `creditbridge_receivables_ledger_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("Ledger records exported to CSV successfully!", "success");
  };

  return (
    <div id="dashboard-view" className="w-full text-left bg-[#f5f3f0] min-h-screen p-6 sm:p-12">
      
      {/* Greeting & Main Action */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12 pb-8 border-b border-black/5">
        <div>
          <h1 className="text-4xl sm:text-5xl font-display font-bold italic text-on-background">Acme Ledger</h1>
          <p className="text-zinc-500 text-sm mt-1">Stellar network account overview & liquidity interface.</p>
        </div>
        
        <button 
          id="submit-invoice-btn"
          onClick={() => setIsSubmitModalOpen(true)}
          className="bg-black hover:bg-zinc-800 text-white px-6 py-4 rounded-none font-mono text-[10px] uppercase tracking-widest font-bold flex items-center gap-2 transition-colors cursor-pointer"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Submit Receivable</span>
        </button>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        
        {/* Total Funding */}
        <div className="bg-white p-6 rounded-none border border-black/10 shadow-sm flex flex-col gap-4">
          <div className="flex justify-between items-start">
            <div className="p-2 bg-black text-white">
              <Building2 className="w-4 h-4" />
            </div>
            <span className="text-[9px] font-mono font-bold text-zinc-400 uppercase tracking-wider">
              +12.5% APR
            </span>
          </div>
          <div>
            <span className="text-[9px] font-mono font-bold text-zinc-400 uppercase tracking-widest">Total Funding Received</span>
            <h3 className="text-2xl font-bold font-mono text-on-background mt-1 tracking-tight">
              ${totalFundingReceived.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
          </div>
          <div className="w-full bg-zinc-100 h-[2px] overflow-hidden mt-1">
            <div className="bg-black h-full w-3/4" />
          </div>
        </div>

        {/* Outstanding Loans */}
        <div className="bg-white p-6 rounded-none border border-black/10 shadow-sm flex flex-col gap-4">
          <div className="flex justify-between items-start">
            <div className="p-2 bg-black text-white">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div>
            <span className="text-[9px] font-mono font-bold text-zinc-400 uppercase tracking-widest">Outstanding Balance</span>
            <h3 className="text-2xl font-bold font-mono text-on-background mt-1 tracking-tight">
              ${totalOutstanding.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
          </div>
          <p className="text-[9px] font-mono font-bold text-zinc-400 uppercase tracking-widest mt-1">
            Next due in <span className="font-bold text-black underline">4 days</span>
          </p>
        </div>

        {/* Available Credit */}
        <div className="bg-white p-6 rounded-none border border-black/10 shadow-sm flex flex-col gap-4">
          <div className="flex justify-between items-start">
            <div className="p-2 bg-black text-white">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div>
            <span className="text-[9px] font-mono font-bold text-zinc-400 uppercase tracking-widest">Available Credit Line</span>
            <h3 className="text-2xl font-bold font-mono text-on-background mt-1 tracking-tight">$2,500,000.00</h3>
          </div>
          <p className="text-[9px] font-mono font-bold text-zinc-400 uppercase tracking-widest mt-1">
            Credit Score: <span className="text-black font-bold">842 (STABLE)</span>
          </p>
        </div>

        {/* Pending Applications */}
        <div className="bg-white p-6 rounded-none border border-black/10 shadow-sm flex flex-col gap-4">
          <div className="flex justify-between items-start">
            <div className="p-2 bg-black text-white">
              <Hourglass className="w-4 h-4" />
            </div>
          </div>
          <div>
            <span className="text-[9px] font-mono font-bold text-zinc-400 uppercase tracking-widest">Pending Verification</span>
            <h3 className="text-2xl font-bold font-mono text-on-background mt-1 tracking-tight">
              {pendingCount.toString().padStart(2, '0')}
            </h3>
          </div>
          <p className="text-[9px] font-mono font-bold text-zinc-400 uppercase tracking-widest mt-1">
            Est. value <span className="font-bold text-black">${pendingValue.toLocaleString('en-US')}</span>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        <div className="lg:col-span-2 space-y-8">
          {/* Main Chart Section */}
          <div className="bg-white p-6 rounded-none border border-black/10 shadow-sm flex flex-col justify-between">
            <div className="flex justify-between items-center mb-6 border-b border-black/5 pb-4">
              <div>
                <h4 className="text-xl font-display font-bold italic text-on-background">Monthly Funding Volume</h4>
                <p className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-widest mt-1">Aggregate ledger volume stats.</p>
              </div>
              
              <select 
                value={timeframe}
                onChange={(e) => setTimeframe(e.target.value as '6m' | '12m')}
                className="bg-[#f5f3f0] border border-black/10 rounded-none px-3 py-1.5 text-xs font-mono font-bold focus:border-black cursor-pointer outline-none"
              >
                <option value="6m">Last 6 Months</option>
                <option value="12m">Last 12 Months</option>
              </select>
            </div>
            
            {/* Chart Display */}
            <div className="h-64 flex items-end justify-between gap-3 px-2 pt-6 relative border-b border-black/10">
              {activeChartData.map((bar, idx) => (
                <div key={idx} className="flex-1 flex flex-col justify-end h-full relative group">
                  {/* Custom Tooltip */}
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black text-white text-[9px] font-mono font-bold px-2 py-1 rounded-none shadow-sm opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-20">
                    ${(bar.value / 1000).toFixed(0)}k
                  </div>
                  
                  {/* Animated bar */}
                  <motion.div 
                    initial={{ height: 0 }}
                    animate={{ height: bar.height }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className={`rounded-none transition-colors cursor-pointer w-full ${
                      bar.label === 'OCT' 
                        ? 'bg-zinc-700 dark:bg-zinc-300 hover:bg-zinc-600 dark:hover:bg-zinc-100' 
                        : 'bg-zinc-300 dark:bg-zinc-600 hover:bg-zinc-400 dark:hover:bg-zinc-500'
                    }`}
                  />
                </div>
              ))}
            </div>
            
            {/* Chart Labels */}
            <div className="flex justify-between mt-4 px-2 text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-wider">
              {activeChartData.map((bar, idx) => (
                <span key={idx} className={bar.label === 'OCT' ? 'text-zinc-700 dark:text-zinc-300 font-extrabold underline' : ''}>
                  {bar.label}
                </span>
              ))}
            </div>
          </div>

          {/* D3 Historical Yield and Repayment Performance Line Chart */}
          <D3LineChart invoices={invoices} theme={theme} />

          {/* Market Sentiment Widget */}
          <div className="bg-white p-6 rounded-none border border-black/10 shadow-sm flex flex-col gap-5 text-left">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-black/5 pb-4 gap-4">
              <div>
                <h4 className="text-xl font-display font-bold italic text-on-background flex items-center gap-2">
                  <Globe className="w-5 h-5 text-black animate-pulse" />
                  <span>Global DeFi Market Sentiment</span>
                </h4>
                <p className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-widest mt-1">
                  Google Search Grounded Institutional Insights
                </p>
              </div>
              <div className="flex items-center gap-2">
                {sentimentData && (
                  <span className="text-[9px] font-mono bg-zinc-100 text-zinc-600 px-2.5 py-1 uppercase border border-black/5 font-semibold">
                    Indices Updated: {sentimentData.lastUpdated}
                  </span>
                )}
                {sentimentData?.isSimulated && (
                  <span className="text-[8px] font-mono bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 uppercase font-bold animate-pulse">
                    Standard Mode
                  </span>
                )}
              </div>
            </div>

            {isSentimentLoading ? (
              <div className="flex flex-col items-center justify-center py-12 text-center gap-4">
                <div className="relative flex items-center justify-center">
                  <div className="w-10 h-10 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  <Globe className="w-4 h-4 absolute text-zinc-600 animate-pulse" />
                </div>
                <div>
                  <h5 className="text-xs font-mono font-bold uppercase tracking-widest text-zinc-700">
                    Querying DeFi Grounding Indexes...
                  </h5>
                  <p className="text-[10px] font-mono text-zinc-400 mt-1">
                    Sifting verified news registries & real-time institutional yield trends.
                  </p>
                </div>
              </div>
            ) : sentimentError ? (
              <div className="p-4 border border-red-100 bg-red-50 text-red-800 rounded-none flex flex-col gap-3">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <div>
                    <h5 className="font-mono text-[10px] uppercase tracking-wider font-bold">Failed to Fetch Grounding Feed</h5>
                    <p className="text-[11px] mt-0.5 text-red-700 leading-relaxed font-mono">{sentimentError}</p>
                  </div>
                </div>
              </div>
            ) : sentimentData ? (
              <div className="space-y-5">
                {/* Sentiment Meter Row */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-center bg-[#f5f3f0] p-4 border border-black/5">
                  <div className="md:col-span-1 flex flex-col gap-1.5 border-r border-black/5 pr-4">
                    <span className="text-[9px] font-mono font-bold text-zinc-400 uppercase tracking-widest">
                      Sentiment Index
                    </span>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-3xl font-bold font-mono text-black">
                        {sentimentData.sentimentIndex}%
                      </span>
                      <span className="text-xs font-mono text-zinc-500">Bullish</span>
                    </div>
                    {/* Linear Bar */}
                    <div className="w-full bg-zinc-200 h-1.5 overflow-hidden mt-1">
                      <div 
                        className="bg-black h-full transition-all duration-1000"
                        style={{ width: `${sentimentData.sentimentIndex}%` }}
                      />
                    </div>
                  </div>

                  <div className="md:col-span-2 flex flex-col gap-1 text-left">
                    <span className="text-[9px] font-mono font-bold text-zinc-400 uppercase tracking-widest">
                      Institutional Index Classification
                    </span>
                    <p className="text-sm font-display font-bold italic text-black leading-tight mt-0.5">
                      {sentimentData.sentimentLabel}
                    </p>
                    <p className="text-[10px] text-zinc-500 font-mono mt-1">
                      Strong interest in backed private credit and asset-tokenized escrows.
                    </p>
                  </div>
                </div>

                {/* Main Summary Panel */}
                <div className="p-4 border border-black/10 bg-white">
                  <span className="text-[9px] font-mono font-bold text-zinc-400 uppercase tracking-widest block mb-2">
                    Research Synthesis Summary
                  </span>
                  <p className="text-xs text-zinc-800 leading-relaxed font-sans">
                    {sentimentData.summary}
                  </p>
                  <p className="text-[11px] text-zinc-500 font-mono italic mt-2.5 border-t border-black/5 pt-2">
                    <span className="font-bold text-black uppercase not-italic">Regulatory:</span> {sentimentData.regulatoryClarity}
                  </p>
                </div>

                {/* 3 Key Trends */}
                <div>
                  <span className="text-[9px] font-mono font-bold text-zinc-400 uppercase tracking-widest block mb-3">
                    Top 3 Institutional Trends (Google Grounded)
                  </span>
                  <ul className="grid grid-cols-1 gap-3">
                    {sentimentData.trends?.slice(0, 3).map((trend: string, index: number) => (
                      <li 
                        key={index} 
                        className="p-3 bg-[#f5f3f0] border border-black/5 text-xs text-zinc-800 flex gap-3 items-start"
                      >
                        <span className="w-5 h-5 bg-black text-white font-mono text-[9px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                          0{index + 1}
                        </span>
                        <p className="font-sans leading-relaxed text-zinc-700">
                          {trend}
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Grounding Citations */}
                <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-black/5">
                  <span className="text-[9px] font-mono font-bold text-zinc-400 uppercase tracking-widest mr-2">
                    Google Grounding Citations:
                  </span>
                  {sentimentData.groundingSources?.map((source: any, idx: number) => (
                    <a
                      key={idx}
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      referrerPolicy="no-referrer"
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#f5f3f0] border border-black/10 hover:border-black hover:bg-black/5 text-black font-mono text-[9px] font-bold uppercase transition-all cursor-pointer"
                    >
                      <span>{source.title.length > 25 ? source.title.substring(0, 25) + "..." : source.title}</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          {/* Yield Calculator Widget */}
          <div className="bg-white p-6 rounded-none border border-black/10 shadow-sm flex flex-col gap-6 text-left" id="yield-calculator-widget">
            <div className="border-b border-black/5 pb-4">
              <h4 className="text-xl font-display font-bold italic text-on-background flex items-center gap-2">
                <Calculator className="w-5 h-5 text-black animate-pulse" />
                <span>Yield Calculator</span>
              </h4>
              <p className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-widest mt-1">
                Project future earnings by backing tokenized receivables
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Left Column: Configuration Parameters */}
              <div className="space-y-6">
                
                {/* Potential Investment Amount */}
                <div className="space-y-2">
                  <label className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-wider block">
                    Potential Investment Amount (USD)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-xs font-bold text-zinc-400">$</span>
                    <input 
                      type="text" 
                      id="calc-amount-input"
                      value={calcAmount}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9.]/g, '');
                        setCalcAmount(val);
                      }}
                      placeholder="e.g. 10000"
                      className="w-full pl-8 pr-4 h-10 border border-black/10 bg-[#f5f3f0] font-mono text-xs font-bold text-black focus:border-black outline-none rounded-none"
                    />
                  </div>
                  
                  {/* Presets */}
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {['5000', '10000', '25000', '50000', '100000'].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        id={`calc-preset-${preset}`}
                        onClick={() => setCalcAmount(preset)}
                        className={`px-2 py-0.5 text-[9px] font-mono uppercase font-bold border transition-all cursor-pointer ${
                          calcAmount === preset 
                            ? 'bg-black text-white border-black' 
                            : 'bg-white text-zinc-500 border-black/10 hover:border-black hover:text-black'
                        }`}
                      >
                        ${parseInt(preset).toLocaleString()}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Investment Horizon */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-wider">
                      Investment Horizon (Maturity)
                    </label>
                    <span className="text-[11px] font-mono font-bold text-black bg-[#f5f3f0] px-2 py-0.5 border border-black/5">
                      {calcPeriodMonths} Months {calcPeriodMonths === 12 ? '(1 Yr)' : calcPeriodMonths === 24 ? '(2 Yrs)' : ''}
                    </span>
                  </div>
                  <input 
                    type="range" 
                    id="calc-period-slider"
                    min="1" 
                    max="24" 
                    value={calcPeriodMonths}
                    onChange={(e) => setCalcPeriodMonths(parseInt(e.target.value))}
                    className="w-full h-1.5 bg-zinc-200 rounded-none appearance-none cursor-pointer accent-black"
                  />
                  <div className="flex justify-between text-[8px] font-mono text-zinc-400 uppercase font-bold">
                    <span>1 Month</span>
                    <span>12 Months (1 Yr)</span>
                    <span>24 Months (2 Yrs)</span>
                  </div>
                </div>

                {/* Select Invoices */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-wider">
                      Select Ledger Invoices to Back ({calcSelectedInvoices.length})
                    </label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        id="calc-select-all-btn"
                        onClick={() => setCalcSelectedInvoices(invoices.map(inv => inv.id))}
                        className="text-[9px] font-mono font-bold uppercase text-black hover:underline cursor-pointer"
                      >
                        Select All
                      </button>
                      <span className="text-zinc-300 text-[9px] font-mono">|</span>
                      <button
                        type="button"
                        id="calc-deselect-all-btn"
                        onClick={() => setCalcSelectedInvoices([])}
                        className="text-[9px] font-mono font-bold uppercase text-red-600 hover:underline cursor-pointer"
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                  
                  <div className="border border-black/10 bg-[#f5f3f0] divide-y divide-black/5 max-h-52 overflow-y-auto" id="calc-invoices-list">
                    {invoices.length === 0 ? (
                      <div className="p-4 text-center text-xs font-mono text-zinc-400 uppercase">
                        No active invoices found on the ledger.
                      </div>
                    ) : (
                      invoices.map((inv) => {
                        const isChecked = calcSelectedInvoices.includes(inv.id);
                        return (
                          <div 
                            key={inv.id}
                            onClick={() => {
                              if (isChecked) {
                                setCalcSelectedInvoices(calcSelectedInvoices.filter(id => id !== inv.id));
                              } else {
                                setCalcSelectedInvoices([...calcSelectedInvoices, inv.id]);
                              }
                            }}
                            className={`p-2 flex items-center justify-between gap-3 text-left transition-colors cursor-pointer select-none ${
                              isChecked ? 'bg-white' : 'hover:bg-zinc-100/50'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className={`w-3.5 h-3.5 border border-black flex items-center justify-center shrink-0 ${
                                isChecked ? 'bg-black text-white' : 'bg-white'
                              }`}>
                                {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1">
                                  <span className="font-mono text-[9px] font-bold text-black">#{inv.id}</span>
                                  <span className="text-[8px] font-mono px-1 bg-zinc-100 text-zinc-500 uppercase font-semibold">
                                    {inv.industry}
                                  </span>
                                </div>
                                <p className="text-[9px] text-zinc-500 font-sans truncate max-w-[130px] sm:max-w-[180px]">
                                  {inv.partnerName}
                                </p>
                              </div>
                            </div>
                            <div className="text-right shrink-0 font-mono text-[9px]">
                              <span className="font-bold text-black block">
                                {inv.annualReturn.toFixed(1)}% APR
                              </span>
                              <span className="text-[8px] text-zinc-400">
                                ${inv.amount.toLocaleString()} limit
                              </span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

              </div>

              {/* Right Column: Calculations & Projections */}
              <div>
                {(() => {
                  const selectedInvoicesObjects = invoices.filter(inv => calcSelectedInvoices.includes(inv.id));
                  const averageAPR = selectedInvoicesObjects.length > 0
                    ? selectedInvoicesObjects.reduce((sum, inv) => sum + inv.annualReturn, 0) / selectedInvoicesObjects.length
                    : 0;
                  const principalAmount = parseFloat(calcAmount) || 0;
                  const projectedEarnings = principalAmount * (averageAPR / 100) * (calcPeriodMonths / 12);
                  const totalFutureValue = principalAmount + projectedEarnings;

                  return (
                    <div className="bg-[#f5f3f0] border border-black/10 p-5 flex flex-col justify-between h-full space-y-6" id="yield-projection-dashboard">
                      <div className="space-y-4 text-left">
                        <div className="flex justify-between items-center border-b border-black/10 pb-2.5">
                          <span className="text-[9px] font-mono font-bold text-zinc-400 uppercase tracking-wider">
                            On-Chain Yield Projections
                          </span>
                          <span className="text-[8px] font-mono bg-black text-white px-2 py-0.5 uppercase font-bold tracking-wider animate-pulse">
                            Live Oracle
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <span className="text-[9px] font-mono font-bold text-zinc-400 uppercase tracking-widest block">
                              Portfolio Average APR
                            </span>
                            <span className="text-2xl font-bold font-mono text-black">
                              {averageAPR.toFixed(2)}%
                            </span>
                          </div>
                          <div>
                            <span className="text-[9px] font-mono font-bold text-zinc-400 uppercase tracking-widest block">
                              Horizon Earnings
                            </span>
                            <span className="text-2xl font-bold font-mono text-emerald-600">
                              +${projectedEarnings.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          </div>
                        </div>

                        <div className="pt-3 border-t border-dashed border-black/10">
                          <span className="text-[9px] font-mono font-bold text-zinc-400 uppercase tracking-widest block mb-0.5">
                            Total Future Asset Valuation (USD)
                          </span>
                          <div className="flex items-baseline gap-1.5">
                            <span className="text-3xl font-extrabold font-mono text-black">
                              ${totalFutureValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                            <span className="text-[9px] font-mono text-zinc-400 font-bold uppercase">USDC Equivalent</span>
                          </div>
                        </div>
                      </div>

                      {/* Allocation Breakdown */}
                      <div className="space-y-2.5 text-left">
                        <span className="text-[9px] font-mono font-bold text-zinc-400 uppercase tracking-widest block border-b border-black/5 pb-1">
                          Estimated Allocation Breakdown (Equally Split)
                        </span>
                        {selectedInvoicesObjects.length === 0 ? (
                          <div className="p-4 bg-white/50 border border-dashed border-black/10 text-center py-6 text-zinc-400 text-[10px] font-mono uppercase">
                            No invoices selected. Back active receivables to view allocation returns.
                          </div>
                        ) : (
                          <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                            {selectedInvoicesObjects.map((inv) => {
                              const invoiceAlloc = principalAmount / selectedInvoicesObjects.length;
                              const invoiceEarn = invoiceAlloc * (inv.annualReturn / 100) * (calcPeriodMonths / 12);
                              return (
                                <div key={inv.id} className="flex justify-between items-center text-[10px] bg-white border border-black/5 p-2 font-mono">
                                  <div className="flex flex-col text-left min-w-0">
                                    <span className="font-bold text-black">#{inv.id}</span>
                                    <span className="text-[8px] text-zinc-400 uppercase truncate max-w-[120px]">
                                      {inv.partnerName}
                                    </span>
                                  </div>
                                  <div className="text-right shrink-0 font-mono text-[9px]">
                                    <span className="font-bold text-emerald-600 block">
                                      +${invoiceEarn.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </span>
                                    <span className="block text-[8px] text-zinc-400 uppercase">
                                      ${invoiceAlloc.toLocaleString('en-US', { maximumFractionDigits: 0 })} @ {inv.annualReturn}%
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                    </div>
                  );
                })()}
              </div>

            </div>
          </div>
        </div>

        {/* Action Required & Recent Activities */}
        <div className="bg-white p-6 rounded-none border border-black/10 shadow-sm flex flex-col gap-6">
          
          {/* Stellar Network Monitor */}
          <div className="bg-zinc-50 border border-black/10 p-4 rounded-none text-left space-y-3" id="stellar-network-monitor">
            <div className="flex items-center justify-between border-b border-black/5 pb-2">
              <span className="text-[10px] font-mono font-bold text-black uppercase tracking-wider flex items-center gap-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#10b981] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#10b981]"></span>
                </span>
                Stellar Network Monitor
              </span>
              <span className="text-[8px] font-mono font-bold text-zinc-400 uppercase">
                Horizon API v2.56
              </span>
            </div>
            
            <div className="grid grid-cols-2 gap-3 font-mono text-[10px]">
              <div className="bg-white border border-black/5 p-2 flex flex-col justify-between">
                <span className="text-zinc-400 uppercase text-[8px] font-bold">Ledger Height</span>
                <span className="font-bold text-black mt-1">
                  #{ledgerHeight.toLocaleString()}
                </span>
              </div>
              <div className="bg-white border border-black/5 p-2 flex flex-col justify-between">
                <span className="text-zinc-400 uppercase text-[8px] font-bold">Close Time</span>
                <span className="font-bold text-black mt-1">
                  {closeTime}s
                </span>
              </div>
              <div className="bg-white border border-black/5 p-2 flex flex-col justify-between">
                <span className="text-zinc-400 uppercase text-[8px] font-bold">Base Fee</span>
                <span className="font-bold text-emerald-600 mt-1">
                  {baseFee} Stroops
                </span>
              </div>
              <div className="bg-white border border-black/5 p-2 flex flex-col justify-between">
                <span className="text-zinc-400 uppercase text-[8px] font-bold">Protocol Version</span>
                <span className="font-bold text-black mt-1">
                  Version 21
                </span>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="text-left space-y-3" id="dashboard-quick-actions">
            <span className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-widest block">
              Quick Actions
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setIsSubmitModalOpen(true)}
                className="flex items-center gap-2 p-2.5 border border-black/10 bg-white hover:bg-black/5 transition-all text-left font-mono text-[9px] font-bold uppercase tracking-wider text-black cursor-pointer group rounded-none"
              >
                <PlusCircle className="w-3.5 h-3.5 group-hover:scale-110 transition-transform text-black shrink-0" />
                <span>Tokenize Asset</span>
              </button>
              <button
                onClick={() => setView('marketplace')}
                className="flex items-center gap-2 p-2.5 border border-black/10 bg-white hover:bg-black/5 transition-all text-left font-mono text-[9px] font-bold uppercase tracking-wider text-black cursor-pointer group rounded-none"
              >
                <Globe className="w-3.5 h-3.5 group-hover:scale-110 transition-transform text-black shrink-0" />
                <span>Marketplace</span>
              </button>
              <button
                onClick={() => {
                  const scrollEl = document.getElementById('yield-calculator-widget');
                  if (scrollEl) {
                    scrollEl.scrollIntoView({ behavior: 'smooth' });
                    showToast("Navigated to Yield Calculator.", "success");
                  }
                }}
                className="flex items-center gap-2 p-2.5 border border-black/10 bg-white hover:bg-black/5 transition-all text-left font-mono text-[9px] font-bold uppercase tracking-wider text-black cursor-pointer group rounded-none"
              >
                <Calculator className="w-3.5 h-3.5 group-hover:scale-110 transition-transform text-black shrink-0" />
                <span>Yield Calc</span>
              </button>
              <button
                onClick={() => setIsExportConfirmOpen(true)}
                className="flex items-center gap-2 p-2.5 border border-black/10 bg-white hover:bg-black/5 transition-all text-left font-mono text-[9px] font-bold uppercase tracking-wider text-black cursor-pointer group rounded-none"
              >
                <Download className="w-3.5 h-3.5 group-hover:scale-110 transition-transform text-black shrink-0" />
                <span>Export Ledger</span>
              </button>
            </div>
          </div>
          
          {/* Action Required */}
          <div>
            <h4 className="text-sm font-mono font-bold text-black uppercase tracking-widest mb-4">Action Required</h4>
            <div className="space-y-4">
              
              {/* Repayment Due Alert */}
              <AnimatePresence mode="popLayout">
                {invoices.some(inv => inv.id === 'CB-8890' && inv.status === 'Due Soon') && (
                  <motion.div 
                    initial={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.3 }}
                    className="bg-red-50 border border-red-200 p-4 rounded-none flex gap-3.5 items-start text-left"
                  >
                    <AlertTriangle className="text-black mt-0.5 shrink-0 w-4 h-4" />
                    <div>
                      <p className="text-xs font-mono font-bold uppercase tracking-wider text-black">Repayment Due</p>
                      <p className="text-xs text-zinc-600 mt-1">Invoice #CB-8890 ($42,000) requires settlement within 48 hours.</p>
                      <button 
                        onClick={() => onRepayInvoice('CB-8890')}
                        className="mt-2 text-[10px] font-mono uppercase tracking-widest font-extrabold text-black underline cursor-pointer block hover:text-zinc-600"
                      >
                        Process Payment Now
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Offer Ready Alert */}
              <div className="bg-zinc-50 border border-black/10 p-4 rounded-none flex gap-3.5 items-start text-left">
                <CheckCircle className="text-black mt-0.5 shrink-0 w-4 h-4" />
                <div>
                  <p className="text-xs font-mono font-bold uppercase tracking-wider text-black">Offer Active</p>
                  <p className="text-xs text-zinc-600 mt-1">New liquidity terms are locked and available for Invoice #CB-9021.</p>
                  <button 
                    onClick={() => setView('marketplace')}
                    className="mt-2 text-[10px] font-mono uppercase tracking-widest font-extrabold text-black underline cursor-pointer block hover:text-zinc-600"
                  >
                    Review Ledger Terms
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Autopilot Automation & Live Sync */}
          <div className="border-t border-black/5 pt-4 text-left">
            <div className="flex justify-between items-center mb-3">
              <h4 className="text-sm font-mono font-bold text-black uppercase tracking-widest flex items-center gap-2">
                <Cpu className="w-4 h-4 text-black animate-pulse" />
                <span>Ledger Autopilot</span>
              </h4>
              <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5">
                <span className="relative flex h-2 w-2">
                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full bg-[#10b981] opacity-75 ${(autoSettleMaturity || autoApproveTerms) ? 'block' : 'hidden'}`}></span>
                  <span className={`relative inline-flex rounded-full h-2 w-2 ${(autoSettleMaturity || autoApproveTerms) ? 'bg-[#10b981]' : 'bg-zinc-400'}`}></span>
                </span>
                <span className="text-[8px] font-mono font-bold text-emerald-800 uppercase tracking-widest">
                  {(autoSettleMaturity || autoApproveTerms) ? 'Engine Active' : 'Engine Idle'}
                </span>
              </div>
            </div>

            <div className="bg-zinc-50 border border-black/10 p-4 rounded-none flex flex-col gap-4">
              {/* Toggle 1: Auto Settle on Maturity */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] font-mono font-bold text-black uppercase tracking-wider">Auto-Pay Maturity Invoices</span>
                  <p className="text-[9px] text-zinc-500 leading-normal">Instantly settle outstanding receivables on due dates via connected Stellar wallet.</p>
                </div>
                <button
                  onClick={() => {
                    const nextVal = !autoSettleMaturity;
                    setAutoSettleMaturity(nextVal);
                    showToast(
                      nextVal 
                        ? "Maturity auto-repayments successfully activated on-chain." 
                        : "Maturity auto-repayments deactivated.",
                      "success"
                    );
                  }}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${autoSettleMaturity ? 'bg-black' : 'bg-zinc-200'}`}
                >
                  <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${autoSettleMaturity ? 'translate-x-4' : 'translate-x-0'}`} />
                </button>
              </div>

              <div className="h-[1px] bg-black/5" />

              {/* Toggle 2: Auto Approve Market Terms */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] font-mono font-bold text-black uppercase tracking-wider">Auto-Approve Market Offers</span>
                  <p className="text-[9px] text-zinc-500 leading-normal">Automatically lock matching liquidity offers that meet or beat your target annual return.</p>
                </div>
                <button
                  onClick={() => {
                    const nextVal = !autoApproveTerms;
                    setAutoApproveTerms(nextVal);
                    showToast(
                      nextVal 
                        ? "Autopilot liquidity term approval successfully configured." 
                        : "Autopilot liquidity approvals deactivated.",
                      "success"
                    );
                  }}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${autoApproveTerms ? 'bg-black' : 'bg-zinc-200'}`}
                >
                  <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${autoApproveTerms ? 'translate-x-4' : 'translate-x-0'}`} />
                </button>
              </div>
            </div>
          </div>

          {/* Stellar Account Funding Section */}
          <div className="border-t border-black/5 pt-4 text-left">
            <h4 className="text-sm font-mono font-bold text-black uppercase tracking-widest mb-3 flex items-center gap-2">
              <QrCode className="w-4 h-4 text-black" />
              <span>Stellar Funding Gateway</span>
            </h4>
            <div className="bg-zinc-50 border border-black/10 p-4 rounded-none flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <span className="text-[9px] font-mono font-bold text-zinc-400 uppercase tracking-widest">Active Stellar Address</span>
                <div className="flex items-center justify-between gap-2 bg-white border border-black/5 p-2 rounded-none">
                  <span className="font-mono text-[10px] text-zinc-600 truncate max-w-[180px]">
                    {walletAddress}
                  </span>
                  <button 
                    onClick={handleCopyAddress}
                    title="Copy Address"
                    className="p-1 hover:bg-black/5 text-zinc-500 hover:text-black transition-colors cursor-pointer animate-none"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <button
                onClick={() => setShowFundingQr(!showFundingQr)}
                className="w-full h-9 font-mono uppercase tracking-wider text-[9px] font-bold flex items-center justify-center gap-2 bg-black text-white hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                <QrCode className="w-3.5 h-3.5" />
                <span>{showFundingQr ? "Hide Funding QR" : "Generate Funding QR"}</span>
              </button>

              <AnimatePresence>
                {showFundingQr && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden flex flex-col items-center gap-3 pt-3 border-t border-black/10"
                  >
                    <div className="p-3 border border-black/10 flex items-center justify-center shadow-sm" style={{ backgroundColor: '#ffffff' }}>
                      <QRCodeSVG 
                        value={walletAddress} 
                        size={140}
                        bgColor="#ffffff"
                        fgColor="#000000"
                        level="H"
                        includeMargin={false}
                      />
                    </div>
                    <p className="text-[9px] font-mono text-zinc-400 text-center leading-relaxed uppercase tracking-wider px-2">
                      Scan this QR code from any external wallet to securely deposit assets or transfer escrow collaterals.
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Stellar Quick Tips */}
          <div className="border-t border-black/5 pt-4 text-left">
            <h4 className="text-sm font-mono font-bold text-black uppercase tracking-widest mb-3 flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-black" />
              <span>Stellar Ledger Tips</span>
            </h4>
            <div className="bg-zinc-50 border border-black/10 p-4 rounded-none flex flex-col gap-3 min-h-[120px] justify-between relative overflow-hidden">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentTipIndex}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  transition={{ duration: 0.15 }}
                  className="flex flex-col gap-1"
                >
                  <h5 className="font-mono text-[9px] font-bold uppercase tracking-wider text-black">
                    {QUICK_TIPS[currentTipIndex].title}
                  </h5>
                  <p className="text-[11px] text-zinc-600 leading-relaxed font-sans mt-0.5">
                    {QUICK_TIPS[currentTipIndex].text}
                  </p>
                </motion.div>
              </AnimatePresence>
              
              <div className="flex justify-between items-center border-t border-black/5 pt-2 mt-1">
                <span className="text-[8px] font-mono font-bold text-zinc-400 uppercase tracking-widest">
                  Slide {currentTipIndex + 1} of {QUICK_TIPS.length}
                </span>
                <button
                  onClick={() => setCurrentTipIndex((prev) => (prev + 1) % QUICK_TIPS.length)}
                  className="text-[9px] font-mono font-bold uppercase tracking-widest text-black underline hover:text-zinc-600 cursor-pointer"
                >
                  Next Tip →
                </button>
              </div>
            </div>
          </div>

          {/* Recent Activities */}
          <div className="border-t border-black/5 pt-4">
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-sm font-mono font-bold text-black uppercase tracking-widest">Stellar Ledger Trail</h4>
              <button 
                onClick={() => alert("Showing full Stellar ledger trail...")}
                className="text-[10px] font-mono font-bold text-black uppercase tracking-widest underline hover:text-zinc-600 cursor-pointer"
              >
                See All
              </button>
            </div>
            
            <ul className="space-y-4">
              {activities.map((act) => (
                <li key={act.id} className="flex items-center gap-3 text-left">
                  <div className="w-6 h-6 bg-black text-white flex items-center justify-center text-[10px] font-mono shrink-0">
                    {act.type === 'approval' ? '✓' : act.type === 'repayment' ? '$' : '⚙'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-zinc-800 truncate">{act.title}</p>
                    <div className="flex flex-wrap items-center gap-x-1.5 text-[9px] font-mono text-zinc-400 uppercase tracking-wider mt-0.5">
                      <span>{act.timestamp}</span>
                      <span>•</span>
                      <span className="text-zinc-500 font-bold bg-[#f5f3f0] px-1">Fee: 0.0001 XLM</span>
                    </div>
                  </div>
                  {act.amount && (
                    <span className="text-xs font-mono font-bold text-black shrink-0">
                      {act.amount}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Invoices Table/Calendar Section */}
      <section className="mt-16">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div>
              <h4 className="text-2xl font-display font-bold italic text-on-background">Active Receivables</h4>
              <p className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-widest mt-1">Stellar-backed verified accounts ledger.</p>
            </div>
            
            {/* View Toggle */}
            <div className="flex border border-black/10 bg-white p-0.5 self-start sm:self-auto">
              <button
                onClick={() => setShowCalendarView(false)}
                className={`px-3 py-1.5 text-[9px] font-mono uppercase tracking-wider font-bold transition-all cursor-pointer ${!showCalendarView ? 'bg-black text-white' : 'text-zinc-600 hover:bg-black/5'}`}
              >
                List View
              </button>
              <button
                onClick={() => setShowCalendarView(true)}
                className={`px-3 py-1.5 text-[9px] font-mono uppercase tracking-wider font-bold transition-all cursor-pointer flex items-center gap-1.5 ${showCalendarView ? 'bg-black text-white' : 'text-zinc-600 hover:bg-black/5'}`}
              >
                <Calendar className="w-3 h-3" />
                <span>Calendar View</span>
              </button>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto items-stretch sm:items-center">
            {/* Search box */}
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input 
                type="text" 
                placeholder="Filter ledger..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-black/10 bg-white rounded-none text-xs font-mono font-bold focus:border-black outline-none"
              />
            </div>

            {/* Export CSV Button */}
            <button
              onClick={() => setIsExportConfirmOpen(true)}
              title="Download ledger records as CSV for institutional archives"
              className="bg-black hover:bg-zinc-800 text-white px-4 py-2 rounded-none font-mono text-[10px] uppercase tracking-widest font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer shrink-0 h-10 border border-black"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {showCalendarView ? (
          <div className="bg-white rounded-none border border-black/10 shadow-sm p-6 text-left overflow-x-auto">
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-black/5 min-w-[600px]">
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-black" />
                <h5 className="text-sm font-mono font-bold uppercase tracking-widest text-black">
                  Maturity Calendar
                </h5>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    if (calendarMonth === 0) {
                      setCalendarMonth(11);
                      setCalendarYear(y => y - 1);
                    } else {
                      setCalendarMonth(m => m - 1);
                    }
                  }}
                  className="p-1.5 border border-black/10 hover:bg-black/5 text-black cursor-pointer bg-white"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs font-mono font-bold uppercase tracking-wider px-3 min-w-[140px] text-center border border-black/10 py-1 bg-zinc-50 text-black">
                  {new Date(calendarYear, calendarMonth).toLocaleString('en-US', { month: 'long', year: 'numeric' })}
                </span>
                <button
                  onClick={() => {
                    if (calendarMonth === 11) {
                      setCalendarMonth(0);
                      setCalendarYear(y => y + 1);
                    } else {
                      setCalendarMonth(m => m + 1);
                    }
                  }}
                  className="p-1.5 border border-black/10 hover:bg-black/5 text-black cursor-pointer bg-white"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-px bg-zinc-200 border border-black/10 min-w-[600px]">
              {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map((day) => (
                <div key={day} className="bg-[#f5f3f0] p-2 text-center text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-widest">
                  {day}
                </div>
              ))}
              
              {/* Blank leading days */}
              {Array.from({ length: new Date(calendarYear, calendarMonth, 1).getDay() }).map((_, idx) => (
                <div key={`blank-${idx}`} className="bg-zinc-50/50 min-h-[110px] p-2 text-zinc-300 font-mono text-[10px] select-none" />
              ))}

              {/* Day cells */}
              {Array.from({ length: new Date(calendarYear, calendarMonth + 1, 0).getDate() }).map((_, idx) => {
                const day = idx + 1;
                // Find invoices for this day
                const dayInvoices = filteredInvoices.filter(inv => {
                  const d = new Date(Date.parse(inv.dueDate));
                  return d.getFullYear() === calendarYear && d.getMonth() === calendarMonth && d.getDate() === day;
                });

                return (
                  <div key={`day-${day}`} className="bg-white min-h-[110px] p-2 border-t border-l border-zinc-100 flex flex-col justify-between hover:bg-zinc-50/80 transition-colors">
                    <span className="text-[10px] font-mono font-bold text-zinc-400">{day}</span>
                    <div className="flex flex-col gap-1.5 mt-2">
                      {dayInvoices.map((inv) => (
                        <div
                          key={inv.id}
                          className={`p-1.5 border text-[10px] font-mono flex flex-col gap-0.5 leading-tight ${
                            inv.status === 'Due Soon'
                              ? 'bg-red-50 border-red-200 text-red-900 font-bold'
                              : inv.status === 'Funded'
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                              : 'bg-zinc-50 border-zinc-200 text-zinc-800'
                          }`}
                        >
                          <span className="font-bold truncate">{inv.id}</span>
                          <span className="truncate text-[9px] opacity-80">{inv.partnerName}</span>
                          <span className="font-bold text-[9px] mt-0.5">${inv.amount.toLocaleString()}</span>
                          
                          {inv.status === 'Due Soon' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onRepayInvoice(inv.id);
                              }}
                              className="mt-1 bg-black hover:bg-zinc-800 text-white text-[8px] py-1 px-1.5 font-mono uppercase tracking-wider font-bold transition-all cursor-pointer text-center"
                            >
                              Settle
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-none border border-black/10 shadow-sm overflow-hidden w-full">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[600px]">
                <thead className="bg-[#f5f3f0] font-mono text-[9px] text-zinc-400 tracking-wider font-extrabold border-b border-black/10">
                  <tr>
                    <th className="px-6 py-4">RECEIVABLE ID</th>
                    <th className="px-6 py-4">PARTNER DEBTOR</th>
                    <th className="px-6 py-4">MATURITY DATE</th>
                    <th className="px-6 py-4">AMOUNT</th>
                    <th className="px-6 py-4">LEDGER STATUS</th>
                    <th className="px-6 py-4 text-right">OPERATIONS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5 text-xs text-zinc-600">
                  {filteredInvoices.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-10 text-zinc-400 font-mono text-xs uppercase tracking-wider">
                        No matching records on-chain.
                      </td>
                    </tr>
                  ) : (
                    filteredInvoices.map((inv) => (
                      <tr key={inv.id} className="hover:bg-zinc-50 transition-colors">
                        <td className="px-6 py-4 font-mono font-bold text-black">{inv.id}</td>
                        <td className="px-6 py-4 font-display font-bold italic text-sm text-black">{inv.partnerName}</td>
                        <td className="px-6 py-4 font-mono text-zinc-500">{inv.dueDate}</td>
                        <td className="px-6 py-4 font-bold text-black font-mono">${inv.amount.toLocaleString()}</td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 border border-black/10 bg-zinc-50 text-[9px] font-mono font-bold uppercase tracking-wider text-black">
                            {inv.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          {inv.status === 'Due Soon' ? (
                            <button 
                              onClick={() => onRepayInvoice(inv.id)}
                              className="bg-black hover:bg-zinc-800 text-white px-4 py-1.5 rounded-none text-[9px] font-mono uppercase tracking-wider font-bold transition-all cursor-pointer"
                            >
                              Settle Now
                            </button>
                          ) : inv.status === 'Pending' ? (
                            <button 
                              onClick={() => {
                                setView('marketplace');
                              }}
                              className="text-black hover:underline px-3 py-1.5 text-[9px] font-mono uppercase tracking-wider font-bold transition-all cursor-pointer"
                            >
                              Review Terms
                            </button>
                          ) : (
                            <button 
                              onClick={() => alert(`Stellar Transaction Ledger ID: Tx-${inv.id}-CB-Verified`)}
                              className="text-zinc-400 hover:text-black hover:underline px-3 py-1.5 text-[9px] font-mono uppercase tracking-wider font-semibold transition-all cursor-pointer"
                            >
                              Hash Trail
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Invoice Status Legend */}
        <div className="mt-4 bg-zinc-50 border border-black/10 p-5 text-left space-y-4" id="invoice-status-legend">
          <div className="flex items-center gap-2 border-b border-black/5 pb-2">
            <Info className="w-4 h-4 text-black shrink-0" />
            <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-black">
              Ledger & Risk Classification Legend
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Column 1: Status Badges */}
            <div className="space-y-3">
              <h5 className="text-[9px] font-mono font-bold text-zinc-400 uppercase tracking-wider">
                Asset Lifecycle States
              </h5>
              <div className="space-y-2">
                <div className="flex items-start gap-3 text-xs">
                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-mono text-[9px] font-bold uppercase shrink-0">
                    Funded
                  </span>
                  <p className="text-zinc-600 font-sans leading-normal">
                    Escrow matching completes. Collateralized capital is active on-chain, accruing APY returns.
                  </p>
                </div>
                <div className="flex items-start gap-3 text-xs">
                  <span className="px-2 py-0.5 bg-[#f5f3f0] text-zinc-800 font-mono text-[9px] font-bold uppercase shrink-0 border border-zinc-200">
                    Pending
                  </span>
                  <p className="text-zinc-600 font-sans leading-normal">
                    Undergoing automated institutional credit rating audits or awaiting matching pools.
                  </p>
                </div>
                <div className="flex items-start gap-3 text-xs">
                  <span className="px-2 py-0.5 bg-amber-100 text-amber-800 font-mono text-[9px] font-bold uppercase shrink-0">
                    Due Soon
                  </span>
                  <p className="text-zinc-600 font-sans leading-normal">
                    Maturity date is less than 7 days. Debtor repayment is queued for automatic or manual settlement.
                  </p>
                </div>
                <div className="flex items-start gap-3 text-xs">
                  <span className="px-2 py-0.5 bg-zinc-800 text-zinc-100 font-mono text-[9px] font-bold uppercase shrink-0">
                    Paid
                  </span>
                  <p className="text-zinc-600 font-sans leading-normal">
                    Invoice token settlement transaction successfully validated and funds distributed on the ledger.
                  </p>
                </div>
              </div>
            </div>

            {/* Column 2: Risk Levels */}
            <div className="space-y-3">
              <h5 className="text-[9px] font-mono font-bold text-zinc-400 uppercase tracking-wider">
                Risk Profile Ratings
              </h5>
              <div className="space-y-2">
                <div className="flex items-start gap-3 text-xs">
                  <span className="px-2 py-0.5 bg-zinc-100 text-zinc-800 font-mono text-[9px] font-bold uppercase shrink-0">
                    Low Risk
                  </span>
                  <p className="text-zinc-600 font-sans leading-normal">
                    Highest institutional liquidity rating. Aaa/Aa equivalent credit profiles. A premium safety standard.
                  </p>
                </div>
                <div className="flex items-start gap-3 text-xs">
                  <span className="px-2 py-0.5 bg-zinc-100 text-zinc-800 font-mono text-[9px] font-bold uppercase shrink-0">
                    Stable
                  </span>
                  <p className="text-zinc-600 font-sans leading-normal">
                    Consistent historical payments, low variance across market shifts, standard market rate returns.
                  </p>
                </div>
                <div className="flex items-start gap-3 text-xs">
                  <span className="px-2 py-0.5 bg-zinc-100 text-zinc-800 font-mono text-[9px] font-bold uppercase shrink-0">
                    Moderate
                  </span>
                  <p className="text-zinc-600 font-sans leading-normal">
                    High incentive APR profile. Managed via additional on-chain collateralization limits to shield backers.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Invoice Submission Modal Dialog */}
      <AnimatePresence>
        {isSubmitModalOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                if (!isSubmitting && !showSuccessCheck) {
                  setIsSubmitModalOpen(false);
                }
              }}
              className="absolute inset-0 bg-black/45 backdrop-blur-sm"
            />
            
            {/* Modal Box */}
            <motion.div 
              initial={{ scale: 0.98, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.98, opacity: 0, y: 10 }}
              className="bg-[#f5f3f0] border border-black/20 rounded-none w-full max-w-lg p-6 sm:p-8 shadow-md relative z-10 overflow-hidden text-left"
            >
              
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-2xl font-display font-bold italic text-on-background">Submit Receivable</h3>
                  <p className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-widest mt-1">Submit invoice receivables for immediate Stellar-backed funding.</p>
                </div>
                {!isSubmitting && !showSuccessCheck && (
                  <button 
                    onClick={() => setIsSubmitModalOpen(false)}
                    className="p-1.5 hover:bg-black/5 rounded-none transition-colors cursor-pointer text-zinc-400 hover:text-black"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>

              {showSuccessCheck ? (
                <div className="flex flex-col items-center justify-center py-12 text-center gap-4">
                  <div className="w-12 h-12 bg-black text-white flex items-center justify-center animate-bounce">
                    <Check className="w-6 h-6 stroke-[3]" />
                  </div>
                  <div>
                    <h4 className="text-lg font-display font-bold italic text-on-background">Submitted on Stellar Chain!</h4>
                    <p className="text-[11px] font-mono text-zinc-500 mt-1.5 max-w-xs leading-relaxed mx-auto">
                      Invoice verified successfully. Smart escrow locked under ledger reference code: <span className="font-mono font-bold text-black underline">0x...4e2a</span>
                    </p>
                  </div>
                </div>
              ) : isSubmitting ? (
                <div className="flex flex-col items-center justify-center py-16 text-center gap-4">
                  <div className="w-8 h-8 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  <div>
                    <h4 className="text-sm font-mono font-bold uppercase tracking-wider text-on-background">Verifying ledger identity...</h4>
                    <p className="text-[10px] font-mono text-zinc-400 mt-1">Validating corporate tax certificates and outstanding amounts.</p>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  
                  {/* Partner Name */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-widest">Partner Company</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Global Logistics Inc."
                      required
                      value={partnerName}
                      onChange={(e) => setPartnerName(e.target.value)}
                      className="w-full px-3.5 py-2.5 border border-black/10 rounded-none text-xs font-mono font-bold focus:border-black bg-white outline-none"
                    />
                  </div>

                  {/* Grid for Amount & Due Date */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-widest">Invoice Amount ($)</label>
                      <input 
                        type="number" 
                        placeholder="e.g. 45000"
                        required
                        min="1"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="w-full px-3.5 py-2.5 border border-black/10 rounded-none text-xs font-mono font-bold focus:border-black bg-white outline-none"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-widest">Due Date</label>
                      <input 
                        type="text" 
                        placeholder="e.g. Nov 12, 2023"
                        required
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                        className="w-full px-3.5 py-2.5 border border-black/10 rounded-none text-xs font-mono font-bold focus:border-black bg-white outline-none"
                      />
                    </div>
                  </div>

                  {/* Industry Option */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-widest">Industry Domain</label>
                    <select 
                      value={industry}
                      onChange={(e) => setIndustry(e.target.value as any)}
                      className="w-full px-3.5 py-2.5 border border-black/10 bg-white rounded-none text-xs font-mono font-bold focus:border-black cursor-pointer outline-none"
                    >
                      <option value="Logistics">Logistics</option>
                      <option value="Technology">Technology</option>
                      <option value="Healthcare">Healthcare</option>
                      <option value="Energy">Energy</option>
                      <option value="Retail">Retail</option>
                    </select>
                  </div>

                  {/* Simulated drag & drop area */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-widest">Invoice Document (PDF, JPEG)</label>
                    <div 
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      className={`border border-dashed rounded-none p-5 text-center flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors ${
                        isDragging 
                          ? 'border-black bg-black/5' 
                          : invoiceFile 
                          ? 'border-black/50 bg-white' 
                          : 'border-black/20 bg-white hover:bg-zinc-50'
                      }`}
                      onClick={() => document.getElementById('file-upload-input')?.click()}
                    >
                      <input 
                        id="file-upload-input" 
                        type="file" 
                        className="hidden" 
                        onChange={handleFileChange}
                        accept=".pdf,.png,.jpg,.jpeg"
                      />
                      
                      {invoiceFile ? (
                        <>
                          <FileText className="w-6 h-6 text-black shrink-0" />
                          <span className="text-xs font-mono font-bold text-black max-w-[200px] truncate">
                            {invoiceFile.name}
                          </span>
                          <span className="text-[9px] text-zinc-400 font-mono">
                            {(invoiceFile.size / 1024).toFixed(1)} KB - Ready
                          </span>
                        </>
                      ) : (
                        <>
                          <Upload className="w-6 h-6 text-zinc-400" />
                          <span className="text-xs font-mono font-bold text-zinc-800">
                            Drag & drop or <span className="underline font-bold text-black">browse</span>
                          </span>
                          <span className="text-[9px] text-zinc-400 font-mono">
                            Max size: 5MB (Simulated)
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Buttons */}
                  <div className="flex justify-end gap-3 pt-4 border-t border-black/5">
                    <button 
                      type="button"
                      onClick={() => setIsSubmitModalOpen(false)}
                      className="px-5 py-2.5 bg-transparent border border-black/20 hover:border-black text-black font-mono text-[10px] uppercase tracking-wider transition-all cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit"
                      className="px-6 py-2.5 bg-black hover:bg-zinc-800 text-white font-mono text-[10px] uppercase tracking-widest font-bold transition-all cursor-pointer"
                    >
                      Submit Invoice
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Export Confirmation Modal Dialog */}
      <AnimatePresence>
        {isExportConfirmOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-xs"
              onClick={() => setIsExportConfirmOpen(false)}
            />
            
            {/* Modal Box */}
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border-2 border-black p-6 md:p-8 max-w-md w-full relative z-10 text-left brutalist-shadow-lg"
            >
              <button 
                onClick={() => setIsExportConfirmOpen(false)}
                className="absolute top-4 right-4 p-1 hover:bg-black/5 text-zinc-500 hover:text-black transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
              
              <div className="flex gap-4 items-start mb-6">
                <div className="p-2.5 bg-black text-white shrink-0">
                  <Download className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xl font-display font-bold italic text-on-background">Confirm Ledger Export</h3>
                  <p className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-widest mt-1">Institutional Data Access Gateway</p>
                </div>
              </div>
              
              <div className="space-y-4 mb-6">
                <p className="text-xs text-zinc-600 leading-relaxed font-sans">
                  You are about to export the current on-chain receivables ledger to a standardized Comma-Separated Values (CSV) format.
                </p>
                
                <div className="p-4 bg-[#f5f3f0] border border-black/10 font-mono text-[10px] space-y-2 text-zinc-800">
                  <div className="flex justify-between">
                    <span className="text-zinc-400 uppercase">Total Records:</span>
                    <span className="font-bold text-black">{filteredInvoices.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400 uppercase">Cumulative Volume:</span>
                    <span className="font-bold text-black">${filteredInvoices.reduce((sum, inv) => sum + inv.amount, 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400 uppercase">Export Standard:</span>
                    <span className="font-bold text-black">CSV UTF-8 Archive</span>
                  </div>
                </div>

                {filteredInvoices.length > 0 && (
                  <div className="border border-black/10 p-3 bg-white space-y-2">
                    <div className="text-[9px] font-mono font-bold text-zinc-400 uppercase tracking-wider">
                      Ledger Preview (Top {Math.min(3, filteredInvoices.length)})
                    </div>
                    <div className="space-y-1.5">
                      {filteredInvoices.slice(0, 3).map((inv) => (
                        <div key={inv.id} className="flex justify-between items-center text-[10px] font-mono py-1 border-b border-zinc-100 last:border-0">
                          <div className="flex flex-col">
                            <span className="font-bold text-black">{inv.id}</span>
                            <span className="text-[9px] text-zinc-500 truncate max-w-[150px]">{inv.partnerName}</span>
                          </div>
                          <div className="text-right">
                            <span className="font-bold text-black">${inv.amount.toLocaleString()}</span>
                            <span className="block text-[8px] text-zinc-400 uppercase">{inv.industry}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                    {filteredInvoices.length > 3 && (
                      <div className="text-[9px] font-mono text-zinc-400 text-center italic pt-1 border-t border-dashed border-zinc-200">
                        + {filteredInvoices.length - 3} more records
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              <div className="flex justify-end gap-3 pt-4 border-t border-black/5">
                <button 
                  type="button"
                  onClick={() => setIsExportConfirmOpen(false)}
                  className="px-5 py-2.5 bg-transparent border border-black/20 hover:border-black text-black font-mono text-[10px] uppercase tracking-wider transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="button"
                  onClick={() => {
                    handleDownloadCSV();
                    setIsExportConfirmOpen(false);
                  }}
                  className="px-6 py-2.5 bg-black hover:bg-zinc-800 text-white font-mono text-[10px] uppercase tracking-widest font-bold transition-all cursor-pointer"
                >
                  Confirm Export
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
