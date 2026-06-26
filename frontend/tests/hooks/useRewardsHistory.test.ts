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

import { useRewardsHistory } from '@/hooks/ico/useRewardsHistory';

// ── Wrapper ────────────────────────────────────────────────────────────────

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return React.createElement(QueryClientProvider, { client: qc }, children);
}

// ── Constants ──────────────────────────────────────────────────────────────

const ACCOUNT_HASH_WITH_PREFIX = 'account-hash-cafebabe5678';
const ACCOUNT_HEX = 'cafebabe5678';

const mockRewardsData = {
  rewards: [
    { date: '2025-01-01', amount: '500' },
    { date: '2025-02-01', amount: '600' },
  ],
};

// ── Tests ──────────────────────────────────────────────────────────────────

describe('useRewardsHistory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does NOT fetch when accountHash is null', () => {
    const { result } = renderHook(
      () => useRewardsHistory(null),
      { wrapper },
    );
    expect(mockGet).not.toHaveBeenCalled();
    expect(result.current.isLoading).toBe(false);
  });

  it('does NOT fetch when accountHash is undefined', () => {
    renderHook(() => useRewardsHistory(undefined), { wrapper });
    expect(mockGet).not.toHaveBeenCalled();
  });

  it('strips account-hash- prefix and includes period in URL', async () => {
    mockGet.mockResolvedValue(mockRewardsData);
    const { result } = renderHook(
      () => useRewardsHistory(ACCOUNT_HASH_WITH_PREFIX, 30),
      { wrapper },
    );
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockGet).toHaveBeenCalledWith(
      `/api/v1/staking/${ACCOUNT_HEX}/rewards-history?period=30`,
    );
  });

  it('uses default period of 90 when not specified', async () => {
    mockGet.mockResolvedValue(mockRewardsData);
    const { result } = renderHook(
      () => useRewardsHistory(ACCOUNT_HEX),
      { wrapper },
    );
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockGet).toHaveBeenCalledWith(
      `/api/v1/staking/${ACCOUNT_HEX}/rewards-history?period=90`,
    );
  });

  it('returns data on success', async () => {
    mockGet.mockResolvedValue(mockRewardsData);
    const { result } = renderHook(
      () => useRewardsHistory(ACCOUNT_HEX),
      { wrapper },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockRewardsData);
  });

  it('returns error on failure', async () => {
    const boom = new Error('Staking service error');
    mockGet.mockRejectedValue(boom);
    const { result } = renderHook(
      () => useRewardsHistory(ACCOUNT_HEX),
      { wrapper },
    );
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(Error);
    expect((result.current.error as Error).message).toBe('Staking service error');
  });
});
