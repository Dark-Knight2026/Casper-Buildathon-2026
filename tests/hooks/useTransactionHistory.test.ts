import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';

vi.mock('@/constants/ico', () => ({
  ICO_CONFIG: {
    CONTRACTS: { tokenAddress: 'hash-bigtoken000aabbcc' },
    TOKEN: { symbol: 'BIG' },
  },
}));

const mockUseAccountTransactions = vi.fn();
vi.mock('@/hooks/ico/useAccountTransactions', () => ({
  useAccountTransactions: (...args: unknown[]) => mockUseAccountTransactions(...args),
}));

import { useTransactionHistory } from '@/hooks/ico/useTransactionHistory';

const BIG_TOKEN_HASH = 'bigtoken000aabbcc'; // tokenAddress stripped of 'hash-'
const ACCOUNT_HASH = 'account-hash-deadbeef0011';
const ACCOUNT_HEX = 'deadbeef0011'; // stripped version

const baseTx = {
  deploy_hash: 'txhash001',
  block_height: 100,
  timestamp: '2024-01-01T00:00:00Z',
  amount: '1000000000000000000', // 1 token (18 decimals)
  currency: null,
  contract_package_hash: BIG_TOKEN_HASH,
  from_hash: 'fromhash',
  from_type: 0,
  to_hash: ACCOUNT_HEX,
  to_type: 0,
  ft_action_type_id: 2,
  transform_idx: 0,
};

const baseHookResult = {
  transactions: [],
  totalPages: 0,
  isLoading: false,
};

