import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

// ── Mocks ──────────────────────────────────────────────────────────────────

const mockUseICOWallet = vi.fn();
vi.mock('@/hooks/ico/useICOWallet', () => ({
  useICOWallet: () => mockUseICOWallet(),
}));

const mockGetNonce = vi.fn();
const mockLoginWithSignature = vi.fn();
vi.mock('@/services/backendAuthService', () => ({
  getNonce: (...args: unknown[]) => mockGetNonce(...args),
  loginWithSignature: (...args: unknown[]) => mockLoginWithSignature(...args),
}));

vi.mock('@/utils/logger', () => ({
  logger: { log: vi.fn(), debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

// Import AFTER vi.mock so the gate picks up the mocked services. ApiError is
// imported directly from api-client (NOT mocked) so the gate's `instanceof
// ApiError` check inside isReauthRequired() narrows correctly against a real
// thrown instance — mocking it as `class ApiError extends Error {}` would
// still satisfy instanceof, but using the real class keeps the test honest
// against the production constructor signature.
import { useReauthGate } from '@/hooks/auth/useReauthGate';
import { ApiError } from '@/lib/api-client';

// ── Helpers ────────────────────────────────────────────────────────────────

const PUBLIC_KEY = '01abc';

function reauthError(): ApiError {
  // Mirrors the shape api-client.handleResponse throws when the backend
  // returns { error: "reauthentication_required" } with status 403.
  return new ApiError('reauthentication_required', 403, undefined, 'reauthentication_required');
}

function plainError(): ApiError {
  return new ApiError('Forbidden', 403, undefined, 'something_else');
}

function setWallet(overrides: { clickRef?: unknown; publicKey?: string | null } = {}) {
  const clickRef =
    overrides.clickRef ?? { signMessage: vi.fn() };
  const publicKey = overrides.publicKey === undefined ? PUBLIC_KEY : overrides.publicKey;
  mockUseICOWallet.mockReturnValue({
    clickRef,
    account: publicKey ? { publicKey } : null,
  });
  return { clickRef };
}

beforeEach(() => {
  mockUseICOWallet.mockReset();
  mockGetNonce.mockReset();
  mockLoginWithSignature.mockReset();
});

// ── Tests ──────────────────────────────────────────────────────────────────

describe('useReauthGate — happy path', () => {
  it('returns the call result directly when the underlying call succeeds', async () => {
    setWallet();
    const { result } = renderHook(() => useReauthGate());
    const value = await act(() => result.current.runWithReauth(async () => 42));
    expect(value, 'no error means no reauth dance — pass the result straight through').toBe(42);
    expect(result.current.state.status, 'state stays idle on the green path').toBe('idle');
  });

  it('does NOT trigger the wallet round-trip for non-reauth errors', async () => {
    setWallet();
    const { result } = renderHook(() => useReauthGate());

    await expect(
      act(() => result.current.runWithReauth(() => Promise.reject(plainError()))),
    ).rejects.toBeInstanceOf(ApiError);

    expect(
      mockGetNonce,
      'a generic 403 must not consume the wallet — only `reauthentication_required` does'
    ).not.toHaveBeenCalled();
  });
});

describe('useReauthGate — reauth flow', () => {
  it('signs, re-logins, and replays the call exactly once on success', async () => {
    const signMessage = vi
      .fn()
      .mockResolvedValueOnce({ cancelled: false, signatureHex: 'deadbeef' });
    setWallet({ clickRef: { signMessage } });
    mockGetNonce.mockResolvedValueOnce({ message: 'nonce-message' });
    mockLoginWithSignature.mockResolvedValueOnce({ user: { id: '1' } });

    const call = vi
      .fn()
      .mockRejectedValueOnce(reauthError())
      .mockResolvedValueOnce('replayed-result');

    const { result } = renderHook(() => useReauthGate());
    const value = await act(() => result.current.runWithReauth(call));

    expect(call, 'call must fire twice: original (403) + replay (200)').toHaveBeenCalledTimes(2);
    expect(value, 'gate must surface the REPLAY result, not the original failure').toBe(
      'replayed-result',
    );
    expect(mockGetNonce).toHaveBeenCalledWith(PUBLIC_KEY);
    expect(signMessage).toHaveBeenCalledWith('nonce-message', PUBLIC_KEY);
    expect(mockLoginWithSignature).toHaveBeenCalledWith(PUBLIC_KEY, 'deadbeef');
    expect(
      result.current.state.status,
      'state must collapse back to idle once the replay lands so the UI un-blocks'
    ).toBe('idle');
  });

  it('does NOT loop if the replay returns another reauth error — state→still-blocked', async () => {
    const signMessage = vi
      .fn()
      .mockResolvedValueOnce({ cancelled: false, signatureHex: 'beef' });
    setWallet({ clickRef: { signMessage } });
    mockGetNonce.mockResolvedValueOnce({ message: 'm' });
    mockLoginWithSignature.mockResolvedValueOnce({ user: { id: '1' } });

    // Original 403 → reauth → replay → ANOTHER 403. Without the loop guard
    // the gate would re-enter and produce an infinite wallet-popup loop.
    const call = vi
      .fn()
      .mockRejectedValueOnce(reauthError())
      .mockRejectedValueOnce(reauthError());

    const { result } = renderHook(() => useReauthGate());

    let caught: unknown = null;
    await act(async () => {
      try {
        await result.current.runWithReauth(call);
      } catch (err) {
        caught = err;
      }
    });

    expect(caught, 'replay throwing must propagate to the caller').toBeInstanceOf(ApiError);
    expect(call, 'replay attempted exactly once — no recursive reauth').toHaveBeenCalledTimes(2);
    await waitFor(() =>
      expect(
        result.current.state,
        'still-blocked is the terminal sentinel for "session is fighting us"'
      ).toEqual({ status: 'error', reason: 'still-blocked' }),
    );
  });
});

describe('useReauthGate — error paths', () => {
  // Shared helper for the "error-path" tests below. Catches the expected
  // rejection inside `act` so React flushes the final setState before we
  // observe `result.current.state`. Without this wrapper, `act(() => promise)`
  // settles via the rejection but the trailing re-render sometimes lags.
  async function runAndCatch<T>(
    runWithReauth: (call: () => Promise<T>) => Promise<T>,
    call: () => Promise<T>,
  ): Promise<unknown> {
    let caught: unknown = null;
    await act(async () => {
      try {
        await runWithReauth(call);
      } catch (err) {
        caught = err;
      }
    });
    return caught;
  }

  it('reports no-wallet and re-throws the original 403 when account is missing', async () => {
    // Wallet hook reports "connected" but lost the public key — the gate
    // cannot produce a signature, so it cannot complete reauth. Surface
    // the original 403 so the page can route to /auth/login.
    setWallet({ publicKey: null });
    const { result } = renderHook(() => useReauthGate());

    const original = reauthError();
    const caught = await runAndCatch(result.current.runWithReauth, () => Promise.reject(original));

    expect(caught, 'original 403 must propagate so the page-level handler can react').toBe(original);
    await waitFor(() =>
      expect(result.current.state).toEqual({ status: 'error', reason: 'no-wallet' }),
    );
    expect(
      mockGetNonce,
      'without a public key there is nothing to sign — must not even ask for a nonce'
    ).not.toHaveBeenCalled();
  });

  it('reports cancelled when signMessage resolves with cancelled=true', async () => {
    const signMessage = vi.fn().mockResolvedValueOnce({ cancelled: true });
    setWallet({ clickRef: { signMessage } });
    mockGetNonce.mockResolvedValueOnce({ message: 'm' });

    const { result } = renderHook(() => useReauthGate());
    const original = reauthError();
    const caught = await runAndCatch(result.current.runWithReauth, () => Promise.reject(original));

    expect(caught).toBe(original);
    await waitFor(() =>
      expect(result.current.state).toEqual({ status: 'error', reason: 'cancelled' }),
    );
    expect(
      mockLoginWithSignature,
      'cancel means no signature → must NOT POST a login attempt with empty/garbage data'
    ).not.toHaveBeenCalled();
  });

  it('reports cancelled when signMessage throws', async () => {
    const signMessage = vi.fn().mockRejectedValueOnce(new Error('wallet popup error'));
    setWallet({ clickRef: { signMessage } });
    mockGetNonce.mockResolvedValueOnce({ message: 'm' });

    const { result } = renderHook(() => useReauthGate());
    const original = reauthError();
    const caught = await runAndCatch(result.current.runWithReauth, () => Promise.reject(original));

    expect(caught).toBe(original);
    await waitFor(() =>
      expect(result.current.state).toEqual({ status: 'error', reason: 'cancelled' }),
    );
  });

  it('reports login-failed when loginWithSignature throws', async () => {
    const signMessage = vi
      .fn()
      .mockResolvedValueOnce({ cancelled: false, signatureHex: 'ab' });
    setWallet({ clickRef: { signMessage } });
    mockGetNonce.mockResolvedValueOnce({ message: 'm' });
    mockLoginWithSignature.mockRejectedValueOnce(new Error('login 500'));

    const { result } = renderHook(() => useReauthGate());
    const original = reauthError();
    const caught = await runAndCatch(result.current.runWithReauth, () => Promise.reject(original));

    expect(caught).toBe(original);
    await waitFor(() =>
      expect(result.current.state).toEqual({ status: 'error', reason: 'login-failed' }),
    );
  });
});

describe('useReauthGate — reset', () => {
  it('clears an error state back to idle on demand', async () => {
    setWallet({ publicKey: null });
    const { result } = renderHook(() => useReauthGate());

    await act(async () => {
      try {
        await result.current.runWithReauth(() => Promise.reject(reauthError()));
      } catch {
        // expected — see no-wallet branch
      }
    });
    await waitFor(() => expect(result.current.state.status).toBe('error'));

    act(() => result.current.reset());
    expect(
      result.current.state.status,
      'reset() is the dismiss hook for the destructive alert in RoleSwitchDialog'
    ).toBe('idle');
  });
});
