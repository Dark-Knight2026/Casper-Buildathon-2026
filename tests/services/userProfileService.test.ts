import { describe, it, expect, vi, beforeEach } from 'vitest';

// `backendClient` is the only seam between userProfileService and the
// network. Mocked at the module level so each test only has to set up
// return values, not network plumbing.
const getMock = vi.fn();
const postMock = vi.fn();
const patchMock = vi.fn();

vi.mock('@/lib/api-client', () => ({
  backendClient: {
    get: (...args: unknown[]) => getMock(...args),
    post: (...args: unknown[]) => postMock(...args),
    patch: (...args: unknown[]) => patchMock(...args),
  },
  ApiError: class ApiError extends Error {},
}));

import {
  confirmEmailChange,
  getMe,
  patchMe,
  patchMyRole,
  requestEmailChange,
  uploadAvatar,
} from '@/services/userProfileService';

const ME = '/api/v1/users/me';

beforeEach(() => {
  getMock.mockReset();
  postMock.mockReset();
  patchMock.mockReset();
});

describe('getMe', () => {
  it('GETs /api/v1/users/me and returns the server payload unchanged', async () => {
    const server = { id: '1', first_name: 'A', last_name: 'B' };
    getMock.mockResolvedValueOnce(server);

    const result = await getMe();

    expect(getMock, 'service must hit the exact /me path the backend exposes').toHaveBeenCalledWith(ME);
    expect(
      result,
      'response is the wire-shape ServerUserInfo; mapping to camelCase belongs to AuthContext, not this layer'
    ).toBe(server);
  });
});

describe('patchMe', () => {
  it('PATCHes /api/v1/users/me with the provided body verbatim', async () => {
    patchMock.mockResolvedValueOnce({});
    await patchMe({ first_name: 'X', phone: '555' });
    expect(
      patchMock,
      'caller is responsible for sending only changed fields — service must NOT add or drop keys'
    ).toHaveBeenCalledWith(ME, { first_name: 'X', phone: '555' });
  });
});

describe('requestEmailChange', () => {
  it('POSTs /me/email with new_email and resolves void', async () => {
    postMock.mockResolvedValueOnce(undefined);
    const result = await requestEmailChange('new@example.com');
    expect(postMock, 'wire-format key is snake_case new_email, not newEmail').toHaveBeenCalledWith(
      `${ME}/email`,
      { new_email: 'new@example.com' },
    );
    expect(
      result,
      'service must resolve to void — 202 means "queued", not "applied"; UI should NOT treat the promise as confirmation'
    ).toBeUndefined();
  });
});

describe('confirmEmailChange', () => {
  it('POSTs /me/email/confirm with the token in the body', async () => {
    postMock.mockResolvedValueOnce({ id: '1' });
    await confirmEmailChange('tok123');
    expect(postMock).toHaveBeenCalledWith(`${ME}/email/confirm`, { token: 'tok123' });
  });
});

describe('patchMyRole', () => {
  it('PATCHes /me/role with { role }', async () => {
    patchMock.mockResolvedValueOnce({ role: 'landlord' });
    await patchMyRole('landlord');
    expect(
      patchMock,
      'role is sent in body, not as a query parameter or path segment'
    ).toHaveBeenCalledWith(`${ME}/role`, { role: 'landlord' });
  });
});

describe('uploadAvatar', () => {
  it('POSTs /me/avatar with a FormData carrying the file under "file"', async () => {
    postMock.mockResolvedValueOnce({ avatar_url: 'https://cdn/avatar.png' });
    const file = new File(['png-bytes'], 'avatar.png', { type: 'image/png' });

    await uploadAvatar(file);

    expect(postMock).toHaveBeenCalledTimes(1);
    const [path, payload] = postMock.mock.calls[0];
    expect(path, 'avatar lives at its own multipart endpoint — NOT the generic PATCH /me path').toBe(
      `${ME}/avatar`,
    );
    expect(
      payload,
      'payload must be a FormData — sending JSON here would silently corrupt the multipart upload (see buildRequestBody comment)'
    ).toBeInstanceOf(FormData);
    expect(
      (payload as FormData).get('file'),
      'server reads the file part as "file" — any other key produces a confusing 400'
    ).toBe(file);
  });

  it('returns the server-issued avatar_url so the caller can update local state', async () => {
    postMock.mockResolvedValueOnce({ avatar_url: 'https://cdn/abc.png' });
    const file = new File(['x'], 'a.png', { type: 'image/png' });
    const result = await uploadAvatar(file);
    expect(result, 'canonical URL must come from the server, NOT the optimistic blob URL').toEqual({
      avatar_url: 'https://cdn/abc.png',
    });
  });
});

describe('error propagation', () => {
  it('lets ApiError bubble up unchanged — the service is a thin wrapper, not a handler', async () => {
    const err = new Error('boom');
    patchMock.mockRejectedValueOnce(err);
    await expect(patchMe({ first_name: 'X' })).rejects.toBe(err);
  });
});
