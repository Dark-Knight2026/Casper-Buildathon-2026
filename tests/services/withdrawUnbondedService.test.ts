import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/constants/ico', () => ({
  ICO_CONFIG: {
    CONTRACTS: { icoPackageHash: 'hash-aabbcc' },
    CASPER: { networkName: 'casper-test', rpcUrl: 'https://rpc.test' },
  },
}));

vi.mock('@/lib/logger', () => ({ default: { debug: vi.fn(), log: vi.fn(), warn: vi.fn() } }));

const mockCreateContractCallTransaction = vi.fn();
vi.mock('@/services/ico/casperClient', () => ({
  createContractCallTransaction: (...args: unknown[]) => mockCreateContractCallTransaction(...args),
}));

vi.mock('casper-js-sdk', () => ({
  Args: { fromMap: vi.fn(() => ({ _map: true })) },
}));

import { parseWithdrawError, createWithdrawUnbondedTransaction } from '@/services/ico/withdrawUnbondedService';
import { Args } from 'casper-js-sdk';

describe('withdrawUnbondedService', () => {
  beforeEach(() => vi.clearAllMocks());

  // ── parseWithdrawError ────────────────────────────────────────────────

  describe('parseWithdrawError', () => {
    it('returns "Withdraw failed" when no message is provided', () => {
      expect(parseWithdrawError()).toBe('Withdraw failed');
      expect(parseWithdrawError(undefined)).toBe('Withdraw failed');
    });

    it('maps error code 609 → "No unbonding in progress"', () => {
      expect(parseWithdrawError('User error: 609')).toBe('No unbonding in progress');
    });

    it('maps error code 610 → "Unbonding period not finished yet — please wait"', () => {
      expect(parseWithdrawError('User error: 610')).toBe('Unbonding period not finished yet — please wait');
    });

    it('maps error code 606 → "Unbonding already in progress"', () => {
      expect(parseWithdrawError('User error: 606')).toBe('Unbonding already in progress');
    });

    it('maps error code 601 → "Staking contract is not configured"', () => {
      expect(parseWithdrawError('User error: 601')).toBe('Staking contract is not configured');
    });

    it('maps error code 604 → "Nothing staked"', () => {
      expect(parseWithdrawError('User error: 604')).toBe('Nothing staked');
    });

    it('returns raw message for unknown error codes', () => {
      expect(parseWithdrawError('User error: 999')).toBe('User error: 999');
    });

    it('returns raw message for non-user-error strings', () => {
      expect(parseWithdrawError('Network timeout')).toBe('Network timeout');
    });
  });

  // ── createWithdrawUnbondedTransaction ─────────────────────────────────

  describe('createWithdrawUnbondedTransaction', () => {
    const fakeTx = { toJSON: () => ({ type: 'Transaction' }) };

    beforeEach(() => {
      mockCreateContractCallTransaction.mockReturnValue(fakeTx);
    });

    it('returns the transaction from createContractCallTransaction', () => {
      const tx = createWithdrawUnbondedTransaction('02aabbcc');
      expect(tx).toBe(fakeTx);
    });

    it('calls createContractCallTransaction with entrypoint "withdraw_unbonded"', () => {
      createWithdrawUnbondedTransaction('02aabbcc');
      const [, , entrypoint] = mockCreateContractCallTransaction.mock.calls[0];
      expect(entrypoint).toBe('withdraw_unbonded');
    });

    it('calls createContractCallTransaction with the sender public key', () => {
      createWithdrawUnbondedTransaction('02aabbcc');
      const [senderKey] = mockCreateContractCallTransaction.mock.calls[0];
      expect(senderKey).toBe('02aabbcc');
    });

    it('calls createContractCallTransaction with empty Args', () => {
      createWithdrawUnbondedTransaction('02aabbcc');
      expect(Args.fromMap).toHaveBeenCalledWith({});
    });

    it('calls createContractCallTransaction with isPackageHash=true', () => {
      createWithdrawUnbondedTransaction('02aabbcc');
      const args = mockCreateContractCallTransaction.mock.calls[0];
      expect(args[args.length - 1]).toBe(true);
    });
  });
});
