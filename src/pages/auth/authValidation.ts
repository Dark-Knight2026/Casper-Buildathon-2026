/**
 * Client-side validation + error mapping shared by the email/password auth
 * pages (Login, Register, ForgotPassword, ResetPassword).
 *
 * The password policy here MIRRORS the backend
 * (`crates/api/src/common/password.rs::validate_password_policy`): 8–128
 * chars, at least one digit, and both an upper- and a lowercase letter. It is
 * a pre-flight check to avoid a wasted round-trip and give inline feedback —
 * the server remains the source of truth.
 */

import { ApiError } from '@/lib/api-client';
import { validateEmail, isNetworkError } from '@/lib/validation';

export const PASSWORD_MIN_LEN = 8;
export const PASSWORD_MAX_LEN = 128;
export const NAME_MAX_LEN = 100;

/** Human-readable summary of the password policy, shown under password inputs. */
export const PASSWORD_HINT =
  'At least 8 characters, including upper- and lowercase letters and a number.';

/** Returns an error message, or `null` when the email is acceptable. */
export function validateEmailFormat(email: string): string | null {
  const trimmed = email.trim();
  if (!trimmed) return 'Email is required.';
  return validateEmail(trimmed).valid ? null : 'Enter a valid email address.';
}

/** Returns an error message, or `null` when the password meets the policy. */
export function validatePasswordPolicy(password: string): string | null {
  if (password.length < PASSWORD_MIN_LEN) {
    return `Password must be at least ${PASSWORD_MIN_LEN} characters.`;
  }
  if (password.length > PASSWORD_MAX_LEN) {
    return `Password must be at most ${PASSWORD_MAX_LEN} characters.`;
  }
  if (!/[0-9]/.test(password)) {
    return 'Password must contain at least one digit.';
  }
  if (!/[a-z]/.test(password) || !/[A-Z]/.test(password)) {
    return 'Password must contain both uppercase and lowercase letters.';
  }
  return null;
}

/** Returns an error message, or `null` when the required name is acceptable. */
export function validateRequiredName(label: string, value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return `${label} is required.`;
  if (trimmed.length > NAME_MAX_LEN) {
    return `${label} must be at most ${NAME_MAX_LEN} characters.`;
  }
  return null;
}

/**
 * Maps an auth request failure to a single user-facing message.
 *
 * `overrides` lets a page supply status-specific copy (e.g. `401` → "Invalid
 * email or password" on login). Any status without an override falls through
 * to safe generic copy. The message NEVER reveals whether an email exists —
 * callers must keep the anti-enumeration guarantee by reusing the same copy
 * for "unknown email" and "wrong password" (one generic `401`).
 */
export function authErrorMessage(
  err: unknown,
  overrides: Record<number, string> = {},
): string {
  if (err instanceof ApiError) {
    const status = err.statusCode;
    if (status !== undefined && overrides[status]) return overrides[status];
    if (status === 429) return 'Too many attempts. Please wait a moment and try again.';
    if (status !== undefined && status >= 500) {
      return 'Something went wrong on our end. Please try again shortly.';
    }
  }
  if (isNetworkError(err)) {
    return 'Network error. Check your connection and try again.';
  }
  return 'Something went wrong. Please try again.';
}

/**
 * Pops a stashed post-login redirect target (set by `useAuthPrompt` when a
 * gated action bounced the user to login). Returns `null` when none is set.
 * Single-use: the entry is removed on read.
 */
export function popPostAuthRedirect(): string | null {
  try {
    const intent = localStorage.getItem('auth_redirect_intent');
    if (intent) {
      localStorage.removeItem('auth_redirect_intent');
      return intent;
    }
  } catch {
    // localStorage unavailable (private mode / embedded webview) — fall back
    // to the role-based default.
  }
  return null;
}
