import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShieldCheck, 
  ExternalLink, 
  CheckCircle, 
  AlertTriangle, 
  FileText, 
  ArrowRight,
  Send,
  Loader2,
  RefreshCw,
  Copy,
  Coins
} from 'lucide-react';
import { WalletState, AccountFundingStatus, TransactionPreparationResponse, TransactionSubmissionResult } from '../types';
import { stellarWalletService } from '../services/stellarWalletService';
import { formatStellarAddress, getStellarExplorerUrl } from '../utils/stellar';
import { useToast } from './Toast';

interface SafeTransactionPanelProps {
  wallet?: WalletState;
  onAuditEntryCreated?: () => void;
}

export default function SafeTransactionPanel({ wallet, onAuditEntryCreated }: SafeTransactionPanelProps) {
  const { showToast } = useToast();
  const [fundingStatus, setFundingStatus] = useState<AccountFundingStatus | null>(null);
  const [isCheckingFunding, setIsCheckingFunding] = useState(false);

  // Transaction lifecycle stages: 'idle' | 'preparing' | 'prepared' | 'signing' | 'submitting' | 'confirmed' | 'failed'
  const [stage, setStage] = useState<'idle' | 'preparing' | 'prepared' | 'signing' | 'submitting' | 'confirmed' | 'failed'>('idle');
  const [preparedTx, setPreparedTx] = useState<TransactionPreparationResponse | null>(null);
  const [submissionResult, setSubmissionResult] = useState<TransactionSubmissionResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchFunding = useCallback(async (address: string) => {
    setIsCheckingFunding(true);
    try {
      const res = await fetch(`/api/stellar/account/${encodeURIComponent(address)}`);
      if (res.ok) {
        const data = await res.json();
        setFundingStatus(data);
      }
    } catch {
      // Non-blocking funding inquiry failure
    } finally {
      setIsCheckingFunding(false);
    }
  }, []);

  useEffect(() => {
    if (wallet?.connected && wallet?.address) {
      fetchFunding(wallet.address);
    } else {
      setFundingStatus(null);
    }
  }, [wallet?.connected, wallet?.address, fetchFunding]);

  const handlePrepareTransaction = async () => {
    if (!wallet?.address) return;
    setStage('preparing');
    setErrorMessage(null);
    setPreparedTx(null);
    setSubmissionResult(null);

    try {
      const token = localStorage.getItem('creditbridge_jwt');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch('/api/stellar/tx/prepare-proof', {
        method: 'POST',
        headers,
        body: JSON.stringify({ sourceAddress: wallet.address }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to construct safe audit transaction');
      }

      setPreparedTx(data);
      setStage('prepared');
      showToast('Safe audit transaction constructed and ready for review', 'info');
    } catch (err: any) {
      setErrorMessage(err?.message || 'Transaction preparation error');
      setStage('failed');
      showToast(err?.message || 'Failed to prepare transaction', 'error');
    }
  };

  const handleSignAndSubmit = async () => {
    if (!preparedTx || !wallet?.address || !wallet?.provider) return;

    const provider = stellarWalletService.getProvider(wallet.provider);
    if (!provider) {
      setErrorMessage(`Provider adapter '${wallet.provider}' is not available.`);
      setStage('failed');
      return;
    }

    // Step 1: Sign using client-side wallet provider
    setStage('signing');
    setErrorMessage(null);

    let signedXdr: string;
    try {
      signedXdr = await provider.signTransaction(preparedTx.unsignedXdr, {
        networkPassphrase: preparedTx.networkPassphrase,
        address: wallet.address,
      });
      showToast('Transaction signature obtained from wallet', 'success');
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to obtain signature from wallet');
      setStage('failed');
      showToast(err?.message || 'Signature rejected', 'error');
      return;
    }

    // Step 2: Submit signed envelope to Stellar Horizon
    setStage('submitting');
    try {
      const token = localStorage.getItem('creditbridge_jwt');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch('/api/stellar/tx/submit', {
        method: 'POST',
        headers,
        body: JSON.stringify({ signedXdr }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.details || data.error || 'Transaction rejected by Stellar Horizon');
      }

      setSubmissionResult(data);
      setStage('confirmed');
      showToast('Transaction confirmed on Stellar Testnet!', 'success');

      // Trigger audit refresh
      if (onAuditEntryCreated) {
        onAuditEntryCreated();
      }

      // Refresh account funding
      fetchFunding(wallet.address);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Horizon submission failure');
      setStage('failed');
      showToast(err?.message || 'Transaction submission failed', 'error');
    }
  };

  const handleReset = () => {
    setStage('idle');
    setPreparedTx(null);
    setSubmissionResult(null);
    setErrorMessage(null);
  };

  return (
    <div className="border-t border-black/5 pt-4 text-left">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-mono font-bold text-black uppercase tracking-widest flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-black" />
          <span>On-Chain Audit Signer</span>
        </h4>
        <span className="text-[8px] font-mono px-1.5 py-0.5 bg-zinc-100 text-zinc-600 uppercase font-bold border border-black/10">
          Non-Custodial
        </span>
      </div>

      <div className="bg-zinc-50 border border-black/10 p-4 rounded-none flex flex-col gap-3">
        {/* Wallet connection check */}
        {!wallet?.connected || !wallet?.address ? (
          <div className="bg-white border border-black/10 p-3 text-center space-y-2">
            <p className="text-[11px] font-mono text-zinc-600">
              Connect your Stellar wallet to inspect account funding and sign live on-chain audit checkpoints.
            </p>
          </div>
        ) : (
          <>
            {/* Account Info & Testnet Balance */}
            <div className="bg-white border border-black/10 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-mono font-bold text-zinc-400 uppercase tracking-widest">
                  Account Status
                </span>
                <button
                  onClick={() => wallet?.address && fetchFunding(wallet.address)}
                  disabled={isCheckingFunding}
                  className="p-1 text-zinc-400 hover:text-black cursor-pointer"
                  title="Refresh Horizon balance"
                >
                  <RefreshCw className={`w-3 h-3 ${isCheckingFunding ? 'animate-spin' : ''}`} />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${fundingStatus?.isFunded ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                  <span className="font-mono text-[11px] font-bold text-black">
                    {fundingStatus?.isFunded ? 'Funded on Testnet' : 'Unfunded (New Account)'}
                  </span>
                </div>
                {fundingStatus?.balanceXlm && (
                  <span className="font-mono text-[11px] font-bold text-black">
                    {parseFloat(fundingStatus.balanceXlm).toFixed(2)} XLM
                  </span>
                )}
              </div>

              {!fundingStatus?.isFunded && (
                <div className="p-2 bg-amber-50/70 border border-amber-200/80 text-[10px] font-mono text-amber-900 space-y-1">
                  <div className="flex items-center gap-1 font-bold">
                    <Coins className="w-3 h-3 text-amber-700" />
                    <span>Testnet Faucet Notice</span>
                  </div>
                  <p className="text-[9px] text-amber-800 leading-relaxed">
                    This account is not yet funded on Stellar Testnet. Fund it with 10,000 free Testnet XLM via Friendbot to submit transactions.
                  </p>
                  <a 
                    href={`https://laboratory.stellar.org/#account-creator?network=testnet`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[9px] font-bold text-black underline mt-1"
                  >
                    <span>Open Stellar Friendbot</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>
              )}
            </div>

            {/* Transaction Builder & Submission Flow */}
            <div className="space-y-3">
              {stage === 'idle' && (
                <div className="space-y-2">
                  <p className="text-[10px] font-mono text-zinc-500 leading-relaxed">
                    Verify client-side signing and submit a genuine <span className="font-bold text-black">manageData</span> audit checkpoint to Stellar Horizon without transferring funds.
                  </p>
                  <button
                    onClick={handlePrepareTransaction}
                    disabled={!fundingStatus?.isFunded}
                    className={`w-full h-9 font-mono uppercase tracking-wider text-[9px] font-bold flex items-center justify-center gap-2 border transition-all ${
                      fundingStatus?.isFunded
                        ? 'bg-black text-white hover:bg-zinc-800 border-black cursor-pointer'
                        : 'bg-zinc-200 text-zinc-400 border-zinc-200 cursor-not-allowed'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Prepare Audit Checkpoint</span>
                  </button>
                </div>
              )}

              {stage === 'preparing' && (
                <div className="p-3 bg-white border border-black/10 flex items-center justify-center gap-2 text-[10px] font-mono text-zinc-600">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Constructing envelope via Stellar SDK...</span>
                </div>
              )}

              {stage === 'prepared' && preparedTx && (
                <div className="bg-white border border-black/10 p-3 space-y-3">
                  <div className="flex items-center justify-between border-b border-black/5 pb-2">
                    <span className="text-[9px] font-mono font-bold text-zinc-400 uppercase tracking-widest">
                      Audit Envelope Ready
                    </span>
                    <span className="text-[9px] font-mono font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5">
                      Unsigned
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                    <div>
                      <span className="text-zinc-400 block text-[8px] uppercase">Operation</span>
                      <span className="font-bold text-black">{preparedTx.operationType}</span>
                    </div>
                    <div>
                      <span className="text-zinc-400 block text-[8px] uppercase">Base Fee</span>
                      <span className="font-bold text-black">{preparedTx.baseFee} Stroops</span>
                    </div>
                    <div>
                      <span className="text-zinc-400 block text-[8px] uppercase">Network</span>
                      <span className="font-bold text-black uppercase">{preparedTx.network}</span>
                    </div>
                    <div>
                      <span className="text-zinc-400 block text-[8px] uppercase">Memo</span>
                      <span className="font-bold text-black">{preparedTx.memo}</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-black/5 flex gap-2">
                    <button
                      onClick={handleReset}
                      className="w-1/3 h-8 font-mono uppercase tracking-wider text-[8px] font-bold border border-black/20 hover:bg-zinc-100 transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSignAndSubmit}
                      className="w-2/3 h-8 font-mono uppercase tracking-wider text-[8px] font-bold bg-black text-white hover:bg-zinc-800 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Send className="w-3 h-3" />
                      <span>Sign & Submit</span>
                    </button>
                  </div>
                </div>
              )}

              {(stage === 'signing' || stage === 'submitting') && (
                <div className="p-3 bg-white border border-black/10 flex flex-col items-center justify-center gap-2 text-[10px] font-mono text-zinc-600">
                  <Loader2 className="w-4 h-4 animate-spin text-black" />
                  <span className="font-bold text-black">
                    {stage === 'signing' ? 'Awaiting Signature in Wallet...' : 'Submitting to Stellar Horizon...'}
                  </span>
                  <p className="text-[9px] text-zinc-400 text-center">
                    {stage === 'signing' 
                      ? `Confirm the prompt in your ${wallet.provider?.toUpperCase()} wallet extension.` 
                      : 'Broadcasting envelope to consensus nodes.'}
                  </p>
                </div>
              )}

              {stage === 'confirmed' && submissionResult && (
                <div className="bg-emerald-50/80 border border-emerald-300 p-3 space-y-2">
                  <div className="flex items-center gap-1.5 text-emerald-800 font-mono font-bold text-[10px]">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Confirmed on Stellar Testnet</span>
                  </div>

                  <div className="text-[9px] font-mono text-emerald-900 space-y-1">
                    <div>
                      <span className="text-zinc-500">Hash: </span>
                      <span className="font-bold">{formatStellarAddress(submissionResult.hash, 8, 8)}</span>
                    </div>
                    {submissionResult.ledger && (
                      <div>
                        <span className="text-zinc-500">Ledger: </span>
                        <span className="font-bold">#{submissionResult.ledger}</span>
                      </div>
                    )}
                  </div>

                  <div className="pt-2 flex items-center justify-between border-t border-emerald-200">
                    <a
                      href={submissionResult.explorerUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[9px] font-mono font-bold text-black hover:underline"
                    >
                      <span>View on Stellar.Expert</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>

                    <button
                      onClick={handleReset}
                      className="text-[9px] font-mono font-bold text-zinc-600 hover:text-black cursor-pointer underline"
                    >
                      Done
                    </button>
                  </div>
                </div>
              )}

              {stage === 'failed' && (
                <div className="bg-rose-50/80 border border-rose-300 p-3 space-y-2">
                  <div className="flex items-center gap-1.5 text-rose-800 font-mono font-bold text-[10px]">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-700" />
                    <span>Transaction Failed</span>
                  </div>
                  <p className="text-[9px] font-mono text-rose-900 leading-relaxed">
                    {errorMessage || 'An error occurred during transaction execution.'}
                  </p>
                  <button
                    onClick={handleReset}
                    className="w-full h-7 font-mono uppercase tracking-wider text-[8px] font-bold bg-white border border-rose-300 text-rose-900 hover:bg-rose-100 transition-colors cursor-pointer"
                  >
                    Try Again
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
