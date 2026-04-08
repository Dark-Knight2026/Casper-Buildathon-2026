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
  stripAccountHashPrefix: (addr: string) => addr.replace(/^account-hash-/, ''),
}));

import { useUnbondingStatus } from '@/hooks/ico/useUnbondingStatus';

// ── Wrapper ────────────────────────────────────────────────────────────────

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return React.createElement(QueryClientProvider, { client: qc }, children);
}

// ── Constants ──────────────────────────────────────────────────────────────

const ACCOUNT_HASH = 'account-hash-aabbccddeeff';
const HEX = 'aabbccddeeff';

const mockUnbondingData = {
  history: [
    { amount: 1000, eventType: 'unbond', timestamp: '2025-01-01T00:00:00Z', transactionHash: 'tx-abc' },
  ],
  isWithdrawable: false,
  timeRemainingMs: 172_800_000, // 48h
  unbondingAmount: 5000,
  unbondingEndsAt: Date.now() + 172_800_000,
};

describe('useUnbondingStatus', () => {
  beforeEach(() => vi.clearAllMocks());

  // ── Disabled when accountHash is absent ───────────────────────────────

  it('does not fetch when accountHash is null', () => {
    renderHook(() => useUnbondingStatus(null), { wrapper });
    expect(mockGet).not.toHaveBeenCalled();
  });

  it('does not fetch when accountHash is undefined', () => {
    renderHook(() => useUnbondingStatus(undefined), { wrapper });
    expect(mockGet).not.toHaveBeenCalled();
  });

  // ── Successful fetch ──────────────────────────────────────────────────

  it('fetches and returns unbonding data', async () => {
    mockGet.mockResolvedValue(mockUnbondingData);
    const { result } = renderHook(() => useUnbondingStatus(ACCOUNT_HASH), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockUnbondingData);
  });

  it('calls the correct API endpoint with stripped account hash', async () => {
    mockGet.mockResolvedValue(mockUnbondingData);
    renderHook(() => useUnbondingStatus(ACCOUNT_HASH), { wrapper });

    await waitFor(() => expect(mockGet).toHaveBeenCalled());

    expect(mockGet).toHaveBeenCalledWith(`/api/v1/staking/${HEX}/unbonding`);
  });

  it('strips account-hash- prefix before calling API', async () => {
    mockGet.mockResolvedValue(null);
    renderHook(() => useUnbondingStatus('account-hash-112233'), { wrapper });

    await waitFor(() => expect(mockGet).toHaveBeenCalled());

    expect(mockGet).toHaveBeenCalledWith('/api/v1/staking/112233/unbonding');
  });

  // ── Null response (no active unbonding) ───────────────────────────────

  it('returns null when backend returns null (no active unbonding)', async () => {
    mockGet.mockResolvedValue(null);
    const { result } = renderHook(() => useUnbondingStatus(ACCOUNT_HASH), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toBeNull();
  });

  // ── Withdrawable state ────────────────────────────────────────────────

  it('reflects isWithdrawable=true when unbonding period has ended', async () => {
    mockGet.mockResolvedValue({ ...mockUnbondingData, isWithdrawable: true, timeRemainingMs: 0 });
    const { result } = renderHook(() => useUnbondingStatus(ACCOUNT_HASH), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.isWithdrawable).toBe(true);
  });

  // ── Network error ─────────────────────────────────────────────────────

  it('transitions to error state on network failure', async () => {
    mockGet.mockRejectedValue(new Error('Network error'));
    const { result } = renderHook(() => useUnbondingStatus(ACCOUNT_HASH), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  // ── AbortSignal propagation ───────────────────────────────────────────

  it('calls the API once per hook mount', async () => {
    mockGet.mockResolvedValue(mockUnbondingData);
    const { result } = renderHook(() => useUnbondingStatus(ACCOUNT_HASH), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockGet).toHaveBeenCalledTimes(1);
  });
});