describe('useTransactionHistory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAccountTransactions.mockReturnValue(baseHookResult);
  });

  // ── forwarded args ────────────────────────────────────────────────────

  it('passes accountHash, page, pageSize and token_transfer type to useAccountTransactions', () => {
    renderHook(() => useTransactionHistory(ACCOUNT_HASH, 2, 5));
    expect(mockUseAccountTransactions).toHaveBeenCalledWith(
      ACCOUNT_HASH, 2, 5, 'token_transfer',
    );
  });

  // ── amount mapping ────────────────────────────────────────────────────

  it('converts 18-decimal BigInt amount correctly (1 token)', () => {
    mockUseAccountTransactions.mockReturnValue({
      ...baseHookResult,
      transactions: [{ ...baseTx, amount: '1000000000000000000' }],
    });
    const { result } = renderHook(() => useTransactionHistory(ACCOUNT_HASH, 1));
    expect(result.current.transactions[0].tokensReceived).toBeCloseTo(1, 10);
  });

  it('preserves fractional part of amount (0.5 tokens)', () => {
    mockUseAccountTransactions.mockReturnValue({
      ...baseHookResult,
      transactions: [{ ...baseTx, amount: '500000000000000000' }],
    });
    const { result } = renderHook(() => useTransactionHistory(ACCOUNT_HASH, 1));
    expect(result.current.transactions[0].tokensReceived).toBeCloseTo(0.5, 10);
  });

  it('returns 0 for null amount', () => {
    mockUseAccountTransactions.mockReturnValue({
      ...baseHookResult,
      transactions: [{ ...baseTx, amount: null }],
    });
    const { result } = renderHook(() => useTransactionHistory(ACCOUNT_HASH, 1));
    expect(result.current.transactions[0].tokensReceived).toBe(0);
  });

  it('returns 0 for decimal (non-integer) amount string', () => {
    mockUseAccountTransactions.mockReturnValue({
      ...baseHookResult,
      transactions: [{ ...baseTx, amount: '1500.5' }],
    });
    const { result } = renderHook(() => useTransactionHistory(ACCOUNT_HASH, 1));
    expect(result.current.transactions[0].tokensReceived).toBe(0);
  });

  // ── direction detection ───────────────────────────────────────────────

  it('sets direction "in" when to_hash matches accountHex', () => {
    mockUseAccountTransactions.mockReturnValue({
      ...baseHookResult,
      transactions: [{ ...baseTx, to_hash: ACCOUNT_HEX }],
    });
    const { result } = renderHook(() => useTransactionHistory(ACCOUNT_HASH, 1));
    expect(result.current.transactions[0].direction).toBe('in');
  });

  it('sets direction "out" when to_hash does not match accountHex', () => {
    mockUseAccountTransactions.mockReturnValue({
      ...baseHookResult,
      transactions: [{ ...baseTx, to_hash: 'other_hash' }],
    });
    const { result } = renderHook(() => useTransactionHistory(ACCOUNT_HASH, 1));
    expect(result.current.transactions[0].direction).toBe('out');
  });

  it('direction comparison is case-insensitive', () => {
    mockUseAccountTransactions.mockReturnValue({
      ...baseHookResult,
      transactions: [{ ...baseTx, to_hash: ACCOUNT_HEX.toUpperCase() }],
    });
    const { result } = renderHook(() => useTransactionHistory(ACCOUNT_HASH, 1));
    expect(result.current.transactions[0].direction).toBe('in');
  });

  // ── BIG token detection ───────────────────────────────────────────────

  it('sets type "purchase" for BIG token transactions', () => {
    mockUseAccountTransactions.mockReturnValue({
      ...baseHookResult,
      transactions: [{ ...baseTx, contract_package_hash: BIG_TOKEN_HASH }],
    });
    const { result } = renderHook(() => useTransactionHistory(ACCOUNT_HASH, 1));
    expect(result.current.transactions[0].type).toBe('purchase');
  });

  it('sets type "transfer" for non-BIG token_transfer transactions', () => {
    mockUseAccountTransactions.mockReturnValue({
      ...baseHookResult,
      transactions: [{ ...baseTx, contract_package_hash: 'other_token', to_type: 0 }],
    });
    const { result } = renderHook(() => useTransactionHistory(ACCOUNT_HASH, 1));
    expect(result.current.transactions[0].type).toBe('transfer');
  });

  // ── transaction ID composition ────────────────────────────────────────

  it('composes id from deploy_hash and transform_idx', () => {
    mockUseAccountTransactions.mockReturnValue({
      ...baseHookResult,
      transactions: [{ ...baseTx, deploy_hash: 'abc', transform_idx: 3 }],
    });
    const { result } = renderHook(() => useTransactionHistory(ACCOUNT_HASH, 1));
    expect(result.current.transactions[0].id).toBe('abc-3');
  });

  it('falls back to transform_idx 0 when null', () => {
    mockUseAccountTransactions.mockReturnValue({
      ...baseHookResult,
      transactions: [{ ...baseTx, deploy_hash: 'abc', transform_idx: null }],
    });
    const { result } = renderHook(() => useTransactionHistory(ACCOUNT_HASH, 1));
    expect(result.current.transactions[0].id).toBe('abc-0');
  });

  // ── timestamp handling ────────────────────────────────────────────────

  it('converts ISO timestamp string to Date', () => {
    mockUseAccountTransactions.mockReturnValue({
      ...baseHookResult,
      transactions: [{ ...baseTx, timestamp: '2024-06-15T12:00:00Z' }],
    });
    const { result } = renderHook(() => useTransactionHistory(ACCOUNT_HASH, 1));
    expect(result.current.transactions[0].timestamp).toBeInstanceOf(Date);
  });

  it('sets timestamp to null when missing', () => {
    mockUseAccountTransactions.mockReturnValue({
      ...baseHookResult,
      transactions: [{ ...baseTx, timestamp: null }],
    });
    const { result } = renderHook(() => useTransactionHistory(ACCOUNT_HASH, 1));
    expect(result.current.transactions[0].timestamp).toBeNull();
  });

  // ── null accountHash ──────────────────────────────────────────────────

  it('returns empty transactions when accountHash is null', () => {
    mockUseAccountTransactions.mockReturnValue(baseHookResult);
    const { result } = renderHook(() => useTransactionHistory(null, 1));
    expect(result.current.transactions).toHaveLength(0);
  });
});
