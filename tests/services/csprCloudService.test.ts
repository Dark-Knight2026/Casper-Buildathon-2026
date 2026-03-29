import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({})),
}));

vi.mock('@/utils/logger', () => ({
  logger: { log: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

const mockFetch = vi.fn();

describe('csprCloudService', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // ── getDeploy ──────────────────────────────────────────────────────

  describe('getDeploy URL format', () => {
    it('uses path format in DEV (/api/cspr-cloud/deploys/:hash)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: { status: 'processed', error_message: null, block_height: 100 } }),
      });

      const { csprCloudService } = await import('@/lib/blockchain/csprCloudService');
      await csprCloudService.getDeploy('abc123');

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/cspr-cloud/deploys/abc123',
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      );
    });

    it('uses query format in PROD (/api/cspr-cloud?path=deploys%2F:hash)', async () => {
      const origDev = import.meta.env.DEV;
      (import.meta.env as Record<string, unknown>).DEV = false;

      try {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ data: { status: 'processed', error_message: null, block_height: 100 } }),
        });

        const { csprCloudService } = await import('@/lib/blockchain/csprCloudService');
        await csprCloudService.getDeploy('abc123');

        expect(mockFetch).toHaveBeenCalledWith(
          '/api/cspr-cloud?path=deploys%2Fabc123',
          expect.objectContaining({ signal: expect.any(AbortSignal) }),
        );
      } finally {
        (import.meta.env as Record<string, unknown>).DEV = origDev;
      }
    });

    it('returns pending for 404 response', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 404, statusText: 'Not Found' });

      const { csprCloudService } = await import('@/lib/blockchain/csprCloudService');
      const result = await csprCloudService.getDeploy('missing');

      expect(result.status).toBe('pending');
    });

    it('returns executed when deploy is processed without error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: { status: 'processed', error_message: null, block_height: 42 } }),
      });

      const { csprCloudService } = await import('@/lib/blockchain/csprCloudService');
      const result = await csprCloudService.getDeploy('abc123');

      expect(result.status).toBe('executed');
      expect(result.block_number).toBe(42);
    });

    it('returns failed when deploy has error_message', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: { status: 'processed', error_message: 'Out of gas' } }),
      });

      const { csprCloudService } = await import('@/lib/blockchain/csprCloudService');
      const result = await csprCloudService.getDeploy('abc123');

      expect(result.status).toBe('failed');
      expect(result.error_message).toBe('Out of gas');
    });
  });

  // ── getCSPRRates ───────────────────────────────────────────────────

  describe('getCSPRRates URL format', () => {
    it('uses path format in DEV (/api/coingecko/simple/price?...)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ 'casper-network': { usd: 0.05 } }),
      });

      const { csprCloudService } = await import('@/lib/blockchain/csprCloudService');
      await csprCloudService.getCSPRRates(['USD']);

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/coingecko/simple/price?ids=casper-network&vs_currencies=usd',
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      );
    });

    it('uses query format in PROD (/api/coingecko?ids=...&vs_currencies=...)', async () => {
      const origDev = import.meta.env.DEV;
      (import.meta.env as Record<string, unknown>).DEV = false;

      try {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ 'casper-network': { usd: 0.05 } }),
        });

        const { csprCloudService } = await import('@/lib/blockchain/csprCloudService');
        await csprCloudService.getCSPRRates(['USD']);

        expect(mockFetch).toHaveBeenCalledWith(
          '/api/coingecko?ids=casper-network&vs_currencies=usd',
          expect.objectContaining({ signal: expect.any(AbortSignal) }),
        );
      } finally {
        (import.meta.env as Record<string, unknown>).DEV = origDev;
      }
    });

    it('maps response to cspr_xxx format', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ 'casper-network': { usd: 0.05, eur: 0.04 } }),
      });

      const { csprCloudService } = await import('@/lib/blockchain/csprCloudService');
      const result = await csprCloudService.getCSPRRates(['USD', 'EUR']);

      expect(result).toEqual({ cspr_usd: 0.05, cspr_eur: 0.04 });
    });

    it('throws on non-ok response', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 429 });

      const { csprCloudService } = await import('@/lib/blockchain/csprCloudService');
      await expect(csprCloudService.getCSPRRates(['USD'])).rejects.toThrow('CoinGecko API error: 429');
    });
  });
});
