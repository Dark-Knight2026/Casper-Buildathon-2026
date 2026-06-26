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

import { useICOBalance } from '@/hooks/ico/useICOBalance';

// ── Wrapper ────────────────────────────────────────────────────────────────

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return React.createElement(QueryClientProvider, { client: qc }, children);
}

// ── Constants ──────────────────────────────────────────────────────────────

const ACCOUNT_HASH_WITH_PREFIX = 'account-hash-deadbeef1234';
const ACCOUNT_HEX = 'deadbeef1234';

const mockBalanceData = { balance: '5000000', locked: '1000000' };

// ── Tests ──────────────────────────────────────────────────────────────────

describe('useICOBalance', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does NOT fetch when accountHash is null', () => {
    const { result } = renderHook(
      () => useICOBalance(null),
      { wrapper },
    );
    expect(mockGet).not.toHaveBeenCalled();
    expect(result.current.isLoading).toBe(false);
  });

  it('does NOT fetch when accountHash is undefined', () => {
    renderHook(() => useICOBalance(undefined), { wrapper });
    expect(mockGet).not.toHaveBeenCalled();
  });

  it('strips account-hash- prefix in URL', async () => {
    mockGet.mockResolvedValue(mockBalanceData);
    const { result } = renderHook(
      () => useICOBalance(ACCOUNT_HASH_WITH_PREFIX),
      { wrapper },
    );
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockGet).toHaveBeenCalledWith(
      `/api/v1/ico/balance/${ACCOUNT_HEX}`,
    );
  });

  it('calls correct endpoint', async () => {
    mockGet.mockResolvedValue(mockBalanceData);
    const { result } = renderHook(
      () => useICOBalance(ACCOUNT_HEX),
      { wrapper },
    );
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockGet).toHaveBeenCalledWith(`/api/v1/ico/balance/${ACCOUNT_HEX}`);
  });

  it('returns data on success', async () => {
    mockGet.mockResolvedValue(mockBalanceData);
    const { result } = renderHook(
      () => useICOBalance(ACCOUNT_HEX),
      { wrapper },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockBalanceData);
  });

  it('returns error on failure', async () => {
    const boom = new Error('Server error');
    mockGet.mockRejectedValue(boom);
    const { result } = renderHook(
      () => useICOBalance(ACCOUNT_HEX),
      { wrapper },
    );
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(Error);
    expect((result.current.error as Error).message).toBe('Server error');
  });
});
