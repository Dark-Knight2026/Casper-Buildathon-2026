import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useWalletBalances } from '@/hooks/ico/useWalletBalances';

// Mock casper-js-sdk (used by fetchCSPRBalance for RPC calls)
vi.mock('casper-js-sdk', () => ({
  PublicKey: {
    fromHex: vi.fn((hex: string) => ({
      accountHash: () => ({
        toPrefixedString: () => `account-hash-${hex.slice(0, 16)}`,
      }),
    })),
  },
  PurseIdentifier: {
    fromPublicKey: vi.fn((pk: unknown) => pk),
  },
}));

// Mock RPC client (CSPR balance is fetched via RPC, not fetch)
const mockQueryLatestBalance = vi.fn();
const mockQueryLatestGlobalState = vi.fn();

vi.mock('@/services/ico/casperClient', () => ({
  getCasperRpcClient: () => ({
    queryLatestBalance: (...args: unknown[]) => mockQueryLatestBalance(...args),
    queryLatestGlobalState: (...args: unknown[]) => mockQueryLatestGlobalState(...args),
    getLatestBalance: vi.fn(),
  }),
}));

// Mock cep18Service (TOKEN_HASHES used at module level for hash matching)
vi.mock('@/services/ico/cep18Service', () => ({
  getBalance: vi.fn(),
  TOKEN_HASHES: {
    USDT: 'hash-usdt123',
    USDC: 'hash-usdc456',
    BIG: 'hash-big789',
  },
}));

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

// Mock fetch (used only for FT balances via CSPR.Cloud REST API)
const mockFetch = vi.fn();
global.fetch = mockFetch;

const mockPublicKey = '01abc123def456789abc123def456789abc123def456789abc123def456789abc1';

// FT balance API response (matched by contract_package_hash → KNOWN_HASHES)
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
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockFTBalanceResponse),
      });

      const { result } = renderHook(() => useWalletBalances(mockPublicKey));

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBeNull();
      expect(result.current.balances.cspr).toBe(5000); // 5000 CSPR via RPC
    });

    it('should convert CSPR balance from motes correctly', async () => {
      mockQueryLatestBalance.mockResolvedValue({
        balance: '1000000000', // 1 CSPR in motes
      });

      const { result } = renderHook(() => useWalletBalances(mockPublicKey));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.balances.cspr).toBe(1);
    });

    it('should find FT balances by contract hash', async () => {
      mockFetch.mockResolvedValue({
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
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        text: () => Promise.resolve(''),
      });

      const { result } = renderHook(() => useWalletBalances(mockPublicKey));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Hook throws on !resp.ok (including 404), caught by Promise.allSettled
      expect(result.current.error).toContain('FT tokens:');
      expect(result.current.balances.usdt).toBe(0);
      expect(result.current.balances.usdc).toBe(0);
      expect(result.current.balances.big).toBe(0);
    });
  });

  // --- Error handling ---

  describe('error handling', () => {
    it('should set error on CSPR balance fetch failure', async () => {
      mockQueryLatestBalance.mockRejectedValue(new Error('RPC connection failed'));

      const { result } = renderHook(() => useWalletBalances(mockPublicKey));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toContain('CSPR:');
      expect(result.current.balances.cspr).toBe(0);
    });

    it('should set error on FT balance fetch failure', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        text: () => Promise.resolve('Internal Server Error'),
      });

      const { result } = renderHook(() => useWalletBalances(mockPublicKey));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toContain('FT tokens:');
    });
  });

  // --- Refetch function ---

  describe('refetch', () => {
    it('should provide refetch function', async () => {
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

      renderHook(() => useWalletBalances(mockPublicKey));

      // Hook uses 60 second interval
      expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 60000);

      setIntervalSpy.mockRestore();
    });
  });

  // --- PublicKey validation ---

  describe('publicKey validation', () => {
    it('should set error for publicKey with wrong length', () => {
      const { result } = renderHook(() => useWalletBalances('01abc123'));

      expect(result.current.error).toBe('Invalid public key format');
      expect(result.current.balances.cspr).toBe(0);
      expect(mockQueryLatestBalance).not.toHaveBeenCalled();
    });

    it('should set error for publicKey with wrong prefix', () => {
      // Valid length but starts with '03' instead of '01' or '02'
      const invalidKey = '03abc123def456789abc123def456789abc123def456789abc123def456789abc1';
      const { result } = renderHook(() => useWalletBalances(invalidKey));

      expect(result.current.error).toBe('Invalid public key format');
      expect(mockQueryLatestBalance).not.toHaveBeenCalled();
    });

    it('should set error for publicKey with non-hex characters', () => {
      // Valid length and prefix but contains 'xyz' (non-hex)
      const invalidKey = '01xyz123def456789abc123def456789abc123def456789abc123def456789abc1';
      const { result } = renderHook(() => useWalletBalances(invalidKey));

      expect(result.current.error).toBe('Invalid public key format');
      expect(mockQueryLatestBalance).not.toHaveBeenCalled();
    });

    it('should accept valid Ed25519 publicKey (01 prefix)', async () => {
      const validKey = '01abc123def456789abc123def456789abc123def456789abc123def456789abc1';
      const { result } = renderHook(() => useWalletBalances(validKey));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBeNull();
    });

    it('should accept valid Secp256k1 publicKey (02 prefix)', async () => {
      // 02 prefix requires 68 chars total (02 + 66 hex chars)
      const validKey = '02abc123def456789abc123def456789abc123def456789abc123def456789abcdef';
      const { result } = renderHook(() => useWalletBalances(validKey));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBeNull();
    });
  });

  // --- PublicKey changes ---

  describe('publicKey changes', () => {
    it('should reset balances when publicKey becomes null', async () => {
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
