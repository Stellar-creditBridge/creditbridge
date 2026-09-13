import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  ShieldCheck, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  ArrowRight, 
  ExternalLink, 
  Loader2, 
  Coins, 
  Layers, 
  UserCheck, 
  DollarSign, 
  AlertTriangle,
  RotateCcw,
  Receipt
} from 'lucide-react';
import { 
  Invoice, 
  WalletState, 
  SettlementCalculation, 
  SettlementRecord, 
  InvestorEntitlement,
  RepaymentPreparationResponse 
} from '../types';
import { formatStellarAddress, getStellarExplorerUrl, STELLAR_DEMO_KEYS } from '../utils/stellar';
import { stellarWalletService } from '../services/stellarWalletService';
import { useToast } from './Toast';

interface RepaymentSettlementModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: Invoice | null;
  wallet?: WalletState;
  onSettlementComplete: (settlementRecord: SettlementRecord) => void;
}

export default function RepaymentSettlementModal({
  isOpen,
  onClose,
  invoice,
  wallet,
  onSettlementComplete
}: RepaymentSettlementModalProps) {
  const { showToast } = useToast();

  // Workflow state machine:
  // 'calculating' -> 'review' -> 'preparing' -> 'prepared' -> 'signing' -> 'submitting' -> 'confirmed' | 'failed'
  const [step, setStep] = useState<
    'calculating' | 'review' | 'preparing' | 'prepared' | 'signing' | 'submitting' | 'confirmed' | 'failed'
  >('calculating');

  const [calculation, setCalculation] = useState<SettlementCalculation | null>(null);
  const [existingRecord, setExistingRecord] = useState<SettlementRecord | null>(null);
  const [preparedTx, setPreparedTx] = useState<RepaymentPreparationResponse | null>(null);
  const [completedSettlement, setCompletedSettlement] = useState<SettlementRecord | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSimulatedMode, setIsSimulatedMode] = useState<boolean>(false);

  const activeWalletAddress = wallet?.address || STELLAR_DEMO_KEYS.MAIN_USER;
  const isConnected = Boolean(wallet?.connected && wallet?.address);

  // Fetch authoritative calculation whenever modal opens for an invoice
  useEffect(() => {
    if (!isOpen || !invoice) {
      setStep('calculating');
      setCalculation(null);
      setExistingRecord(null);
      setPreparedTx(null);
      setCompletedSettlement(null);
      setErrorMessage(null);
      return;
    }

    let isMounted = true;
    const fetchCalculation = async () => {
      setStep('calculating');
      setErrorMessage(null);
      try {
        const res = await fetch(`/api/invoices/${invoice.id}/settlement-calculation`);
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || 'Failed to load authoritative settlement calculation');
        }
        const data = await res.json();
        if (isMounted) {
          setCalculation(data.calculation);
          if (data.settlementRecord) {
            setExistingRecord(data.settlementRecord);
            setCompletedSettlement(data.settlementRecord);
            setStep('confirmed');
          } else {
            setStep('review');
          }
        }
      } catch (err: any) {
        if (isMounted) {
          setErrorMessage(err?.message || 'Failed to load settlement details');
          setStep('failed');
        }
      }
    };

    fetchCalculation();

    return () => {
      isMounted = false;
    };
  }, [isOpen, invoice?.id]);

  if (!isOpen || !invoice) return null;

  // Helper for auth headers
  const getAuthHeaders = (): Record<string, string> => {
    const token = localStorage.getItem('creditbridge_jwt');
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  };

  // Prepare unsigned Stellar settlement transaction
  const handlePrepareTransaction = async () => {
    setStep('preparing');
    setErrorMessage(null);
    try {
      const res = await fetch(`/api/invoices/${invoice.id}/prepare-repayment`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          debtorWallet: activeWalletAddress
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to construct repayment transaction on Stellar Testnet');
      }

      setPreparedTx(data);
      setStep('prepared');
      showToast('Stellar Testnet settlement envelope prepared. Review details to sign.', 'info');
    } catch (err: any) {
      console.error('Repayment preparation error:', err);
      setErrorMessage(err?.message || 'Failed to construct repayment transaction');
      setStep('failed');
      showToast(err?.message || 'Preparation failed', 'error');
    }
  };

  // Sign with connected non-custodial wallet & submit to Stellar Testnet
  const handleSignAndSubmit = async () => {
    if (!preparedTx) return;

    // Check if wallet can sign genuine XDR
    if (!isConnected || !wallet?.provider) {
      // If demo or simulated fallback is chosen
      await handleExecuteSettlement(undefined, true);
      return;
    }

    setStep('signing');
    setErrorMessage(null);

    try {
      const provider = stellarWalletService.getProvider(wallet.provider);
      if (!provider) {
        throw new Error(`Provider for '${wallet.provider}' is not available.`);
      }

      // Non-custodial sign step via wallet extension/app
      const signedXdr = await provider.signTransaction(preparedTx.unsignedXdr, {
        networkPassphrase: preparedTx.networkPassphrase,
        address: activeWalletAddress
      });

      setStep('submitting');
      await handleExecuteSettlement(signedXdr, false);
    } catch (err: any) {
      console.error('Signing / submission error:', err);
      setErrorMessage(err?.message || 'Signing failed or was rejected by user wallet');
      setStep('failed');
      showToast(err?.message || 'Transaction signing failed', 'error');
    }
  };

  // Execute settlement endpoint on backend
  const handleExecuteSettlement = async (signedXdr?: string, simulationMode: boolean = false) => {
    setStep('submitting');
    try {
      const res = await fetch(`/api/invoices/${invoice.id}/repay`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          operatorWallet: activeWalletAddress,
          signedXdr: signedXdr,
          simulationMode: simulationMode
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Settlement failed on server');
      }

      setCompletedSettlement(data.settlementRecord);
      setIsSimulatedMode(simulationMode || !signedXdr);
      setStep('confirmed');
      onSettlementComplete(data.settlementRecord);
      showToast(`Invoice #${invoice.id} successfully settled and distributed!`, 'success');
    } catch (err: any) {
      console.error('Settlement execution error:', err);
      setErrorMessage(err?.message || 'Settlement submission failed');
      setStep('failed');
      showToast(err?.message || 'Settlement failed', 'error');
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 10 }}
          className="bg-white border border-black/20 w-full max-w-2xl shadow-2xl relative my-8 overflow-hidden"
          id="repayment-settlement-modal"
        >
          {/* Header */}
          <div className="bg-[#f5f3f0] p-5 border-b border-black/10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-black text-white flex items-center justify-center font-mono text-xs font-bold">
                <Receipt className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-display font-bold italic text-lg text-black">
                    Invoice Repayment & Settlement
                  </h3>
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 bg-black text-white">
                    Stellar Testnet
                  </span>
                </div>
                <p className="text-[11px] font-mono text-zinc-500 mt-0.5">
                  Receivable #{invoice.id} • {invoice.partnerName}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-black/5 text-zinc-400 hover:text-black transition-colors"
              title="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body Content by Step */}
          <div className="p-6 max-h-[75vh] overflow-y-auto space-y-6">

            {/* Step: Calculating */}
            {step === 'calculating' && (
              <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
                <Loader2 className="w-8 h-8 animate-spin text-black" />
                <p className="font-mono text-xs uppercase tracking-widest text-zinc-500 font-bold">
                  Auditing Position Ledger & Entitlements...
                </p>
                <p className="text-xs text-zinc-400 max-w-sm">
                  Querying server-side accounting engine to calculate exact investor principal distributions and accrued returns.
                </p>
              </div>
            )}

            {/* Step: Review / Prepared / Preparing / Signing / Submitting */}
            {calculation && step !== 'calculating' && (
              <>
                {/* Repayment Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="bg-[#fcfbf9] border border-black/10 p-3.5">
                    <span className="text-[9px] font-mono uppercase tracking-widest text-zinc-400 block font-bold">
                      Repayment Amount Due
                    </span>
                    <span className="text-lg font-mono font-bold text-black mt-1 block">
                      ${calculation.invoiceAmount.toLocaleString()} USD
                    </span>
                    <span className="text-[10px] font-mono text-zinc-500">
                      Debtor obligation
                    </span>
                  </div>

                  <div className="bg-[#fcfbf9] border border-black/10 p-3.5">
                    <span className="text-[9px] font-mono uppercase tracking-widest text-zinc-400 block font-bold">
                      Investor Entitlement Pool
                    </span>
                    <span className="text-lg font-mono font-bold text-emerald-700 mt-1 block">
                      ${calculation.totalDistributionObligation.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                    </span>
                    <span className="text-[10px] font-mono text-zinc-500">
                      {calculation.activeInvestorCount} position{calculation.activeInvestorCount !== 1 ? 's' : ''} to settle
                    </span>
                  </div>

                  <div className="bg-[#fcfbf9] border border-black/10 p-3.5">
                    <span className="text-[9px] font-mono uppercase tracking-widest text-zinc-400 block font-bold">
                      Net Platform Margin
                    </span>
                    <span className="text-lg font-mono font-bold text-black mt-1 block">
                      ${calculation.netPlatformSurplus.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                    </span>
                    <span className="text-[10px] font-mono text-zinc-500">
                      Reserve balance
                    </span>
                  </div>
                </div>

                {/* Granular Investor Entitlement Table */}
                <div className="border border-black/10">
                  <div className="bg-[#f5f3f0] px-4 py-2.5 border-b border-black/10 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Coins className="w-3.5 h-3.5 text-black" />
                      <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-black">
                        Investor Entitlement Breakdown ({calculation.entitlements.length})
                      </span>
                    </div>
                    <span className="text-[9px] font-mono font-bold text-zinc-500 uppercase">
                      Server-Authoritative
                    </span>
                  </div>

                  <div className="max-h-48 overflow-y-auto divide-y divide-black/5">
                    {calculation.entitlements.length === 0 ? (
                      <div className="p-4 text-center text-xs font-mono text-zinc-400">
                        No investor allocations on this receivable. Repayment settles directly into platform reserve.
                      </div>
                    ) : (
                      calculation.entitlements.map((ent, idx) => (
                        <div key={ent.investmentId || idx} className="p-3 hover:bg-zinc-50 flex items-center justify-between text-xs">
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-black">
                                {formatStellarAddress(ent.investorWallet)}
                              </span>
                              <span className="text-[9px] font-mono bg-zinc-100 text-zinc-600 px-1 py-0.2">
                                {ent.ownershipPercentage.toFixed(1)}% Pool
                              </span>
                            </div>
                            <p className="text-[10px] font-mono text-zinc-500">
                              Principal: ${ent.principal.toLocaleString()} • APR: {ent.capturedApr}% • Days: {ent.durationDays}
                            </p>
                          </div>
                          <div className="text-right">
                            <span className="font-mono font-bold text-emerald-700 block">
                              +${ent.totalEntitlement.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                            <span className="text-[9px] font-mono text-zinc-400">
                              Yield: ${ent.expectedYield.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Non-Custodial Safety & Network Details */}
                <div className="bg-zinc-50 border border-black/10 p-4 space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-zinc-500 uppercase tracking-wider text-[10px] font-bold">Settlement Network:</span>
                    <span className="font-bold text-black flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      Stellar Testnet (testnet.stellar.org)
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-zinc-500 uppercase tracking-wider text-[10px] font-bold">Signing Wallet:</span>
                    <span className="font-bold text-black font-mono">
                      {formatStellarAddress(activeWalletAddress)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-zinc-500 uppercase tracking-wider text-[10px] font-bold">Non-Custodial Guarantee:</span>
                    <span className="text-zinc-700 text-[11px]">
                      Zero private key exposure. User signs via connected Stellar wallet.
                    </span>
                  </div>
                </div>

                {/* Transaction Inspection Panel when Prepared */}
                {preparedTx && step === 'prepared' && (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="border border-black bg-[#fbfaf8] p-4 space-y-3"
                  >
                    <div className="flex items-center justify-between border-b border-black/10 pb-2">
                      <span className="font-mono text-xs uppercase tracking-widest font-bold text-black flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-emerald-600" />
                        Unsigned Stellar Envelope Ready
                      </span>
                      <span className="text-[10px] font-mono bg-black text-white px-2 py-0.5">
                        manageData (CB_REPAY)
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                      <div>
                        <span className="text-zinc-400 block text-[9px] uppercase">Base Fee:</span>
                        <span className="font-bold text-black">{preparedTx.baseFee} stroops (0.00001 XLM)</span>
                      </div>
                      <div>
                        <span className="text-zinc-400 block text-[9px] uppercase">Sequence Number:</span>
                        <span className="font-bold text-black">{preparedTx.sequence}</span>
                      </div>
                      <div>
                        <span className="text-zinc-400 block text-[9px] uppercase">Memo:</span>
                        <span className="font-bold text-black">{preparedTx.memo}</span>
                      </div>
                      <div>
                        <span className="text-zinc-400 block text-[9px] uppercase">Source Account:</span>
                        <span className="font-bold text-black">{formatStellarAddress(preparedTx.sourceAccount)}</span>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Progress / Status Indicators */}
                {step === 'preparing' && (
                  <div className="p-4 bg-zinc-100 border border-black/10 flex items-center justify-center gap-3">
                    <Loader2 className="w-4 h-4 animate-spin text-black" />
                    <span className="font-mono text-xs uppercase tracking-wider font-bold text-zinc-700">
                      Querying Horizon Testnet & Building Unsigned XDR...
                    </span>
                  </div>
                )}

                {step === 'signing' && (
                  <div className="p-4 bg-amber-50 border border-amber-200 flex items-center justify-center gap-3">
                    <Loader2 className="w-4 h-4 animate-spin text-amber-700" />
                    <span className="font-mono text-xs uppercase tracking-wider font-bold text-amber-900">
                      Waiting for wallet confirmation in {wallet?.provider ? stellarWalletService.getProvider(wallet.provider)?.name : 'Stellar Wallet'}...
                    </span>
                  </div>
                )}

                {step === 'submitting' && (
                  <div className="p-4 bg-blue-50 border border-blue-200 flex items-center justify-center gap-3">
                    <Loader2 className="w-4 h-4 animate-spin text-blue-700" />
                    <span className="font-mono text-xs uppercase tracking-wider font-bold text-blue-900">
                      Broadcasting signed envelope to Stellar Horizon Testnet...
                    </span>
                  </div>
                )}

                {/* Confirmed Settlement View */}
                {step === 'confirmed' && completedSettlement && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="p-5 bg-emerald-50 border border-emerald-300 space-y-3"
                  >
                    <div className="flex items-center gap-2.5 text-emerald-900 font-bold">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                      <span className="font-display italic text-base">
                        Settlement Confirmed & Position Ledger Reconciled!
                      </span>
                    </div>

                    <p className="text-xs text-emerald-800 leading-relaxed">
                      Borrower repayment of ${completedSettlement.amountDue.toLocaleString()} USD has been reconciled. All {completedSettlement.entitlements.length} investor positions have transitioned from Active to <span className="font-bold">Settled</span>.
                    </p>

                    <div className="bg-white border border-emerald-200 p-3 space-y-1.5 text-xs font-mono">
                      <div className="flex items-center justify-between">
                        <span className="text-zinc-500">Settlement ID:</span>
                        <span className="font-bold text-black">{completedSettlement.id}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-zinc-500">Settlement Status:</span>
                        <span className="font-bold text-emerald-700">{completedSettlement.status}</span>
                      </div>
                      {completedSettlement.stellarTxHash && (
                        <div className="flex items-center justify-between">
                          <span className="text-zinc-500">Stellar Tx Hash:</span>
                          <a
                            href={completedSettlement.explorerUrl || getStellarExplorerUrl('tx', completedSettlement.stellarTxHash)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-bold text-black hover:underline flex items-center gap-1"
                          >
                            <span>{completedSettlement.stellarTxHash.slice(0, 10)}...{completedSettlement.stellarTxHash.slice(-6)}</span>
                            <ExternalLink className="w-3 h-3 text-zinc-400" />
                          </a>
                        </div>
                      )}
                      {completedSettlement.ledger && (
                        <div className="flex items-center justify-between">
                          <span className="text-zinc-500">Confirmed Ledger:</span>
                          <span className="font-bold text-black">#{completedSettlement.ledger}</span>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}

                {/* Error State */}
                {step === 'failed' && errorMessage && (
                  <div className="p-4 bg-red-50 border border-red-200 text-red-900 space-y-2">
                    <div className="flex items-center gap-2 font-bold text-xs">
                      <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                      <span>Settlement Procedure Interrupted</span>
                    </div>
                    <p className="text-xs text-red-800 font-mono">
                      {errorMessage}
                    </p>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer Controls */}
          <div className="bg-[#f5f3f0] p-5 border-t border-black/10 flex flex-col sm:flex-row items-center justify-between gap-3">
            <button
              onClick={onClose}
              className="w-full sm:w-auto px-4 py-2 border border-black/20 text-xs font-mono font-bold uppercase tracking-wider hover:bg-black/5 transition-colors cursor-pointer"
            >
              {step === 'confirmed' ? 'Close' : 'Cancel'}
            </button>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              {step === 'review' && (
                <>
                  <button
                    onClick={() => handleExecuteSettlement(undefined, true)}
                    title="Simulate settlement authorization without requiring active testnet gas"
                    className="w-full sm:w-auto px-4 py-2 border border-black text-black hover:bg-black/5 font-mono text-xs uppercase tracking-wider font-bold transition-all cursor-pointer"
                  >
                    Simulate Settlement
                  </button>

                  <button
                    onClick={handlePrepareTransaction}
                    className="w-full sm:w-auto px-5 py-2 bg-black hover:bg-zinc-800 text-white font-mono text-xs uppercase tracking-wider font-bold transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <span>Prepare Stellar Settlement</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </>
              )}

              {step === 'prepared' && (
                <button
                  onClick={handleSignAndSubmit}
                  className="w-full sm:w-auto px-6 py-2.5 bg-black hover:bg-zinc-800 text-white font-mono text-xs uppercase tracking-wider font-bold transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Sign & Settle on Stellar Testnet</span>
                </button>
              )}

              {step === 'failed' && (
                <button
                  onClick={() => setStep('review')}
                  className="w-full sm:w-auto px-4 py-2 bg-black text-white font-mono text-xs uppercase tracking-wider font-bold hover:bg-zinc-800 transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Retry Settlement</span>
                </button>
              )}

              {step === 'confirmed' && (
                <button
                  onClick={onClose}
                  className="w-full sm:w-auto px-6 py-2 bg-black text-white font-mono text-xs uppercase tracking-wider font-bold hover:bg-zinc-800 transition-all cursor-pointer"
                >
                  Done
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
