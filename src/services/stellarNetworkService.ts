import { Horizon, Networks } from '@stellar/stellar-sdk';
import { 
  StellarNetworkId, 
  StellarNetworkStatus, 
  StellarLatestLedger, 
  StellarFeeStats,
  StellarNetworkAvailability 
} from '../types';
import { STELLAR_NETWORKS, DEFAULT_STELLAR_NETWORK } from '../utils/stellar';

/**
 * Resolved Network Configuration based on process environment.
 * Default network is Testnet unless STELLAR_NETWORK is explicitly configured.
 */
export function getResolvedNetworkConfig(): {
  networkId: StellarNetworkId;
  horizonUrl: string;
  networkPassphrase: string;
  explorerBaseUrl: string;
} {
  const envNet = (process.env.STELLAR_NETWORK || '').toLowerCase().trim();
  const networkId: StellarNetworkId = envNet === 'public' || envNet === 'mainnet' ? 'public' : 'testnet';
  
  const def = STELLAR_NETWORKS[networkId] || STELLAR_NETWORKS[DEFAULT_STELLAR_NETWORK];
  const horizonUrl = process.env.STELLAR_HORIZON_URL?.trim() || def.horizonUrl;
  const explorerBaseUrl = def.explorerBaseUrl;
  const networkPassphrase = networkId === 'public' ? Networks.PUBLIC : Networks.TESTNET;

  return {
    networkId,
    horizonUrl,
    networkPassphrase,
    explorerBaseUrl,
  };
}

// In-memory cache & state for server-side Horizon polling
interface CacheEntry {
  status: StellarNetworkStatus;
  timestamp: number;
}

class StellarNetworkService {
  private server: Horizon.Server;
  private networkId: StellarNetworkId;
  private horizonUrl: string;
  private networkPassphrase: string;
  private explorerBaseUrl: string;

  private cache: CacheEntry | null = null;
  private lastKnownGood: StellarNetworkStatus | null = null;
  private activeFetchPromise: Promise<StellarNetworkStatus> | null = null;

  // Short-lived TTL (6 seconds) to align with Stellar ledger close time (~5 seconds)
  // and prevent flooding Horizon while maintaining real-time accuracy.
  private readonly CACHE_TTL_MS = 6000;
  private readonly REQUEST_TIMEOUT_MS = 8000;

  constructor() {
    const config = getResolvedNetworkConfig();
    this.networkId = config.networkId;
    this.horizonUrl = config.horizonUrl;
    this.networkPassphrase = config.networkPassphrase;
    this.explorerBaseUrl = config.explorerBaseUrl;

    this.server = new Horizon.Server(this.horizonUrl);
  }

  /**
   * Returns current network configuration without exposing sensitive internal credentials.
   */
  public getConfig() {
    return {
      network: this.networkId,
      horizonUrl: this.horizonUrl,
      networkPassphrase: this.networkPassphrase,
      explorerBaseUrl: this.explorerBaseUrl,
    };
  }

