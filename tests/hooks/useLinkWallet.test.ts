import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// Hoisted mocks so the factories can reference them (vi.mock is hoisted above imports).
const { refreshProfile, getNonce, linkWallet } = vi.hoisted(() => ({
  refreshProfile: vi.fn(),
  getNonce: vi.fn(),
  linkWallet: vi.fn(),
}));

vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ refreshProfile }) }));
vi.mock('@/services/backendAuthService', () => ({ getNonce }));
vi.mock('@/services/userProfileService', () => ({ linkWallet }));

import { useLinkWallet } from '@/hooks/auth/useLinkWallet';
import { ApiError } from '@/lib/api-client';

function makeClickRef(signResult: unknown) {
  return { signMessage: vi.fn().mockResolvedValue(signResult) } as never;
}

beforeEach(() => {
  refreshProfile.mockReset().mockResolvedValue(undefined);
  getNonce.mockReset().mockResolvedValue({ nonce: 'n', message: 'sign me' });
  linkWallet.mockReset().mockResolvedValue({ id: '1', wallet_address: '01pub' });
});

describe('useLinkWallet', () => {
  it('runs nonce → sign → link → refresh and returns true', async () => {
    const clickRef = makeClickRef({ signatureHex: 'rawsig' });
    const { result } = renderHook(() => useLinkWallet());

    let ok: boolean | undefined;
    await act(async () => {
      ok = await result.current.link(clickRef, '01pubkey');
    });

    expect(getNonce).toHaveBeenCalledWith('01pubkey');
    expect(clickRef.signMessage).toHaveBeenCalledWith('sign me', '01pubkey');
    // 01 (Ed25519) prefix prepended to the raw signature.
    expect(linkWallet).toHaveBeenCalledWith('01pubkey', '01rawsig');
    expect(refreshProfile).toHaveBeenCalledOnce();
    expect(ok).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it('keeps an already-prefixed signature as-is', async () => {
    const clickRef = makeClickRef({ signatureHex: '02alreadysig' });
    const { result } = renderHook(() => useLinkWallet());
    await act(async () => {
      await result.current.link(clickRef, '02pubkey');
    });
    expect(linkWallet).toHaveBeenCalledWith('02pubkey', '02alreadysig');
  });

  it('returns false and sets an error when signing is cancelled', async () => {
    const clickRef = makeClickRef({ cancelled: true });
    const { result } = renderHook(() => useLinkWallet());

    let ok: boolean | undefined;
    await act(async () => {
      ok = await result.current.link(clickRef, '01pubkey');
    });

    expect(ok).toBe(false);
    expect(linkWallet).not.toHaveBeenCalled();
    expect(result.current.error).toBe('Signing was cancelled.');
  });

  it('maps a 409 to an "already linked" message', async () => {
    linkWallet.mockRejectedValueOnce(new ApiError('Wallet already linked', 409));
    const clickRef = makeClickRef({ signatureHex: 'sig' });
    const { result } = renderHook(() => useLinkWallet());

    let ok: boolean | undefined;
    await act(async () => {
      ok = await result.current.link(clickRef, '01pubkey');
    });

    expect(ok).toBe(false);
    expect(result.current.error).toMatch(/already linked/i);
    expect(refreshProfile).not.toHaveBeenCalled();
  });

  it('maps a 401 to an ownership-verification message', async () => {
    linkWallet.mockRejectedValueOnce(new ApiError('Invalid signature', 401));
    const clickRef = makeClickRef({ signatureHex: 'sig' });
    const { result } = renderHook(() => useLinkWallet());
    await act(async () => {
      await result.current.link(clickRef, '01pubkey');
    });
    expect(result.current.error).toMatch(/verify wallet ownership/i);
  });

  it('no-ops (false) when clickRef or publicKey is missing', async () => {
    const { result } = renderHook(() => useLinkWallet());
    let ok: boolean | undefined;
    await act(async () => {
      ok = await result.current.link(null, '01pubkey');
    });
    expect(ok).toBe(false);
    expect(getNonce).not.toHaveBeenCalled();
  });
});
