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
