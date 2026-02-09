import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useWalletBalances } from '@/hooks/ico/useWalletBalances';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock ICO_CONFIG
vi.mock('@/constants/ico', () => ({
  ICO_CONFIG: {
    CASPER: {
      networkName: 'casper-test',
    },
    CONTRACTS: {
      usdtAddress: 'hash-usdt123',
      usdcAddress: 'hash-usdc456',
      tokenAddress: 'hash-big789',
    },
  },
}));

const mockPublicKey = '01abc123def456789abc123def456789abc123def456789abc123def456789abc1';

// Mock API responses
const mockCSPRBalanceResponse = {
  data: {
    balance: '5000000000000', // 5000 CSPR in motes
  },
};

const mockFTBalanceResponse = {
  data: [
    {
      balance: '1000000000', // 1000 USDT (6 decimals)
      contract_package_hash: 'usdt123',
      contract_package: {
        metadata: {
          symbol: 'tUSDT',
          name: 'Test USDT',
          decimals: '6',
        },
      },
    },
    {
      balance: '500000000', // 500 USDC (6 decimals)
      contract_package_hash: 'usdc456',
      contract_package: {
        metadata: {
          symbol: 'tUSDC',
          name: 'Test USDC',
          decimals: '6',
        },
      },
    },
    {
      balance: '10000000000000000000000', // 10000 BIG (18 decimals)
      contract_package_hash: 'big789',
      contract_package: {
        metadata: {
          symbol: 'BIG',
          name: 'BIG Token',
          decimals: '18',
        },
      },
    },
  ],
};

describe('useWalletBalances', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // --- Initial state ---

  describe('initial state', () => {
    it('should return zero balances when no publicKey provided', () => {
      const { result } = renderHook(() => useWalletBalances(null));

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
      const { result } = renderHook(() => useWalletBalances(undefined));

      expect(result.current.balances.cspr).toBe(0);
    });
  });

  // --- Fetch balances ---

  describe('fetch balances', () => {
    it('should fetch balances when publicKey is provided', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockCSPRBalanceResponse),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockFTBalanceResponse),
        });

      const { result } = renderHook(() => useWalletBalances(mockPublicKey));

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBeNull();
      expect(result.current.balances.cspr).toBe(5000); // 5000 CSPR
    });

    it('should convert CSPR balance from motes correctly', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ data: { balance: '1000000000' } }), // 1 CSPR
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ data: [] }),
        });

      const { result } = renderHook(() => useWalletBalances(mockPublicKey));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.balances.cspr).toBe(1);
    });

    it('should find FT balances by symbol fallback', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockCSPRBalanceResponse),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockFTBalanceResponse),
        });

      const { result } = renderHook(() => useWalletBalances(mockPublicKey));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.balances.usdt).toBe(1000);
      expect(result.current.balances.usdc).toBe(500);
    });

    it('should handle 404 for FT tokens (no tokens)', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockCSPRBalanceResponse),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 404,
        });

      const { result } = renderHook(() => useWalletBalances(mockPublicKey));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBeNull();
      expect(result.current.balances.usdt).toBe(0);
      expect(result.current.balances.usdc).toBe(0);
      expect(result.current.balances.big).toBe(0);
    });
  });

  // --- Error handling ---

  describe('error handling', () => {
    it('should set error on CSPR balance fetch failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      const { result } = renderHook(() => useWalletBalances(mockPublicKey));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toContain('CSPR balance error');
      expect(result.current.balances.cspr).toBe(0);
    });

    it('should set error on FT balance fetch failure', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockCSPRBalanceResponse),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
        });

      const { result } = renderHook(() => useWalletBalances(mockPublicKey));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toContain('FT balance error');
    });
  });

  // --- Refetch function ---

  describe('refetch', () => {
    it('should provide refetch function', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockCSPRBalanceResponse),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ data: [] }),
        });

      const { result } = renderHook(() => useWalletBalances(mockPublicKey));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(typeof result.current.refetch).toBe('function');
    });
  });

  // --- Auto-refresh setup ---

  describe('auto-refresh', () => {
    it('should set up auto-refresh interval when publicKey provided', () => {
      const setIntervalSpy = vi.spyOn(global, 'setInterval');

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockCSPRBalanceResponse),
      });

      renderHook(() => useWalletBalances(mockPublicKey));

      // Verify setInterval was called with 30 second interval
      expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 30000);

      setIntervalSpy.mockRestore();
    });
  });

  // --- PublicKey validation ---

  describe('publicKey validation', () => {
    it('should set error for publicKey with wrong length', () => {
      const { result } = renderHook(() => useWalletBalances('01abc123'));

      expect(result.current.error).toBe('Invalid public key format');
      expect(result.current.balances.cspr).toBe(0);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should set error for publicKey with wrong prefix', () => {
      // Valid length but starts with '03' instead of '01' or '02'
      const invalidKey = '03abc123def456789abc123def456789abc123def456789abc123def456789abc1';
      const { result } = renderHook(() => useWalletBalances(invalidKey));

      expect(result.current.error).toBe('Invalid public key format');
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should set error for publicKey with non-hex characters', () => {
      // Valid length and prefix but contains 'xyz' (non-hex)
      const invalidKey = '01xyz123def456789abc123def456789abc123def456789abc123def456789abc1';
      const { result } = renderHook(() => useWalletBalances(invalidKey));

      expect(result.current.error).toBe('Invalid public key format');
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should accept valid Ed25519 publicKey (01 prefix)', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockCSPRBalanceResponse),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ data: [] }),
        });

      const validKey = '01abc123def456789abc123def456789abc123def456789abc123def456789abc1';
      const { result } = renderHook(() => useWalletBalances(validKey));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBeNull();
      expect(mockFetch).toHaveBeenCalled();
    });

    it('should accept valid Secp256k1 publicKey (02 prefix)', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockCSPRBalanceResponse),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ data: [] }),
        });

      const validKey = '02abc123def456789abc123def456789abc123def456789abc123def456789abc1';
      const { result } = renderHook(() => useWalletBalances(validKey));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBeNull();
      expect(mockFetch).toHaveBeenCalled();
    });
  });

  // --- PublicKey changes ---

  describe('publicKey changes', () => {
    it('should reset balances when publicKey becomes null', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockCSPRBalanceResponse),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ data: [] }),
        });

      const { result, rerender } = renderHook(
        ({ pk }) => useWalletBalances(pk),
        { initialProps: { pk: mockPublicKey as string | null } }
      );

      await waitFor(() => {
        expect(result.current.balances.cspr).toBe(5000);
      });

      rerender({ pk: null });

      expect(result.current.balances.cspr).toBe(0);
    });
  });
});
