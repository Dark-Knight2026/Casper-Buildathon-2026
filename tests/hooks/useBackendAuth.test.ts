import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// ── Mocks ──────────────────────────────────────────────────────────────────

const mockGetNonce = vi.fn();
const mockLoginWithSignature = vi.fn();
const mockApplyToken = vi.fn();

vi.mock('@/services/ico/backendAuthService', () => ({
  getNonce: (...args: unknown[]) => mockGetNonce(...args),
  loginWithSignature: (...args: unknown[]) => mockLoginWithSignature(...args),
  applyToken: (...args: unknown[]) => mockApplyToken(...args),
}));

vi.mock('@/utils/logger', () => ({
  logger: { debug: vi.fn(), error: vi.fn() },
}));

import { useBackendAuth } from '@/hooks/ico/useBackendAuth';

// ── JWT helpers ────────────────────────────────────────────────────────────

function makeFakeJwt(exp: number): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = btoa(JSON.stringify({ sub: '1', exp }));
  return `${header}.${payload}.signature`;
}

const futureExp = Math.floor(Date.now() / 1000) + 3600;
const pastExp = Math.floor(Date.now() / 1000) - 3600;

// ── Constants ──────────────────────────────────────────────────────────────

const TOKEN_KEY = 'leasefi_jwt';
const PUBLIC_KEY = '02aabbccddeeff001122334455';
const NONCE_MESSAGE = 'Please sign this nonce: abc123';
const SIGNATURE_HEX = 'deadbeef1234567890';
const RETURNED_TOKEN = makeFakeJwt(futureExp);

// ── clickRef helpers ───────────────────────────────────────────────────────

