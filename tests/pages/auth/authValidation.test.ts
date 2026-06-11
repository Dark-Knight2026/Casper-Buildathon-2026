import { describe, it, expect, beforeEach } from 'vitest';

import {
  validateEmailFormat,
  validatePasswordPolicy,
  validateRequiredName,
  authErrorMessage,
  popPostAuthRedirect,
} from '@/pages/auth/authValidation';
import { ApiError } from '@/lib/api-client';

describe('validateEmailFormat', () => {
  it('accepts a well-formed address', () => {
    expect(validateEmailFormat('jane@example.com')).toBeNull();
  });

  it('requires a value', () => {
    expect(validateEmailFormat('  ')).toBe('Email is required.');
  });

  it('rejects a malformed address', () => {
    expect(validateEmailFormat('not-an-email')).toBe('Enter a valid email address.');
  });
});

describe('validatePasswordPolicy (mirrors backend: 8–128, digit, upper+lower)', () => {
  it('accepts a compliant password', () => {
    expect(validatePasswordPolicy('Valid123')).toBeNull();
  });

  it('rejects too-short', () => {
    expect(validatePasswordPolicy('Ab1')).toMatch(/at least 8/);
  });

  it('rejects too-long (>128)', () => {
    expect(validatePasswordPolicy('Aa1' + 'x'.repeat(130))).toMatch(/at most 128/);
  });

  it('rejects missing digit', () => {
    expect(validatePasswordPolicy('NoDigitsHere')).toMatch(/digit/);
  });

  it('rejects missing a case (all upper + digit)', () => {
    expect(validatePasswordPolicy('NOLOWER123')).toMatch(/uppercase and lowercase/);
  });

  it('rejects missing a case (all lower + digit)', () => {
    expect(validatePasswordPolicy('nolower123')).toMatch(/uppercase and lowercase/);
  });
});

describe('validateRequiredName', () => {
  it('accepts a normal name', () => {
    expect(validateRequiredName('First name', 'Jane')).toBeNull();
  });

  it('requires a non-empty value', () => {
    expect(validateRequiredName('First name', '   ')).toBe('First name is required.');
  });

  it('rejects over 100 chars', () => {
    expect(validateRequiredName('Last name', 'x'.repeat(101))).toMatch(/at most 100/);
  });
});

describe('authErrorMessage', () => {
  it('uses a status-specific override when present', () => {
    const msg = authErrorMessage(new ApiError('x', 401), { 401: 'Invalid email or password.' });
    expect(msg).toBe('Invalid email or password.');
  });

  it('maps 429 to a wait message without an override', () => {
    expect(authErrorMessage(new ApiError('x', 429))).toMatch(/Too many attempts/);
  });

  it('maps 5xx to a server-side message', () => {
    expect(authErrorMessage(new ApiError('x', 500))).toMatch(/on our end/);
  });

  it('falls back to a generic message for unknown errors', () => {
    expect(authErrorMessage(new Error('boom'))).toBe('Something went wrong. Please try again.');
  });

  it('does not leak which check failed (same 401 copy regardless of cause)', () => {
    const overrides = { 401: 'Invalid email or password.' };
    expect(authErrorMessage(new ApiError('unknown email', 401), overrides)).toBe(
      authErrorMessage(new ApiError('wrong password', 401), overrides),
    );
  });
});

describe('popPostAuthRedirect', () => {
  beforeEach(() => localStorage.clear());

  it('returns null when no intent is stashed', () => {
    expect(popPostAuthRedirect()).toBeNull();
  });

  it('returns and clears the stashed intent (single-use)', () => {
    localStorage.setItem('auth_redirect_intent', '/tenant/dashboard');
    expect(popPostAuthRedirect()).toBe('/tenant/dashboard');
    expect(popPostAuthRedirect()).toBeNull();
  });
});
