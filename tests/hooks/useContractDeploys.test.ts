import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useContractDeploys, isICOPurchase } from '@/hooks/ico/useContractDeploys';
import type { FTTokenAction } from '@/hooks/ico/useContractDeploys';

const mockFetch = vi.fn();
global.fetch = mockFetch;

vi.mock('@/constants/ico', () => ({
  ICO_CONFIG: {
    CONTRACTS: {
      tokenAddress: 'hash-abc123def456',
      icoPackageHash: 'hash-ico789xyz',
    },
    TOKEN: { decimals: 18 },
    CASPER: { explorerUrl: 'https://explorer.example.com' },
    CURRENCY_RATES: { CSPR: 0.05, USDT: 1, USDC: 1 },
  },
  getCurrencyRateUsd: (currency: string) => {
    const rates: Record<string, number> = { CSPR: 0.05, USDT: 1, USDC: 1 };
    return rates[currency] ?? 1;
  },
}));

const mockAction: FTTokenAction = {
  deploy_hash: 'deploy-abc123456789abc123456789abc123',
  block_height: 1_000_000,
  timestamp: '2024-01-15T12:00:00.000Z',
  amount: '1000000000000000000',
  contract_package_hash: 'abc123def456',
  from_hash: 'ico789xyz',
  from_type: 1,
  to_hash: 'user-account-hash',
  to_type: 0,
  ft_action_type_id: 2,
  transform_idx: 0,
};

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
}

describe('useContractDeploys', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // --- Successful fetch ---

  describe('successful fetch', () => {
    it('should return actions, totalPages, and totalItems from API', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            item_count: 1,
            page_count: 5,
            data: [mockAction],
          }),
      });

      const { result } = renderHook(() => useContractDeploys(1, 10), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.actions).toHaveLength(1);
      expect(result.current.actions[0].deploy_hash).toBe(mockAction.deploy_hash);
      expect(result.current.totalPages).toBe(5);
      expect(result.current.totalItems).toBe(1);
      expect(result.current.error).toBeNull();
    });

    it('should return empty defaults when data array is empty', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ item_count: 0, page_count: 0, data: [] }),
      });

      const { result } = renderHook(() => useContractDeploys(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.actions).toEqual([]);
      expect(result.current.totalPages).toBe(0);
      expect(result.current.totalItems).toBe(0);
    });

    it('should include page and pageSize in the request URL', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ item_count: 0, page_count: 0, data: [] }),
      });

      renderHook(() => useContractDeploys(3, 20), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });

      const url: string = mockFetch.mock.calls[0][0];
      expect(url).toContain('page=3');
      expect(url).toContain('page_size=20');
    });
  });

  // --- API errors ---

  describe('API errors', () => {
    it('should set error when API returns a non-ok status', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });

      const { result } = renderHook(() => useContractDeploys(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.error).not.toBeNull();
      });

      expect(result.current.actions).toEqual([]);
    });

    it('should set error on network failure', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useContractDeploys(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.error).not.toBeNull();
      });

      expect(result.current.actions).toEqual([]);
    });
  });

  // --- refetch ---

  describe('refetch', () => {
    it('should expose a refetch function', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ item_count: 0, page_count: 0, data: [] }),
      });

      const { result } = renderHook(() => useContractDeploys(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(typeof result.current.refetch).toBe('function');
    });
  });
});

// =====================================================
// isICOPurchase — pure function
// =====================================================

describe('isICOPurchase', () => {
  // ICO_PACKAGE_HASH = 'hash-ico789xyz'.replace(/^hash-/, '').toLowerCase() = 'ico789xyz'

  it('should return true when from_type=1 and from_hash matches ICO package hash', () => {
    const action: FTTokenAction = {
      ...mockAction,
      from_type: 1,
      from_hash: 'ico789xyz',
    };
    expect(isICOPurchase(action)).toBe(true);
  });

  it('should return false when from_type is 0 (account, not contract)', () => {
    const action: FTTokenAction = {
      ...mockAction,
      from_type: 0,
      from_hash: 'ico789xyz',
    };
    expect(isICOPurchase(action)).toBe(false);
  });

  it('should return false when from_hash does not match ICO package hash', () => {
    const action: FTTokenAction = {
      ...mockAction,
      from_type: 1,
      from_hash: 'some-other-contract-hash',
    };
    expect(isICOPurchase(action)).toBe(false);
  });

  it('should return false when from_hash is null', () => {
    const action: FTTokenAction = {
      ...mockAction,
      from_type: 1,
      from_hash: null,
    };
    expect(isICOPurchase(action)).toBe(false);
  });

  it('should be case-insensitive when comparing from_hash', () => {
    const action: FTTokenAction = {
      ...mockAction,
      from_type: 1,
      from_hash: 'ICO789XYZ', // uppercase, should still match
    };
    expect(isICOPurchase(action)).toBe(true);
  });
});
