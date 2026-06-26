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

import { useStakingInfo } from '@/hooks/ico/useStakingInfo';

// ── Wrapper ────────────────────────────────────────────────────────────────

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return React.createElement(QueryClientProvider, { client: qc }, children);
}

// ── Constants ──────────────────────────────────────────────────────────────

const ACCOUNT_HASH_WITH_PREFIX = 'account-hash-aabbccdd1122';
const ACCOUNT_HEX = 'aabbccdd1122';

const mockStakingInfo = {
  staked_amount: '50000',
  rewards_earned: '1200',
  unlock_date: '2026-01-01',
};

// ── Tests ──────────────────────────────────────────────────────────────────

describe('useStakingInfo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does NOT fetch when accountHash is null', () => {
    const { result } = renderHook(
      () => useStakingInfo(null),
      { wrapper },
    );
    expect(mockGet).not.toHaveBeenCalled();
    expect(result.current.isLoading).toBe(false);
  });

  it('does NOT fetch when accountHash is undefined', () => {
    renderHook(() => useStakingInfo(undefined), { wrapper });
    expect(mockGet).not.toHaveBeenCalled();
  });

  it('strips account-hash- prefix in URL', async () => {
    mockGet.mockResolvedValue(mockStakingInfo);
    const { result } = renderHook(
      () => useStakingInfo(ACCOUNT_HASH_WITH_PREFIX),
      { wrapper },
    );
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockGet).toHaveBeenCalledWith(`/api/v1/staking/${ACCOUNT_HEX}`);
  });

  it('returns data on success', async () => {
    mockGet.mockResolvedValue(mockStakingInfo);
    const { result } = renderHook(
      () => useStakingInfo(ACCOUNT_HEX),
      { wrapper },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockStakingInfo);
  });

  it('returns null data when API returns null', async () => {
    mockGet.mockResolvedValue(null);
    const { result } = renderHook(
      () => useStakingInfo(ACCOUNT_HEX),
      { wrapper },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeNull();
  });

  it('returns error on failure', async () => {
    const boom = new Error('Staking info unavailable');
    mockGet.mockRejectedValue(boom);
    const { result } = renderHook(
      () => useStakingInfo(ACCOUNT_HEX),
      { wrapper },
    );
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(Error);
    expect((result.current.error as Error).message).toBe('Staking info unavailable');
  });
});
