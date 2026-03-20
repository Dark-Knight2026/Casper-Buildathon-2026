import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useWalletBalances } from '@/hooks/ico/useWalletBalances';

// Mock fetch (used only for FT balance via CSPR.Cloud REST API)
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock casper-js-sdk (PublicKey used for account hash derivation,
// PurseIdentifier used for CSPR balance query)
vi.mock('casper-js-sdk', () => ({
  PublicKey: {
    fromHex: vi.fn(() => ({
      accountHash: () => ({
        toPrefixedString: () => 'account-hash-mock',
      }),
    })),
  },
  PurseIdentifier: {
    fromPublicKey: vi.fn(() => 'mock-purse-id'),
  },
}));

// Mock casperClient (CSPR balance is fetched via RPC, not REST)
const mockQueryLatestBalance = vi.fn();
const mockQueryLatestGlobalState = vi.fn();
vi.mock('@/services/ico/casperClient', () => ({
  getCasperRpcClient: () => ({
    queryLatestBalance: mockQueryLatestBalance,
    queryLatestGlobalState: vi.fn().mockRejectedValue(new Error('fallback not mocked')),
    getLatestBalance: vi.fn().mockRejectedValue(new Error('fallback not mocked')),
  }),
}));

// Mock cep18Service (provides TOKEN_HASHES for FT balance matching)
vi.mock('@/services/ico/cep18Service', () => ({
  TOKEN_HASHES: {
    USDT: 'hash-usdt123',
    USDC: 'hash-usdc456',
    BIG: 'hash-big789',
  },
}));

const mockPublicKey = '01abc123def456789abc123def456789abc123def456789abc123def456789abc1';

// Mock FT balance API response
const mockFTBalanceResponse = {
  data: [
    {
      balance: '1000000000', // 1000 USDT (6 decimals from TOKEN_DECIMALS fallback)
      contract_package_hash: 'usdt123',
    },
    {
      balance: '500000000', // 500 USDC (6 decimals)
      contract_package_hash: 'usdc456',
    },
    {
      balance: '10000000000000000000000', // 10000 BIG (18 decimals)
      contract_package_hash: 'big789',
    },
  ],
};

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
}

/** Helper: mock a successful CSPR balance (in motes) */
function mockCSPRBalance(motes: string) {
  mockQueryLatestBalance.mockResolvedValueOnce({
    balance: { toString: () => motes },
  });
}

/** Helper: mock a successful FT balance response */
function mockFTBalance(response = mockFTBalanceResponse) {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: () => Promise.resolve(response),
  });
}

