import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// vi.hoisted runs before ES module imports — required because API_KEY is
// captured as a module-level constant at import time.
vi.hoisted(() => {
  process.env.CSPR_CLOUD_API_KEY = 'test-api-key';
  process.env.VITE_CASPER_NETWORK = 'casper-test';
});

import handler from '../../api/casper-rpc';

// ── helpers ────────────────────────────────────────────────────────────────

function makeReq(overrides: Record<string, unknown> = {}) {
  return {
    method: 'POST',
    url: '/api/casper-rpc',
    query: {},
    headers: { 'content-type': 'application/json' },
    body: { jsonrpc: '2.0', id: 1, method: 'info_get_deploy', params: {} },
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

describe('api/casper-rpc handler', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch(200, '{"result":{}}'));
    process.env.VITE_CASPER_NETWORK = 'casper-test';
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

  it('responds 405 to non-POST methods', async () => {
    for (const method of ['GET', 'PUT', 'DELETE', 'PATCH']) {
      const req = makeReq({ method });
      const res = makeRes();
      await handler(req as never, res as never);
      expect(res.status).toHaveBeenCalledWith(405);
      expect(res.json).toHaveBeenCalledWith({ error: 'Method not allowed' });
    }
  });

  // ── method allowlist ─────────────────────────────────────────────────

  it.each([
    'query_global_state',
    'state_get_dictionary_item',
    'state_get_balance',
    'query_balance',
    'info_get_deploy',
    'state_get_entity',
    'info_get_account_info',
    'info_get_status',
    'chain_get_state_root_hash',
  ])('proxies allowed method: %s', async (method) => {
    const responseBody = JSON.stringify({ result: { api_version: '1.0' } });
    vi.stubGlobal('fetch', mockFetch(200, responseBody));

    const req = makeReq({ body: { jsonrpc: '2.0', id: 1, method } });
    const res = makeRes();
    await handler(req as never, res as never);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith(responseBody);
  });

  it('allows account_put_deploy (the only write method in allowlist)', async () => {
    const req = makeReq({ body: { jsonrpc: '2.0', id: 1, method: 'account_put_deploy', params: {} } });
    const res = makeRes();
    await handler(req as never, res as never);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it.each([
    ['unknown method', 'some_unknown_method'],
    ['admin method', 'admin_get_config'],
    ['sql injection attempt', "'; DROP TABLE deploys; --"],
    ['empty string', ''],
  ])('blocks disallowed method: %s', async (_label, method) => {
    const req = makeReq({ body: { jsonrpc: '2.0', id: 1, method } });
    const res = makeRes();
    await handler(req as never, res as never);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'RPC method not allowed' });
  });

  it('blocks when method is a number', async () => {
    const req = makeReq({ body: { jsonrpc: '2.0', id: 1, method: 42 } });
    const res = makeRes();
    await handler(req as never, res as never);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'RPC method not allowed' });
  });

  it('blocks when method is an object', async () => {
    const req = makeReq({ body: { jsonrpc: '2.0', id: 1, method: { name: 'info_get_deploy' } } });
    const res = makeRes();
    await handler(req as never, res as never);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'RPC method not allowed' });
  });

  it('blocks when method is missing from body', async () => {
    const req = makeReq({ body: { jsonrpc: '2.0', id: 1 } });
    const res = makeRes();
    await handler(req as never, res as never);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'RPC method not allowed' });
  });

  it('blocks when body is null', async () => {
    const req = makeReq({ body: null });
    const res = makeRes();
    await handler(req as never, res as never);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'RPC method not allowed' });
  });

  // ── request forwarding ────────────────────────────────────────────────

  it('forwards the full request body to upstream RPC', async () => {
    const fetchSpy = mockFetch(200, '{}');
    vi.stubGlobal('fetch', fetchSpy);

    const rpcBody = { jsonrpc: '2.0', id: 99, method: 'info_get_deploy', params: { deploy_hash: 'abc' } };
    const req = makeReq({ body: rpcBody });
    const res = makeRes();
    await handler(req as never, res as never);

    const [, options] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(options.body as string)).toEqual(rpcBody);
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

  it('uses testnet RPC URL when VITE_CASPER_NETWORK is casper-test', async () => {
    const fetchSpy = mockFetch(200, '{}');
    vi.stubGlobal('fetch', fetchSpy);
    process.env.VITE_CASPER_NETWORK = 'casper-test';

    const req = makeReq();
    const res = makeRes();
    await handler(req as never, res as never);

    const [url] = fetchSpy.mock.calls[0] as [string];
    expect(url).toBe('https://node.testnet.cspr.cloud/rpc');
  });

  it('uses mainnet RPC URL when VITE_CASPER_NETWORK is casper', async () => {
    const fetchSpy = mockFetch(200, '{}');
    vi.stubGlobal('fetch', fetchSpy);
    process.env.VITE_CASPER_NETWORK = 'casper';

    const req = makeReq();
    const res = makeRes();
    await handler(req as never, res as never);

    const [url] = fetchSpy.mock.calls[0] as [string];
    expect(url).toBe('https://node.cspr.cloud/rpc');
  });

  // ── missing API key ───────────────────────────────────────────────────

  it('returns 500 when CSPR_CLOUD_API_KEY is not configured', async () => {
    vi.resetModules();
    const saved = process.env.CSPR_CLOUD_API_KEY;
    delete process.env.CSPR_CLOUD_API_KEY;

    const { default: handlerNoKey } = await import('../../api/casper-rpc');

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
    expect(res.json).toHaveBeenCalledWith({ error: 'RPC proxy request failed' });
  });

  it('passes through non-200 upstream status codes', async () => {
    vi.stubGlobal('fetch', mockFetch(503, '{"error":"unavailable"}'));

    const req = makeReq();
    const res = makeRes();
    await handler(req as never, res as never);

    expect(res.status).toHaveBeenCalledWith(503);
  });
});
