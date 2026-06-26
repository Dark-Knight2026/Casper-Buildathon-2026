import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/api-client', () => ({
  backendClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
  ApiError: class ApiError extends Error {
    statusCode?: number;
    constructor(message: string, statusCode?: number) {
      super(message);
      this.statusCode = statusCode;
    }
  },
}));

import { backendClient, ApiError } from '@/lib/api-client';
import {
  getNonce,
  loginWithSignature,
  refreshSession,
  logoutSession,
  sendVerificationEmail,
  resendVerificationEmail,
  confirmEmailVerification,
  register,
  loginWithPassword,
  forgotPassword,
  resetPassword,
  type ServerUserInfo,
} from '@/services/backendAuthService';

const mockGet = vi.mocked(backendClient.get);
const mockPost = vi.mocked(backendClient.post);

const SAMPLE_USER: ServerUserInfo = {
  id: 'user-1',
  role: 'tenant',
  wallet_address: '02walletabc',
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
  onchain_user_id: null,
};

// Signature prefixing is detected by LENGTH, not leading bytes: a raw signature
// is 128 hex chars; one already carrying the 1-byte algo prefix is 130. Use
// realistic lengths so "already-prefixed → as-is" is exercised correctly.
const RAW_SIG = 'ab'.repeat(64); // 128 hex chars
const PREFIXED_SIG_02 = `02${RAW_SIG}`; // 130 hex chars
const PREFIXED_SIG_01 = `01${RAW_SIG}`; // 130 hex chars

// Unauthenticated auth calls opt out of the global 401→refresh→redirect:
// skipRefresh (no session yet) + skipAuthError (errors handled in-page, never a
// full-page reload). Asserting these guards the "failed login reloads" fix.
const UNAUTH_OPTS = { retry: false, skipRefresh: true, skipAuthError: true };