describe('useWalletBalances', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default: CSPR RPC returns 5000 CSPR (in motes)
    mockQueryLatestBalance.mockResolvedValue({
      balance: '5000000000000',
    });
    // Default: RPC fallback rejects (so it doesn't interfere)
    mockQueryLatestGlobalState.mockRejectedValue(new Error('Not available'));

    // Default: FT API returns empty data
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: [] }),
    });
  });

  // --- Initial state ---

  describe('initial state', () => {
    it('should return zero balances when no publicKey provided', () => {
      const { result } = renderHook(() => useWalletBalances(null), {
        wrapper: createWrapper(),
      });

      expect(result.current.balances).toEqual({
        cspr: 0,
        usdt: 0,
        usdc: 0,
        big: 0,
      });
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should return zero balances for undefined publicKey', () => {
      const { result } = renderHook(() => useWalletBalances(undefined), {
        wrapper: createWrapper(),
      });

      expect(result.current.balances.cspr).toBe(0);
    });
  });

  // --- Fetch balances ---

  describe('fetch balances', () => {
    it('should fetch balances when publicKey is provided', async () => {
      mockCSPRBalance('5000000000000'); // 5000 CSPR
      mockFTBalance(mockFTBalanceResponse);

      const { result } = renderHook(() => useWalletBalances(mockPublicKey), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBeNull();
      expect(result.current.balances.cspr).toBe(5000);
    });

    it('should convert CSPR balance from motes correctly', async () => {
      mockCSPRBalance('1000000000'); // 1 CSPR
      mockFTBalance({ data: [] });

      const { result } = renderHook(() => useWalletBalances(mockPublicKey), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.balances.cspr).toBe(1);
    });

    it('should find FT balances by contract hash', async () => {
      mockCSPRBalance('5000000000000');
      mockFTBalance(mockFTBalanceResponse);

      const { result } = renderHook(() => useWalletBalances(mockPublicKey), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.balances.usdt).toBe(1000);
      expect(result.current.balances.usdc).toBe(500);
    });

    it('should handle 404 for FT tokens (no tokens)', async () => {
      mockCSPRBalance('5000000000000');
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: () => Promise.resolve('Not Found'),
      });

      const { result } = renderHook(() => useWalletBalances(mockPublicKey), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // 404 is a fetch failure — error is reported, FT balances fall back to 0
      expect(result.current.error).toBe('Failed to fetch token balances');
      expect(result.current.balances.cspr).toBe(5000);
      expect(result.current.balances.usdt).toBe(0);
      expect(result.current.balances.usdc).toBe(0);
      expect(result.current.balances.big).toBe(0);
    });
  });

  // --- Graceful degradation (Promise.allSettled) ---

  describe('graceful degradation', () => {
    it('should return zero CSPR balance and error when RPC fetch fails', async () => {
      mockQueryLatestBalance.mockRejectedValueOnce(new Error('RPC error'));
      mockFTBalance({ data: [] });

      const { result } = renderHook(() => useWalletBalances(mockPublicKey), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Partial failure: CSPR falls back to 0, error is reported
      expect(result.current.error).toBe('Failed to fetch CSPR balance');
      expect(result.current.balances.cspr).toBe(0);
    });

    it('should return zero FT balances and error when FT fetch fails', async () => {
      mockCSPRBalance('5000000000000');
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: () => Promise.resolve('Internal Server Error'),
      });

      const { result } = renderHook(() => useWalletBalances(mockPublicKey), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Partial failure: FT falls back to 0, CSPR still available, error is reported
      expect(result.current.error).toBe('Failed to fetch token balances');
      expect(result.current.balances.cspr).toBe(5000);
      expect(result.current.balances.usdt).toBe(0);
      expect(result.current.balances.usdc).toBe(0);
    });

    it('should report both errors when all fetches fail', async () => {
      mockQueryLatestBalance.mockRejectedValueOnce(new Error('RPC error'));
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: () => Promise.resolve('Internal Server Error'),
      });

      const { result } = renderHook(() => useWalletBalances(mockPublicKey), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBe('Failed to fetch CSPR balance. Failed to fetch token balances');
      expect(result.current.balances.cspr).toBe(0);
      expect(result.current.balances.usdt).toBe(0);
    });
  });

  // --- Refetch function ---

  describe('refetch', () => {
    it('should provide refetch function', async () => {
      mockCSPRBalance('5000000000000');
      mockFTBalance({ data: [] });

      const { result } = renderHook(() => useWalletBalances(mockPublicKey), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(typeof result.current.refetch).toBe('function');
    });
  });

  // --- PublicKey validation ---

  describe('publicKey validation', () => {
    it('should set error for publicKey with wrong length', async () => {
      const { result } = renderHook(() => useWalletBalances('01abc123'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.error).toBe('Invalid public key format');
      });

      expect(result.current.balances.cspr).toBe(0);
      expect(mockQueryLatestBalance).not.toHaveBeenCalled();
    });

    it('should set error for publicKey with wrong prefix', async () => {
      // Valid length but starts with '03' instead of '01' or '02'
      const invalidKey = '03abc123def456789abc123def456789abc123def456789abc123def456789abc1';
      const { result } = renderHook(() => useWalletBalances(invalidKey), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.error).toBe('Invalid public key format');
      });

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should set error for publicKey with non-hex characters', async () => {
      // Valid length and prefix but contains 'xyz' (non-hex)
      const invalidKey = '01xyz123def456789abc123def456789abc123def456789abc123def456789abc1';
      const { result } = renderHook(() => useWalletBalances(invalidKey), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.error).toBe('Invalid public key format');
      });

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should accept valid Ed25519 publicKey (01 prefix)', async () => {
      mockCSPRBalance('5000000000000');
      mockFTBalance({ data: [] });

      const validKey = '01abc123def456789abc123def456789abc123def456789abc123def456789abc1';
      const { result } = renderHook(() => useWalletBalances(validKey), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBeNull();
    });

    it('should accept valid Secp256k1 publicKey (02 prefix)', async () => {
      mockCSPRBalance('5000000000000');
      mockFTBalance({ data: [] });

      // Secp256k1: 02 prefix + 66 hex chars = 68 chars total
      const validKey = '02abc123def456789abc123def456789abc123def456789abc123def456789abc1de';
      const { result } = renderHook(() => useWalletBalances(validKey), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBeNull();
    });
  });

  // --- PublicKey changes ---

  describe('publicKey changes', () => {
    it('should reset balances when publicKey becomes null', async () => {
      mockCSPRBalance('5000000000000');
      mockFTBalance({ data: [] });

      const wrapper = createWrapper();
      const { result, rerender } = renderHook(
        ({ pk }) => useWalletBalances(pk),
        { initialProps: { pk: mockPublicKey as string | null }, wrapper }
      );

      await waitFor(() => {
        expect(result.current.balances.cspr).toBe(5000);
      });

      rerender({ pk: null });

      expect(result.current.balances.cspr).toBe(0);
    });
  });
});
