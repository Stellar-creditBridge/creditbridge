import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Factory, 
  Cpu, 
  Microscope, 
  Zap, 
  Package,
  ShieldCheck,
  Timer,
  SlidersHorizontal,
  X,
  CreditCard,
  TrendingUp,
  Check,
  Search
} from 'lucide-react';
import { Invoice, WalletState } from '../types';
import { useToast } from './Toast';

interface MarketplaceProps {
  invoices: Invoice[];
  onInvest: (invoiceId: string, investAmount: number) => void;
  wallet: WalletState;
  setView: (view: 'landing' | 'dashboard' | 'marketplace' | 'analytics' | 'admin' | 'connect') => void;
}

export default function Marketplace({ invoices, onInvest, wallet, setView }: MarketplaceProps) {
  const { showToast } = useToast();
  // Filter States
  const [selectedIndustry, setSelectedIndustry] = useState('All Industries');
  const [minReturn, setMinReturn] = useState('Any APR');
  const [selectedDuration, setSelectedDuration] = useState('Any duration');
  const [selectedRisk, setSelectedRisk] = useState('All levels');
  const [partnerSearch, setPartnerSearch] = useState('');
  const [sortBy, setSortBy] = useState('default');
  
  // Active Invoices to display
  const [activeInvoices, setActiveInvoices] = useState<Invoice[]>(invoices);
  
  // Investment Dialog state
  const [investingInvoice, setInvestingInvoice] = useState<Invoice | null>(null);
  const [investAmount, setInvestAmount] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [investmentSuccess, setInvestmentSuccess] = useState(false);
  const [kycCompleted, setKycCompleted] = useState(false);

  // Gemini Risk Scoring State
  const [activeRiskScoringInvoice, setActiveRiskScoringInvoice] = useState<Invoice | null>(null);
  const [riskScoringData, setRiskScoringData] = useState<any | null>(null);
  const [isRiskLoading, setIsRiskLoading] = useState(false);
  const [riskError, setRiskError] = useState<string | null>(null);

  // Apply filters on invoices list
  const filteredInvoices = invoices.filter(inv => {
    // 1. Industry filter
    if (selectedIndustry !== 'All Industries' && inv.industry !== selectedIndustry) {
      return false;
    }

    // 2. Min Return APR filter
    if (minReturn !== 'Any APR') {
      const minVal = parseFloat(minReturn);
      if (inv.annualReturn < minVal) return false;
    }

    // 3. Duration filter
    if (selectedDuration !== 'Any duration') {
      if (selectedDuration === '< 30 days' && inv.daysRemaining >= 30) return false;
      if (selectedDuration === '30-60 days' && (inv.daysRemaining < 30 || inv.daysRemaining > 60)) return false;
      if (selectedDuration === '60-90 days' && (inv.daysRemaining < 60 || inv.daysRemaining > 90)) return false;
    }

    // 4. Risk level filter
    if (selectedRisk !== 'All levels' && inv.risk !== selectedRisk) {
      return false;
    }

    // 5. Partner Search filter (Quick company name search)
    if (partnerSearch.trim() !== '') {
      if (!inv.partnerName.toLowerCase().includes(partnerSearch.toLowerCase())) {
        return false;
      }
    }

    // Don't show Paid invoices in Marketplace active opportunities
    if (inv.status === 'Paid') return false;

    return true;
  });

  // Sort the filtered invoices
  const sortedInvoices = [...filteredInvoices].sort((a, b) => {
    if (sortBy === 'industry') {
      return a.industry.localeCompare(b.industry);
    }
    if (sortBy === 'risk') {
      const riskOrder = { 'Low Risk': 1, 'Stable': 2, 'Moderate': 3 };
      const rankA = riskOrder[a.risk as keyof typeof riskOrder] || 99;
      const rankB = riskOrder[b.risk as keyof typeof riskOrder] || 99;
      return rankA - rankB;
    }
    if (sortBy === 'amount-desc') {
      return b.amount - a.amount;
    }
    if (sortBy === 'apr-desc') {
      return b.annualReturn - a.annualReturn;
    }
    return 0; // Default
  });

  const handleApplyFilters = () => {
    // This updates the view, filteredInvoices will be recomputed reactively
    showToast("Marketplace filters applied successfully.", "info");
  };

  const handleOpenRiskScoring = async (invoice: Invoice) => {
    setActiveRiskScoringInvoice(invoice);
    setIsRiskLoading(true);
    setRiskError(null);
    setRiskScoringData(null);

    try {
      const response = await fetch('/api/risk-scoring', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          partnerName: invoice.partnerName,
          industry: invoice.industry,
          amount: invoice.amount,
          annualReturn: invoice.annualReturn,
          daysRemaining: invoice.daysRemaining,
          riskRating: invoice.risk,
        }),
      });

      if (!response.ok) {
        throw new Error(`Risk scoring service returned status: ${response.status}`);
      }

      const data = await response.json();
      setRiskScoringData(data);
      showToast("AI Risk Scoring analysis report loaded.", "success");
    } catch (err: any) {
      console.error("Failed to load Gemini risk analysis:", err);
      setRiskError(err.message || "An unexpected network error occurred while accessing the risk ledger.");
      showToast("Could not retrieve AI Risk Analysis.", "error");
    } finally {
      setIsRiskLoading(false);
    }
  };

  const handleOpenInvest = (invoice: Invoice) => {
    if (!wallet.connected) {
      setView('connect');
      return;
    }
    setInvestingInvoice(invoice);
    // Recommend custom smart micro-allocations by default (e.g., 20% of remaining target)
    const remaining = invoice.amount * (1 - invoice.fundingProgress / 100);
    setInvestAmount(Math.min(remaining, 5000).toFixed(0));
  };

  const handleConfirmInvestment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!investingInvoice) return;

    const amt = parseFloat(investAmount);
    if (isNaN(amt) || amt <= 0) return;

    setIsProcessing(true);

    // Simulate smart contract escrow allocation on the Stellar network
    setTimeout(() => {
      setIsProcessing(false);
      setInvestmentSuccess(true);

      setTimeout(() => {
        onInvest(investingInvoice.id, amt);
        setInvestingInvoice(null);
        setInvestAmount('');
        setInvestmentSuccess(false);
      }, 1200);
    }, 1600);
  };

  const getIndustryIcon = (industry: string) => {
    switch (industry) {
      case 'Logistics':
        return <Factory className="w-6 h-6 text-primary" />;
      case 'Technology':
        return <Cpu className="w-6 h-6 text-primary" />;
      case 'Healthcare':
        return <Microscope className="w-6 h-6 text-primary" />;
      case 'Energy':
        return <Zap className="w-6 h-6 text-primary" />;
      case 'Retail':
        return <Package className="w-6 h-6 text-primary" />;
      default:
        return <Package className="w-6 h-6 text-primary" />;
    }
  };

  const handleCompleteKyc = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      setKycCompleted(true);
      showToast("Verification Successful! You are now cleared for premium high-yield corporate pools.", "success");
    }, 1500);
  };

  return (
    <div id="marketplace-view" className="w-full text-left">
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12 pb-8 border-b border-black/5">
        <div>
          <h2 className="text-4xl sm:text-5xl font-display font-bold italic text-on-background">Marketplace</h2>
          <p className="text-zinc-500 text-sm mt-2 max-w-2xl leading-relaxed">
            High-yield invoice financing opportunities verified on-chain. Capital is secured by corporate receivables in high-contrast ledger pools.
          </p>
        </div>
        
        {/* Marketplace overview stats */}
        <div className="flex gap-4 shrink-0">
          <div className="flex flex-col bg-white p-4 border border-black/10 min-w-[140px] text-left">
            <span className="text-[9px] font-mono font-bold text-zinc-400 mb-1 uppercase tracking-widest">Market Liquidity</span>
            <span className="text-2xl font-bold text-black font-mono tracking-tight">$12.4M</span>
          </div>
          <div className="flex flex-col bg-white p-4 border border-black/10 min-w-[140px] text-left">
            <span className="text-[9px] font-mono font-bold text-zinc-400 mb-1 uppercase tracking-widest">Avg. Return</span>
            <span className="text-2xl font-bold text-zinc-800 font-mono tracking-tight">11.2%</span>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-4 p-5 bg-white border border-black/10 rounded-none mb-12 shadow-sm">
        
        {/* Search Partner */}
        <div className="flex flex-col gap-1.5 min-w-[200px] flex-1 text-left">
          <label className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-wider ml-1">Search Partner</label>
          <div className="relative">
            <input 
              type="text"
              value={partnerSearch}
              onChange={(e) => setPartnerSearch(e.target.value)}
              placeholder="e.g. Acme Corp..."
              className="w-full h-10 rounded-none border border-black/10 bg-[#f5f3f0] text-xs font-mono font-semibold focus:border-black pl-8 pr-8 outline-none placeholder-zinc-400"
            />
            <Search className="absolute left-2.5 top-3 w-3.5 h-3.5 text-zinc-400" />
            {partnerSearch && (
              <button 
                onClick={() => setPartnerSearch('')}
                className="absolute right-2.5 top-3 text-zinc-400 hover:text-black cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Industry */}
        <div className="flex flex-col gap-1.5 min-w-[160px] flex-1 sm:flex-initial text-left">
          <label className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-wider ml-1">Industry</label>
          <select 
            value={selectedIndustry}
            onChange={(e) => setSelectedIndustry(e.target.value)}
            className="h-10 rounded-none border border-black/10 bg-[#f5f3f0] text-xs font-mono font-semibold focus:border-black px-3 cursor-pointer outline-none"
          >
            <option value="All Industries">All Industries</option>
            <option value="Technology">Technology</option>
            <option value="Logistics">Logistics</option>
            <option value="Healthcare">Healthcare</option>
            <option value="Energy">Energy</option>
            <option value="Retail">Retail</option>
          </select>
        </div>

        {/* Min Return */}
        <div className="flex flex-col gap-1.5 min-w-[120px] flex-1 sm:flex-initial text-left">
          <label className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-wider ml-1">Min Return</label>
          <select 
            value={minReturn}
            onChange={(e) => setMinReturn(e.target.value)}
            className="h-10 rounded-none border border-black/10 bg-[#f5f3f0] text-xs font-mono font-semibold focus:border-black px-3 cursor-pointer outline-none"
          >
            <option value="Any APR">Any APR</option>
            <option value="10%">10%+</option>
            <option value="11%">11%+</option>
            <option value="12%">12%+</option>
            <option value="13%">13%+</option>
          </select>
        </div>

        {/* Duration */}
        <div className="flex flex-col gap-1.5 min-w-[130px] flex-1 sm:flex-initial text-left">
          <label className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-wider ml-1">Duration</label>
          <select 
            value={selectedDuration}
            onChange={(e) => setSelectedDuration(e.target.value)}
            className="h-10 rounded-none border border-black/10 bg-[#f5f3f0] text-xs font-mono font-semibold focus:border-black px-3 cursor-pointer outline-none"
          >
            <option value="Any duration">Any duration</option>
            <option value="< 30 days">&lt; 30 days</option>
            <option value="30-60 days">30-60 days</option>
            <option value="60-90 days">60-90 days</option>
          </select>
        </div>

        {/* Risk Level */}
        <div className="flex flex-col gap-1.5 min-w-[120px] flex-1 sm:flex-initial text-left">
          <label className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-wider ml-1">Risk</label>
          <select 
            value={selectedRisk}
            onChange={(e) => setSelectedRisk(e.target.value)}
            className="h-10 rounded-none border border-black/10 bg-[#f5f3f0] text-xs font-mono font-semibold focus:border-black px-3 cursor-pointer outline-none"
          >
            <option value="All levels">All levels</option>
            <option value="Low Risk">Low Risk</option>
            <option value="Moderate">Moderate</option>
            <option value="Stable">Stable</option>
          </select>
        </div>

        {/* Sort By Dropdown */}
        <div className="flex flex-col gap-1.5 min-w-[150px] flex-1 sm:flex-initial text-left animate-fade-in" id="marketplace-sort-container">
          <label className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-wider ml-1">Sort By</label>
          <select 
            id="marketplace-sort-select"
            value={sortBy}
            onChange={(e) => {
              setSortBy(e.target.value);
              showToast(`Sorted invoices by ${e.target.options[e.target.selectedIndex].text}.`, "info");
            }}
            className="h-10 rounded-none border border-black/10 bg-[#f5f3f0] text-xs font-mono font-semibold focus:border-black px-3 cursor-pointer outline-none"
          >
            <option value="default">Default Order</option>
            <option value="industry">Industry (A-Z)</option>
            <option value="risk">Risk Rating (Low to High)</option>
            <option value="amount-desc">Amount (High to Low)</option>
            <option value="apr-desc">Return APR (High to Low)</option>
          </select>
        </div>

        {/* Action Button */}
        <div className="flex items-end h-full mt-auto pb-0.5 ml-auto w-full sm:w-auto">
          <button 
            id="marketplace-apply-filters-btn"
            onClick={handleApplyFilters}
            className="bg-black hover:bg-zinc-800 text-white w-full sm:w-auto px-6 h-10 rounded-none font-mono uppercase tracking-[0.15em] flex items-center justify-center gap-2 transition-all cursor-pointer text-[10px] font-bold"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Apply Filters</span>
          </button>
        </div>
      </div>

      {/* Grid of Invoice Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {sortedInvoices.map((inv) => (
          <div 
            key={inv.id} 
            className="bg-white border border-black/10 rounded-none p-6 flex flex-col hover:shadow-sm transition-all duration-300"
          >
            {/* Header info */}
            <div className="flex justify-between items-start mb-5">
              <div className="flex items-center gap-4 text-left">
                <div className="w-10 h-10 bg-black text-white flex items-center justify-center shrink-0">
                  {getIndustryIcon(inv.industry)}
                </div>
                <div className="min-w-0">
                  <h3 className="font-display font-bold italic text-lg text-on-background leading-tight truncate max-w-[150px]">
                    {inv.partnerName}
                  </h3>
                  <span className="text-[9px] font-mono font-bold text-zinc-400 bg-[#f5f3f0] px-2 py-0.5 tracking-widest mt-1 inline-block uppercase border border-black/5">
                    {inv.industry}
                  </span>
                </div>
              </div>
              
              <div className="px-2.5 py-1 bg-black text-white shrink-0">
                <span className="font-mono font-bold text-[9px] uppercase tracking-wider">{inv.risk}</span>
              </div>
            </div>

            {/* Invoice parameters */}
            <div className="grid grid-cols-2 gap-4 py-4 border-y border-black/5 mb-5 text-left">
              <div>
                <p className="text-[9px] font-mono font-bold text-zinc-400 uppercase tracking-widest">Invoice Amount</p>
                <p className="text-xl font-bold text-on-background mt-1 font-mono tracking-tight">
                  ${inv.amount.toLocaleString()}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[9px] font-mono font-bold text-zinc-400 uppercase tracking-widest">Annual Return</p>
                <p className="text-xl font-bold text-black mt-1 font-mono tracking-tight">
                  {inv.annualReturn.toFixed(1)}% APR
                </p>
              </div>
            </div>

            {/* Progress indicator */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-2 text-xs">
                <span className="font-mono font-bold text-[9px] text-zinc-400 uppercase tracking-widest">Funding Progress</span>
                <span className="font-mono font-bold text-black">{inv.fundingProgress}%</span>
              </div>
              <div className="h-[2px] w-full bg-zinc-200 overflow-hidden">
                <div 
                  className="h-full bg-black transition-all duration-500" 
                  style={{ width: `${inv.fundingProgress}%` }}
                />
              </div>
              <div className="flex justify-between mt-2.5 text-[9px] text-zinc-400 font-mono uppercase tracking-widest">
                <span>Target: ${inv.targetAmount >= 1000 ? `${(inv.targetAmount / 1000).toFixed(0)}k` : inv.targetAmount}</span>
                <div className="flex items-center gap-1 font-semibold">
                  <Timer className="w-3 h-3" />
                  <span>
                    {inv.daysRemaining === 0 
                      ? 'Fully Funded' 
                      : `${inv.daysRemaining} Days`
                    }
                  </span>
                </div>
              </div>
            </div>

            {/* CTA action */}
            {inv.fundingProgress >= 100 ? (
              <div className="mt-auto flex flex-col gap-2">
                <button 
                  disabled
                  className="w-full py-3 bg-zinc-100 text-zinc-400 font-mono text-[10px] uppercase tracking-widest cursor-default flex items-center justify-center gap-1.5 border border-black/5"
                >
                  <Check className="w-3.5 h-3.5 stroke-[3.5]" />
                  <span>Fully Funded</span>
                </button>
                <button 
                  onClick={() => handleOpenRiskScoring(inv)}
                  className="w-full py-2 bg-transparent hover:bg-black/5 text-black border border-black/20 hover:border-black font-mono text-[9px] uppercase tracking-widest font-bold transition-all cursor-pointer text-center flex items-center justify-center gap-1.5"
                >
                  <TrendingUp className="w-3 h-3" />
                  <span>AI Risk Scoring</span>
                </button>
              </div>
            ) : (
              <div className="mt-auto flex flex-col gap-2">
                <button 
                  onClick={() => handleOpenInvest(inv)}
                  className="w-full py-3 bg-black hover:bg-zinc-800 text-white font-mono text-[10px] uppercase tracking-widest transition-all cursor-pointer"
                >
                  Invest Now
                </button>
                <button 
                  onClick={() => handleOpenRiskScoring(inv)}
                  className="w-full py-2 bg-transparent hover:bg-black/5 text-black border border-black/20 hover:border-black font-mono text-[9px] uppercase tracking-widest font-bold transition-all cursor-pointer text-center flex items-center justify-center gap-1.5"
                >
                  <TrendingUp className="w-3 h-3" />
                  <span>AI Risk Scoring</span>
                </button>
              </div>
            )}
          </div>
        ))}

        {/* Card 6: Locked KYC state */}
        <div className="bg-[#f5f3f0] border border-dashed border-black/20 rounded-none p-6 flex flex-col items-center justify-center text-center">
          <div className="w-10 h-10 bg-white flex items-center justify-center border border-black/10 shadow-sm mb-4">
            <ShieldCheck className="w-5 h-5 text-zinc-400" />
          </div>
          <p className="font-display font-bold italic text-lg text-on-surface-variant mb-1">New Opportunities</p>
          <p className="text-[11px] text-zinc-500 leading-relaxed max-w-[220px] mx-auto font-mono">
            Verify your identity gateway to gain access to premium corporate structures with APR {'>'} 14%.
          </p>
          
          <button 
            onClick={handleCompleteKyc}
            className="mt-5 px-6 py-2.5 bg-black text-white hover:bg-zinc-800 font-mono text-[10px] uppercase tracking-wider font-bold transition-all cursor-pointer"
          >
            Complete Verification
          </button>
        </div>
      </div>

      {/* Investment Drawer/Modal */}
      <AnimatePresence>
        {investingInvoice && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                if (!isProcessing && !investmentSuccess) {
                  setInvestingInvoice(null);
                }
              }}
              className="absolute inset-0 bg-black/45 backdrop-blur-sm"
            />
            
            {/* Box container */}
            <motion.div 
              initial={{ scale: 0.98, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.98, opacity: 0, y: 10 }}
              className="bg-[#f5f3f0] border border-black/20 rounded-none w-full max-w-md p-6 sm:p-8 shadow-md relative z-10 overflow-hidden text-left"
            >
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-2xl font-display font-bold italic text-on-background">Confirm Allocation</h3>
                  <p className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-widest mt-1">Stellar network escrow handshake.</p>
                </div>
                {!isProcessing && !investmentSuccess && (
                  <button 
                    onClick={() => setInvestingInvoice(null)}
                    className="p-1.5 hover:bg-black/5 rounded-none transition-colors cursor-pointer text-zinc-400 hover:text-black"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>

              {investmentSuccess ? (
                <div className="flex flex-col items-center justify-center py-8 text-center gap-4">
                  <div className="w-12 h-12 bg-black text-white flex items-center justify-center animate-bounce">
                    <Check className="w-6 h-6 stroke-[3]" />
                  </div>
                  <div>
                    <h4 className="text-lg font-display font-bold italic text-on-background">Investment Settled</h4>
                    <p className="text-[11px] font-mono text-zinc-500 mt-2 max-w-[260px] mx-auto leading-relaxed">
                      Your Stellar liquidity pool allocation is confirmed. Smart yields will distribute starting next block.
                    </p>
                  </div>
                </div>
              ) : isProcessing ? (
                <div className="flex flex-col items-center justify-center py-12 text-center gap-4">
                  <div className="w-8 h-8 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  <div>
                    <h4 className="text-sm font-mono font-bold uppercase tracking-wider text-on-background">Escrowing funds...</h4>
                    <p className="text-[10px] font-mono text-zinc-400 mt-1">Signing transaction payload and validating token security key.</p>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleConfirmInvestment} className="space-y-4">
                  <div className="p-4 bg-white border border-black/10 rounded-none flex flex-col gap-2.5">
                    <div className="flex justify-between text-[11px] font-mono">
                      <span className="text-zinc-400 uppercase tracking-wider">Target Partner:</span>
                      <span className="text-black font-bold">{investingInvoice.partnerName}</span>
                    </div>
                    <div className="flex justify-between text-[11px] font-mono">
                      <span className="text-zinc-400 uppercase tracking-wider">Yield Rate:</span>
                      <span className="text-black font-bold">{investingInvoice.annualReturn}% APR</span>
                    </div>
                    <div className="flex justify-between text-[11px] font-mono border-t border-black/5 pt-2.5">
                      <span className="text-zinc-400 uppercase tracking-wider">Invoice Balance:</span>
                      <span className="text-black font-bold">
                        ${(investingInvoice.amount * (1 - investingInvoice.fundingProgress / 100)).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </span>
                    </div>
                  </div>

                  {/* Input field */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-widest">Your Allocation Amount ($)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 font-mono font-bold text-xs">$</span>
                      <input 
                        type="number" 
                        required
                        min="100"
                        max={(investingInvoice.amount * (1 - investingInvoice.fundingProgress / 100)).toString()}
                        value={investAmount}
                        onChange={(e) => setInvestAmount(e.target.value)}
                        className="w-full pl-6 pr-4 py-2 border border-black/10 rounded-none text-xs font-mono font-bold focus:border-black outline-none bg-white"
                      />
                    </div>
                    <p className="text-[9px] font-mono text-zinc-400 mt-1 leading-relaxed">
                      Funding completes in real-time. Minimum allocation: $100.
                    </p>
                  </div>

                  {/* Action controls */}
                  <div className="flex justify-end gap-3 pt-4 border-t border-black/5">
                    <button 
                      type="button"
                      onClick={() => setInvestingInvoice(null)}
                      className="px-4 py-2 bg-transparent border border-black/20 hover:border-black text-black font-mono text-[10px] uppercase tracking-wider transition-all cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit"
                      className="px-5 py-2 bg-black hover:bg-zinc-800 text-white font-mono text-[10px] uppercase tracking-widest transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <CreditCard className="w-3.5 h-3.5" />
                      <span>Confirm Invest</span>
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        )}

        {activeRiskScoringInvoice && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                if (!isRiskLoading) {
                  setActiveRiskScoringInvoice(null);
                }
              }}
              className="absolute inset-0 bg-black/45 backdrop-blur-sm"
            />
            
            {/* Modal Container */}
            <motion.div 
              initial={{ scale: 0.98, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.98, opacity: 0, y: 10 }}
              className="bg-[#f5f3f0] border border-black/20 rounded-none w-full max-w-xl p-6 sm:p-8 shadow-md relative z-10 overflow-hidden text-left"
            >
              {/* Header */}
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-2xl font-display font-bold italic text-on-background flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-black" />
                    <span>AI Credit Risk Report</span>
                  </h3>
                  <p className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-widest mt-1">
                    On-chain partner history & industry risk index.
                  </p>
                </div>
                {!isRiskLoading && (
                  <button 
                    onClick={() => setActiveRiskScoringInvoice(null)}
                    className="p-1.5 hover:bg-black/5 rounded-none transition-colors cursor-pointer text-zinc-400 hover:text-black"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>

              {isRiskLoading ? (
                <div className="flex flex-col items-center justify-center py-12 text-center gap-5">
                  <div className="relative flex items-center justify-center">
                    <div className="w-12 h-12 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    <TrendingUp className="w-4 h-4 absolute animate-pulse text-zinc-600" />
                  </div>
                  <div>
                    <h4 className="text-xs font-mono font-bold uppercase tracking-widest text-on-background animate-pulse">
                      Consulting Gemini AI Ledger...
                    </h4>
                    <p className="text-[10px] font-mono text-zinc-400 mt-2 max-w-[320px] mx-auto leading-relaxed">
                      Sifting macroeconomic industry tables, partner repayment benchmarks, and structural liquidity coverage indices.
                    </p>
                  </div>
                </div>
              ) : riskError ? (
                <div className="p-5 border border-red-200 bg-red-50 text-red-800 rounded-none flex flex-col gap-4 text-left">
                  <div className="flex items-start gap-3">
                    <X className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-mono text-[11px] uppercase tracking-wider font-bold">Ledger Handshake Failed</h4>
                      <p className="text-[11px] mt-1 text-red-700 leading-relaxed font-mono">
                        {riskError}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <button
                      type="button"
                      onClick={() => setActiveRiskScoringInvoice(null)}
                      className="px-4 py-2 border border-red-200 hover:border-red-400 text-red-800 font-mono text-[10px] uppercase tracking-wider bg-white cursor-pointer"
                    >
                      Close
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenRiskScoring(activeRiskScoringInvoice)}
                      className="px-4 py-2 bg-red-800 text-white font-mono text-[10px] uppercase tracking-wider cursor-pointer"
                    >
                      Retry Connection
                    </button>
                  </div>
                </div>
              ) : riskScoringData ? (
                <div className="space-y-6">
                  {/* Partner meta card */}
                  <div className="flex flex-col sm:flex-row gap-4 items-center justify-between p-4 bg-white border border-black/10 rounded-none">
                    <div className="text-left">
                      <p className="text-[9px] font-mono font-bold text-zinc-400 uppercase tracking-widest">Debtor / Borrower</p>
                      <h4 className="text-xl font-display font-bold italic text-black mt-1 leading-none">
                        {activeRiskScoringInvoice.partnerName}
                      </h4>
                      <span className="inline-block mt-1.5 text-[8px] font-mono bg-zinc-100 text-zinc-600 px-2 py-0.5 uppercase border border-black/5">
                        Sector: {activeRiskScoringInvoice.industry}
                      </span>
                    </div>
                    
                    {/* Visual speedometer credit score */}
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="relative w-20 h-20 flex items-center justify-center">
                        {/* Circle meter */}
                        <svg className="w-full h-full transform -rotate-90">
                          <circle
                            cx="40"
                            cy="40"
                            r="32"
                            className="stroke-zinc-100"
                            strokeWidth="5"
                            fill="transparent"
                          />
                          <circle
                            cx="40"
                            cy="40"
                            r="32"
                            className="stroke-black transition-all duration-500"
                            strokeWidth="5"
                            fill="transparent"
                            strokeDasharray={`${2 * Math.PI * 32}`}
                            strokeDashoffset={`${2 * Math.PI * 32 * (1 - Math.max(0, Math.min(1, (riskScoringData.creditScore - 300) / 550)))}`}
                          />
                        </svg>
                        <div className="absolute flex flex-col items-center">
                          <span className="text-lg font-bold font-mono text-black leading-none">{riskScoringData.creditScore}</span>
                          <span className="text-[7px] font-mono text-zinc-400 uppercase tracking-widest">Score</span>
                        </div>
                      </div>
                      <div className="text-left">
                        <p className="text-[9px] font-mono font-bold text-zinc-400 uppercase tracking-widest">Rating Tier</p>
                        <p className="text-sm font-display font-bold italic text-black mt-0.5">
                          {riskScoringData.creditScore >= 750 ? "Institutional AAA" : riskScoringData.creditScore >= 700 ? "Prime Stable" : "Standard Yield"}
                        </p>
                        <span className="inline-block px-1.5 py-0.5 bg-black text-white text-[8px] font-mono uppercase tracking-wider mt-1">
                          {riskScoringData.riskLevel}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Matrix details */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-3 bg-white border border-black/10 rounded-none text-left">
                      <span className="text-[9px] font-mono font-bold text-zinc-400 uppercase tracking-widest block">Sector Threat Factor</span>
                      <p className="text-xs font-mono font-semibold text-black mt-1 leading-relaxed">
                        {riskScoringData.industryRiskFactor}
                      </p>
                    </div>
                    <div className="p-3 bg-white border border-black/10 rounded-none text-left">
                      <span className="text-[9px] font-mono font-bold text-zinc-400 uppercase tracking-widest block">On-Time Settlements</span>
                      <p className="text-xs font-mono font-semibold text-black mt-1 leading-relaxed">
                        {riskScoringData.paymentHistoryRating}
                      </p>
                    </div>
                    <div className="p-3 bg-white border border-black/10 rounded-none text-left sm:col-span-2">
                      <span className="text-[9px] font-mono font-bold text-zinc-400 uppercase tracking-widest block">Escrow Allocation Guidance</span>
                      <p className="text-xs font-mono font-semibold text-zinc-800 mt-1 leading-relaxed">
                        {riskScoringData.recommendedAction}
                      </p>
                    </div>
                  </div>

                  {/* Gemini Summary Box */}
                  <div className="p-4 bg-zinc-50 border border-black/5 rounded-none text-left">
                    <span className="text-[9px] font-mono font-bold text-zinc-400 uppercase tracking-widest block mb-1.5">
                      Gemini AI Credit Risk Synthesis
                    </span>
                    <p className="text-xs text-zinc-700 leading-relaxed font-sans">
                      {riskScoringData.summary}
                    </p>
                  </div>

                  {/* Warning Box */}
                  {riskScoringData.warning && (
                    <div className="p-2.5 bg-zinc-100 border border-black/5 text-[9px] font-mono text-zinc-500 leading-relaxed flex items-start gap-2">
                      <span className="bg-zinc-200 text-zinc-600 px-1 font-bold uppercase shrink-0 scale-90">Bureau Mode</span>
                      <span>{riskScoringData.warning}</span>
                    </div>
                  )}

                  {/* Close button */}
                  <div className="flex justify-end pt-4 border-t border-black/5">
                    <button 
                      type="button"
                      onClick={() => setActiveRiskScoringInvoice(null)}
                      className="px-6 py-2.5 bg-black hover:bg-zinc-800 text-white font-mono text-[10px] uppercase tracking-widest transition-all cursor-pointer"
                    >
                      Close Report
                    </button>
                  </div>
                </div>
              ) : null}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