describe('backendAuthService', () => {
  beforeEach(() => vi.clearAllMocks());

  // ── getNonce ─────────────────────────────────────────────────────────

  describe('getNonce', () => {
    it('calls the nonce endpoint with encoded wallet address', async () => {
      mockGet.mockResolvedValue({ nonce: 'abc', message: 'sign this' });
      await getNonce('02abc123');
      expect(
        mockGet,
        'GET /api/v1/auth/nonce should be called with raw wallet_address and retry disabled'
      ).toHaveBeenCalledWith('/api/v1/auth/nonce?wallet_address=02abc123', {
        retry: false,
      });
    });

    it('URL-encodes special characters in wallet address', async () => {
      mockGet.mockResolvedValue({ nonce: 'x', message: 'y' });
      await getNonce('02ab+cd');
      expect(
        mockGet,
        '"+" in wallet_address must be percent-encoded as %2B in the query string'
      ).toHaveBeenCalledWith('/api/v1/auth/nonce?wallet_address=02ab%2Bcd', {
        retry: false,
      });
    });

    it('returns the nonce response', async () => {
      mockGet.mockResolvedValue({
        nonce: 'test-nonce',
        message: 'please sign',
      });
      const result = await getNonce('02abc');
      expect(
        result,
        'getNonce should pass the response body through unchanged'
      ).toEqual({
        nonce: 'test-nonce',
        message: 'please sign',
      });
    });

    it('propagates errors from backendClient', async () => {
      mockGet.mockRejectedValue(new Error('Network error'));
      await expect(
        getNonce('02abc'),
        'transport errors must surface to the caller, not be swallowed'
      ).rejects.toThrow('Network error');
    });
  });

  // ── loginWithSignature ────────────────────────────────────────────────

  describe('loginWithSignature', () => {
    it('passes signature as-is when it already has the correct 02 prefix', async () => {
      mockPost.mockResolvedValue({ user: SAMPLE_USER });
      await loginWithSignature('02walletabc', PREFIXED_SIG_02);
      expect(
        mockPost,
        'login payload should reuse a 02-prefixed signature without re-prefixing'
      ).toHaveBeenCalledWith(
        '/api/v1/auth/login',
        { wallet_address: '02walletabc', signature: PREFIXED_SIG_02 },
        { retry: false }
      );
    });

    it('prepends 02 prefix when Secp256k1 signature has no prefix', async () => {
      mockPost.mockResolvedValue({ user: SAMPLE_USER });
      await loginWithSignature('02walletabc', 'rawsig');
      expect(
        mockPost,
        'unprefixed signature for a 02 wallet should be sent as 02-prefixed'
      ).toHaveBeenCalledWith(
        '/api/v1/auth/login',
        { wallet_address: '02walletabc', signature: '02rawsig' },
        { retry: false }
      );
    });

    it('passes 01-prefixed signature as-is for Ed25519 wallet', async () => {
      mockPost.mockResolvedValue({ user: SAMPLE_USER });
      await loginWithSignature('01walletabc', PREFIXED_SIG_01);
      expect(
        mockPost,
        '01-prefixed signature for an Ed25519 wallet must not be re-prefixed'
      ).toHaveBeenCalledWith(
        '/api/v1/auth/login',
        { wallet_address: '01walletabc', signature: PREFIXED_SIG_01 },
        { retry: false }
      );
    });

    it('prepends 01 prefix for Ed25519 wallet when signature has no prefix', async () => {
      mockPost.mockResolvedValue({ user: SAMPLE_USER });
      await loginWithSignature('01walletabc', 'rawsig');
      expect(
        mockPost,
        'unprefixed signature for an Ed25519 wallet should be sent as 01-prefixed'
      ).toHaveBeenCalledWith(
        '/api/v1/auth/login',
        { wallet_address: '01walletabc', signature: '01rawsig' },
        { retry: false }
      );
    });

    it('omits role from the body when not provided', async () => {
      mockPost.mockResolvedValue({ user: SAMPLE_USER });
      await loginWithSignature('02walletabc', '02sigabc');
      const [, body] = mockPost.mock.calls[0];
      expect(
        body,
        'role must not appear in the login body unless the caller passes one — backend defaults to tenant on first INSERT'
      ).not.toHaveProperty('role');
    });

    it('forwards role as a top-level field when provided (Register flow)', async () => {
      mockPost.mockResolvedValue({ user: SAMPLE_USER });
      await loginWithSignature('02walletabc', PREFIXED_SIG_02, 'landlord');
      expect(
        mockPost,
        'when Register passes role=landlord it must reach the backend in the JSON body'
      ).toHaveBeenCalledWith(
        '/api/v1/auth/login',
        {
          wallet_address: '02walletabc',
          signature: PREFIXED_SIG_02,
          role: 'landlord',
        },
        { retry: false }
      );
    });

    it('returns the login response (user only — tokens travel as cookies)', async () => {
      const response = { user: SAMPLE_USER };
      mockPost.mockResolvedValue(response);
      const result = await loginWithSignature('02abc', '02sig');
      expect(
        result,
        'loginWithSignature should pass through the body verbatim ({ user })'
      ).toEqual(response);
    });

    it('propagates errors from backendClient', async () => {
      mockPost.mockRejectedValue(new Error('401 Unauthorized'));
      await expect(
        loginWithSignature('02abc', '02sig'),
        'login transport errors must surface to the caller'
      ).rejects.toThrow('401 Unauthorized');
    });
  });

  // ── refreshSession ────────────────────────────────────────────────────

  describe('refreshSession', () => {
    it('POSTs /auth/refresh with skipRefresh and returns true on success', async () => {
      mockPost.mockResolvedValue(undefined);
      const ok = await refreshSession();
      expect(
        mockPost,
        'refreshSession must opt out of the 401-refresh loop via skipRefresh'
      ).toHaveBeenCalledWith('/api/v1/auth/refresh', undefined, {
        retry: false,
        skipRefresh: true,
      });
      expect(ok, 'successful refresh should resolve to true').toBe(true);
    });

    it('returns false when the refresh cookie is missing/expired (401)', async () => {
      mockPost.mockRejectedValue(new ApiError('Unauthorized', 401));
      const ok = await refreshSession();
      expect(
        ok,
        '401 from refresh endpoint should resolve to false (logged out)'
      ).toBe(false);
    });

    it('returns false on 404 (refresh endpoint not deployed yet)', async () => {
      mockPost.mockRejectedValue(new ApiError('Not Found', 404));
      const ok = await refreshSession();
      expect(
        ok,
        'a 404 should be treated as no-session rather than rethrown so the UI degrades cleanly'
      ).toBe(false);
    });

    it('rethrows non-auth errors (e.g. network down) so callers can distinguish', async () => {
      mockPost.mockRejectedValue(new Error('Failed to fetch'));
      await expect(
        refreshSession(),
        'transient network failures must propagate so we do not wipe a still-valid session'
      ).rejects.toThrow('Failed to fetch');
    });
  });

  // ── logoutSession ─────────────────────────────────────────────────────

  describe('logoutSession', () => {
    it('POSTs /auth/logout with skipRefresh', async () => {
      mockPost.mockResolvedValue(undefined);
      await logoutSession();
      expect(
        mockPost,
        'logoutSession must opt out of the 401-refresh loop via skipRefresh'
      ).toHaveBeenCalledWith('/api/v1/auth/logout', undefined, {
        retry: false,
        skipRefresh: true,
      });
    });

    it('swallows errors so callers can clear local state regardless', async () => {
      mockPost.mockRejectedValue(new Error('boom'));
      await expect(
        logoutSession(),
        'logoutSession is best-effort — failures must not throw out of it'
      ).resolves.toBeUndefined();
    });
  });

  // ── email verification (BACKENDAUTH-01) ───────────────────────────────

  describe('sendVerificationEmail', () => {
    it('POSTs the send endpoint with no body and retry disabled', async () => {
      mockPost.mockResolvedValue({ status: 'sent' });
      await sendVerificationEmail();
      expect(
        mockPost,
        'send must hit /verify/email/send with no body and retry off (a queued send still resolves "sent")'
      ).toHaveBeenCalledWith('/api/v1/auth/verify/email/send', undefined, {
        retry: false,
      });
    });

    it('returns the send response verbatim', async () => {
      const res = { status: 'sent' as const };
      mockPost.mockResolvedValue(res);
      await expect(
        sendVerificationEmail(),
        'send should pass the { status } body through unchanged'
      ).resolves.toEqual(res);
    });

    it('propagates errors from backendClient', async () => {
      mockPost.mockRejectedValue(new ApiError('rate limited', 429));
      await expect(
        sendVerificationEmail(),
        'a 429 rate-limit must surface to the caller, not be swallowed'
      ).rejects.toThrow('rate limited');
    });
  });

  describe('resendVerificationEmail', () => {
    it('POSTs the distinct resend endpoint with no body and retry disabled', async () => {
      mockPost.mockResolvedValue({ status: 'sent' });
      await resendVerificationEmail();
      expect(
        mockPost,
        'resend must hit the separate /verify/email/resend endpoint (distinct metrics), not /send'
      ).toHaveBeenCalledWith('/api/v1/auth/verify/email/resend', undefined, {
        retry: false,
      });
    });

    it('propagates errors from backendClient', async () => {
      mockPost.mockRejectedValue(new Error('boom'));
      await expect(resendVerificationEmail()).rejects.toThrow('boom');
    });
  });

  describe('confirmEmailVerification', () => {
    it('POSTs { token } and sets skipAuthError so the in-page 401 handler runs', async () => {
      mockPost.mockResolvedValue({ user: SAMPLE_USER });
      await confirmEmailVerification('tok-123');
      expect(
        mockPost,
        'confirm must send { token } with skipAuthError:true so a 401 is classified in-page (needs_login vs bad token) instead of hard-redirecting to /auth/login'
      ).toHaveBeenCalledWith(
        '/api/v1/auth/verify/email/confirm',
        { token: 'tok-123' },
        { retry: false, skipAuthError: true }
      );
    });

    it('returns the upgraded user from the confirm response', async () => {
      mockPost.mockResolvedValue({ user: SAMPLE_USER });
      await expect(
        confirmEmailVerification('tok'),
        'confirm should pass the { user } body through so the caller can feed AuthContext directly'
      ).resolves.toEqual({ user: SAMPLE_USER });
    });

    it('propagates errors from backendClient', async () => {
      mockPost.mockRejectedValue(new ApiError('invalid_or_expired_token', 401));
      await expect(
        confirmEmailVerification('tok'),
        'a bad/expired-token 401 must surface so the page can classify it'
      ).rejects.toThrow('invalid_or_expired_token');
    });
  });

  // ── email + password auth ─────────────────────────────────────────────

  describe('register', () => {
    it('POSTs /auth/register with the body and unauthenticated options', async () => {
      mockPost.mockResolvedValue({ user: SAMPLE_USER });
      const body = {
        email: 'jane@example.com',
        password: 'Valid123',
        first_name: 'Jane',
        last_name: 'Doe',
        role: 'tenant' as const,
      };
      await register(body);
      expect(
        mockPost,
        'register must not trigger the global refresh/redirect (no session yet)'
      ).toHaveBeenCalledWith('/api/v1/auth/register', body, UNAUTH_OPTS);
    });

    it('propagates a 409 (email taken) to the caller', async () => {
      mockPost.mockRejectedValue(new ApiError('Email already registered', 409));
      await expect(
        register({
          email: 'a@b.com',
          password: 'Valid123',
          first_name: 'A',
          last_name: 'B',
        })
      ).rejects.toThrow('Email already registered');
    });
  });

  describe('loginWithPassword', () => {
    it('POSTs /auth/login/password and does not hard-redirect on failure', async () => {
      mockPost.mockResolvedValue({ user: SAMPLE_USER });
      await loginWithPassword('jane@example.com', 'Valid123');
      expect(
        mockPost,
        'a 401 here is a wrong-credentials case handled in-form, so skipAuthError must be set'
      ).toHaveBeenCalledWith(
        '/api/v1/auth/login/password',
        { email: 'jane@example.com', password: 'Valid123' },
        UNAUTH_OPTS
      );
    });
  });

  describe('forgotPassword', () => {
    it('POSTs /auth/password/forgot with just the email', async () => {
      mockPost.mockResolvedValue({ status: 'sent' });
      const res = await forgotPassword('jane@example.com');
      expect(mockPost).toHaveBeenCalledWith(
        '/api/v1/auth/password/forgot',
        { email: 'jane@example.com' },
        UNAUTH_OPTS
      );
      expect(
        res,
        'anti-enumeration: response is always { status: "sent" }'
      ).toEqual({
        status: 'sent',
      });
    });
  });

  describe('resetPassword', () => {
    it('POSTs /auth/password/reset mapping newPassword → new_password', async () => {
      mockPost.mockResolvedValue({ user: SAMPLE_USER });
      await resetPassword('tok123', 'Valid123');
      expect(mockPost).toHaveBeenCalledWith(
        '/api/v1/auth/password/reset',
        { token: 'tok123', new_password: 'Valid123' },
        UNAUTH_OPTS
      );
    });
  });
});
