import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// ── Mocks ─────────────────────────────────────────────────────────────────

const mockGetDeploy = vi.fn();
vi.mock('@/lib/blockchain/csprCloudService', () => ({
  csprCloudService: { getDeploy: (...args: unknown[]) => mockGetDeploy(...args) },
}));

const mockCreateClaimTransaction = vi.fn();
const mockParseVestingError = vi.fn((msg?: string) => msg ?? 'Claim failed');
vi.mock('@/services/ico/vestingClaimService', () => ({
  createClaimTransaction: (...args: unknown[]) => mockCreateClaimTransaction(...args),
  parseVestingError: (msg?: string) => mockParseVestingError(msg),
}));

import { useClaimTokens } from '@/hooks/ico/useClaimTokens';

// ── Helpers ───────────────────────────────────────────────────────────────

const PUBLIC_KEY = '02aabbccddeeff';
const VESTING_ID = 7n;

const fakeTx = { toJSON: () => ({ type: 'Transaction' }) };
const mockSend = vi.fn();
const clickRef = { send: mockSend } as never;

function makeSuccessResult(txHash = 'deploy-hash-abc') {
  return { cancelled: false, error: null, deployHash: txHash };
}

describe('useClaimTokens', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateClaimTransaction.mockReturnValue(fakeTx);
    mockSend.mockResolvedValue(makeSuccessResult());
    mockGetDeploy.mockResolvedValue({ status: 'executed' });
  });

  // ── Initial state ─────────────────────────────────────────────────────

  it('starts in idle state', () => {
    const { result } = renderHook(() => useClaimTokens(PUBLIC_KEY, clickRef));
    expect(result.current.state).toEqual({
      step: 'idle',
      txHash: null,
      error: null,
      isProcessing: false,
    });
  });

  // ── Precondition failures ─────────────────────────────────────────────

  it('transitions to failed when publicKey is null', async () => {
    const onError = vi.fn();
    const { result } = renderHook(() => useClaimTokens(null, clickRef, { onError }));
    await act(async () => { await result.current.claim(VESTING_ID); });
    expect(result.current.state.step).toBe('failed');
    expect(result.current.state.error).toBe('Wallet not connected');
    expect(onError).toHaveBeenCalledWith('Wallet not connected');
  });

  it('transitions to failed when clickRef is null', async () => {
    const onError = vi.fn();
    const { result } = renderHook(() => useClaimTokens(PUBLIC_KEY, null, { onError }));
    await act(async () => { await result.current.claim(VESTING_ID); });
    expect(result.current.state.step).toBe('failed');
    expect(result.current.state.error).toBe('Wallet SDK not initialized');
    expect(onError).toHaveBeenCalledWith('Wallet SDK not initialized');
  });

  // ── Happy path ────────────────────────────────────────────────────────

  it('ends in confirmed state with correct txHash on success', async () => {
    const onSuccess = vi.fn();
    const { result } = renderHook(() => useClaimTokens(PUBLIC_KEY, clickRef, { onSuccess }));

    await act(async () => { await result.current.claim(VESTING_ID); });

    expect(result.current.state.step).toBe('confirmed');
    expect(result.current.state.txHash).toBe('deploy-hash-abc');
    expect(result.current.state.isProcessing).toBe(false);
    expect(result.current.state.error).toBeNull();
    expect(onSuccess).toHaveBeenCalledWith('deploy-hash-abc');
  });

  it('sets isProcessing true while signing is in progress', async () => {
    let resolveSend!: (v: unknown) => void;
    mockSend.mockReturnValue(new Promise((res) => { resolveSend = res; }));

    const { result } = renderHook(() => useClaimTokens(PUBLIC_KEY, clickRef));

    act(() => { result.current.claim(VESTING_ID); });
    // After kicking off, before send resolves — isProcessing should be true
    expect(result.current.state.isProcessing).toBe(true);
    expect(result.current.state.step).toBe('signing');

    await act(async () => { resolveSend(makeSuccessResult()); });
  });

  it('uses transactionHash as fallback when deployHash is absent', async () => {
    mockSend.mockResolvedValue({ cancelled: false, error: null, transactionHash: 'tx-hash-xyz' });
    const { result } = renderHook(() => useClaimTokens(PUBLIC_KEY, clickRef));
    await act(async () => { await result.current.claim(VESTING_ID); });
    expect(result.current.state.txHash).toBe('tx-hash-xyz');
  });

  // ── Wallet signing failures ────────────────────────────────────────────

  it('transitions to failed when wallet signing is cancelled', async () => {
    mockSend.mockResolvedValue({ cancelled: true });
    const onError = vi.fn();
    const { result } = renderHook(() => useClaimTokens(PUBLIC_KEY, clickRef, { onError }));
    await act(async () => { await result.current.claim(VESTING_ID); });
    expect(result.current.state.step).toBe('failed');
    expect(onError).toHaveBeenCalled();
  });

  it('transitions to failed when wallet returns an error', async () => {
    mockSend.mockResolvedValue({ cancelled: false, error: 'User rejected' });
    const { result } = renderHook(() => useClaimTokens(PUBLIC_KEY, clickRef));
    await act(async () => { await result.current.claim(VESTING_ID); });
    expect(result.current.state.step).toBe('failed');
  });

  it('transitions to failed when send() throws', async () => {
    mockSend.mockRejectedValue(new Error('Wallet disconnected'));
    const { result } = renderHook(() => useClaimTokens(PUBLIC_KEY, clickRef));
    await act(async () => { await result.current.claim(VESTING_ID); });
    expect(result.current.state.step).toBe('failed');
  });

  // ── On-chain status failures ──────────────────────────────────────────

  it('transitions to failed when on-chain status is "failed"', async () => {
    mockGetDeploy.mockResolvedValue({ status: 'failed' });
    const onError = vi.fn();
    const { result } = renderHook(() => useClaimTokens(PUBLIC_KEY, clickRef, { onError }));
    await act(async () => { await result.current.claim(VESTING_ID); });
    expect(result.current.state.step).toBe('failed');
    expect(onError).toHaveBeenCalled();
  });

  // ── Double-submit prevention ──────────────────────────────────────────

  it('ignores a second claim() call while one is in progress', async () => {
    let resolveFirst!: () => void;
    mockSend.mockReturnValue(
      new Promise<typeof makeSuccessResult>((res) => {
        resolveFirst = () => res(makeSuccessResult() as never);
      }),
    );

    const { result } = renderHook(() => useClaimTokens(PUBLIC_KEY, clickRef));

    act(() => { result.current.claim(VESTING_ID); });
    act(() => { result.current.claim(VESTING_ID); }); // second call ignored

    await act(async () => { resolveFirst(); });

    // send() must have been called exactly once
    expect(mockSend).toHaveBeenCalledTimes(1);
  });

  // ── reset() ──────────────────────────────────────────────────────────

  it('reset() returns state to idle', async () => {
    mockSend.mockResolvedValue({ cancelled: true });
    const { result } = renderHook(() => useClaimTokens(PUBLIC_KEY, clickRef));
    await act(async () => { await result.current.claim(VESTING_ID); });
    expect(result.current.state.step).toBe('failed');

    act(() => { result.current.reset(); });
    expect(result.current.state).toEqual({
      step: 'idle', txHash: null, error: null, isProcessing: false,
    });
  });

  // ── Abort on unmount ─────────────────────────────────────────────────

  it('does not update state after unmount (abort on unmount)', async () => {
    // keep getDeploy pending so polling is in-flight when we unmount
    let resolveDeploy!: () => void;
    mockGetDeploy.mockReturnValue(
      new Promise((res) => { resolveDeploy = () => res({ status: 'executed' }); }),
    );

    const { result, unmount } = renderHook(() => useClaimTokens(PUBLIC_KEY, clickRef));

    act(() => { result.current.claim(VESTING_ID); });
    // wait for signing to complete
    await act(async () => { await Promise.resolve(); });

    // unmount while polling is still running
    unmount();

    // resolve deploy after unmount — should NOT cause state update
    await act(async () => { resolveDeploy(); await Promise.resolve(); });

    // step stays at 'pending' (last known before unmount), not 'confirmed'
    expect(result.current.state.step).not.toBe('confirmed');
  });
});
