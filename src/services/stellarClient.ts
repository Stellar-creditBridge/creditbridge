import { StellarNetworkStatus } from '../types';

/**
 * Client-side service for fetching live Stellar network telemetry from CreditBridge backend.
 */
export async function fetchStellarNetworkStatus(forceFresh = false): Promise<StellarNetworkStatus> {
  const url = forceFresh ? '/api/stellar/network?fresh=true' : '/api/stellar/network';
  const res = await fetch(url, {
    headers: {
      'Accept': 'application/json',
    },
    cache: 'no-cache',
  });

  if (!res.ok && res.status !== 503) {
    throw new Error(`Stellar network service returned HTTP ${res.status}`);
  }

  const data: StellarNetworkStatus = await res.json();
  return data;
}
