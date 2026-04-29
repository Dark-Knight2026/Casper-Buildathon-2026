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
  type ServerUserInfo,
} from '@/services/ico/backendAuthService';

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
};

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
      ).toHaveBeenCalledWith('/api/v1/auth/nonce?wallet_address=02abc123', { retry: false });
    });

    it('URL-encodes special characters in wallet address', async () => {
      mockGet.mockResolvedValue({ nonce: 'x', message: 'y' });
      await getNonce('02ab+cd');
      expect(
        mockGet,
        '"+" in wallet_address must be percent-encoded as %2B in the query string'
      ).toHaveBeenCalledWith('/api/v1/auth/nonce?wallet_address=02ab%2Bcd', { retry: false });
    });

    it('returns the nonce response', async () => {
      mockGet.mockResolvedValue({ nonce: 'test-nonce', message: 'please sign' });
      const result = await getNonce('02abc');
      expect(result, 'getNonce should pass the response body through unchanged').toEqual({
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
      await loginWithSignature('02walletabc', '02sigabc');
      expect(
        mockPost,
        'login payload should reuse a 02-prefixed signature without re-prefixing'
      ).toHaveBeenCalledWith(
        '/api/v1/auth/login',
        { wallet_address: '02walletabc', signature: '02sigabc' },
        { retry: false },
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
        { retry: false },
      );
    });

    it('passes 01-prefixed signature as-is for Ed25519 wallet', async () => {
      mockPost.mockResolvedValue({ user: SAMPLE_USER });
      await loginWithSignature('01walletabc', '01sigabc');
      expect(
        mockPost,
        '01-prefixed signature for an Ed25519 wallet must not be re-prefixed'
      ).toHaveBeenCalledWith(
        '/api/v1/auth/login',
        { wallet_address: '01walletabc', signature: '01sigabc' },
        { retry: false },
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
        { retry: false },
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
      expect(ok, '401 from refresh endpoint should resolve to false (logged out)').toBe(false);
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
});
