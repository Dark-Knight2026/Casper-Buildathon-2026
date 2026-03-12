import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCSPRPrice } from '@/hooks/useCSPRPrice';

vi.mock('@/lib/blockchain/csprCloudService', () => ({
  csprCloudService: {
    getCSPRRates: vi.fn(),
  },
}));

vi.mock('@/lib/logger', () => ({
  default: { error: vi.fn() },
}));

import { csprCloudService } from '@/lib/blockchain/csprCloudService';

const STALE_THRESHOLD_MS = 5 * 60 * 1000;

const mockRates = {
  cspr_usd: 0.042,
  cspr_eur: 0.039,
  cspr_gbp: 0.033,
};

/** Flush all pending microtasks / resolved-promise chains. */
const flush = () => act(async () => {});

describe('useCSPRPrice', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('(a) starts in loading state before the first fetch resolves', () => {
    // Never-resolving promise keeps the hook in loading state
    vi.mocked(csprCloudService.getCSPRRates).mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useCSPRPrice());

    expect(result.current.loading).toBe(true);
    expect(result.current.priceUSD).toBe(0);
    expect(result.current.lastUpdated).toBeNull();
  });

  it('(b) updates prices after a successful fetch', async () => {
    vi.mocked(csprCloudService.getCSPRRates).mockResolvedValue(mockRates);

    const { result } = renderHook(() => useCSPRPrice());
    await flush();

    expect(result.current.loading).toBe(false);
    expect(result.current.priceUSD).toBe(0.042);
    expect(result.current.priceEUR).toBe(0.039);
    expect(result.current.priceGBP).toBe(0.033);
    expect(result.current.error).toBeNull();
    expect(result.current.lastUpdated).toBeInstanceOf(Date);
  });

  it('(c) isStale becomes true after STALE_THRESHOLD_MS elapses', async () => {
    vi.mocked(csprCloudService.getCSPRRates).mockResolvedValue(mockRates);

    const { result, rerender } = renderHook(() => useCSPRPrice());
    await flush();

    expect(result.current.isStale).toBe(false);

    // Move system clock forward past threshold, then rerender so the derived
    // `isStale` value (computed inline on each render) is recalculated.
    await act(async () => {
      vi.setSystemTime(Date.now() + STALE_THRESHOLD_MS + 1);
      rerender();
    });

    expect(result.current.isStale).toBe(true);
  });

  it('(d) isStale resets to false after a successful refresh', async () => {
    vi.mocked(csprCloudService.getCSPRRates).mockResolvedValue(mockRates);

    const { result, rerender } = renderHook(() => useCSPRPrice());
    await flush();

    // Make data stale
    await act(async () => {
      vi.setSystemTime(Date.now() + STALE_THRESHOLD_MS + 1);
      rerender();
    });
    expect(result.current.isStale).toBe(true);

    // Manually trigger a refresh
    await act(async () => {
      await result.current.fetchPrice();
    });

    expect(result.current.isStale).toBe(false);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });
});
