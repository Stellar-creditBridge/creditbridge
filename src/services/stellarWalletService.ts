import { 
  isConnected, 
  requestAccess, 
  getAddress, 
  getNetwork, 
  signTransaction as freighterSignTx 
} from '@stellar/freighter-api';
import { StellarWalletProvider, WalletProviderType } from '../types';
import { isValidStellarPublicKey } from '../utils/stellar';

/**
 * Standardized Error types for Wallet operations
 */
export class WalletError extends Error {
  constructor(
    message: string, 
    public readonly code: 
      | 'NOT_INSTALLED' 
      | 'USER_REJECTED' 
      | 'INVALID_PUBLIC_KEY' 
      | 'NETWORK_MISMATCH' 
      | 'SIGNING_FAILED' 
      | 'PROVIDER_ERROR'
  ) {
    super(message);
    this.name = 'WalletError';
  }
}

/**
 * Freighter Wallet Adapter
 * Interacts directly with the official Freighter browser extension API.
 */
class FreighterAdapter implements StellarWalletProvider {
  readonly id: WalletProviderType = 'freighter';
  readonly name = 'Freighter';
  readonly description = 'Official Stellar Development Foundation Browser Extension';

  async isAvailable(): Promise<boolean> {
    try {
      if (typeof window === 'undefined') return false;
      const res = await isConnected();
      return Boolean(res && res.isConnected);
    } catch {
      return false;
    }
  }

  async connect(): Promise<{ address: string; network?: string }> {
    const available = await this.isAvailable();
    if (!available) {
      throw new WalletError(
        'Freighter extension not detected. Please install the Freighter browser extension from freighter.app or enable it for this site.',
        'NOT_INSTALLED'
      );
    }

    try {
      // Prompt user in Freighter popup to grant public key access
      const accessRes = await requestAccess();
      if (accessRes.error) {
        if (typeof accessRes.error === 'string' && accessRes.error.toLowerCase().includes('reject')) {
          throw new WalletError('Connection request rejected in Freighter.', 'USER_REJECTED');
        }
        throw new WalletError(accessRes.error, 'PROVIDER_ERROR');
      }

      let address = accessRes.address;
      if (!address) {
        const addrRes = await getAddress();
        if (addrRes.error) {
          throw new WalletError(addrRes.error, 'PROVIDER_ERROR');
        }
        address = addrRes.address;
      }

      if (!address || !isValidStellarPublicKey(address)) {
        throw new WalletError(
          `Freighter returned an invalid Stellar public key: ${address || 'empty'}. Must be a valid 56-character Ed25519 G-address.`,
          'INVALID_PUBLIC_KEY'
        );
      }

      // Check reported network if available
      let network: string | undefined;
      try {
        const netRes = await getNetwork();
        if (netRes && !netRes.error) {
          network = netRes.network;
        }
      } catch {
        // Non-critical network detection failure
      }

      return { address: address.trim(), network };
    } catch (err: any) {
      if (err instanceof WalletError) throw err;
      const msg = err?.message || String(err);
      if (msg.toLowerCase().includes('reject') || msg.toLowerCase().includes('cancel')) {
        throw new WalletError('Connection request was declined by the user in Freighter.', 'USER_REJECTED');
      }
      throw new WalletError(`Failed to connect to Freighter: ${msg}`, 'PROVIDER_ERROR');
    }
  }

  async disconnect(): Promise<void> {
    // Browser extensions maintain authorization state internally, client simply forgets session
    return Promise.resolve();
  }

  async signTransaction(xdr: string, opts?: { networkPassphrase?: string; address?: string }): Promise<string> {
    const available = await this.isAvailable();
    if (!available) {
      throw new WalletError('Freighter extension not found.', 'NOT_INSTALLED');
    }

    try {
      const signRes = await freighterSignTx(xdr, {
        networkPassphrase: opts?.networkPassphrase,
        address: opts?.address
      });

      if (signRes.error) {
        const errStr = typeof signRes.error === 'string' ? signRes.error : JSON.stringify(signRes.error);
        if (errStr.toLowerCase().includes('reject') || errStr.toLowerCase().includes('cancel') || errStr.toLowerCase().includes('declined')) {
          throw new WalletError('Transaction signing was rejected by the user in Freighter.', 'USER_REJECTED');
        }
        throw new WalletError(`Freighter signing error: ${errStr}`, 'SIGNING_FAILED');
      }

      if (!signRes.signedTxXdr) {
        throw new WalletError('Freighter completed without returning signed transaction XDR envelope.', 'SIGNING_FAILED');
      }

      return signRes.signedTxXdr;
    } catch (err: any) {
      if (err instanceof WalletError) throw err;
      const msg = err?.message || String(err);
      if (msg.toLowerCase().includes('reject') || msg.toLowerCase().includes('cancel') || msg.toLowerCase().includes('declined')) {
        throw new WalletError('Transaction signature was cancelled by user.', 'USER_REJECTED');
      }
      throw new WalletError(`Failed to sign transaction with Freighter: ${msg}`, 'SIGNING_FAILED');
    }
  }

  async getNetwork(): Promise<string> {
    try {
      const res = await getNetwork();
      if (res && !res.error && res.network) {
        return res.network;
      }
      return 'UNKNOWN';
    } catch {
      return 'UNKNOWN';
    }
  }
}

/**
 * Unsupported / Stub Wallet Provider placeholder
 * Accurately reports that the integration is not yet connected rather than simulating a fake handshake.
 */
class UnsupportedProvider implements StellarWalletProvider {
  constructor(
    public readonly id: WalletProviderType,
    public readonly name: string,
    public readonly description: string
  ) {}

  async isAvailable(): Promise<boolean> {
    return false;
  }

  async connect(): Promise<{ address: string; network?: string }> {
    throw new WalletError(
      `${this.name} integration is currently in protocol onboarding and not yet active. Please connect via Freighter.`,
      'NOT_INSTALLED'
    );
  }

  async disconnect(): Promise<void> {
    return Promise.resolve();
  }

  async signTransaction(): Promise<string> {
    throw new WalletError(`${this.name} does not support transaction signing in this release.`, 'SIGNING_FAILED');
  }
}

/**
 * Centralized Wallet Service Registry
 */
class StellarWalletService {
  private providers: Map<WalletProviderType, StellarWalletProvider> = new Map();

  constructor() {
    this.registerProvider(new FreighterAdapter());
    this.registerProvider(new UnsupportedProvider('albedo', 'Albedo', 'Web-based Stellar signing link (Coming in next protocol update)'));
    this.registerProvider(new UnsupportedProvider('rabe', 'Rabet', 'Browser & Mobile Wallet (Coming in next protocol update)'));
  }

  registerProvider(provider: StellarWalletProvider) {
    this.providers.set(provider.id, provider);
  }

  getProvider(id: WalletProviderType): StellarWalletProvider | undefined {
    return this.providers.get(id);
  }

  getAvailableProviders(): StellarWalletProvider[] {
    return Array.from(this.providers.values());
  }

  /**
   * Probes whether Freighter is currently installed in the user's browser
   */
  async isFreighterInstalled(): Promise<boolean> {
    const freighter = this.providers.get('freighter');
    if (!freighter) return false;
    return freighter.isAvailable();
  }
}

export const stellarWalletService = new StellarWalletService();
