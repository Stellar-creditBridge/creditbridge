import React, { useState, useEffect } from 'react';
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
  ChevronRight,
  ExternalLink,
  AlertTriangle,
  Key
} from 'lucide-react';
import { WalletState, WalletProviderType } from '../types';
import { useToast } from './Toast';
import { stellarWalletService, WalletError } from '../services/stellarWalletService';
import { isValidStellarPublicKey, STELLAR_DEMO_KEYS, formatStellarAddress } from '../utils/stellar';

interface WalletAuthProps {
  wallet: WalletState;
  setWallet: React.Dispatch<React.SetStateAction<WalletState>>;
  setView: (view: 'landing' | 'dashboard' | 'marketplace' | 'analytics' | 'admin' | 'connect') => void;
}

export default function WalletAuth({ wallet, setWallet, setView }: WalletAuthProps) {
  const { showToast } = useToast();
  const [selectedProvider, setSelectedProvider] = useState<WalletProviderType | null>('freighter');
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isFreighterInstalled, setIsFreighterInstalled] = useState<boolean | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Manual key connection modal / fallback state for developer / demo inspection
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualAddress, setManualAddress] = useState('');

  useEffect(() => {
    let active = true;
    stellarWalletService.isFreighterInstalled().then(installed => {
      if (active) {
        setIsFreighterInstalled(installed);
      }
    });
    return () => { active = false; };
  }, []);

  const handleSelectWallet = (provider: WalletProviderType) => {
    if (isAuthenticating) return;
    setSelectedProvider(provider);
    setErrorMessage(null);
  };

  const authenticateWithAddress = async (address: string, provider: WalletProviderType, network?: string) => {
    // 1. Authenticate with backend JWT endpoint using cryptographic public key
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ walletAddress: address.trim() })
    });

    const data = await res.json();
    if (!res.ok || !data.token) {
      throw new Error(data.error || 'Authentication server rejected wallet handshake.');
    }

    localStorage.setItem('creditbridge_jwt', data.token);

    const newWalletState: WalletState = {
      address: address.trim(),
      provider,
      connected: true,
      role: (data.role as 'investor' | 'admin') || 'investor',
      network
    };

    setWallet(newWalletState);
    setSuccess(true);
    showToast(`Stellar wallet connected (${formatStellarAddress(address.trim())})`, 'success');

    setTimeout(() => {
      setView('dashboard');
    }, 800);
  };

  const handleConnect = async () => {
    if (!selectedProvider || isAuthenticating) return;

    setIsAuthenticating(true);
    setErrorMessage(null);

    const providerAdapter = stellarWalletService.getProvider(selectedProvider);
    if (!providerAdapter) {
      setIsAuthenticating(false);
      setErrorMessage(`Unknown wallet provider '${selectedProvider}'`);
      return;
    }

    try {
      // Connect to genuine wallet adapter
      const result = await providerAdapter.connect();
      await authenticateWithAddress(result.address, selectedProvider, result.network);
    } catch (err: any) {
      setIsAuthenticating(false);
      const msg = err?.message || 'Connection failed';
      setErrorMessage(msg);
      if (err instanceof WalletError && err.code === 'USER_REJECTED') {
        showToast('Connection request was declined in wallet', 'info');
      } else if (err instanceof WalletError && err.code === 'NOT_INSTALLED') {
        showToast('Freighter extension not detected in browser', 'error');
      } else {
        showToast(msg, 'error');
      }
    }
  };

  const handleManualConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = manualAddress.trim();
    if (!clean) {
      showToast('Please enter a Stellar Ed25519 public address.', 'error');
      return;
    }
    if (!isValidStellarPublicKey(clean)) {
      showToast('Invalid Stellar public key format. Must start with G and be 56 characters.', 'error');
      return;
    }

    setIsAuthenticating(true);
    setErrorMessage(null);
    try {
      await authenticateWithAddress(clean, 'manual_dev', 'TESTNET');
    } catch (err: any) {
      setIsAuthenticating(false);
      setErrorMessage(err?.message || 'Failed to authenticate manual address');
      showToast(err?.message || 'Authentication error', 'error');
    }
  };

  return (
    <div id="wallet-auth-container" className="w-full min-h-[calc(100vh-140px)] flex flex-col justify-center items-center py-10 px-6 max-w-7xl mx-auto">
      <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        
        {/* Left Side: Value Proposition */}
        <div className="lg:col-span-7 text-left space-y-8 hidden lg:block pr-8">
          <div className="space-y-4">
            <h1 className="text-5xl sm:text-7xl font-display font-bold italic tracking-tighter text-on-background leading-[0.9]">
              Form & <br/>
              <span className="text-primary italic">Liquidity.</span>
            </h1>
            <p className="text-base text-zinc-600 max-w-xl leading-relaxed">
              Connect your genuine Stellar wallet to securely access liquidity pools, inspect on-chain receivables, and sign audit checkpoints with cryptographic precision.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-6 pt-4">
            <div className="bg-white p-6 border border-black/10 flex flex-col gap-3 hover:shadow-sm transition-all">
              <ShieldCheck className="text-black w-6 h-6" />
              <h3 className="font-display font-bold text-lg text-on-background">Self-Custody</h3>
              <p className="text-xs text-zinc-500 leading-relaxed">
                You maintain 100% custody of your private keys. CreditBridge never requests, sees, or stores secret seeds.
              </p>
            </div>
            
            <div className="bg-white p-6 border border-black/10 flex flex-col gap-3 hover:shadow-sm transition-all">
              <Bolt className="text-black w-6 h-6" />
              <h3 className="font-display font-bold text-lg text-on-background">Non-Custodial Signing</h3>
              <p className="text-xs text-zinc-500 leading-relaxed">
                Transactions are prepared securely and presented to your local wallet for Ed25519 signature before broadcast.
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
                Select your Stellar wallet to authenticate.
              </p>
            </div>

            {/* Error Notification */}
            {errorMessage && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-left flex items-start gap-2 text-rose-900">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-[11px] font-mono font-bold leading-tight">Connection Issue</p>
                  <p className="text-[10px] font-mono leading-relaxed">{errorMessage}</p>
                </div>
              </div>
            )}

            {/* Wallet Selection Options */}
            <div className="flex flex-col gap-3">
              {/* Option 1: Freighter (Real Extension Integration) */}
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
                    <div className="flex items-center gap-2">
                      <p className="font-mono text-[11px] font-bold uppercase tracking-wider text-on-background">Freighter</p>
                      {isFreighterInstalled === true && (
                        <span className="text-[8px] font-mono px-1 py-0.2 bg-emerald-100 text-emerald-800 uppercase font-bold">Detected</span>
                      )}
                      {isFreighterInstalled === false && (
                        <span className="text-[8px] font-mono px-1 py-0.2 bg-zinc-100 text-zinc-500 uppercase font-bold">Extension</span>
                      )}
                    </div>
                    <p className="text-[10px] text-zinc-400 uppercase tracking-widest">Official SDF Browser Extension</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:text-black transition-colors" />
              </button>

              {/* Notice when Freighter is selected but not detected */}
              {selectedProvider === 'freighter' && isFreighterInstalled === false && (
                <div className="p-3 bg-zinc-50 border border-black/10 text-left space-y-2">
                  <p className="text-[10px] font-mono text-zinc-600 leading-relaxed">
                    Freighter extension is not currently active in your browser. Install it to sign on-chain transactions directly:
                  </p>
                  <a
                    href="https://www.freighter.app/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-[10px] font-mono font-bold text-black underline"
                  >
                    <span>Install Freighter from freighter.app</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}

              {/* Option 2: Albedo (Protocol Status: Onboarding) */}
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
                    <div className="flex items-center gap-2">
                      <p className="font-mono text-[11px] font-bold uppercase tracking-wider text-on-background">Albedo</p>
                      <span className="text-[8px] font-mono px-1 py-0.2 bg-zinc-100 text-zinc-500 uppercase font-bold">Coming Soon</span>
                    </div>
                    <p className="text-[10px] text-zinc-400 uppercase tracking-widest">Web-based link</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:text-black transition-colors" />
              </button>

              {/* Option 3: Rabe (Protocol Status: Onboarding) */}
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
                    <div className="flex items-center gap-2">
                      <p className="font-mono text-[11px] font-bold uppercase tracking-wider text-on-background">Rabet</p>
                      <span className="text-[8px] font-mono px-1 py-0.2 bg-zinc-100 text-zinc-500 uppercase font-bold">Coming Soon</span>
                    </div>
                    <p className="text-[10px] text-zinc-400 uppercase tracking-widest">Mobile & Extension</p>
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
                    <span>Awaiting Wallet Approval...</span>
                  </>
                ) : success ? (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    <span>Handshake Verified</span>
                  </>
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    <span>Connect Genuine Wallet</span>
                  </>
                )}
              </button>

              {/* Developer / Demo Mode Manual Public Key Access */}
              <div className="pt-2 border-t border-black/5">
                <button
                  type="button"
                  onClick={() => setShowManualInput(!showManualInput)}
                  className="w-full text-center text-[10px] font-mono text-zinc-500 hover:text-black cursor-pointer flex items-center justify-center gap-1"
                >
                  <Key className="w-3 h-3" />
                  <span>{showManualInput ? 'Hide manual address connection' : 'Connect via Stellar Public Key (Demo/Testnet)'}</span>
                </button>

                {showManualInput && (
                  <form onSubmit={handleManualConnect} className="mt-3 p-3 bg-zinc-50 border border-black/10 space-y-2 text-left">
                    <label className="text-[9px] font-mono font-bold text-zinc-500 uppercase tracking-widest block">
                      Stellar Ed25519 Public Key (G...)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. GBBUYYLWYM5JMKAKHLJ4OCZGIQ5WCKPL6JVDZ7F6HMDXIJVFP22FB6DY"
                      value={manualAddress}
                      onChange={(e) => setManualAddress(e.target.value)}
                      className="w-full h-9 px-3 bg-white border border-black/10 text-black font-mono text-[11px] focus:outline-none focus:border-black"
                    />
                    <div className="flex gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setManualAddress(STELLAR_DEMO_KEYS.MAIN_USER)}
                        className="text-[8px] font-mono text-zinc-500 hover:text-black underline cursor-pointer"
                      >
                        Use Demo User Key
                      </button>
                      <button
                        type="button"
                        onClick={() => setManualAddress(STELLAR_DEMO_KEYS.ADMIN)}
                        className="text-[8px] font-mono text-zinc-500 hover:text-black underline cursor-pointer"
                      >
                        Use Protocol Admin Key
                      </button>
                    </div>
                    <button
                      type="submit"
                      disabled={isAuthenticating}
                      className="w-full h-8 mt-2 bg-zinc-800 hover:bg-black text-white font-mono uppercase tracking-wider text-[9px] font-bold transition-colors cursor-pointer"
                    >
                      Authenticate Public Key
                    </button>
                  </form>
                )}
              </div>

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
                CreditBridge uses your wallet address as a unique identifier to verify ownership of tokenized invoices. Private keys are never read or stored.
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
          <span>v2.5.0</span>
        </div>
      </div>
    </div>
  );
}
