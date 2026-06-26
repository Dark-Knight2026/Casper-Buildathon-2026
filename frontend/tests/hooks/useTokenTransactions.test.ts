import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// ── Mocks ──────────────────────────────────────────────────────────────────

const mockGet = vi.fn();
vi.mock('@/lib/api-client', () => ({
  backendClient: { get: (...args: unknown[]) => mockGet(...args) },
}));

import { useTokenTransactions } from '@/hooks/ico/useTokenTransactions';

// ── Wrapper ────────────────────────────────────────────────────────────────

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return React.createElement(QueryClientProvider, { client: qc }, children);
}

// ── Helpers ────────────────────────────────────────────────────────────────

function makeMockResponse(overrides = {}) {
  return {
    data: [
      { deploy_hash: 'hash-a', amount: '1000' },
      { deploy_hash: 'hash-b', amount: '2000' },
    ],
    page_count: 7,
    item_count: 70,
    ...overrides,
  };
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('useTokenTransactions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls correct URL with default page=1 and pageSize=10', async () => {
    mockGet.mockResolvedValue(makeMockResponse());
    const { result } = renderHook(
      () => useTokenTransactions(),
      { wrapper },
    );
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockGet).toHaveBeenCalledWith(
      '/api/v1/transactions/token/big?page=1&page_size=10',
    );
  });

  it('calls URL with custom page and pageSize', async () => {
    mockGet.mockResolvedValue(makeMockResponse());
    const { result } = renderHook(
      () => useTokenTransactions(3, 25),
      { wrapper },
    );
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockGet).toHaveBeenCalledWith(
      '/api/v1/transactions/token/big?page=3&page_size=25',
    );
  });

  it('returns transactions from data.data', async () => {
    const mockData = makeMockResponse();
    mockGet.mockResolvedValue(mockData);
    const { result } = renderHook(
      () => useTokenTransactions(),
      { wrapper },
    );
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.transactions).toEqual(mockData.data);
  });

  it('returns totalPages from data.page_count', async () => {
    mockGet.mockResolvedValue(makeMockResponse());
    const { result } = renderHook(
      () => useTokenTransactions(),
      { wrapper },
    );
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.totalPages).toBe(7);
  });

  it('returns totalItems from data.item_count', async () => {
    mockGet.mockResolvedValue(makeMockResponse());
    const { result } = renderHook(
      () => useTokenTransactions(),
      { wrapper },
    );
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.totalItems).toBe(70);
  });

  it('defaults to empty array and zeros before data arrives', () => {
    // Never resolve - query stays in loading state
    mockGet.mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(
      () => useTokenTransactions(),
      { wrapper },
    );
    // While loading, defaults should be empty/zero
    expect(result.current.transactions).toEqual([]);
    expect(result.current.totalPages).toBe(0);
    expect(result.current.totalItems).toBe(0);
  });

  it('returns error on failure', async () => {
    const boom = new Error('Token transactions fetch failed');
    mockGet.mockRejectedValue(boom);
    const { result } = renderHook(
      () => useTokenTransactions(),
      { wrapper },
    );
    await waitFor(() => expect(result.current.error).toBeTruthy());
    expect(result.current.error).toBeInstanceOf(Error);
    expect((result.current.error as Error).message).toBe('Token transactions fetch failed');
  });
});
