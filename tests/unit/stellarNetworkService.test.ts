import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { stellarNetworkService } from '../../src/services/stellarNetworkService';
import { FIXTURE_HORIZON_ROOT, FIXTURE_HORIZON_LEDGERS, FIXTURE_HORIZON_FEE_STATS, FIXTURE_WALLETS } from '../fixtures/stellarFixtures';
import { Horizon } from '@stellar/stellar-sdk';

describe('StellarNetworkService (Horizon Telemetry & Offline Degradation)', () => {

  beforeEach(() => {
    vi.restoreAllMocks();
    // Clear in-memory cache between tests
    (stellarNetworkService as any).cache = null;
    (stellarNetworkService as any).lastKnownGood = null;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('queries genuine Horizon endpoints and structures network metrics correctly', async () => {
    // Mock Horizon Server methods
    const mockRoot = vi.spyOn((stellarNetworkService as any).server, 'root')
      .mockResolvedValue(FIXTURE_HORIZON_ROOT as any);

    const mockLedgers = vi.spyOn((stellarNetworkService as any).server, 'ledgers')
      .mockReturnValue({
        order: () => ({
          limit: () => ({
            call: vi.fn().mockResolvedValue(FIXTURE_HORIZON_LEDGERS)
          })
        })
      } as any);

    const mockFeeStats = vi.spyOn((stellarNetworkService as any).server, 'feeStats')
      .mockResolvedValue(FIXTURE_HORIZON_FEE_STATS as any);

    const status = await stellarNetworkService.getNetworkStatus(true);

    expect(status.status).toBe('healthy');
    expect(status.network).toBe('testnet');
    expect(status.latestLedger?.sequence).toBe(1234567);
    expect(status.latestLedger?.closeTimeSeconds).toBe(5.0);
    expect(status.feeStats?.minAcceptedFee).toBe(100);
    expect(status.isStale).toBe(false);
    expect(status.isCached).toBe(false);

    expect(mockRoot).toHaveBeenCalledTimes(1);
  });

  it('serves cached status within TTL to avoid flooding Horizon', async () => {
    vi.spyOn((stellarNetworkService as any).server, 'root')
      .mockResolvedValue(FIXTURE_HORIZON_ROOT as any);

    vi.spyOn((stellarNetworkService as any).server, 'ledgers')
      .mockReturnValue({
        order: () => ({
          limit: () => ({
            call: vi.fn().mockResolvedValue(FIXTURE_HORIZON_LEDGERS)
          })
        })
      } as any);

    vi.spyOn((stellarNetworkService as any).server, 'feeStats')
      .mockResolvedValue(FIXTURE_HORIZON_FEE_STATS as any);

    // Initial fetch
    const status1 = await stellarNetworkService.getNetworkStatus(false);
    expect(status1.isCached).toBe(false);

    // Second fetch without forceFresh within TTL
    const status2 = await stellarNetworkService.getNetworkStatus(false);
    expect(status2.isCached).toBe(true);
    expect(status2.latestLedger?.sequence).toBe(status1.latestLedger?.sequence);
  });

  it('gracefully degrades to last known good telemetry if Horizon becomes temporarily unreachable', async () => {
    // 1. Initial successful query
    vi.spyOn((stellarNetworkService as any).server, 'root')
      .mockResolvedValue(FIXTURE_HORIZON_ROOT as any);

    vi.spyOn((stellarNetworkService as any).server, 'ledgers')
      .mockReturnValue({
        order: () => ({
          limit: () => ({
            call: vi.fn().mockResolvedValue(FIXTURE_HORIZON_LEDGERS)
          })
        })
      } as any);

    vi.spyOn((stellarNetworkService as any).server, 'feeStats')
      .mockResolvedValue(FIXTURE_HORIZON_FEE_STATS as any);

    await stellarNetworkService.getNetworkStatus(true);

    // 2. Horizon starts failing
    vi.spyOn((stellarNetworkService as any).server, 'root')
      .mockRejectedValue(new Error('Horizon 503 Service Unavailable'));

    const degradedStatus = await stellarNetworkService.getNetworkStatus(true);

    expect(degradedStatus.status).toBe('degraded');
    expect(degradedStatus.isStale).toBe(true);
    expect(degradedStatus.latestLedger?.sequence).toBe(1234567);
    expect(degradedStatus.error).toContain('Network degraded');
  });

  it('marks network as unavailable and returns null metrics when no cache exists and Horizon fails', async () => {
    vi.spyOn((stellarNetworkService as any).server, 'root')
      .mockRejectedValue(new Error('Connection Refused'));

    const status = await stellarNetworkService.getNetworkStatus(true);

    expect(status.status).toBe('unavailable');
    expect(status.latestLedger).toBeNull();
    expect(status.feeStats).toBeNull();
    expect(status.error).toContain('Stellar Horizon unavailable: Connection Refused');
  });

});
