import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// ── Mocks ──────────────────────────────────────────────────────────────────

const mockGet = vi.fn();
vi.mock('@/lib/api-client', () => ({
  backendClient: { get: (...args: unknown[]) => mockGet(...args) },
}));

import { useICOProgress } from '@/hooks/ico/useICOProgress';

// ── Wrapper ────────────────────────────────────────────────────────────────

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return React.createElement(QueryClientProvider, { client: qc }, children);
}

// ── Constants ──────────────────────────────────────────────────────────────

const mockProgressData = {
  total_raised: '1000000',
  total_supply: '5000000',
  percentage: 20,
};

// ── Tests ──────────────────────────────────────────────────────────────────

describe('useICOProgress', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls /api/v1/ico/progress', async () => {
    mockGet.mockResolvedValue(mockProgressData);
    const { result } = renderHook(() => useICOProgress(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockGet).toHaveBeenCalledWith('/api/v1/ico/progress');
  });

  it('returns data on success', async () => {
    mockGet.mockResolvedValue(mockProgressData);
    const { result } = renderHook(() => useICOProgress(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockProgressData);
  });

  it('returns error on failure', async () => {
    const boom = new Error('Service unavailable');
    mockGet.mockRejectedValue(boom);
    const { result } = renderHook(() => useICOProgress(), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(Error);
    expect((result.current.error as Error).message).toBe('Service unavailable');
  });
});
