import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// ── Mocks ──────────────────────────────────────────────────────────────────

const mockGetNonce = vi.fn();
const mockLoginWithSignature = vi.fn();
const mockLogoutSession = vi.fn();

vi.mock('@/services/ico', () => ({
  getNonce: (...args: unknown[]) => mockGetNonce(...args),
  loginWithSignature: (...args: unknown[]) => mockLoginWithSignature(...args),
  logoutSession: (...args: unknown[]) => mockLogoutSession(...args),
}));

vi.mock('@/utils/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { useBackendAuth } from '@/hooks/ico/useBackendAuth';
import type { ServerUserInfo } from '@/services/ico/backendAuthService';

// ── Constants ──────────────────────────────────────────────────────────────

const PUBLIC_KEY = '02aabbccddeeff001122334455';
const NONCE_MESSAGE = 'Please sign this nonce: abc123';
const SIGNATURE_HEX = 'deadbeef1234567890';

const SAMPLE_USER: ServerUserInfo = {
  id: 'user-1',
  role: 'tenant',
  wallet_address: PUBLIC_KEY,
  status: 'active',
  email: 'user@example.com',
  first_name: 'Ada',
  last_name: 'Lovelace',
  phone: null,
  avatar_url: null,
  bio: null,
  is_profile_complete: true,
  active_leases_count: 0,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-04-01T00:00:00Z',
};

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
    mockGetNonce.mockResolvedValue({ message: NONCE_MESSAGE });
    mockLoginWithSignature.mockResolvedValue({ user: SAMPLE_USER });
    mockLogoutSession.mockResolvedValue(undefined);
  });

  // ── Initial state ────────────────────────────────────────────────────────

  describe('initial isAuthenticated state', () => {
    it('is false before any login', () => {
      const { result } = renderHook(() => useBackendAuth(null, PUBLIC_KEY));
      expect(
        result.current.isAuthenticated,
        'cookie session is verified by AuthContext, not this hook — fresh hook starts unauthenticated'
      ).toBe(false);
    });

    it('exposes user=null before login', () => {
      const { result } = renderHook(() => useBackendAuth(null, PUBLIC_KEY));
      expect(
        result.current.user,
        'user must be null until a successful loginWithSignature call resolves'
      ).toBeNull();
    });
  });

  // ── login() preconditions ─────────────────────────────────────────────────

  describe('login() guard conditions', () => {
    it('does nothing when clickRef is null', async () => {
      const { result } = renderHook(() => useBackendAuth(null, PUBLIC_KEY));
      await act(async () => {
        await result.current.login();
      });
      expect(
        mockGetNonce,
        'login() must short-circuit before hitting the network when clickRef is missing'
      ).not.toHaveBeenCalled();
      expect(result.current.isAuthenticated, 'no clickRef → no auth').toBe(false);
      expect(result.current.isLoading, 'guarded login() must not leave isLoading=true').toBe(false);
    });

    it('does nothing when publicKey is null', async () => {
      const clickRef = makeClickRef();
      const { result } = renderHook(() => useBackendAuth(clickRef as never, null));
      await act(async () => {
        await result.current.login();
      });
      expect(
        mockGetNonce,
        'login() must short-circuit when no publicKey is provided'
      ).not.toHaveBeenCalled();
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.isLoading).toBe(false);
    });

    it('does nothing when publicKey is undefined', async () => {
      const clickRef = makeClickRef();
      const { result } = renderHook(() => useBackendAuth(clickRef as never, undefined));
      await act(async () => {
        await result.current.login();
      });
      expect(mockGetNonce).not.toHaveBeenCalled();
    });
  });

  // ── login() loading state ─────────────────────────────────────────────────

  describe('login() isLoading', () => {
    it('sets isLoading=true during execution and false after', async () => {
      let resolveNonce!: (v: unknown) => void;
      mockGetNonce.mockReturnValue(
        new Promise((res) => {
          resolveNonce = res;
        })
      );

      const clickRef = makeClickRef();
      const { result } = renderHook(() => useBackendAuth(clickRef as never, PUBLIC_KEY));

      // Start login without awaiting
      act(() => {
        result.current.login();
      });

      // isLoading should be true while getNonce is pending
      expect(
        result.current.isLoading,
        'isLoading must flip to true while the auth flow is in flight'
      ).toBe(true);

      // Resolve the nonce and let the rest complete
      await act(async () => {
        resolveNonce({ message: NONCE_MESSAGE });
        await Promise.resolve();
      });
    });

    it('resets isLoading to false after successful login', async () => {
      const clickRef = makeClickRef();
      const { result } = renderHook(() => useBackendAuth(clickRef as never, PUBLIC_KEY));
      await act(async () => {
        await result.current.login();
      });
      expect(result.current.isLoading, 'isLoading must reset after login resolves').toBe(false);
    });
  });

  // ── login() happy path ────────────────────────────────────────────────────

  describe('login() success flow', () => {
    it('calls getNonce with publicKey', async () => {
      const clickRef = makeClickRef();
      const { result } = renderHook(() => useBackendAuth(clickRef as never, PUBLIC_KEY));
      await act(async () => {
        await result.current.login();
      });
      expect(mockGetNonce, 'getNonce should receive the wallet publicKey').toHaveBeenCalledWith(
        PUBLIC_KEY
      );
    });

    it('calls clickRef.signMessage with the nonce message and publicKey', async () => {
      const clickRef = makeClickRef();
      const { result } = renderHook(() => useBackendAuth(clickRef as never, PUBLIC_KEY));
      await act(async () => {
        await result.current.login();
      });
      expect(
        clickRef.signMessage,
        'wallet must be asked to sign the exact nonce message returned from /auth/nonce'
      ).toHaveBeenCalledWith(NONCE_MESSAGE, PUBLIC_KEY);
    });

    it('exposes the server user from the login response', async () => {
      const clickRef = makeClickRef();
      const { result } = renderHook(() => useBackendAuth(clickRef as never, PUBLIC_KEY));
      await act(async () => {
        await result.current.login();
      });
      expect(
        result.current.user,
        'after login, hook must expose the ServerUserInfo from the response body'
      ).toEqual(SAMPLE_USER);
    });

    it('sets isAuthenticated=true on success', async () => {
      const clickRef = makeClickRef();
      const { result } = renderHook(() => useBackendAuth(clickRef as never, PUBLIC_KEY));
      await act(async () => {
        await result.current.login();
      });
      expect(
        result.current.isAuthenticated,
        'isAuthenticated tracks user !== null'
      ).toBe(true);
    });

    it('does not touch localStorage for tokens (cookies are HttpOnly)', async () => {
      const clickRef = makeClickRef();
      const { result } = renderHook(() => useBackendAuth(clickRef as never, PUBLIC_KEY));
      await act(async () => {
        await result.current.login();
      });
      // Pre-cookie code stored a JWT under "leasefi_jwt"; the new flow must not.
      expect(
        localStorage.getItem('leasefi_jwt'),
        'no JWT may be persisted to localStorage — auth tokens are HttpOnly cookies'
      ).toBeNull();
    });
  });

  // ── login() error cases ───────────────────────────────────────────────────

  describe('login() error cases', () => {
    it('sets error when signMessage returns cancelled=true', async () => {
      const clickRef = makeClickRef({ cancelled: true, signatureHex: undefined });
      const { result } = renderHook(() => useBackendAuth(clickRef as never, PUBLIC_KEY));
      await act(async () => {
        await result.current.login();
      });
      expect(result.current.error, 'cancelled signing must surface as an error').toBe(
        'Message signing was cancelled'
      );
      expect(result.current.isAuthenticated).toBe(false);
    });

    it('sets error when signMessage returns no signatureHex', async () => {
      const clickRef = makeClickRef({ cancelled: false, signatureHex: undefined });
      const { result } = renderHook(() => useBackendAuth(clickRef as never, PUBLIC_KEY));
      await act(async () => {
        await result.current.login();
      });
      expect(
        result.current.error,
        'missing signatureHex is treated as user cancellation'
      ).toBe('Message signing was cancelled');
      expect(result.current.isAuthenticated).toBe(false);
    });

    it('sets error when signMessage returns null result', async () => {
      const clickRef = {
        signMessage: vi.fn().mockResolvedValue(null),
      };
      const { result } = renderHook(() => useBackendAuth(clickRef as never, PUBLIC_KEY));
      await act(async () => {
        await result.current.login();
      });
      expect(
        result.current.error,
        'a null SDK response is also treated as user cancellation'
      ).toBe('Message signing was cancelled');
    });

    it('sets error when getNonce throws', async () => {
      mockGetNonce.mockRejectedValue(new Error('Nonce service down'));
      const clickRef = makeClickRef();
      const { result } = renderHook(() => useBackendAuth(clickRef as never, PUBLIC_KEY));
      await act(async () => {
        await result.current.login();
      });
      expect(result.current.error, 'getNonce errors should surface verbatim').toBe(
        'Nonce service down'
      );
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.isLoading).toBe(false);
    });

    it('sets error when loginWithSignature throws', async () => {
      mockLoginWithSignature.mockRejectedValue(new Error('Auth backend error'));
      const clickRef = makeClickRef();
      const { result } = renderHook(() => useBackendAuth(clickRef as never, PUBLIC_KEY));
      await act(async () => {
        await result.current.login();
      });
      expect(result.current.error, 'login transport errors should surface verbatim').toBe(
        'Auth backend error'
      );
      expect(result.current.isAuthenticated).toBe(false);
    });

    it('uses fallback error message when thrown error is not an Error instance', async () => {
      mockGetNonce.mockRejectedValue('some string error');
      const clickRef = makeClickRef();
      const { result } = renderHook(() => useBackendAuth(clickRef as never, PUBLIC_KEY));
      await act(async () => {
        await result.current.login();
      });
      expect(
        result.current.error,
        'non-Error rejections fall back to a generic auth-failure message'
      ).toBe('Authentication failed');
    });
  });

  // ── logout() ─────────────────────────────────────────────────────────────

  describe('logout()', () => {
    async function loginFirst(clickRef: ReturnType<typeof makeClickRef>) {
      const hook = renderHook(() => useBackendAuth(clickRef as never, PUBLIC_KEY));
      await act(async () => {
        await hook.result.current.login();
      });
      return hook;
    }

    it('clears the local user and sets isAuthenticated=false', async () => {
      const clickRef = makeClickRef();
      const { result } = await loginFirst(clickRef);
      expect(result.current.isAuthenticated, 'precondition: login must succeed').toBe(true);

      act(() => {
        result.current.logout();
      });
      expect(result.current.user, 'logout must null out the local user').toBeNull();
      expect(result.current.isAuthenticated, 'logout must drop isAuthenticated to false').toBe(
        false
      );
    });

    it('triggers a server-side logout call (cookie revocation)', async () => {
      const clickRef = makeClickRef();
      const { result } = await loginFirst(clickRef);

      act(() => {
        result.current.logout();
      });
      expect(
        mockLogoutSession,
        'logout must hit /auth/logout so the backend revokes the refresh family'
      ).toHaveBeenCalled();
    });
  });

  // ── account switch ───────────────────────────────────────────────────────

  describe('account switch', () => {
    it('logs out when the publicKey changes mid-session', async () => {
      const clickRef = makeClickRef();
      const { result, rerender } = renderHook(
        ({ pk }: { pk: string | null }) => useBackendAuth(clickRef as never, pk),
        { initialProps: { pk: PUBLIC_KEY } }
      );

      await act(async () => {
        await result.current.login();
      });
      expect(result.current.isAuthenticated, 'precondition: account A is logged in').toBe(true);

      const NEW_PUBLIC_KEY = '02ffeeddccbbaa9988776655';
      rerender({ pk: NEW_PUBLIC_KEY });

      expect(
        result.current.isAuthenticated,
        'switching wallets must drop the in-memory session for safety'
      ).toBe(false);
      expect(
        mockLogoutSession,
        'wallet switch must also tell the backend to revoke the previous session'
      ).toHaveBeenCalled();
    });
  });
});
