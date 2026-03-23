import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/constants/ico', () => ({
  ICO_CONFIG: {
    CONTRACTS: { vestingPackageHash: 'hash-aabbcc' },
    CASPER: { networkName: 'casper-test', rpcUrl: 'https://rpc.test' },
  },
}));

vi.mock('@/lib/logger', () => ({ default: { debug: vi.fn(), log: vi.fn(), warn: vi.fn() } }));

const mockCreateContractCallTransaction = vi.fn();
vi.mock('@/services/ico/casperClient', () => ({
  createContractCallTransaction: (...args: unknown[]) => mockCreateContractCallTransaction(...args),
  stripHashPrefix: (h: string) => h.replace(/^hash-/, ''),
}));

// casper-js-sdk mocks
vi.mock('casper-js-sdk', () => ({
  Args: { fromMap: vi.fn(() => ({ _map: true })) },
  CLValue: { newCLUInt256: vi.fn((v) => ({ _u256: v })) },
}));

import { parseVestingError, createClaimTransaction } from '@/services/ico/vestingClaimService';
import { Args, CLValue } from 'casper-js-sdk';

describe('vestingClaimService', () => {
  beforeEach(() => vi.clearAllMocks());

  // ── parseVestingError ─────────────────────────────────────────────────

  describe('parseVestingError', () => {
    it('returns "Claim failed" when no message is provided', () => {
      expect(parseVestingError()).toBe('Claim failed');
      expect(parseVestingError(undefined)).toBe('Claim failed');
    });

    it('maps error code 65005 → "Vesting schedule not found"', () => {
      expect(parseVestingError('User error: 65005')).toBe('Vesting schedule not found');
    });

    it('maps error code 65006 → "Only the beneficiary can claim these tokens"', () => {
      expect(parseVestingError('User error: 65006')).toBe('Only the beneficiary can claim these tokens');
    });

    it('maps error code 65007 → "Nothing to claim — tokens are not yet unlocked"', () => {
      expect(parseVestingError('User error: 65007')).toBe('Nothing to claim — tokens are not yet unlocked');
    });

    it('maps error code 65008 → "Claim blocked by active unbonding"', () => {
      expect(parseVestingError('User error: 65008')).toBe('Claim blocked by active unbonding');
    });

    it('returns the raw message for unknown User error codes', () => {
      expect(parseVestingError('User error: 99999')).toBe('User error: 99999');
    });

    it('returns the raw message when no "User error:" pattern is found', () => {
      expect(parseVestingError('Something went wrong')).toBe('Something went wrong');
    });

    it('handles multiword messages without User error prefix', () => {
      expect(parseVestingError('Claim transaction was cancelled')).toBe('Claim transaction was cancelled');
    });
  });

  // ── createClaimTransaction ─────────────────────────────────────────────

  describe('createClaimTransaction', () => {
    const publicKey = '02aabbcc';
    const vestingId = 42n;
    const fakeTx = { toJSON: () => ({}) };

    beforeEach(() => {
      mockCreateContractCallTransaction.mockReturnValue(fakeTx);
    });

    it('builds CLValue.newCLUInt256 with the vesting ID', () => {
      createClaimTransaction(publicKey, vestingId);
      expect(CLValue.newCLUInt256).toHaveBeenCalledWith(vestingId);
    });

    it('builds Args with vesting_id key', () => {
      createClaimTransaction(publicKey, vestingId);
      expect(Args.fromMap).toHaveBeenCalledWith(
        expect.objectContaining({ vesting_id: expect.anything() }),
      );
    });

    it('calls createContractCallTransaction with correct publicKey and entry point', () => {
      createClaimTransaction(publicKey, vestingId);
      expect(mockCreateContractCallTransaction).toHaveBeenCalledWith(
        publicKey,
        'hash-aabbcc',
        'claim',
        expect.anything(),
        3_000_000_000n,
        true,
      );
    });

    it('returns the transaction object', () => {
      const result = createClaimTransaction(publicKey, vestingId);
      expect(result).toBe(fakeTx);
    });
  });
});
