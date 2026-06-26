import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ApiError } from '@/lib/api-client';

const mockUseAuth = vi.fn();
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => mockUseAuth() }));

const loginWithPassword = vi.fn();
vi.mock('@/services/backendAuthService', () => ({
  loginWithPassword: (...a: unknown[]) => loginWithPassword(...a),
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importActual) => {
  const actual = await importActual<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => mockNavigate };
});

import Login from '@/pages/auth/Login';

function apiError(statusCode: number) {
  return new ApiError(`status ${statusCode}`, statusCode);
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/auth/login']}>
      <Login />
    </MemoryRouter>,
  );
}

const setSession = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  mockUseAuth.mockReturnValue({ profile: null, setSession });
});

describe('Login', () => {
  it('submits normalized credentials and hands the user to setSession', async () => {
    loginWithPassword.mockResolvedValue({ user: { id: '1', role: 'tenant' } });
    renderPage();

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: '  Jane@Example.com ' } });
    fireEvent.change(screen.getByLabelText(/^password/i, { selector: 'input' }), { target: { value: 'Valid123' } });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() =>
      expect(loginWithPassword).toHaveBeenCalledWith('jane@example.com', 'Valid123'),
    );
    expect(setSession).toHaveBeenCalledWith({ id: '1', role: 'tenant' });
  });

  it('blocks submit and shows a field error for an invalid email', async () => {
    renderPage();
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'not-an-email' } });
    fireEvent.change(screen.getByLabelText(/^password/i, { selector: 'input' }), { target: { value: 'Valid123' } });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    expect(await screen.findByText(/valid email/i)).toBeInTheDocument();
    expect(loginWithPassword).not.toHaveBeenCalled();
  });

  it('shows one generic error on a 401 (anti-enumeration) and does not seat a session', async () => {
    loginWithPassword.mockRejectedValue(apiError(401));
    renderPage();
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'jane@example.com' } });
    fireEvent.change(screen.getByLabelText(/^password/i, { selector: 'input' }), { target: { value: 'Valid123' } });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    expect(await screen.findByText(/invalid email or password/i)).toBeInTheDocument();
    expect(setSession).not.toHaveBeenCalled();
  });

  it('surfaces a 403 as an account-not-active message', async () => {
    loginWithPassword.mockRejectedValue(apiError(403));
    renderPage();
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'jane@example.com' } });
    fireEvent.change(screen.getByLabelText(/^password/i, { selector: 'input' }), { target: { value: 'Valid123' } });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    expect(await screen.findByText(/not active/i)).toBeInTheDocument();
  });

  it('redirects to the role dashboard when already authenticated', async () => {
    mockUseAuth.mockReturnValue({ profile: { role: 'tenant' }, setSession });
    renderPage();
    await waitFor(() =>
      expect(mockNavigate).toHaveBeenCalledWith('/tenant/dashboard', { replace: true }),
    );
  });
});
