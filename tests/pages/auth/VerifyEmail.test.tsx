import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { StrictMode } from 'react';
import { MemoryRouter } from 'react-router-dom';

const mockUseAuth = vi.fn();
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => mockUseAuth() }));

const mockToast = vi.fn();
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: mockToast }) }));

const confirmEmailVerification = vi.fn();
const sendVerificationEmail = vi.fn();
vi.mock('@/services/ico/backendAuthService', () => ({
  confirmEmailVerification: (...a: unknown[]) => confirmEmailVerification(...a),
  sendVerificationEmail: (...a: unknown[]) => sendVerificationEmail(...a),
}));

// Keep MemoryRouter / Link / useSearchParams real; only intercept useNavigate so
// we can assert the success auto-redirect fired.
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importActual) => {
  const actual = await importActual<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => mockNavigate };
});

// Mirror of SUCCESS_REDIRECT_DELAY_MS in VerifyEmail.tsx (not exported).
const SUCCESS_REDIRECT_DELAY_MS = 3000;

import VerifyEmail from '@/pages/auth/VerifyEmail';

// Mirror the ApiError shape the api-client throws (statusCode + machine code).
function apiError(statusCode: number, code?: string) {
  const e = new Error(code ?? `status ${statusCode}`) as Error & { statusCode?: number; code?: string };
  e.statusCode = statusCode;
  e.code = code;
  return e;
}

function renderPage(token = 'tok', strict = false) {
  const ui = (
    <MemoryRouter initialEntries={[`/verify-email?token=${token}`]}>
      <VerifyEmail />
    </MemoryRouter>
  );
  return render(strict ? <StrictMode>{ui}</StrictMode> : ui);
}

describe('VerifyEmail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mockUseAuth.mockReturnValue({ profile: { role: 'tenant' }, setWalletSession: vi.fn() });
  });

  it('confirms the token once and shows success', async () => {
    confirmEmailVerification.mockResolvedValue({ user: { id: '1', role: 'tenant' } });
    renderPage();
    await waitFor(() => expect(screen.getByText(/your email is confirmed/i)).toBeInTheDocument());
    expect(confirmEmailVerification).toHaveBeenCalledTimes(1);
    expect(confirmEmailVerification).toHaveBeenCalledWith('tok');
  });

  it('does not double-confirm under StrictMode double-invoke (TEST-06)', async () => {
    confirmEmailVerification.mockResolvedValue({ user: { id: '1', role: 'tenant' } });
    renderPage('tok', true);
    await waitFor(() => expect(confirmEmailVerification).toHaveBeenCalled());
    // The one-shot ref survives StrictMode's mount→cleanup→mount, so the
    // single-use token is submitted exactly once.
    expect(confirmEmailVerification).toHaveBeenCalledTimes(1);
  });

  it('renders needs_login and stashes redirect intent on a not-logged-in 401 (AUTH-12 / AUTH-01)', async () => {
    confirmEmailVerification.mockRejectedValue(apiError(401, 'invalid_token'));
    renderPage('tok');
    await waitFor(() => expect(screen.getByRole('link', { name: /log in/i })).toBeInTheDocument());
    expect(localStorage.getItem('auth_redirect_intent')).toContain('/verify-email?token=tok');
  });

  it('renders invalid_token (not needs_login) and does NOT stash intent on a bad-token 401 (AUTH-12 / AUTH-01)', async () => {
    confirmEmailVerification.mockRejectedValue(apiError(401, 'invalid_or_expired_token'));
    renderPage('tok');
    await waitFor(() => expect(screen.getByText(/no longer valid/i)).toBeInTheDocument());
    expect(screen.queryByRole('link', { name: /log in/i })).not.toBeInTheDocument();
    expect(localStorage.getItem('auth_redirect_intent')).toBeNull();
  });

  it('renders bad_format on a 400', async () => {
    confirmEmailVerification.mockRejectedValue(apiError(400, 'bad_token_format'));
    renderPage('tok');
    await waitFor(() => expect(screen.getByText(/malformed/i)).toBeInTheDocument());
    expect(localStorage.getItem('auth_redirect_intent')).toBeNull();
  });

  it('offers a working resend button in bad_format that calls sendVerificationEmail (VE-01)', async () => {
    const { default: userEvent } = await import('@testing-library/user-event');
    confirmEmailVerification.mockRejectedValue(apiError(400, 'bad_token_format'));
    sendVerificationEmail.mockResolvedValue({ status: 'sent' });
    renderPage('tok');
    const resendBtn = await screen.findByRole('button', { name: /send a new verification email/i });
    await userEvent.click(resendBtn);
    await waitFor(() => expect(sendVerificationEmail).toHaveBeenCalledTimes(1));
  });

  it('disables the resend button and shows "Sending…" while the request is in flight (VE-01)', async () => {
    const { default: userEvent } = await import('@testing-library/user-event');
    confirmEmailVerification.mockRejectedValue(apiError(400, 'bad_token_format'));
    let resolveSend!: () => void;
    sendVerificationEmail.mockReturnValue(new Promise<void>((res) => { resolveSend = res; }));
    renderPage('tok');
    const resendBtn = await screen.findByRole('button', { name: /send a new verification email/i });
    await userEvent.click(resendBtn);
    // While the send promise is pending the button reflects the sending state…
    await waitFor(() => expect(screen.getByRole('button', { name: /sending…/i })).toBeDisabled());
    // …and reverts once it resolves.
    resolveSend();
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /send a new verification email/i })).toBeEnabled(),
    );
  });

  it('shows no_token when the link has no token', async () => {
    renderPage('');
    await waitFor(() => expect(screen.getByText(/needs a verification token/i)).toBeInTheDocument());
    expect(confirmEmailVerification).not.toHaveBeenCalled();
  });

  it('routes a 500 to generic_error with both Retry and Resend — TBLK-03', async () => {
    confirmEmailVerification.mockRejectedValue(apiError(500, 'internal'));
    renderPage('tok');
    await waitFor(() => expect(screen.getByText(/something went wrong/i)).toBeInTheDocument());
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /new email/i })).toBeInTheDocument();
  });

  it('retries the verification when Retry is clicked from generic_error — TBLK-03', async () => {
    const { default: userEvent } = await import('@testing-library/user-event');
    confirmEmailVerification.mockRejectedValue(apiError(500, 'internal'));
    renderPage('tok');
    await waitFor(() => expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument());
    expect(confirmEmailVerification).toHaveBeenCalledTimes(1);
    await userEvent.click(screen.getByRole('button', { name: /retry/i }));
    await waitFor(() => expect(confirmEmailVerification).toHaveBeenCalledTimes(2));
  });

  it('auto-redirects to the role dashboard after the success delay — TBLK-02', async () => {
    vi.useFakeTimers();
    try {
      confirmEmailVerification.mockResolvedValue({ user: { id: '1', role: 'tenant' } });
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
