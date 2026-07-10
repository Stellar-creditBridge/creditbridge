import React from 'react';
import { motion } from 'motion/react';
import { 
  TrendingUp, 
  Bolt, 
  Globe, 
  Shield, 
  Cpu, 
  UploadCloud, 
  Wallet, 
  CheckCircle, 
  ArrowRight,
  HelpCircle,
  Share2,
  Lock,
  ChevronRight
} from 'lucide-react';
import { WalletState } from '../types';

interface LandingPageProps {
  wallet: WalletState;
  setView: (view: 'landing' | 'dashboard' | 'marketplace' | 'connect') => void;
}

export default function LandingPage({ wallet, setView }: LandingPageProps) {
  // We can simulate an active mini sparkline animation
  const sparklineHeights = [40, 60, 50, 80, 70, 90, 85];

  const handleStartFinancing = () => {
    if (wallet.connected) {
      setView('dashboard');
    } else {
      setView('connect');
    }
  };

  const handleBecomeInvestor = () => {
    setView('marketplace');
  };

  return (
    <div id="landing-page" className="w-full flex flex-col bg-[#f5f3f0]">
      {/* Hero Section */}
      <section className="relative overflow-hidden px-6 md:px-12 py-16 md:py-24 max-w-7xl mx-auto w-full border-b border-black/5">
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-7 flex flex-col gap-6 text-left">
            <div className="inline-flex items-center">
              <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500 font-mono">
                Institutional Receivables / on-chain ledger
              </span>
            </div>
            
            <h1 className="text-6xl sm:text-7xl md:text-[100px] leading-[0.85] font-display tracking-tighter italic mt-2 text-primary">
              Shadow <br/> & Capital
            </h1>
            
            <div className="flex items-start gap-6 mt-4">
              <div className="w-20 h-[1px] bg-black mt-3 shrink-0"></div>
              <p className="text-base text-zinc-600 max-w-xl leading-relaxed">
                An exploration of decentralized corporate finance through the lens of high-contrast minimalism, enabling prompt liquidity pooling on the Stellar network.
              </p>
            </div>
            
            <div className="flex flex-wrap gap-4 mt-8">
              <button 
                id="cta-start-financing"
                onClick={handleStartFinancing}
                className="px-8 py-4 bg-black hover:bg-zinc-800 text-white text-[10px] uppercase tracking-[0.2em] font-mono font-semibold transition-colors brutalist-shadow-sm cursor-pointer"
              >
                Start Financing
              </button>
              
              <button 
                id="cta-become-investor"
                onClick={handleBecomeInvestor}
                className="px-8 py-4 border border-black/20 hover:border-black text-black text-[10px] uppercase tracking-[0.2em] font-mono font-semibold transition-colors cursor-pointer bg-transparent"
              >
                Become an Investor
              </button>
            </div>
          </div>
          
          {/* Animated Widget - Live Dashboard Mock (Artistic Frame Style) */}
          <div className="lg:col-span-5 w-full">
            <motion.div 
              initial={{ y: 15, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="bg-white border border-black/10 p-6 md:p-8 shadow-sm relative overflow-hidden flex flex-col gap-6"
            >
              <div className="flex justify-between items-center border-b border-black/5 pb-4">
                <span className="font-display font-bold text-lg text-primary italic">Live Ledger Activity</span>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[9px] font-mono text-zinc-400 uppercase tracking-wider">SYSTEM LIVE</span>
                </div>
              </div>
              
              <div className="p-5 bg-[#f5f3f0] border border-black/5 flex justify-between items-center">
                <div>
                  <p className="text-[9px] font-mono font-semibold text-zinc-500 uppercase tracking-widest">Active Invoices</p>
                  <p className="text-2xl sm:text-3xl font-bold text-on-background mt-1 font-mono tracking-tight">$1,248,500.00</p>
                </div>
                <div className="p-3 bg-black text-white">
                  <TrendingUp className="w-6 h-6" />
                </div>
              </div>

              {/* Sparkline Visualizer */}
              <div className="h-32 w-full bg-white border border-black/5 flex items-end p-3 gap-1.5 justify-between">
                {sparklineHeights.map((height, idx) => (
                  <div key={idx} className="flex-1 flex flex-col justify-end h-full">
                    <motion.div 
                      initial={{ height: 0 }}
                      animate={{ height: `${height}%` }}
                      transition={{ delay: idx * 0.1, duration: 1, ease: "easeOut" }}
                      className="bg-zinc-400 hover:bg-zinc-500 w-full"
                    />
                  </div>
                ))}
              </div>
              
              <div className="flex justify-between text-[9px] font-mono text-zinc-400 font-semibold uppercase tracking-widest px-1">
                <span>MON</span>
                <span>TUE</span>
                <span>WED</span>
                <span>THU</span>
                <span>FRI</span>
                <span>SAT</span>
                <span>SUN</span>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Stats Bar (High Contrast Studio Minimalist) */}
      <section className="bg-black py-16 text-white w-full">
        <div className="max-w-7xl mx-auto px-6 md:px-12 grid grid-cols-1 md:grid-cols-3 gap-12 text-left">
          <div className="flex flex-col gap-2 border-l border-white/10 pl-6">
            <span className="text-4xl md:text-5xl font-display font-bold italic">$250M+</span>
            <span className="text-[10px] font-mono font-semibold text-zinc-400 uppercase tracking-[0.2em]">Total Volume Financed</span>
          </div>
          <div className="flex flex-col gap-2 border-l border-white/10 pl-6">
            <span className="text-4xl md:text-5xl font-display font-bold italic">12,000+</span>
            <span className="text-[10px] font-mono font-semibold text-zinc-400 uppercase tracking-[0.2em]">Verified Businesses</span>
          </div>
          <div className="flex flex-col gap-2 border-l border-white/10 pl-6">
            <span className="text-4xl md:text-5xl font-display font-bold italic">98%</span>
            <span className="text-[10px] font-mono font-semibold text-zinc-400 uppercase tracking-[0.2em]">Historical Settlement</span>
          </div>
        </div>
      </section>

      {/* Why Finance Bento Grid */}
      <section className="py-24 px-6 md:px-12 max-w-7xl mx-auto w-full text-center border-b border-black/5">
        <div className="mb-16">
          <h2 className="text-4xl sm:text-5xl font-display font-bold italic text-on-background">
            Structure & Efficiency
          </h2>
          <p className="text-[10px] font-mono font-semibold text-zinc-400 uppercase tracking-[0.2em] mt-3">
            The power of decentralized settlement meets architectural financial security.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 text-left">
          {/* Card 1: Instant Liquidity */}
          <div className="md:col-span-8 bg-white border border-black/10 p-6 md:p-8 flex flex-col justify-between min-h-[300px] transition-all hover:shadow-sm group">
            <div className="flex flex-col gap-4">
              <div className="w-10 h-10 bg-black text-white flex items-center justify-center">
                <Bolt className="w-5 h-5" />
              </div>
              <h3 className="text-2xl font-display font-bold italic text-on-background">Instant Liquidity</h3>
              <p className="text-zinc-600 text-sm leading-relaxed max-w-xl">
                Minimize processing delays. Access required working capital within hours of submitting and verifying invoices on our secure distributed ledger.
              </p>
            </div>
            
            <div className="mt-8 relative h-16 bg-[#f5f3f0] border border-black/5 flex items-center px-6">
              <div className="flex-1 h-[2px] bg-zinc-300 overflow-hidden relative">
                <motion.div 
                  initial={{ width: 0 }}
                  whileInView={{ width: '75%' }}
                  viewport={{ once: true }}
                  transition={{ duration: 1.5, ease: "easeOut" }}
                  className="h-full bg-black"
                />
              </div>
              <span className="text-[10px] font-mono font-bold text-black uppercase tracking-wider ml-4">75% Funded</span>
            </div>
          </div>

          {/* Card 2: Global Access */}
          <div className="md:col-span-4 bg-zinc-900 p-6 md:p-8 flex flex-col justify-between text-white transition-all hover:bg-black group relative overflow-hidden">
            <div className="flex flex-col gap-4">
              <div className="w-10 h-10 bg-white/10 flex items-center justify-center">
                <Globe className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-2xl font-display font-bold italic">Global Access</h3>
              <p className="text-zinc-400 text-sm leading-relaxed">
                Powered by Stellar core ledger integrations, enabling secure cross-border invoice settlements at fractional costs and swift speed.
              </p>
            </div>
            
            <div className="self-end mt-4 text-white/5 group-hover:scale-105 transition-transform duration-700">
              <Globe className="w-20 h-20 stroke-[0.5]" />
            </div>
          </div>

          {/* Card 3: Institutional Security */}
          <div className="md:col-span-4 bg-white border border-black/10 p-6 md:p-8 flex flex-col gap-4 transition-all">
            <div className="w-10 h-10 bg-black text-white flex items-center justify-center">
              <Shield className="w-5 h-5" />
            </div>
            <h3 className="text-2xl font-display font-bold italic text-on-background">Rigorous Protocols</h3>
            <p className="text-zinc-600 text-sm leading-relaxed">
              Multi-signature escrows, precise corporate identity credentials, and sound smart agreements ensure legal compliance and absolute peace of mind.
            </p>
          </div>

          {/* Card 4: Smart Contract Enforcement */}
          <div className="md:col-span-8 bg-white border border-black/10 overflow-hidden flex flex-col md:flex-row transition-all">
            <div className="p-6 md:p-8 flex-1 flex flex-col justify-center gap-3">
              <div className="w-10 h-10 bg-black text-white flex items-center justify-center mb-1">
                <Cpu className="w-5 h-5" />
              </div>
              <h3 className="text-2xl font-display font-bold italic text-on-background">Algorithmic Escrow</h3>
              <p className="text-zinc-600 text-sm leading-relaxed">
                Smart enforcement mechanisms guarantee that yield distribution models and repayments are fully automated, removing manual administrative overhead.
              </p>
            </div>
            
            <div 
              className="w-full md:w-2/5 h-48 md:h-auto bg-cover bg-center min-h-[180px] grayscale contrast-125 hover:grayscale-0 transition-all duration-700"
              style={{ 
                backgroundImage: `url('https://lh3.googleusercontent.com/aida-public/AB6AXuD1locMGDuY3fz2bpvR77njXId0zPVfSs0bL-7FLMLrWLeLoh1dOVZpr32ks1ZhFvmruC-9Rn8bXzYsKIMHGImH1izdldykxcVQfURFbyC0Z_SOzLIlA1QyMN4Y-00S1pVUEDpjIxC98MGdANmEa-eOb_5pN2pjbaMXII0NdTDUnC2CG7r_ZQOcFaALAP17nDz09mI_DKezp6MURm_iDttw4OZ56VyogkkcRSiLV8vlJILgOTeJ18dTXg')` 
              }}
              aria-label="Smart contract security visualization"
            />
          </div>
        </div>
      </section>

      {/* Simple, Secure Process (Artistic List Layout) */}
      <section className="bg-white py-24 px-6 md:px-12 border-b border-black/5 w-full">
        <div className="max-w-7xl mx-auto">
          <div className="text-left mb-16 border-l-2 border-black pl-6">
            <h2 className="text-4xl sm:text-5xl font-display font-bold italic text-on-background">
              The Framework
            </h2>
            <p className="text-[10px] font-mono font-semibold text-zinc-400 uppercase tracking-[0.2em] mt-1">
              Step-by-step corporate receiver flow.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative">
            {/* Step 1 */}
            <div className="flex flex-col items-start text-left gap-4 group z-10">
              <span className="text-5xl font-display italic font-bold text-zinc-300 group-hover:text-black transition-colors">
                01.
              </span>
              <h4 className="text-xl font-bold tracking-tight text-on-background uppercase font-mono text-[11px] tracking-widest">Upload Receivables</h4>
              <p className="text-zinc-600 text-xs sm:text-sm leading-relaxed max-w-xs">
                Log into your dashboard, fill in your counterparty billing parameters, and register the pending receivable on our platform.
              </p>
              <UploadCloud className="w-5 h-5 text-zinc-400 group-hover:text-black transition-colors mt-2" />
            </div>

            {/* Step 2 */}
            <div className="flex flex-col items-start text-left gap-4 group z-10">
              <span className="text-5xl font-display italic font-bold text-zinc-300 group-hover:text-black transition-colors">
                02.
              </span>
              <h4 className="text-xl font-bold tracking-tight text-on-background uppercase font-mono text-[11px] tracking-widest">Collect Liquidity</h4>
              <p className="text-zinc-600 text-xs sm:text-sm leading-relaxed max-w-xs">
                The global marketplace funds your request. Escrow reserves compile automatically in stable assets for immediate withdrawal.
              </p>
              <Wallet className="w-5 h-5 text-zinc-400 group-hover:text-black transition-colors mt-2" />
            </div>

            {/* Step 3 */}
            <div className="flex flex-col items-start text-left gap-4 group z-10">
              <span className="text-5xl font-display italic font-bold text-zinc-300 group-hover:text-black transition-colors">
                03.
              </span>
              <h4 className="text-xl font-bold tracking-tight text-on-background uppercase font-mono text-[11px] tracking-widest">Automatic Settlement</h4>
              <p className="text-zinc-600 text-xs sm:text-sm leading-relaxed max-w-xs">
                Upon counterparty settlement, smart ledger actions allocate capital principal and returns back to liquidity providers automatically.
              </p>
              <CheckCircle className="w-5 h-5 text-zinc-400 group-hover:text-black transition-colors mt-2" />
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section (Artistic Brutalist Frame Style) */}
      <section className="py-24 px-6 md:px-12 max-w-7xl mx-auto w-full">
        <div className="bg-zinc-900 border border-black/20 p-8 md:p-16 text-center flex flex-col items-center gap-6 relative overflow-hidden text-white shadow-sm">
          <div className="absolute inset-0 bg-gradient-to-br from-zinc-800 to-black opacity-40 pointer-events-none" />
          
          <h2 className="text-4xl sm:text-5xl md:text-7xl font-display font-bold italic max-w-3xl leading-[0.9] tracking-tight z-10">
            Form & Yield
          </h2>
          
          <p className="text-zinc-400 text-xs sm:text-sm max-w-2xl leading-relaxed z-10 font-mono uppercase tracking-widest">
            Streamline your cash flow gap inside a high-contrast minimalist ledger environment.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 mt-4 z-10">
            <button 
              onClick={handleStartFinancing}
              className="px-8 py-4 bg-white text-black font-semibold text-[10px] uppercase tracking-[0.2em] font-mono transition-colors hover:bg-zinc-200 cursor-pointer"
            >
              Apply Now
            </button>
            <button 
              onClick={() => alert("Connecting with an institutional advisor... We will reach out to your wallet verification email address.")}
              className="px-8 py-4 bg-transparent border border-white/20 text-white font-semibold text-[10px] uppercase tracking-[0.2em] font-mono transition-colors hover:border-white cursor-pointer"
            >
              Talk to an Advisor
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white py-16 px-6 md:px-12 border-t border-black/5 w-full mt-auto text-left">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-10">
          <div className="flex flex-col gap-4">
            <span className="text-xl font-bold text-primary font-display italic tracking-tight">CreditBridge</span>
            <p className="text-xs text-zinc-500 leading-relaxed max-w-xs">
              The leading decentralized invoice financing framework for institutional users. Inspired by purity and absolute efficiency.
            </p>
          </div>
          
          <div>
            <h5 className="text-[10px] font-mono font-bold text-black uppercase tracking-[0.2em] mb-4">Product</h5>
            <ul className="space-y-2.5 text-xs text-zinc-500">
              <li><button onClick={() => setView('dashboard')} className="hover:text-black cursor-pointer">Dashboard</button></li>
              <li><button onClick={() => setView('marketplace')} className="hover:text-black cursor-pointer">Marketplace</button></li>
              <li><button onClick={() => setView('marketplace')} className="hover:text-black cursor-pointer">Invest</button></li>
              <li><span className="opacity-50">API status: Live</span></li>
            </ul>
          </div>
          
          <div>
            <h5 className="text-[10px] font-mono font-bold text-black uppercase tracking-[0.2em] mb-4">Company</h5>
            <ul className="space-y-2.5 text-xs text-zinc-500">
              <li><span className="opacity-50">About Studio</span></li>
              <li><span className="opacity-50">Archive</span></li>
              <li><span className="opacity-50">Journal</span></li>
              <li><span className="opacity-50">Contact</span></li>
            </ul>
          </div>
          
          <div>
            <h5 className="text-[10px] font-mono font-bold text-black uppercase tracking-[0.2em] mb-4">Legal</h5>
            <ul className="space-y-2.5 text-xs text-zinc-500">
              <li><span className="opacity-50">Terms of Service</span></li>
              <li><span className="opacity-50">Privacy Policy</span></li>
              <li><span className="opacity-50">Risk Disclosures</span></li>
            </ul>
          </div>
        </div>
        
        <div className="max-w-7xl mx-auto mt-12 pt-8 border-t border-black/5 flex flex-col sm:flex-row justify-between items-center gap-4 text-zinc-400 text-[10px] font-mono">
          <p>© {new Date().getFullYear()} CreditBridge. Designed for One Screen.</p>
          <div className="flex gap-6">
            <Globe className="w-4 h-4 hover:text-black cursor-pointer" />
            <Share2 className="w-4 h-4 hover:text-black cursor-pointer" />
            <HelpCircle className="w-4 h-4 hover:text-black cursor-pointer" />
          </div>
        </div>
      </footer>
    </div>
  );
}
