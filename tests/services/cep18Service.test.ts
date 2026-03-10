import { describe, it, expect, vi, beforeEach } from 'vitest';

// Only stub RPC-calling functions; use real clValueToBigInt / clValueToString
const mockQueryContractState = vi.fn();
const mockQueryDictionaryItem = vi.fn();

vi.mock('@/services/ico/casperClient', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/services/ico/casperClient')>();
  return {
    ...actual,
    queryContractState: (...args: unknown[]) => mockQueryContractState(...args),
    queryDictionaryItem: (...args: unknown[]) => mockQueryDictionaryItem(...args),
  };
});

vi.mock('@/constants/ico', () => ({
  ICO_CONFIG: {
    CONTRACTS: {
      tokenAddress: 'hash-big-token',
      usdcAddress: 'hash-usdc',
      usdtAddress: 'hash-usdt',
    },
  },
}));

import {
  getBalance,
  getAllowance,
  getTotalSupply,
  getTokenMetadata,
  getBIGBalance,
  TOKEN_HASHES,
} from '@/services/ico/cep18Service';

describe('TOKEN_HASHES', () => {
  it('contains BIG, USDC, USDT addresses from config', () => {
    expect(TOKEN_HASHES.BIG).toBe('hash-big-token');
    expect(TOKEN_HASHES.USDC).toBe('hash-usdc');
    expect(TOKEN_HASHES.USDT).toBe('hash-usdt');
  });
});

describe('getBalance', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns balance from dictionary lookup', async () => {
    mockQueryDictionaryItem.mockResolvedValue({ clValue: { ui256: '1000' } });

    const balance = await getBalance('hash-token', 'account-hash-abc');
    expect(balance).toBe(1000n);
    expect(mockQueryDictionaryItem).toHaveBeenCalledWith(
      'hash-token',
      'balances',
      'account-hash-abc',
    );
  });

  it('returns 0n when no balance found', async () => {
    mockQueryDictionaryItem.mockResolvedValue(null);

    const balance = await getBalance('hash-token', 'account-hash-abc');
    expect(balance).toBe(0n);
  });

  it('returns 0n when clValue is null', async () => {
    mockQueryDictionaryItem.mockResolvedValue({ clValue: null });

    const balance = await getBalance('hash-token', 'account-hash-abc');
    expect(balance).toBe(0n);
  });
});

describe('getAllowance', () => {
  beforeEach(() => vi.clearAllMocks());

  it('queries allowance dictionary with blake2b hashed key', async () => {
    mockQueryDictionaryItem.mockResolvedValue({ clValue: { ui256: '500' } });

    const allowance = await getAllowance('hash-token', 'account-hash-owner', 'hash-spender');
    expect(allowance).toBe(500n);
    // Verify it called with 'allowances' dictionary
    expect(mockQueryDictionaryItem).toHaveBeenCalledWith(
      'hash-token',
      'allowances',
      expect.any(String), // blake2b hash of owner+spender bytes
    );
  });

  it('returns 0n when no allowance set', async () => {
    mockQueryDictionaryItem.mockResolvedValue(null);

    const allowance = await getAllowance('hash-token', 'account-hash-owner', 'hash-spender');
    expect(allowance).toBe(0n);
  });

  it('produces different keys for different owner/spender pairs', async () => {
    mockQueryDictionaryItem.mockResolvedValue(null);

    await getAllowance('hash-token', 'account-hash-aaa', 'hash-bbb');
    const call1Key = mockQueryDictionaryItem.mock.calls[0][2];

    await getAllowance('hash-token', 'account-hash-bbb', 'hash-aaa');
    const call2Key = mockQueryDictionaryItem.mock.calls[1][2];

    // Different order of owner/spender should produce different dictionary keys
    expect(call1Key).not.toBe(call2Key);
  });
});

describe('getTotalSupply', () => {
  beforeEach(() => vi.clearAllMocks());

  it('reads total_supply from contract state', async () => {
    mockQueryContractState.mockResolvedValue({ clValue: { ui256: '5000000' } });

    const supply = await getTotalSupply('hash-token');
    expect(supply).toBe(5000000n);
    expect(mockQueryContractState).toHaveBeenCalledWith('hash-token', ['total_supply']);
  });

  it('returns 0n when not found', async () => {
    mockQueryContractState.mockResolvedValue(null);

    const supply = await getTotalSupply('hash-token');
    expect(supply).toBe(0n);
  });
});

describe('getTokenMetadata', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns full metadata when all fields present', async () => {
    mockQueryContractState
      .mockResolvedValueOnce({ clValue: { stringVal: 'BIG Token' } })  // name
      .mockResolvedValueOnce({ clValue: { stringVal: 'BIG' } })        // symbol
      .mockResolvedValueOnce({ clValue: { ui8: '18' } })               // decimals
      .mockResolvedValueOnce({ clValue: { ui256: '5000000000' } });    // totalSupply

    const metadata = await getTokenMetadata('hash-token');

    expect(metadata).toEqual({
      name: 'BIG Token',
      symbol: 'BIG',
      decimals: 18,
      totalSupply: 5000000000n,
    });
  });

  it('returns null when name and symbol are both empty', async () => {
    mockQueryContractState.mockResolvedValue(null);

    const metadata = await getTokenMetadata('hash-token');
    expect(metadata).toBeNull();
  });
});

describe('getBIGBalance', () => {
  beforeEach(() => vi.clearAllMocks());

  it('delegates to getBalance with BIG token hash', async () => {
    mockQueryDictionaryItem.mockResolvedValue({ clValue: { ui256: '100' } });

    const balance = await getBIGBalance('account-hash-abc');
    expect(balance).toBe(100n);
    expect(mockQueryDictionaryItem).toHaveBeenCalledWith(
      'hash-big-token',
      'balances',
      'account-hash-abc',
    );
  });
});
