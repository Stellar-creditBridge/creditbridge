import { useState, useEffect, useRef, useCallback } from 'react';
import { StellarNetworkStatus } from '../types';
import { fetchStellarNetworkStatus } from '../services/stellarClient';

interface UseStellarNetworkOptions {
  pollIntervalMs?: number;
  enabled?: boolean;
}

export function useStellarNetwork(options: UseStellarNetworkOptions = {}) {
  const { pollIntervalMs = 12000, enabled = true } = options;

  const [networkStatus, setNetworkStatus] = useState<StellarNetworkStatus | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const isMountedRef = useRef<boolean>(true);
  const inFlightRef = useRef<boolean>(false);
  const intervalIdRef = useRef<NodeJS.Timeout | null>(null);

  const loadStatus = useCallback(async (forceFresh = false, isInitial = false) => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;

    if (isInitial) {
      setIsLoading(true);
    } else {
      setIsRefreshing(true);
    }

    try {
      const data = await fetchStellarNetworkStatus(forceFresh);
      if (isMountedRef.current) {
        setNetworkStatus(data);
        if (data.status === 'unavailable' && data.error) {
          setError(data.error);
        } else {
          setError(null);
        }
      }
    } catch (err: any) {
      if (isMountedRef.current) {
        const msg = err?.message || 'Failed to query Stellar network telemetry';
        setError(msg);
      }
    } finally {
      inFlightRef.current = false;
      if (isMountedRef.current) {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    }
  }, []);

  // Initial load & Polling loop setup
  useEffect(() => {
    isMountedRef.current = true;

    if (!enabled) {
      setIsLoading(false);
      return;
    }

    // 1. Fetch immediately on mount
    loadStatus(false, true);

    // 2. Set up controlled polling interval
    const startPolling = () => {
      if (intervalIdRef.current) {
        clearInterval(intervalIdRef.current);
      }
      intervalIdRef.current = setInterval(() => {
        // Only poll if tab is visible to avoid unnecessary API traffic
        if (typeof document !== 'undefined' && document.hidden) {
          return;
        }
        loadStatus(false, false);
      }, pollIntervalMs);
    };

    startPolling();

    // 3. Tab visibility change listener: resume immediately when user returns to tab
    const handleVisibilityChange = () => {
      if (typeof document !== 'undefined' && !document.hidden) {
        loadStatus(false, false);
      }
    };

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilityChange);
    }

    // 4. Cleanup on unmount: stop timer and listeners
    return () => {
      isMountedRef.current = false;
      if (intervalIdRef.current) {
        clearInterval(intervalIdRef.current);
        intervalIdRef.current = null;
      }
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      }
    };
  }, [enabled, pollIntervalMs, loadStatus]);

  const refresh = useCallback((forceFresh = true) => {
    return loadStatus(forceFresh, false);
  }, [loadStatus]);

  return {
    networkStatus,
    isLoading,
    isRefreshing,
    error,
    refresh,
  };
}
