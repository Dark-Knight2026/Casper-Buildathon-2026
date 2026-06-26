import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ApiError } from '@/lib/api-client';

const mockUseAuth = vi.fn();
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => mockUseAuth() }));

const register = vi.fn();
vi.mock('@/services/backendAuthService', () => ({
  register: (...a: unknown[]) => register(...a),
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importActual) => {
  const actual = await importActual<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => mockNavigate };
});

import Register from '@/pages/auth/Register';

function apiError(statusCode: number) {
  return new ApiError(`status ${statusCode}`, statusCode);
}

const setSession = vi.fn();

function renderPage(search = '') {
  return render(
    <MemoryRouter initialEntries={[`/auth/register${search}`]}>
      <Register />
    </MemoryRouter>,
  );
}

function fillValid() {
  fireEvent.change(screen.getByLabelText(/first name/i), { target: { value: 'Jane' } });
  fireEvent.change(screen.getByLabelText(/last name/i), { target: { value: 'Doe' } });
  fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'Jane@Example.com' } });
  fireEvent.change(screen.getByLabelText(/^password/i, { selector: 'input' }), { target: { value: 'Valid123' } });
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  mockUseAuth.mockReturnValue({ profile: null, setSession });
});

describe('Register', () => {
  it('submits the normalized body (default role tenant) and seats the session', async () => {
    register.mockResolvedValue({ user: { id: '1', role: 'tenant' } });
    renderPage();
    fillValid();
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() =>
      expect(register).toHaveBeenCalledWith({
        email: 'jane@example.com',
        password: 'Valid123',
        first_name: 'Jane',
        last_name: 'Doe',
        role: 'tenant',
      }),
    );
    expect(setSession).toHaveBeenCalledWith({ id: '1', role: 'tenant' });
  });

  it('honors a ?role=landlord deep-link', async () => {
    register.mockResolvedValue({ user: { id: '1', role: 'landlord' } });
    renderPage('?role=landlord');
    fillValid();
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() =>
      expect(register).toHaveBeenCalledWith(expect.objectContaining({ role: 'landlord' })),
    );
  });

  it('blocks submit and shows a field error for an empty name', async () => {
    renderPage();
    // leave first name empty
    fireEvent.change(screen.getByLabelText(/last name/i), { target: { value: 'Doe' } });
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'jane@example.com' } });
    fireEvent.change(screen.getByLabelText(/^password/i, { selector: 'input' }), { target: { value: 'Valid123' } });
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));

    expect(await screen.findByText(/first name is required/i)).toBeInTheDocument();
    expect(register).not.toHaveBeenCalled();
  });

  it('shows an "already exists" message on a 409', async () => {
    register.mockRejectedValue(apiError(409));
    renderPage();
    fillValid();
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));

    expect(await screen.findByText(/already exists/i)).toBeInTheDocument();
    expect(setSession).not.toHaveBeenCalled();
  });
});
