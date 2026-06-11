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

// Keep MemoryRouter / Link / useSearchParams real; only intercept useNavigate so
// we can assert the success auto-redirect fired.
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importActual) => {
  const actual = await importActual<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => mockNavigate };
});

// Mirror of SUCCESS_REDIRECT_DELAY_MS in ConfirmEmailChange.tsx (not exported).
const SUCCESS_REDIRECT_DELAY_MS = 3000;

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
      setSession: vi.fn(),
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

  it('routes a 409 to a dead-end email_taken screen (no Retry) — TBLK-01', async () => {
    confirmEmailChange.mockRejectedValue(apiError(409, 'email_taken'));
    renderPage('tok');
    await waitFor(() =>
      expect(screen.getByText(/already registered to another account/i)).toBeInTheDocument(),
    );
    // email_taken offers a way out (Back to dashboard) but never a Retry — the
    // second attempt would just 409 again.
    expect(screen.getByRole('link', { name: /back to dashboard/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /retry/i })).not.toBeInTheDocument();
  });

  it('shows no_token and never calls the API when the link has no token — TBLK-04', async () => {
    renderPage('');
    await waitFor(() =>
      expect(screen.getByText(/needs a confirmation token/i)).toBeInTheDocument(),
    );
    expect(confirmEmailChange).not.toHaveBeenCalled();
  });

  it('auto-redirects to the role dashboard after the success delay — TBLK-02', async () => {
    vi.useFakeTimers();
    try {
      confirmEmailChange.mockResolvedValue({ id: '1', role: 'tenant' });
      renderPage();
      // Flush the confirm promise so status becomes 'success' and the redirect
      // timer is scheduled, then advance past the delay to fire it.
      await vi.advanceTimersByTimeAsync(0);
      expect(mockNavigate).not.toHaveBeenCalled();
      await vi.advanceTimersByTimeAsync(SUCCESS_REDIRECT_DELAY_MS);
      expect(mockNavigate).toHaveBeenCalledWith('/tenant/dashboard', { replace: true });
    } finally {
      vi.useRealTimers();
    }
  });
});
