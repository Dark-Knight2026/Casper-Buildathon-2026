import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { StrictMode } from 'react';
import { MemoryRouter } from 'react-router-dom';

const mockUseAuth = vi.fn();
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => mockUseAuth() }));

const confirmEmailChange = vi.fn();
vi.mock('@/services/userProfileService', () => ({
  confirmEmailChange: (...a: unknown[]) => confirmEmailChange(...a),
}));

import ConfirmEmailChange from '@/pages/auth/ConfirmEmailChange';

function apiError(statusCode: number, code?: string) {
  const e = new Error(code ?? `status ${statusCode}`) as Error & { statusCode?: number; code?: string };
  e.statusCode = statusCode;
  e.code = code;
  return e;
}

function renderPage(token = 'tok', strict = false) {
  const ui = (
    <MemoryRouter initialEntries={[`/confirm-email-change?token=${token}`]}>
      <ConfirmEmailChange />
    </MemoryRouter>
  );
  return render(strict ? <StrictMode>{ui}</StrictMode> : ui);
}

describe('ConfirmEmailChange', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mockUseAuth.mockReturnValue({
      profile: { role: 'tenant', email: 'new@example.com' },
      setWalletSession: vi.fn(),
    });
  });

  it('confirms the token once and shows success', async () => {
    confirmEmailChange.mockResolvedValue({ id: '1', role: 'tenant' });
    renderPage();
    await waitFor(() => expect(screen.getByText(/your new email is active/i)).toBeInTheDocument());
    expect(confirmEmailChange).toHaveBeenCalledTimes(1);
  });

  it('does not double-confirm under StrictMode double-invoke (TEST-06)', async () => {
    confirmEmailChange.mockResolvedValue({ id: '1', role: 'tenant' });
    renderPage('tok', true);
    await waitFor(() => expect(confirmEmailChange).toHaveBeenCalled());
    expect(confirmEmailChange).toHaveBeenCalledTimes(1);
  });

  it('renders needs_login and stashes intent on a not-logged-in 401', async () => {
    confirmEmailChange.mockRejectedValue(apiError(401, 'invalid_token'));
    renderPage('tok');
    await waitFor(() => expect(screen.getByRole('link', { name: /log in/i })).toBeInTheDocument());
    expect(localStorage.getItem('auth_redirect_intent')).toContain('/confirm-email-change?token=tok');
  });

  it('renders invalid_token (NOT needs_login) on a bad-token 401 — mirror-bug fix', async () => {
    confirmEmailChange.mockRejectedValue(apiError(401, 'invalid_email_change_token'));
    renderPage('tok');
    await waitFor(() => expect(screen.getByText(/no longer valid/i)).toBeInTheDocument());
    expect(screen.queryByRole('link', { name: /log in/i })).not.toBeInTheDocument();
    // A bad token must not stash a post-login retry intent.
    expect(localStorage.getItem('auth_redirect_intent')).toBeNull();
  });

  it('routes a 400 to invalid_token (no Retry loop) — TEST-07', async () => {
    confirmEmailChange.mockRejectedValue(apiError(400, 'bad_request'));
    renderPage('tok');
    await waitFor(() => expect(screen.getByText(/no longer valid/i)).toBeInTheDocument());
    // invalid_token screen has no Retry button (unlike generic_error).
    expect(screen.queryByRole('button', { name: /retry/i })).not.toBeInTheDocument();
  });

  it('routes an unexpected 500 to generic_error (with Retry)', async () => {
    confirmEmailChange.mockRejectedValue(apiError(500, 'internal'));
    renderPage('tok');
    await waitFor(() => expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument());
  });
});
