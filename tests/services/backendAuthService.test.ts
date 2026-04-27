import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/api-client', () => ({
  backendClient: {
    get: vi.fn(),
    post: vi.fn(),
    setAuthToken: vi.fn(),
  },
}));

import { backendClient } from '@/lib/api-client';
import { getNonce, loginWithSignature, applyToken } from '@/services/ico/backendAuthService';

const mockGet = vi.mocked(backendClient.get);
const mockPost = vi.mocked(backendClient.post);
const mockSetAuthToken = vi.mocked(backendClient.setAuthToken);

describe('backendAuthService', () => {
  beforeEach(() => vi.clearAllMocks());

  // ── getNonce ─────────────────────────────────────────────────────────

  describe('getNonce', () => {
    it('calls the nonce endpoint with encoded wallet address', async () => {
      mockGet.mockResolvedValue({ nonce: 'abc', message: 'sign this' });
      await getNonce('02abc123');
      expect(mockGet).toHaveBeenCalledWith(
        '/api/v1/auth/nonce?wallet_address=02abc123',
        { retry: false },
      );
    });

    it('URL-encodes special characters in wallet address', async () => {
      mockGet.mockResolvedValue({ nonce: 'x', message: 'y' });
      await getNonce('02ab+cd');
      expect(mockGet).toHaveBeenCalledWith(
        '/api/v1/auth/nonce?wallet_address=02ab%2Bcd',
        { retry: false },
      );
    });

    it('returns the nonce response', async () => {
      mockGet.mockResolvedValue({ nonce: 'test-nonce', message: 'please sign' });
      const result = await getNonce('02abc');
      expect(result).toEqual({ nonce: 'test-nonce', message: 'please sign' });
    });

    it('propagates errors from backendClient', async () => {
      mockGet.mockRejectedValue(new Error('Network error'));
      await expect(getNonce('02abc')).rejects.toThrow('Network error');
    });
  });

  // ── loginWithSignature ────────────────────────────────────────────────

  describe('loginWithSignature', () => {
    it('passes signature as-is when it already has the correct 02 prefix', async () => {
      mockPost.mockResolvedValue({ token: 'jwt', user: { id: '1', role: 'user' } });
      await loginWithSignature('02walletabc', '02sigabc');
      expect(mockPost).toHaveBeenCalledWith(
        '/api/v1/auth/login',
        { wallet_address: '02walletabc', signature: '02sigabc' },
        { retry: false },
      );
    });

    it('prepends 02 prefix when Secp256k1 signature has no prefix', async () => {
      mockPost.mockResolvedValue({ token: 'jwt', user: { id: '1', role: 'user' } });
      await loginWithSignature('02walletabc', 'rawsig');
      expect(mockPost).toHaveBeenCalledWith(
        '/api/v1/auth/login',
        { wallet_address: '02walletabc', signature: '02rawsig' },
        { retry: false },
      );
    });

    it('passes 01-prefixed signature as-is for Ed25519 wallet', async () => {
      mockPost.mockResolvedValue({ token: 'jwt', user: { id: '1', role: 'user' } });
      await loginWithSignature('01walletabc', '01sigabc');
      expect(mockPost).toHaveBeenCalledWith(
        '/api/v1/auth/login',
        { wallet_address: '01walletabc', signature: '01sigabc' },
        { retry: false },
      );
    });

    it('prepends 01 prefix for Ed25519 wallet when signature has no prefix', async () => {
      mockPost.mockResolvedValue({ token: 'jwt', user: { id: '1', role: 'user' } });
      await loginWithSignature('01walletabc', 'rawsig');
      expect(mockPost).toHaveBeenCalledWith(
        '/api/v1/auth/login',
        { wallet_address: '01walletabc', signature: '01rawsig' },
        { retry: false },
      );
    });

    it('returns the login response', async () => {
      const response = { token: 'my-jwt', user: { id: '42', role: 'admin' } };
      mockPost.mockResolvedValue(response);
      const result = await loginWithSignature('02abc', '02sig');
      expect(result).toEqual(response);
    });

    it('propagates errors from backendClient', async () => {
      mockPost.mockRejectedValue(new Error('401 Unauthorized'));
      await expect(loginWithSignature('02abc', '02sig')).rejects.toThrow('401 Unauthorized');
    });
  });

  // ── applyToken ────────────────────────────────────────────────────────

  describe('applyToken', () => {
    it('calls setAuthToken with the provided token', () => {
      applyToken('my-jwt-token');
      expect(mockSetAuthToken).toHaveBeenCalledWith('my-jwt-token');
    });

    it('calls setAuthToken with null to clear the token', () => {
      applyToken(null);
      expect(mockSetAuthToken).toHaveBeenCalledWith(null);
    });
  });
});
