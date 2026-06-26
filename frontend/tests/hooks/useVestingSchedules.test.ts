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

import { useVestingSchedules } from '@/hooks/ico/useVestingSchedules';

// ── Wrapper ────────────────────────────────────────────────────────────────

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return React.createElement(QueryClientProvider, { client: qc }, children);
}

// ── Constants ──────────────────────────────────────────────────────────────

const ACCOUNT_HASH_WITH_PREFIX = 'account-hash-778899aabbcc';
const ACCOUNT_HEX = '778899aabbcc';

const mockSchedulesData = {
  schedules: [
    { id: 1, amount: '10000', release_date: '2025-03-01', claimed: false },
    { id: 2, amount: '20000', release_date: '2025-09-01', claimed: false },
  ],
};

// ── Tests ──────────────────────────────────────────────────────────────────

describe('useVestingSchedules', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does NOT fetch when accountHash is null', () => {
    const { result } = renderHook(
      () => useVestingSchedules(null),
      { wrapper },
    );
    expect(mockGet).not.toHaveBeenCalled();
    expect(result.current.isLoading).toBe(false);
  });

  it('does NOT fetch when accountHash is undefined', () => {
    renderHook(() => useVestingSchedules(undefined), { wrapper });
    expect(mockGet).not.toHaveBeenCalled();
  });

  it('strips account-hash- prefix in URL', async () => {
    mockGet.mockResolvedValue(mockSchedulesData);
    const { result } = renderHook(
      () => useVestingSchedules(ACCOUNT_HASH_WITH_PREFIX),
      { wrapper },
    );
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockGet).toHaveBeenCalledWith(
      `/api/v1/vesting/schedules?account=${ACCOUNT_HEX}`,
    );
    expect(mockGet).not.toHaveBeenCalledWith(
      expect.stringContaining('account-hash-'),
    );
  });

  it('calls correct endpoint', async () => {
    mockGet.mockResolvedValue(mockSchedulesData);
    const { result } = renderHook(
      () => useVestingSchedules(ACCOUNT_HEX),
      { wrapper },
    );
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockGet).toHaveBeenCalledWith(
      `/api/v1/vesting/schedules?account=${ACCOUNT_HEX}`,
    );
  });

  it('returns data on success', async () => {
    mockGet.mockResolvedValue(mockSchedulesData);
    const { result } = renderHook(
      () => useVestingSchedules(ACCOUNT_HEX),
      { wrapper },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockSchedulesData);
  });

  it('returns error on failure', async () => {
    const boom = new Error('Vesting schedules fetch failed');
    mockGet.mockRejectedValue(boom);
    const { result } = renderHook(
      () => useVestingSchedules(ACCOUNT_HEX),
      { wrapper },
    );
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(Error);
    expect((result.current.error as Error).message).toBe('Vesting schedules fetch failed');
  });
});
