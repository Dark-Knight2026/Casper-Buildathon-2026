import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CSPRCloudService } from '@/lib/blockchain/csprCloudService';

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: () => ({
      select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: null, error: { code: 'PGRST116' } }) }) }),
      upsert: () => Promise.resolve({ error: null }),
    }),
  }),
}));

const mockFetch = vi.fn();

describe('CSPRCloudService.getDeploy', () => {
  let service: CSPRCloudService;

  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch);
    mockFetch.mockReset();
    service = new CSPRCloudService();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns executed status for a processed deploy with no error', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        data: { status: 'processed', error_message: null, block_height: 123456 },
      }),
    });

    const result = await service.getDeploy('abc123');

    expect(result.status).toBe('executed');
    expect(result.block_number).toBe(123456);
  });

  it('returns failed status when deploy has an error_message', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        data: { status: 'processed', error_message: 'User error: insufficient balance' },
      }),
    });

    const result = await service.getDeploy('abc123');

    expect(result.status).toBe('failed');
    expect(result.error_message).toBe('User error: insufficient balance');
  });

  it('returns pending status when deploy is not yet processed', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        data: { status: 'pending', error_message: null },
      }),
    });

    const result = await service.getDeploy('abc123');

    expect(result.status).toBe('pending');
  });

  it('returns pending when deploy is not found (404)', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 404 });

    const result = await service.getDeploy('notfound');

    expect(result.status).toBe('pending');
  });

  it('returns pending when fetch throws (timeout or network error)', async () => {
    mockFetch.mockRejectedValueOnce(new DOMException('Aborted', 'AbortError'));

    const result = await service.getDeploy('abc123');

    expect(result.status).toBe('pending');
  });

  it('returns pending when response has no data field', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({}),
    });

    const result = await service.getDeploy('abc123');

    expect(result.status).toBe('pending');
  });
});

describe('CSPRCloudService.getCSPRRates', () => {
  let service: CSPRCloudService;

  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch);
    mockFetch.mockReset();
    service = new CSPRCloudService();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns mapped cspr_usd rate on success', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ 'casper-network': { usd: 0.042 } }),
    });

    const result = await service.getCSPRRates(['USD']);

    expect(result).toEqual({ cspr_usd: 0.042 });
  });

  it('maps multiple currencies', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ 'casper-network': { usd: 0.042, eur: 0.039 } }),
    });

    const result = await service.getCSPRRates(['USD', 'EUR']);

    expect(result).toEqual({ cspr_usd: 0.042, cspr_eur: 0.039 });
  });

  it('returns 0 for a currency missing from the response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ 'casper-network': {} }),
    });

    const result = await service.getCSPRRates(['USD']);

    expect(result).toEqual({ cspr_usd: 0 });
  });

  it('throws on non-ok response', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 429 });

    await expect(service.getCSPRRates(['USD'])).rejects.toThrow('CoinGecko API error: 429');
  });

  it('throws on network failure', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    await expect(service.getCSPRRates(['USD'])).rejects.toThrow('Network error');
  });
});

describe('CSPRCloudService.submitDeploy', () => {
  let service: CSPRCloudService;

  const mockSignedDeploy = {
    deploy: { hash: 'abc123', header: {}, payment: {}, session: {}, approvals: [] },
    signature: 'sig123',
  };

  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch);
    mockFetch.mockReset();
    service = new CSPRCloudService();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns deploy_hash on successful submission', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ result: { deploy_hash: 'deadbeef' } }),
    });

    const result = await service.submitDeploy(mockSignedDeploy);

    expect(result.deploy_hash).toBe('deadbeef');
  });

  it('throws when response contains a JSON-RPC error', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ error: { message: 'InvalidDeploy' } }),
    });

    await expect(service.submitDeploy(mockSignedDeploy)).rejects.toThrow('InvalidDeploy');
  });

  it('throws when HTTP response is not ok', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, statusText: 'Bad Gateway' });

    await expect(service.submitDeploy(mockSignedDeploy)).rejects.toThrow('RPC request failed: Bad Gateway');
  });

  it('throws on network failure', async () => {
    mockFetch.mockRejectedValueOnce(new Error('fetch failed'));

    await expect(service.submitDeploy(mockSignedDeploy)).rejects.toThrow('fetch failed');
  });
});

describe('CSPRCloudService URL routing', () => {
  let service: CSPRCloudService;

  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch);
    mockFetch.mockReset();
    service = new CSPRCloudService();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('getDeploy', () => {
    it('uses path format in DEV (/api/cspr-cloud/deploys/:hash)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: { status: 'processed', error_message: null, block_height: 100 } }),
      });

      await service.getDeploy('abc123');

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

        await service.getDeploy('abc123');

        expect(mockFetch).toHaveBeenCalledWith(
          '/api/cspr-cloud?path=deploys%2Fabc123',
          expect.objectContaining({ signal: expect.any(AbortSignal) }),
        );
      } finally {
        (import.meta.env as Record<string, unknown>).DEV = origDev;
      }
    });
  });

  describe('getCSPRRates', () => {
    it('uses path format in DEV (/api/coingecko/simple/price?...)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ 'casper-network': { usd: 0.05 } }),
      });

      await service.getCSPRRates(['USD']);

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

        await service.getCSPRRates(['USD']);

        expect(mockFetch).toHaveBeenCalledWith(
          '/api/coingecko?ids=casper-network&vs_currencies=usd',
          expect.objectContaining({ signal: expect.any(AbortSignal) }),
        );
      } finally {
        (import.meta.env as Record<string, unknown>).DEV = origDev;
      }
    });
  });
});
