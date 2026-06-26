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

import { useStakingPortfolio } from '@/hooks/ico/useStakingPortfolio';

// ── Wrapper ────────────────────────────────────────────────────────────────

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return React.createElement(QueryClientProvider, { client: qc }, children);
}

// ── Constants ──────────────────────────────────────────────────────────────

const ACCOUNT_HASH_WITH_PREFIX = 'account-hash-112233445566';
const ACCOUNT_HEX = '112233445566';

const mockPortfolioData = {
  positions: [
    { pool: 'BIG-CSPR', staked: '10000', share: '0.05' },
  ],
  total_value_usd: '8500',
};

// ── Tests ──────────────────────────────────────────────────────────────────

describe('useStakingPortfolio', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does NOT fetch when accountHash is null', () => {
    const { result } = renderHook(
      () => useStakingPortfolio(null),
      { wrapper },
    );
    expect(mockGet).not.toHaveBeenCalled();
    expect(result.current.isLoading).toBe(false);
  });

  it('does NOT fetch when accountHash is undefined', () => {
    renderHook(() => useStakingPortfolio(undefined), { wrapper });
    expect(mockGet).not.toHaveBeenCalled();
  });

  it('strips account-hash- prefix in URL', async () => {
    mockGet.mockResolvedValue(mockPortfolioData);
    const { result } = renderHook(
      () => useStakingPortfolio(ACCOUNT_HASH_WITH_PREFIX),
      { wrapper },
    );
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockGet).toHaveBeenCalledWith(`/api/v1/staking/${ACCOUNT_HEX}/portfolio`);
    expect(mockGet).not.toHaveBeenCalledWith(
      expect.stringContaining('account-hash-'),
    );
  });

  it('calls correct endpoint', async () => {
    mockGet.mockResolvedValue(mockPortfolioData);
    const { result } = renderHook(
      () => useStakingPortfolio(ACCOUNT_HEX),
      { wrapper },
    );
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockGet).toHaveBeenCalledWith(`/api/v1/staking/${ACCOUNT_HEX}/portfolio`);
  });

  it('returns data on success', async () => {
    mockGet.mockResolvedValue(mockPortfolioData);
    const { result } = renderHook(
      () => useStakingPortfolio(ACCOUNT_HEX),
      { wrapper },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockPortfolioData);
  });

  it('returns error on failure', async () => {
    const boom = new Error('Portfolio unavailable');
    mockGet.mockRejectedValue(boom);
    const { result } = renderHook(
      () => useStakingPortfolio(ACCOUNT_HEX),
      { wrapper },
    );
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(Error);
    expect((result.current.error as Error).message).toBe('Portfolio unavailable');
  });
});
