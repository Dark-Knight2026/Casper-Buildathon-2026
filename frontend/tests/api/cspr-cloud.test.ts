import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// vi.hoisted runs before ES module imports — required because API_KEY is
// captured as a module-level constant at import time.
vi.hoisted(() => {
  process.env.CSPR_CLOUD_API_KEY = 'test-api-key';
  process.env.VITE_CASPER_NETWORK = 'casper-test';
});

import handler from '../../api/cspr-cloud';

// ── helpers ────────────────────────────────────────────────────────────────

function makeReq(overrides: Record<string, unknown> = {}) {
  return {
    method: 'GET',
    url: '/api/cspr-cloud/accounts/abc123/ft-token-actions',
    query: {},
    headers: {},
    body: null,
    ...overrides,
  };
}

function makeRes() {
  const res = {} as Record<string, unknown> & {
    status: ReturnType<typeof vi.fn>;
    json: ReturnType<typeof vi.fn>;
    send: ReturnType<typeof vi.fn>;
    end: ReturnType<typeof vi.fn>;
    setHeader: ReturnType<typeof vi.fn>;
  };
  res.setHeader = vi.fn();
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  res.send = vi.fn().mockReturnValue(res);
  res.end = vi.fn().mockReturnValue(res);
  return res;
}

function mockFetch(status: number, body: string, contentType = 'application/json') {
  return vi.fn().mockResolvedValue({
    status,
    headers: { get: vi.fn().mockReturnValue(contentType) },
    text: vi.fn().mockResolvedValue(body),
  });
}

// ── tests ──────────────────────────────────────────────────────────────────

describe('api/cspr-cloud handler', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch(200, '{"data":[]}'));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // ── CORS / method ─────────────────────────────────────────────────────

  it('responds 204 to OPTIONS preflight', async () => {
    const req = makeReq({ method: 'OPTIONS' });
    const res = makeRes();
    await handler(req as never, res as never);
    expect(res.status).toHaveBeenCalledWith(204);
    expect(res.end).toHaveBeenCalled();
  });

  it('responds 405 to non-GET methods', async () => {
    for (const method of ['POST', 'PUT', 'DELETE', 'PATCH']) {
      const req = makeReq({ method });
      const res = makeRes();
      await handler(req as never, res as never);
      expect(res.status).toHaveBeenCalledWith(405);
      expect(res.json).toHaveBeenCalledWith({ error: 'Method not allowed' });
    }
  });

  // ── valid request ────────────────────────────────────────────────────

  it('proxies a valid GET and returns upstream status + body', async () => {
    const responseBody = JSON.stringify({ data: [{ id: 1 }] });
    vi.stubGlobal('fetch', mockFetch(200, responseBody));

    const req = makeReq({ url: '/api/cspr-cloud/accounts/abc123/ft-token-actions?page_size=10' });
    const res = makeRes();
    await handler(req as never, res as never);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith(responseBody);
  });

  it('forwards the CSPR_CLOUD_API_KEY as Authorization header', async () => {
    const fetchSpy = mockFetch(200, '{}');
    vi.stubGlobal('fetch', fetchSpy);

    const req = makeReq();
    const res = makeRes();
    await handler(req as never, res as never);

    const [, options] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect((options.headers as Record<string, string>)['authorization']).toBe('test-api-key');
  });

  it('returns 400 when path is empty', async () => {
    const req = makeReq({ url: '/api/cspr-cloud/' });
    const res = makeRes();
    await handler(req as never, res as never);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Missing path parameter' });
  });

  // ── path traversal ────────────────────────────────────────────────────

  it.each([
    ['double dot', '/api/cspr-cloud/accounts/../secret'],
    ['double slash', '/api/cspr-cloud/accounts//secret'],
    ['%2f encoding', '/api/cspr-cloud/accounts%2fsecret'],
    ['%5c encoding', '/api/cspr-cloud/accounts%5csecret'],
    ['%2F uppercase', '/api/cspr-cloud/accounts%2Fsecret'],
  ])('blocks path traversal: %s', async (_label, url) => {
    const req = makeReq({ url });
    const res = makeRes();
    await handler(req as never, res as never);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid path' });
  });

  // ── missing API key ───────────────────────────────────────────────────

  it('returns 500 when CSPR_CLOUD_API_KEY is not configured', async () => {
    vi.resetModules();
    const saved = process.env.CSPR_CLOUD_API_KEY;
    delete process.env.CSPR_CLOUD_API_KEY;

    const { default: handlerNoKey } = await import('../../api/cspr-cloud');

    const req = makeReq();
    const res = makeRes();
    await handlerNoKey(req as never, res as never);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Proxy not configured' });

    process.env.CSPR_CLOUD_API_KEY = saved;
    vi.resetModules();
  });

  // ── upstream errors ───────────────────────────────────────────────────

  it('returns 502 when upstream fetch throws', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')));

    const req = makeReq();
    const res = makeRes();
    await handler(req as never, res as never);

    expect(res.status).toHaveBeenCalledWith(502);
    expect(res.json).toHaveBeenCalledWith({ error: 'Proxy request failed' });
  });

  it('passes through non-200 upstream status codes', async () => {
    vi.stubGlobal('fetch', mockFetch(404, '{"error":"not found"}'));

    const req = makeReq();
    const res = makeRes();
    await handler(req as never, res as never);

    expect(res.status).toHaveBeenCalledWith(404);
  });
});