  /**
   * Helper to race a promise against a timeout.
   */
  private async withTimeout<T>(promise: Promise<T>, timeoutMs: number, operationName: string): Promise<T> {
    let timer: NodeJS.Timeout;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        reject(new Error(`Horizon request timed out after ${timeoutMs}ms during ${operationName}`));
      }, timeoutMs);
    });

    try {
      const result = await Promise.race([promise, timeoutPromise]);
      clearTimeout(timer!);
      return result;
    } catch (err) {
      clearTimeout(timer!);
      throw err;
    }
  }

  /**
   * Fetches genuine Stellar network telemetry from Horizon.
   * Leverages caching, request deduplication, and graceful degradation.
   */
  public async getNetworkStatus(forceFresh = false): Promise<StellarNetworkStatus> {
    const now = Date.now();

    // 1. Serve fresh cache if within TTL and not forcing fresh
    if (!forceFresh && this.cache && (now - this.cache.timestamp < this.CACHE_TTL_MS)) {
      return {
        ...this.cache.status,
        isCached: true,
        isStale: false,
      };
    }

    // 2. Prevent duplicate concurrent requests (coalesce into single in-flight promise)
    if (this.activeFetchPromise) {
      return this.activeFetchPromise;
    }

    this.activeFetchPromise = this.performFetch()
      .finally(() => {
        this.activeFetchPromise = null;
      });

    return this.activeFetchPromise;
  }

  private async performFetch(): Promise<StellarNetworkStatus> {
    const startTime = Date.now();
    try {
      // Query Horizon root, latest 2 ledgers, and fee stats concurrently with timeout
      const [rootRes, ledgersRes, feeStatsRes] = await this.withTimeout(
        Promise.all([
          this.server.root(),
          this.server.ledgers().order('desc').limit(2).call(),
          this.server.feeStats(),
        ]),
        this.REQUEST_TIMEOUT_MS,
        'Stellar network metrics query'
      );

      const latencyMs = Date.now() - startTime;
      const latestLedgerRecord = ledgersRes.records?.[0];
      const previousLedgerRecord = ledgersRes.records?.[1];

      if (!latestLedgerRecord) {
        throw new Error('No ledger records returned by Stellar Horizon');
      }

      // Calculate exact ledger close time between N and N-1
      let closeTimeSeconds = 5.0;
      if (previousLedgerRecord && latestLedgerRecord.closed_at && previousLedgerRecord.closed_at) {
        const diff = (new Date(latestLedgerRecord.closed_at).getTime() - new Date(previousLedgerRecord.closed_at).getTime()) / 1000;
        if (diff > 0 && diff < 60) {
          closeTimeSeconds = Number(diff.toFixed(1));
        }
      }

      const latestLedger: StellarLatestLedger = {
        sequence: latestLedgerRecord.sequence,
        closedAt: latestLedgerRecord.closed_at,
        closeTimeSeconds,
        baseFee: latestLedgerRecord.base_fee_in_stroops ?? 100,
        txCount: latestLedgerRecord.successful_transaction_count ?? 0,
        operationCount: latestLedgerRecord.operation_count ?? 0,
      };

      const feeStats: StellarFeeStats = {
        lastLedgerBaseFee: Number(feeStatsRes.last_ledger_base_fee ?? 100),
        minAcceptedFee: Number(feeStatsRes.fee_charged?.min ?? 100),
        modeAcceptedFee: Number(feeStatsRes.fee_charged?.mode ?? 100),
        p50AcceptedFee: Number(feeStatsRes.fee_charged?.p50 ?? 100),
        capacityUsage: Number(parseFloat(feeStatsRes.ledger_capacity_usage ?? '0').toFixed(4)),
      };

      const status: StellarNetworkStatus = {
        network: this.networkId,
        networkPassphrase: rootRes.network_passphrase || this.networkPassphrase,
        horizonUrl: this.horizonUrl,
        explorerBaseUrl: this.explorerBaseUrl,
        status: 'healthy',
        latestLedger,
        feeStats,
        protocolVersion: rootRes.current_protocol_version ?? 28,
        coreVersion: rootRes.core_version,
        horizonVersion: rootRes.horizon_version,
        fetchedAt: new Date().toISOString(),
        isCached: false,
        isStale: false,
        latencyMs,
        error: null,
      };

      // Update in-memory cache and last-known-good
      this.cache = {
        status,
        timestamp: Date.now(),
      };
      this.lastKnownGood = status;

      return status;
    } catch (err: any) {
      const errorMessage = err?.message || 'Failed to reach Stellar Horizon';
      console.warn(`[StellarNetworkService] Horizon query failed: ${errorMessage}`);

      // Graceful fallback to cached last-known-good (marked as degraded & stale)
      if (this.lastKnownGood && this.lastKnownGood.latestLedger) {
        const degradedStatus: StellarNetworkStatus = {
          ...this.lastKnownGood,
          status: 'degraded',
          isCached: true,
          isStale: true,
          latencyMs: Date.now() - startTime,
          error: `Network degraded: ${errorMessage}. Displaying last-known ledger.`,
        };
        return degradedStatus;
      }

      // If no last-known-good exists, return unavailable without any fake values
      const unavailableStatus: StellarNetworkStatus = {
        network: this.networkId,
        networkPassphrase: this.networkPassphrase,
        horizonUrl: this.horizonUrl,
        explorerBaseUrl: this.explorerBaseUrl,
        status: 'unavailable',
        latestLedger: null,
        feeStats: null,
        protocolVersion: null,
        fetchedAt: new Date().toISOString(),
        isCached: false,
        isStale: false,
        latencyMs: Date.now() - startTime,
        error: `Stellar Horizon unavailable: ${errorMessage}`,
      };
      return unavailableStatus;
    }
  }

  /**
   * Loads account status from Horizon to verify whether an account exists and is funded.
   */
  public async getAccountFundingStatus(address: string): Promise<{
    isFunded: boolean;
    balanceXlm?: string;
    subentryCount?: number;
    sequence?: string;
    address: string;
    network: StellarNetworkId;
  }> {
    try {
      const account = await this.withTimeout(
        this.server.loadAccount(address),
        this.REQUEST_TIMEOUT_MS,
        `loadAccount(${address})`
      );

      // Find native XLM balance
      const nativeBal = account.balances.find(b => b.asset_type === 'native');
      const balanceXlm = nativeBal ? nativeBal.balance : '0';

      return {
        isFunded: true,
        balanceXlm,
        subentryCount: account.subentry_count,
        sequence: account.sequenceNumber(),
        address,
        network: this.networkId,
      };
    } catch (err: any) {
      if (err?.response?.status === 404) {
        return {
          isFunded: false,
          address,
          network: this.networkId,
        };
      }
      throw err;
    }
  }

  /**
   * Constructs an unsigned safe Testnet proof transaction.
   * Uses manageData operation to record an audit checkpoint without transferring funds.
   */
  public async prepareTestnetProofTransaction(sourceAddress: string): Promise<{
    unsignedXdr: string;
    network: StellarNetworkId;
    networkPassphrase: string;
    sourceAccount: string;
    sequence: string;
    baseFee: number;
    operationType: string;
    memo: string;
  }> {
    // 1. Safety check: ensure network is testnet
    if (this.networkId !== 'testnet') {
      throw new Error('Testnet proof transactions are strictly forbidden on Public Mainnet.');
    }

    // 2. Verify account exists on Horizon
    const funding = await this.getAccountFundingStatus(sourceAddress);
    if (!funding.isFunded) {
      throw new Error(
        `Account ${sourceAddress} is not funded on Stellar Testnet. Please fund your Testnet account using Friendbot before submitting transactions.`
      );
    }

    // 3. Load live sequence number
    const account = await this.server.loadAccount(sourceAddress);

    // 4. Fetch live fee stats to set fair base fee
    let fee = '100';
    try {
      const feeStats = await this.server.feeStats();
      if (feeStats && feeStats.last_ledger_base_fee) {
        fee = String(Math.max(100, Number(feeStats.last_ledger_base_fee)));
      }
    } catch {
      fee = '100';
    }

    // 5. Build transaction with a safe manageData audit proof (Harmless, does not move funds)
    const { TransactionBuilder, Operation, Memo } = await import('@stellar/stellar-sdk');

    const tx = new TransactionBuilder(account, {
      fee,
      networkPassphrase: this.networkPassphrase,
    })
      .addOperation(
        Operation.manageData({
          name: 'CB_PROOF',
          value: Buffer.from(`CB_AUDIT_${Date.now()}`),
        })
      )
      .addMemo(Memo.text('CreditBridge Proof'))
      .setTimeout(180) // 3 minute validity window
      .build();

    return {
      unsignedXdr: tx.toXDR(),
      network: this.networkId,
      networkPassphrase: this.networkPassphrase,
      sourceAccount: sourceAddress,
      sequence: account.sequenceNumber(),
      baseFee: Number(fee),
      operationType: 'manageData',
      memo: 'CreditBridge Proof',
    };
  }

  /**
   * Submits a user-signed transaction envelope to Stellar Horizon.
   */
  public async submitTransaction(signedEnvelopeXdr: string): Promise<{
    successful: boolean;
    hash: string;
    ledger?: number;
    network: StellarNetworkId;
    createdAt: string;
    explorerUrl: string;
    envelopeXdr: string;
    resultXdr?: string;
  }> {
    const { TransactionBuilder } = await import('@stellar/stellar-sdk');
    
    // Parse transaction envelope from XDR to extract hash and metadata
    const tx = TransactionBuilder.fromXDR(signedEnvelopeXdr, this.networkPassphrase);
    const txHash = Buffer.from(tx.hash()).toString('hex');

    // Submit to Horizon
    const submissionResult = await this.withTimeout(
      this.server.submitTransaction(tx),
      15000,
      `submitTransaction(${txHash})`
    );

    const explorerUrl = `${this.explorerBaseUrl}/tx/${submissionResult.hash}`;

    return {
      successful: Boolean(submissionResult.successful),
      hash: submissionResult.hash,
      ledger: submissionResult.ledger,
      network: this.networkId,
      createdAt: new Date().toISOString(),
      explorerUrl,
      envelopeXdr: submissionResult.envelope_xdr,
      resultXdr: submissionResult.result_xdr,
    };
  }
}

// Export singleton instance
export const stellarNetworkService = new StellarNetworkService();