function makeClickRef(overrides: Record<string, unknown> = {}) {
  return {
    signMessage: vi.fn().mockResolvedValue({
      cancelled: false,
      signatureHex: SIGNATURE_HEX,
      ...overrides,
    }),
  };
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('useBackendAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mockGetNonce.mockResolvedValue({ message: NONCE_MESSAGE });
    mockLoginWithSignature.mockResolvedValue({ token: RETURNED_TOKEN });
  });

  afterEach(() => {
    localStorage.clear();
  });

  // ── Initial state: localStorage ──────────────────────────────────────────

  describe('initial isAuthenticated state', () => {
    it('is false when localStorage is empty', () => {
      const { result } = renderHook(() => useBackendAuth(null, PUBLIC_KEY));
      expect(result.current.isAuthenticated).toBe(false);
    });

    it('is false when stored JWT is expired', () => {
      localStorage.setItem(TOKEN_KEY, makeFakeJwt(pastExp));
      const { result } = renderHook(() => useBackendAuth(null, PUBLIC_KEY));
      expect(result.current.isAuthenticated).toBe(false);
      // Should clean up the expired token
      expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
    });

    it('is false when stored JWT is malformed (catch block)', () => {
      localStorage.setItem(TOKEN_KEY, 'not.a.valid.jwt.at.all');
      const { result } = renderHook(() => useBackendAuth(null, PUBLIC_KEY));
      expect(result.current.isAuthenticated).toBe(false);
      // Malformed token should be removed
      expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
    });

    it('is true when valid non-expired JWT is in localStorage', () => {
      const validToken = makeFakeJwt(futureExp);
      localStorage.setItem(TOKEN_KEY, validToken);
      const { result } = renderHook(() => useBackendAuth(null, PUBLIC_KEY));
      expect(result.current.isAuthenticated).toBe(true);
    });
  });

  // ── login() preconditions ─────────────────────────────────────────────────

  describe('login() guard conditions', () => {
    it('does nothing when clickRef is null', async () => {
      const { result } = renderHook(() => useBackendAuth(null, PUBLIC_KEY));
      await act(async () => { await result.current.login(); });
      expect(mockGetNonce).not.toHaveBeenCalled();
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.isLoading).toBe(false);
    });

    it('does nothing when publicKey is null', async () => {
      const clickRef = makeClickRef();
      const { result } = renderHook(
        () => useBackendAuth(clickRef as never, null),
      );
      await act(async () => { await result.current.login(); });
      expect(mockGetNonce).not.toHaveBeenCalled();
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.isLoading).toBe(false);
    });

    it('does nothing when publicKey is undefined', async () => {
      const clickRef = makeClickRef();
      const { result } = renderHook(
        () => useBackendAuth(clickRef as never, undefined),
      );
      await act(async () => { await result.current.login(); });
      expect(mockGetNonce).not.toHaveBeenCalled();
    });
  });

  // ── login() loading state ─────────────────────────────────────────────────

  describe('login() isLoading', () => {
    it('sets isLoading=true during execution and false after', async () => {
      let resolveNonce!: (v: unknown) => void;
      mockGetNonce.mockReturnValue(new Promise((res) => { resolveNonce = res; }));

      const clickRef = makeClickRef();
      const { result } = renderHook(
        () => useBackendAuth(clickRef as never, PUBLIC_KEY),
      );

      // Start login without awaiting
      act(() => { result.current.login(); });

      // isLoading should be true while getNonce is pending
      expect(result.current.isLoading).toBe(true);

      // Resolve the nonce and let the rest complete
      await act(async () => {
        resolveNonce({ message: NONCE_MESSAGE });
        await Promise.resolve();
      });
    });

    it('resets isLoading to false after successful login', async () => {
      const clickRef = makeClickRef();
      const { result } = renderHook(
        () => useBackendAuth(clickRef as never, PUBLIC_KEY),
      );
      await act(async () => { await result.current.login(); });
      expect(result.current.isLoading).toBe(false);
    });
  });

  // ── login() happy path ────────────────────────────────────────────────────

  describe('login() success flow', () => {
    it('calls getNonce with publicKey', async () => {
      const clickRef = makeClickRef();
      const { result } = renderHook(
        () => useBackendAuth(clickRef as never, PUBLIC_KEY),
      );
      await act(async () => { await result.current.login(); });
      expect(mockGetNonce).toHaveBeenCalledWith(PUBLIC_KEY);
    });

    it('calls clickRef.signMessage with the nonce message and publicKey', async () => {
      const clickRef = makeClickRef();
      const { result } = renderHook(
        () => useBackendAuth(clickRef as never, PUBLIC_KEY),
      );
      await act(async () => { await result.current.login(); });
      expect(clickRef.signMessage).toHaveBeenCalledWith(NONCE_MESSAGE, PUBLIC_KEY);
    });

    it('stores token in localStorage on success', async () => {
      const clickRef = makeClickRef();
      const { result } = renderHook(
        () => useBackendAuth(clickRef as never, PUBLIC_KEY),
      );
      await act(async () => { await result.current.login(); });
      expect(localStorage.getItem(TOKEN_KEY)).toBe(RETURNED_TOKEN);
    });

    it('calls applyToken with the returned token on success', async () => {
      const clickRef = makeClickRef();
      const { result } = renderHook(
        () => useBackendAuth(clickRef as never, PUBLIC_KEY),
      );
      await act(async () => { await result.current.login(); });
      expect(mockApplyToken).toHaveBeenCalledWith(RETURNED_TOKEN);
    });

    it('sets isAuthenticated=true on success', async () => {
      const clickRef = makeClickRef();
      const { result } = renderHook(
        () => useBackendAuth(clickRef as never, PUBLIC_KEY),
      );
      await act(async () => { await result.current.login(); });
      expect(result.current.isAuthenticated).toBe(true);
    });
  });

  // ── login() error cases ───────────────────────────────────────────────────

  describe('login() error cases', () => {
    it('sets error when signMessage returns cancelled=true', async () => {
      const clickRef = makeClickRef({ cancelled: true, signatureHex: undefined });
      const { result } = renderHook(
        () => useBackendAuth(clickRef as never, PUBLIC_KEY),
      );
      await act(async () => { await result.current.login(); });
      expect(result.current.error).toBe('Message signing was cancelled');
      expect(result.current.isAuthenticated).toBe(false);
    });

    it('sets error when signMessage returns no signatureHex', async () => {
      const clickRef = makeClickRef({ cancelled: false, signatureHex: undefined });
      const { result } = renderHook(
        () => useBackendAuth(clickRef as never, PUBLIC_KEY),
      );
      await act(async () => { await result.current.login(); });
      expect(result.current.error).toBe('Message signing was cancelled');
      expect(result.current.isAuthenticated).toBe(false);
    });

    it('sets error when signMessage returns null result', async () => {
      const clickRef = {
        signMessage: vi.fn().mockResolvedValue(null),
      };
      const { result } = renderHook(
        () => useBackendAuth(clickRef as never, PUBLIC_KEY),
      );
      await act(async () => { await result.current.login(); });
      expect(result.current.error).toBe('Message signing was cancelled');
    });

    it('sets error when getNonce throws', async () => {
      mockGetNonce.mockRejectedValue(new Error('Nonce service down'));
      const clickRef = makeClickRef();
      const { result } = renderHook(
        () => useBackendAuth(clickRef as never, PUBLIC_KEY),
      );
      await act(async () => { await result.current.login(); });
      expect(result.current.error).toBe('Nonce service down');
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.isLoading).toBe(false);
    });

    it('sets error when loginWithSignature throws', async () => {
      mockLoginWithSignature.mockRejectedValue(new Error('Auth backend error'));
      const clickRef = makeClickRef();
      const { result } = renderHook(
        () => useBackendAuth(clickRef as never, PUBLIC_KEY),
      );
      await act(async () => { await result.current.login(); });
      expect(result.current.error).toBe('Auth backend error');
      expect(result.current.isAuthenticated).toBe(false);
    });

    it('uses fallback error message when thrown error is not an Error instance', async () => {
      mockGetNonce.mockRejectedValue('some string error');
      const clickRef = makeClickRef();
      const { result } = renderHook(
        () => useBackendAuth(clickRef as never, PUBLIC_KEY),
      );
      await act(async () => { await result.current.login(); });
      expect(result.current.error).toBe('Authentication failed');
    });
  });

  // ── logout() ─────────────────────────────────────────────────────────────

  describe('logout()', () => {
    async function loginFirst(clickRef: ReturnType<typeof makeClickRef>) {
      const hook = renderHook(() => useBackendAuth(clickRef as never, PUBLIC_KEY));
      await act(async () => { await hook.result.current.login(); });
      return hook;
    }

    it('removes token from localStorage', async () => {
      const clickRef = makeClickRef();
      const { result } = await loginFirst(clickRef);
      expect(localStorage.getItem(TOKEN_KEY)).toBe(RETURNED_TOKEN);

      act(() => { result.current.logout(); });
      expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
    });

    it('calls applyToken(null)', async () => {
      const clickRef = makeClickRef();
      const { result } = await loginFirst(clickRef);

      act(() => { result.current.logout(); });
      expect(mockApplyToken).toHaveBeenLastCalledWith(null);
    });

    it('sets isAuthenticated=false', async () => {
      const clickRef = makeClickRef();
      const { result } = await loginFirst(clickRef);
      expect(result.current.isAuthenticated).toBe(true);

      act(() => { result.current.logout(); });
      expect(result.current.isAuthenticated).toBe(false);
    });

    it('removes token from localStorage even if no login occurred (pre-stored token)', () => {
      localStorage.setItem(TOKEN_KEY, makeFakeJwt(futureExp));
      const { result } = renderHook(() => useBackendAuth(null, PUBLIC_KEY));
      expect(result.current.isAuthenticated).toBe(true);

      act(() => { result.current.logout(); });
      expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });
  });
});
