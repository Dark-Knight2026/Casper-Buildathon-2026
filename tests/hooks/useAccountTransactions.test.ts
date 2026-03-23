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

import { useAccountTransactions } from '@/hooks/ico/useAccountTransactions';

// ── Wrapper ────────────────────────────────────────────────────────────────

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return React.createElement(QueryClientProvider, { client: qc }, children);
}

// ── Constants ──────────────────────────────────────────────────────────────

const ADDRESS_WITH_PREFIX = 'account-hash-abcdef1234567890';
const ADDRESS_HEX = 'abcdef1234567890';
const ADDRESS_PLAIN = 'abcdef1234567890';

const mockData = {
  data: [{ deploy_hash: 'hash1' }, { deploy_hash: 'hash2' }],
  page_count: 5,
  item_count: 40,
};

// ── Tests ──────────────────────────────────────────────────────────────────

describe('useAccountTransactions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does NOT fetch when address is null', () => {
    const { result } = renderHook(
      () => useAccountTransactions(null),
      { wrapper },
    );
    expect(mockGet).not.toHaveBeenCalled();
    expect(result.current.isLoading).toBe(false);
  });

  it('does NOT fetch when address is undefined', () => {
    const { result } = renderHook(
      () => useAccountTransactions(undefined),
      { wrapper },
    );
    expect(mockGet).not.toHaveBeenCalled();
    expect(result.current.isLoading).toBe(false);
  });

  it('strips account-hash- prefix from address in URL', async () => {
    mockGet.mockResolvedValue(mockData);
    const { result } = renderHook(
      () => useAccountTransactions(ADDRESS_WITH_PREFIX, 1, 8),
      { wrapper },
    );
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockGet).toHaveBeenCalledWith(
      expect.stringContaining(`/api/v1/transactions/account/${ADDRESS_HEX}`),
    );
    expect(mockGet).not.toHaveBeenCalledWith(
      expect.stringContaining('account-hash-'),
    );
  });

  it('builds correct URL with page and page_size params', async () => {
    mockGet.mockResolvedValue(mockData);
    const { result } = renderHook(
      () => useAccountTransactions(ADDRESS_PLAIN, 3, 20),
      { wrapper },
    );
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockGet).toHaveBeenCalledWith(
      expect.stringContaining('page=3'),
    );
    expect(mockGet).toHaveBeenCalledWith(
      expect.stringContaining('page_size=20'),
    );
  });

  it('includes type param when provided', async () => {
    mockGet.mockResolvedValue(mockData);
    const { result } = renderHook(
      () => useAccountTransactions(ADDRESS_PLAIN, 1, 8, 'transfer'),
      { wrapper },
    );
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockGet).toHaveBeenCalledWith(
      expect.stringContaining('type=transfer'),
    );
  });

  it('includes from_type param when provided', async () => {
    mockGet.mockResolvedValue(mockData);
    const { result } = renderHook(
      () => useAccountTransactions(ADDRESS_PLAIN, 1, 8, undefined, 2),
      { wrapper },
    );
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockGet).toHaveBeenCalledWith(
      expect.stringContaining('from_type=2'),
    );
  });

  it('includes contract_package_hash param when provided', async () => {
    mockGet.mockResolvedValue(mockData);
    const { result } = renderHook(
      () => useAccountTransactions(ADDRESS_PLAIN, 1, 8, undefined, undefined, 'pkghash123'),
      { wrapper },
    );
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockGet).toHaveBeenCalledWith(
      expect.stringContaining('contract_package_hash=pkghash123'),
    );
  });

  it('returns transactions from data.data', async () => {
    mockGet.mockResolvedValue(mockData);
    const { result } = renderHook(
      () => useAccountTransactions(ADDRESS_PLAIN),
      { wrapper },
    );
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.transactions).toEqual(mockData.data);
  });

  it('returns totalPages from data.page_count', async () => {
    mockGet.mockResolvedValue(mockData);
    const { result } = renderHook(
      () => useAccountTransactions(ADDRESS_PLAIN),
      { wrapper },
    );
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.totalPages).toBe(5);
  });

  it('returns totalItems from data.item_count', async () => {
    mockGet.mockResolvedValue(mockData);
    const { result } = renderHook(
      () => useAccountTransactions(ADDRESS_PLAIN),
      { wrapper },
    );
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.totalItems).toBe(40);
  });

  it('returns empty array and zeros as defaults when no data yet', () => {
    // Query is disabled (no address), so data is never fetched
    const { result } = renderHook(
      () => useAccountTransactions(null),
      { wrapper },
    );
    expect(result.current.transactions).toEqual([]);
    expect(result.current.totalPages).toBe(0);
    expect(result.current.totalItems).toBe(0);
  });

  it('propagates error when backendClient.get rejects', async () => {
    const boom = new Error('Network error');
    mockGet.mockRejectedValue(boom);
    const { result } = renderHook(
      () => useAccountTransactions(ADDRESS_PLAIN),
      { wrapper },
    );
    await waitFor(() => expect(result.current.error).toBeTruthy());
    expect(result.current.error).toBeInstanceOf(Error);
    expect((result.current.error as Error).message).toBe('Network error');
  });
});
