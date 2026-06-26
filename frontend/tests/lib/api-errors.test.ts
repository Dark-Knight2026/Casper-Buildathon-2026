import { describe, it, expect } from 'vitest';

import {
  AvatarStatus,
  ProfileApiErrorCode,
  isProfileApiErrorCode,
  parseProfileApiErrorBody,
} from '@/lib/api-errors';

describe('parseProfileApiErrorBody', () => {
  it('returns the envelope when the body is a valid { error: string } JSON', () => {
    expect(
      parseProfileApiErrorBody('{"error":"reauthentication_required"}'),
      'wire-shape envelope must round-trip so callers can switch on error.code'
    ).toEqual({ error: 'reauthentication_required' });
  });

  it('returns null for an empty body', () => {
    expect(
      parseProfileApiErrorBody(''),
      'empty body → null lets callers fall through to status-driven copy without a try/catch'
    ).toBeNull();
  });

  it('returns null for malformed JSON', () => {
    expect(
      parseProfileApiErrorBody('<html>500 Internal Server Error</html>'),
      'HTML / non-JSON bodies must NOT throw — the parser swallows so it is safe inside a catch'
    ).toBeNull();
  });

  it('returns null when the JSON parses but does not match the envelope shape', () => {
    expect(
      parseProfileApiErrorBody('{"detail":"oops"}'),
      'foreign shape must not be coerced — caller would otherwise read undefined as a string code'
    ).toBeNull();
    expect(
      parseProfileApiErrorBody('"bare-string"'),
      'JSON primitives (string/number/null) must also be rejected'
    ).toBeNull();
  });

  it('returns null when error field is non-string', () => {
    expect(
      parseProfileApiErrorBody('{"error":42}'),
      'numeric error must not become a string code at the type-system level'
    ).toBeNull();
  });
});

describe('isProfileApiErrorCode', () => {
  it('narrows for every registered code', () => {
    for (const code of Object.values(ProfileApiErrorCode)) {
      expect(
        isProfileApiErrorCode(code),
        `${code} is registered in ProfileApiErrorCode and must narrow positively`
      ).toBe(true);
    }
  });

  it('rejects unknown tokens', () => {
    expect(
      isProfileApiErrorCode('something_new'),
      'tokens not in the constant set must fall through to status-driven handling'
    ).toBe(false);
    expect(isProfileApiErrorCode(''), 'empty string is not a valid code').toBe(false);
  });
});

describe('AvatarStatus', () => {
  it('exposes the exact HTTP statuses the avatar handler emits with prose bodies', () => {
    // Pinned here so a UI tweak that branches on these numbers fails loudly if
    // the backend rev moves them; the contract is documented in
    // crates/api/src/services/users/handlers.rs::upload_avatar.
    expect(AvatarStatus.PayloadTooLarge).toBe(413);
    expect(AvatarStatus.UnsupportedMediaType).toBe(415);
    expect(AvatarStatus.TooManyRequests).toBe(429);
  });
});
