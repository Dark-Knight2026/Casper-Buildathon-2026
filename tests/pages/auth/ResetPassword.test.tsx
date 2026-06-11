import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ApiError } from '@/lib/api-client';

const mockUseAuth = vi.fn();
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => mockUseAuth() }));

const resetPassword = vi.fn();
vi.mock('@/services/backendAuthService', () => ({
  resetPassword: (...a: unknown[]) => resetPassword(...a),
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importActual) => {
  const actual = await importActual<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => mockNavigate };
});

import ResetPassword from '@/pages/auth/ResetPassword';

const setSession = vi.fn();

function renderPage(token?: string) {
  const path = token === undefined ? '/reset-password' : `/reset-password?token=${token}`;
  return render(
    <MemoryRouter initialEntries={[path]}>
      <ResetPassword />
    </MemoryRouter>,
  );
}

function fillPasswords(pw: string, confirm = pw) {
  fireEvent.change(screen.getByLabelText(/^new password/i, { selector: 'input' }), {
    target: { value: pw },
  });
  fireEvent.change(screen.getByLabelText(/confirm new password/i, { selector: 'input' }), {
    target: { value: confirm },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  mockUseAuth.mockReturnValue({ profile: null, setSession });
});

describe('ResetPassword', () => {
  it('shows an invalid-link state when the token is missing', () => {
    renderPage();
    expect(screen.getByText(/invalid reset link/i)).toBeInTheDocument();
  });

  it('resets with the token + new password and seats the session', async () => {
    resetPassword.mockResolvedValue({ user: { id: '1', role: 'tenant' } });
    renderPage('tok123');
    fillPasswords('Valid123');
    fireEvent.click(screen.getByRole('button', { name: /reset password/i }));

    await waitFor(() => expect(resetPassword).toHaveBeenCalledWith('tok123', 'Valid123'));
    expect(setSession).toHaveBeenCalledWith({ id: '1', role: 'tenant' });
  });

  it('blocks submit when the confirmation does not match', async () => {
    renderPage('tok123');
    fillPasswords('Valid123', 'Other123');
    fireEvent.click(screen.getByRole('button', { name: /reset password/i }));

    expect(await screen.findByText(/do not match/i)).toBeInTheDocument();
    expect(resetPassword).not.toHaveBeenCalled();
  });

  it('maps a 400 to an invalid/expired-link message', async () => {
    resetPassword.mockRejectedValue(new ApiError('invalid_or_expired_token', 400));
    renderPage('tok123');
    fillPasswords('Valid123');
    fireEvent.click(screen.getByRole('button', { name: /reset password/i }));

    expect(await screen.findByText(/invalid or has expired/i)).toBeInTheDocument();
  });
});
