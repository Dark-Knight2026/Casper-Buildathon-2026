import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// ── Mocks ──────────────────────────────────────────────────────────────────

const mockGet = vi.fn();
vi.mock('@/lib/api-client', () => ({
  backendClient: { get: (...args: unknown[]) => mockGet(...args) },
}));

vi.mock('@/lib/blockchain/accountUtils', () => ({
  stripAccountHashPrefix: (addr: string) =>
    addr.startsWith('account-hash-') ? addr.slice('account-hash-'.length) : addr,
}));

import { useStakingEarnings } from '@/hooks/ico/useStakingEarnings';

// ── Wrapper ────────────────────────────────────────────────────────────────

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return React.createElement(QueryClientProvider, { client: qc }, children);
}

// ── Constants ──────────────────────────────────────────────────────────────

const ACCOUNT_HASH_WITH_PREFIX = 'account-hash-feed1234abcd';
const ACCOUNT_HEX = 'feed1234abcd';

const mockEarningsData = {
  total_earned: '12500',
  period: '6m',
  breakdown: [],
};

// ── Tests ──────────────────────────────────────────────────────────────────

describe('useStakingEarnings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does NOT fetch when accountHash is null', () => {
    const { result } = renderHook(
      () => useStakingEarnings(null),
      { wrapper },
    );
    expect(mockGet).not.toHaveBeenCalled();
    expect(result.current.isLoading).toBe(false);
  });

  it('does NOT fetch when accountHash is undefined', () => {
    renderHook(() => useStakingEarnings(undefined), { wrapper });
    expect(mockGet).not.toHaveBeenCalled();
  });

  it('strips account-hash- prefix from address in URL', async () => {
    mockGet.mockResolvedValue(mockEarningsData);
    const { result } = renderHook(
      () => useStakingEarnings(ACCOUNT_HASH_WITH_PREFIX, '6m'),
      { wrapper },
    );
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockGet).toHaveBeenCalledWith(
      expect.stringContaining(`/api/v1/staking/${ACCOUNT_HEX}/earnings`),
    );
    expect(mockGet).not.toHaveBeenCalledWith(
      expect.stringContaining('account-hash-'),
    );
  });

  it('uses default period of 6m when not specified', async () => {
    mockGet.mockResolvedValue(mockEarningsData);
    const { result } = renderHook(
      () => useStakingEarnings(ACCOUNT_HEX),
      { wrapper },
    );
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockGet).toHaveBeenCalledWith(
      `/api/v1/staking/${ACCOUNT_HEX}/earnings?period=6m`,
    );
  });

  it('uses custom period when provided', async () => {
    mockGet.mockResolvedValue(mockEarningsData);
    const { result } = renderHook(
      () => useStakingEarnings(ACCOUNT_HEX, '3m'),
      { wrapper },
    );
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockGet).toHaveBeenCalledWith(
      `/api/v1/staking/${ACCOUNT_HEX}/earnings?period=3m`,
    );
  });

  it('returns data on success', async () => {
    mockGet.mockResolvedValue(mockEarningsData);
    const { result } = renderHook(
      () => useStakingEarnings(ACCOUNT_HEX),
      { wrapper },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockEarningsData);
  });

  it('returns error on failure', async () => {
    const boom = new Error('Earnings fetch failed');
    mockGet.mockRejectedValue(boom);
    const { result } = renderHook(
      () => useStakingEarnings(ACCOUNT_HEX),
      { wrapper },
    );
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(Error);
    expect((result.current.error as Error).message).toBe('Earnings fetch failed');
  });
});
