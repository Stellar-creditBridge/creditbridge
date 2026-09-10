import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  ShieldCheck, 
  Bolt, 
  QrCode, 
  Compass, 
  Wallet, 
  LogIn, 
  Info, 
  CheckCircle,
  Lock,
  ChevronRight
} from 'lucide-react';
import { WalletState } from '../types';
import { useToast } from './Toast';
import { STELLAR_DEMO_KEYS } from '../utils/stellar';

interface WalletAuthProps {
  wallet: WalletState;
  setWallet: React.Dispatch<React.SetStateAction<WalletState>>;
  setView: (view: 'landing' | 'dashboard' | 'marketplace' | 'analytics' | 'admin' | 'connect') => void;
}

export default function WalletAuth({ wallet, setWallet, setView }: WalletAuthProps) {
  const { showToast } = useToast();
  const [selectedProvider, setSelectedProvider] = useState<'freighter' | 'albedo' | 'rabe' | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSelectWallet = (provider: 'freighter' | 'albedo' | 'rabe') => {
    if (isAuthenticating) return;
    setSelectedProvider(provider);
  };

  const handleConnect = () => {
    if (!selectedProvider || isAuthenticating) return;

    setIsAuthenticating(true);
    
    // Simulate Stellar network authentication handshake
    setTimeout(async () => {
      try {
        const mockAddress = STELLAR_DEMO_KEYS.MAIN_USER;
        
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ walletAddress: mockAddress })
        });
        const data = await res.json();
        if (data.token) {
          localStorage.setItem('creditbridge_jwt', data.token);
        }

        setIsAuthenticating(false);
        setSuccess(true);
        
        setWallet({
          address: mockAddress,
          provider: selectedProvider,
          connected: true,
          role: (data.role as 'investor' | 'admin') || 'investor'
        });

        showToast(`Wallet connected via ${selectedProvider.toUpperCase()} successfully!`, 'success');

        // Quick delay before navigating to dashboard
        setTimeout(() => {
          setView('dashboard');
        }, 800);
      } catch (e) {
        setIsAuthenticating(false);
        showToast('Authentication failed', 'error');
      }
    }, 1500);
  };

  return (
    <div id="wallet-auth-container" className="w-full min-h-[calc(100vh-140px)] flex flex-col justify-center items-center py-10 px-6 max-w-7xl mx-auto">
      <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        
        {/* Left Side: Value Proposition (Hidden on small screens) */}
        <div className="lg:col-span-7 text-left space-y-8 hidden lg:block pr-8">
          <div className="space-y-4">
            <h1 className="text-5xl sm:text-7xl font-display font-bold italic tracking-tighter text-on-background leading-[0.9]">
              Form & <br/>
              <span className="text-primary italic">Liquidity.</span>
            </h1>
            <p className="text-base text-zinc-600 max-w-xl leading-relaxed">
              Connect your Stellar wallet to securely access liquidity pools, manage digital receivables, and verify identity with cryptographic precision.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-6 pt-4">
            <div className="bg-white p-6 border border-black/10 flex flex-col gap-3 hover:shadow-sm transition-all">
              <ShieldCheck className="text-black w-6 h-6" />
              <h3 className="font-display font-bold text-lg text-on-background">Self-Custody</h3>
              <p className="text-xs text-zinc-500 leading-relaxed">
                You maintain 100% control over your private keys and financial metadata at all times.
              </p>
            </div>
            
            <div className="bg-white p-6 border border-black/10 flex flex-col gap-3 hover:shadow-sm transition-all">
              <Bolt className="text-black w-6 h-6" />
              <h3 className="font-display font-bold text-lg text-on-background">Real-time Settlement</h3>
              <p className="text-xs text-zinc-500 leading-relaxed">
                Automated smart contracts handle verification and fund transfers in seconds.
              </p>
            </div>
          </div>
        </div>

        {/* Right Side: Auth Form Component */}
        <div className="lg:col-span-5 w-full">
          <div className="bg-white border border-black/10 p-6 sm:p-8 flex flex-col gap-6 shadow-sm">
            <div className="text-center lg:text-left">
              <h2 className="text-3xl font-display font-bold italic text-on-background tracking-tight">Connect Wallet</h2>
              <p className="text-[10px] font-mono font-semibold text-zinc-400 uppercase tracking-widest mt-1.5 leading-relaxed">
                Select your preferred Stellar gateway to authenticate.
              </p>
            </div>

            {/* Wallet Selection Options */}
            <div className="flex flex-col gap-3">
              {/* Option 1: Freighter */}
              <button 
                id="wallet-freighter"
                disabled={isAuthenticating}
                onClick={() => handleSelectWallet('freighter')}
                className={`w-full flex items-center justify-between p-4 border transition-all cursor-pointer group text-left ${
                  selectedProvider === 'freighter'
                    ? 'border-black bg-zinc-50'
                    : 'border-black/5 bg-[#fbfbfa] hover:bg-zinc-50'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-black text-white flex items-center justify-center">
                    <Wallet className="w-5 h-5 stroke-[1.5]" />
                  </div>
                  <div>
                    <p className="font-mono text-[11px] font-bold uppercase tracking-wider text-on-background">Freighter</p>
                    <p className="text-[10px] text-zinc-400 uppercase tracking-widest">Browser Extension</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:text-black transition-colors" />
              </button>

              {/* Option 2: Albedo */}
              <button 
                id="wallet-albedo"
                disabled={isAuthenticating}
                onClick={() => handleSelectWallet('albedo')}
                className={`w-full flex items-center justify-between p-4 border transition-all cursor-pointer group text-left ${
                  selectedProvider === 'albedo'
                    ? 'border-black bg-zinc-50'
                    : 'border-black/5 bg-[#fbfbfa] hover:bg-zinc-50'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-black text-white flex items-center justify-center">
                    <Compass className="w-5 h-5 stroke-[1.5]" />
                  </div>
                  <div>
                    <p className="font-mono text-[11px] font-bold uppercase tracking-wider text-on-background">Albedo</p>
                    <p className="text-[10px] text-zinc-400 uppercase tracking-widest">Web-based link</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:text-black transition-colors" />
              </button>

              {/* Option 3: Rabe */}
              <button 
                id="wallet-rabe"
                disabled={isAuthenticating}
                onClick={() => handleSelectWallet('rabe')}
                className={`w-full flex items-center justify-between p-4 border transition-all cursor-pointer group text-left ${
                  selectedProvider === 'rabe'
                    ? 'border-black bg-zinc-50'
                    : 'border-black/5 bg-[#fbfbfa] hover:bg-zinc-50'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-black text-white flex items-center justify-center">
                    <QrCode className="w-5 h-5 stroke-[1.5]" />
                  </div>
                  <div>
                    <p className="font-mono text-[11px] font-bold uppercase tracking-wider text-on-background">Rabe</p>
                    <p className="text-[10px] text-zinc-400 uppercase tracking-widest">Mobile Wallet</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:text-black transition-colors" />
              </button>
            </div>

            {/* Action controls */}
            <div className="space-y-4">
              <button
                id="connect-btn"
                disabled={!selectedProvider || isAuthenticating || success}
                onClick={handleConnect}
                className={`w-full h-12 font-mono uppercase tracking-[0.2em] text-[11px] font-bold flex items-center justify-center gap-2 transition-all ${
                  success
                    ? 'bg-emerald-600 text-white cursor-default'
                    : selectedProvider
                    ? 'bg-black hover:bg-zinc-800 text-white brutalist-shadow-sm cursor-pointer'
                    : 'bg-zinc-200 text-zinc-400 cursor-not-allowed'
                }`}
              >
                {isAuthenticating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Authenticating...</span>
                  </>
                ) : success ? (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    <span>Handshake Verified</span>
                  </>
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    <span>Connect Ledger</span>
                  </>
                )}
              </button>

              <p className="text-[10px] text-zinc-400 text-center px-4 leading-relaxed font-mono uppercase tracking-wider">
                By connecting, you agree to the{' '}
                <a className="text-black font-bold hover:underline" href="#">Terms</a>{' '}
                and{' '}
                <a className="text-black font-bold hover:underline" href="#">Privacy</a>.
              </p>
            </div>

            <div className="pt-5 border-t border-black/5 flex items-start gap-3">
              <Info className="w-4 h-4 text-black shrink-0 mt-0.5" />
              <p className="text-[10px] text-zinc-500 leading-relaxed font-mono">
                CreditBridge uses your wallet address as a unique identifier to verify ownership of tokenized invoices. Private keys are never read.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Security footer info at bottom of authentication view */}
      <div className="w-full mt-16 pt-6 border-t border-black/5 flex flex-col sm:flex-row justify-between items-center gap-4 text-[10px] text-zinc-400 font-mono uppercase tracking-widest">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-1.5 font-medium">
            <ShieldCheck className="w-4 h-4 text-black stroke-[1.5]" />
            <span>Audited Protocol</span>
          </div>
          <div className="flex items-center gap-1.5 font-medium">
            <Lock className="w-4 h-4 text-black stroke-[1.5]" />
            <span>SSL Encrypted</span>
          </div>
        </div>
        
        <div className="flex gap-6 font-mono font-medium">
          <span>Stellar Ledger: <span className="text-black font-bold">OPERATIONAL</span></span>
          <span>v2.4.0a</span>
        </div>
      </div>
    </div>
  );
}
