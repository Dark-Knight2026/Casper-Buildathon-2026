import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useUserTokenActions } from '@/hooks/ico/useUserTokenActions';
import type { FTTokenAction } from '@/hooks/ico/useContractDeploys';

const mockFetch = vi.fn();
global.fetch = mockFetch;

vi.mock('@/constants/ico', () => ({
  ICO_CONFIG: {
    CONTRACTS: {
      tokenAddress: 'hash-abc123def456',
      icoPackageHash: 'hash-ico789xyz',
    },
    TOKEN: { decimals: 18, symbol: 'BIG' },
    CASPER: { explorerUrl: 'https://explorer.example.com' },
    CURRENCY_RATES: { CSPR: 0.05, USDT: 1, USDC: 1 },
  },
  getCurrencyRateUsd: (currency: string) => {
    const rates: Record<string, number> = { CSPR: 0.05, USDT: 1, USDC: 1 };
    return rates[currency] ?? 1;
  },
}));

const PUBLIC_KEY = '02abc123def456';

const mockAction: FTTokenAction = {
  deploy_hash: 'deploy-abc123456789abc123456789abc123',
  block_height: 1_000_000,
  timestamp: '2024-01-15T12:00:00.000Z',
  amount: '1000000000000000000', // 1 BIG (18 decimals)
  contract_package_hash: 'abc123def456',
  from_hash: 'ico789xyz',
  from_type: 1,
  to_hash: 'user-account-hash',
  to_type: 0,
  ft_action_type_id: 2,
  transform_idx: 0,
};

function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children);
}

function mockOk(data: FTTokenAction[]) {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({ item_count: data.length, page_count: 1, data }),
  });
}

beforeEach(() => {
  mockFetch.mockReset();
});

describe('useUserTokenActions', () => {
  it('correctly converts 1e18 raw amount to 1 token', async () => {
    mockOk([mockAction]);

    const { result } = renderHook(() => useUserTokenActions(PUBLIC_KEY), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.transactions).toHaveLength(1);
    expect(result.current.transactions[0].tokensReceived).toBeCloseTo(1, 10);
  });

  it('handles non-integer amount string gracefully (falls back to 0)', async () => {
    mockOk([{ ...mockAction, amount: '1.5e18' }]);

    const { result } = renderHook(() => useUserTokenActions(PUBLIC_KEY), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.transactions[0].tokensReceived).toBe(0);
  });

  it('returns empty array and does not fetch when publicKey is empty', async () => {
    const { result } = renderHook(() => useUserTokenActions(null), {
      wrapper: makeWrapper(),
    });

    // No fetch should be triggered
    expect(mockFetch).not.toHaveBeenCalled();
    expect(result.current.transactions).toEqual([]);
    expect(result.current.isLoading).toBe(false);
  });

  it('exposes error state when API returns non-ok response', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });

    const { result } = renderHook(() => useUserTokenActions(PUBLIC_KEY), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => expect(result.current.error).not.toBeNull());

    expect(result.current.transactions).toEqual([]);
    expect(result.current.error?.message).toMatch(/500/);
  });
});
