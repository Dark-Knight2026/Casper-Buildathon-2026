import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// ── Mocks ──────────────────────────────────────────────────────────────────
//
// useSensitiveAction wraps three collaborators that we mock independently so
// each side effect can be asserted in isolation:
//   - useReauthGate : drives the reauth round-trip. Replaced with a spy that
//                     forwards the underlying call so we can choose to make
//                     it resolve or reject.
//   - useAuth       : provides walletSignOut(); spied to confirm the local
//                     session is wiped on success.
//   - useNavigate   : redirect to /auth/login after the cleanup runs.

const mockRunWithReauth = vi.fn();
const mockReset = vi.fn();
const mockReauthState = { status: 'idle' as const };

vi.mock('@/hooks/auth/useReauthGate', () => ({
  useReauthGate: () => ({
    runWithReauth: mockRunWithReauth,
    state: mockReauthState,
    reset: mockReset,
  }),
}));

const mockWalletSignOut = vi.fn();
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ walletSignOut: mockWalletSignOut }),
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

import { useSensitiveAction } from '@/hooks/auth/useSensitiveAction';

// ── Helpers ────────────────────────────────────────────────────────────────

function seedLocalStorage() {
  // CSPR.click keys that the cleanup must strip. Mix with unrelated keys so
  // we can verify the loop removes the right prefix and nothing else.
  localStorage.setItem('csprclick:session', '{"token":"abc"}');
  localStorage.setItem('csprclick:provider', 'google');
  localStorage.setItem('csprclick:nonce', 'xyz');
  localStorage.setItem('app:theme', 'dark');
  localStorage.setItem('user:preferences', '{}');
}

beforeEach(() => {
  mockRunWithReauth.mockReset();
  mockReset.mockReset();
  mockWalletSignOut.mockReset();
  mockNavigate.mockReset();
  localStorage.clear();
});

afterEach(() => {
  localStorage.clear();
});

// ── Tests ──────────────────────────────────────────────────────────────────

describe('useSensitiveAction — successful reauth', () => {
  it('returns the underlying call result and runs the cleanup sequence', async () => {
    mockRunWithReauth.mockImplementation(async (call: () => Promise<unknown>) => call());
    seedLocalStorage();

    const { result } = renderHook(() => useSensitiveAction());
    const serverResponse = { role: 'landlord' };

    const value = await act(() => result.current.runAndReauth(async () => serverResponse));

    expect(
      value,
      'callers read fields off the server response before the redirect — the original payload must propagate'
    ).toEqual(serverResponse);
    expect(
      mockWalletSignOut,
      'AuthContext must be cleared so the next request does not 401 mid-flow on a stale session marker'
    ).toHaveBeenCalledTimes(1);
    expect(
      mockNavigate,
      'redirect must land on /auth/login with replace so the back button does not return to the now-authless page'
    ).toHaveBeenCalledWith('/auth/login', { replace: true });
  });

  it('strips csprclick:* keys from localStorage and leaves unrelated keys intact', async () => {
    mockRunWithReauth.mockImplementation(async (call: () => Promise<unknown>) => call());
    seedLocalStorage();

    const { result } = renderHook(() => useSensitiveAction());

    await act(() => result.current.runAndReauth(async () => undefined));

    expect(
      localStorage.getItem('csprclick:session'),
      'csprclick:* keys must be wiped — leaving them on disk causes the SDK to revalidate a dead account on next mount'
    ).toBeNull();
    expect(localStorage.getItem('csprclick:provider')).toBeNull();
    expect(localStorage.getItem('csprclick:nonce')).toBeNull();
    expect(
      localStorage.getItem('app:theme'),
      'cleanup must be prefix-scoped — unrelated keys (theme, prefs) must survive'
    ).toBe('dark');
    expect(localStorage.getItem('user:preferences')).toBe('{}');
  });
});

describe('useSensitiveAction — reauth failure', () => {
  it('re-throws the underlying error and skips every post-call side effect', async () => {
    const failure = new Error('reauth cancelled');
    mockRunWithReauth.mockRejectedValueOnce(failure);
    seedLocalStorage();

    const { result } = renderHook(() => useSensitiveAction());

    await expect(
      act(() => result.current.runAndReauth(async () => 'never-returned')),
    ).rejects.toBe(failure);

    expect(
      mockWalletSignOut,
      'failed reauth must NOT wipe the session — the user is still authenticated under the old role'
    ).not.toHaveBeenCalled();
    expect(
      mockNavigate,
      'no redirect on failure — keep the user on the current page so the error UI can surface'
    ).not.toHaveBeenCalled();
    expect(
      localStorage.getItem('csprclick:session'),
      'cleanup must be gated behind a successful call; localStorage stays intact on failure'
    ).toBe('{"token":"abc"}');
  });
});

describe('useSensitiveAction — forwarded state machine', () => {
  it('forwards state and reset from the underlying useReauthGate', () => {
    mockRunWithReauth.mockImplementation(async (call: () => Promise<unknown>) => call());
    const { result } = renderHook(() => useSensitiveAction());

    expect(
      result.current.state,
      'state must mirror the underlying gate so callers can drive the "Confirm with your wallet" prompt'
    ).toBe(mockReauthState);

    result.current.reset();
    expect(
      mockReset,
      'reset must passthrough — the same function reference clears the gate after a dismissed error'
    ).toHaveBeenCalledTimes(1);
  });
});
