import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ApiClient, ApiError } from '@/lib/api-client';

// Minimal duck-typed Response — handleResponse only touches ok/status/headers/
// text/json, so we avoid depending on a global Response constructor.
function res(body: unknown, status: number): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (h: string) => (h.toLowerCase() === 'content-type' ? 'application/json' : null) },
    text: async () => JSON.stringify(body),
    json: async () => body,
  } as unknown as Response;
}

describe('ApiClient — withAuthRetry / skipAuthError', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('fires onAuthError on a final 401 by default (global redirect path)', async () => {
    const onAuthError = vi.fn();
    const client = new ApiClient({ refreshPath: '/api/v1/auth/refresh', onAuthError });

    fetchMock
      .mockResolvedValueOnce(res({ error: 'invalid_token' }, 401)) // initial POST
      .mockResolvedValueOnce(res({ error: 'invalid_token' }, 401)); // refresh attempt → not ok

    await expect(client.post('/x', {})).rejects.toBeInstanceOf(ApiError);
    expect(onAuthError).toHaveBeenCalledTimes(1);
  });

  it('suppresses onAuthError with skipAuthError and surfaces statusCode + code', async () => {
    const onAuthError = vi.fn();
    const client = new ApiClient({ refreshPath: '/api/v1/auth/refresh', onAuthError });

    fetchMock
      .mockResolvedValueOnce(res({ error: 'invalid_token' }, 401)) // initial POST
      .mockResolvedValueOnce(res({ error: 'invalid_token' }, 401)); // refresh attempt → not ok

    const err = await client.post('/x', {}, { skipAuthError: true }).catch((e: unknown) => e);

    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).statusCode).toBe(401);
    // The caller (verify/change confirm page) branches on this code.
    expect((err as ApiError).code).toBe('invalid_token');
    expect(onAuthError).not.toHaveBeenCalled();
  });

  it('still attempts the transparent refresh-and-replay even with skipAuthError', async () => {
    const onAuthError = vi.fn();
    const client = new ApiClient({ refreshPath: '/api/v1/auth/refresh', onAuthError });

    fetchMock
      .mockResolvedValueOnce(res({ error: 'invalid_token' }, 401)) // initial POST → 401
      .mockResolvedValueOnce(res({}, 200)) // refresh succeeds
      .mockResolvedValueOnce(res({ ok: true }, 200)); // replayed POST succeeds

    const result = await client.post<{ ok: boolean }>('/x', {}, { skipAuthError: true });

    expect(result).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(3); // POST → refresh → replay
    expect(onAuthError).not.toHaveBeenCalled();
  });
});
