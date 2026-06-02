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

  it('shows no_token when the link has no token', async () => {
    renderPage('');
    await waitFor(() => expect(screen.getByText(/needs a verification token/i)).toBeInTheDocument());
    expect(confirmEmailVerification).not.toHaveBeenCalled();
  });
});
