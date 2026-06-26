import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// ── Mocks ──────────────────────────────────────────────────────────────────

const mockGet = vi.fn();
vi.mock('@/lib/api-client', () => ({
  backendClient: { get: (...args: unknown[]) => mockGet(...args) },
}));

import { useTokenSupply } from '@/hooks/ico/useTokenSupply';

// ── Wrapper ────────────────────────────────────────────────────────────────

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return React.createElement(QueryClientProvider, { client: qc }, children);
}

// ── Constants ──────────────────────────────────────────────────────────────

const mockSupplyData = {
  total_supply: '100000000',
  circulating_supply: '25000000',
  locked_supply: '75000000',
};

// ── Tests ──────────────────────────────────────────────────────────────────

describe('useTokenSupply', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls correct endpoint /api/v1/vesting/token-supply', async () => {
    mockGet.mockResolvedValue(mockSupplyData);
    const { result } = renderHook(() => useTokenSupply(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockGet).toHaveBeenCalledWith('/api/v1/vesting/token-supply');
  });

  it('returns data on success', async () => {
    mockGet.mockResolvedValue(mockSupplyData);
    const { result } = renderHook(() => useTokenSupply(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockSupplyData);
  });

  it('returns error on failure', async () => {
    const boom = new Error('Token supply fetch failed');
    mockGet.mockRejectedValue(boom);
    const { result } = renderHook(() => useTokenSupply(), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(Error);
    expect((result.current.error as Error).message).toBe('Token supply fetch failed');
  });
});
