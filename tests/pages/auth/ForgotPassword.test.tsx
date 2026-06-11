import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ApiError } from '@/lib/api-client';

const forgotPassword = vi.fn();
vi.mock('@/services/backendAuthService', () => ({
  forgotPassword: (...a: unknown[]) => forgotPassword(...a),
}));

import ForgotPassword from '@/pages/auth/ForgotPassword';

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/forgot-password']}>
      <ForgotPassword />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('ForgotPassword', () => {
  it('submits the normalized email and shows a neutral confirmation', async () => {
    forgotPassword.mockResolvedValue({ status: 'sent' });
    renderPage();
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: ' Jane@Example.com ' } });
    fireEvent.click(screen.getByRole('button', { name: /send reset link/i }));

    expect(await screen.findByText(/check your email/i)).toBeInTheDocument();
    expect(forgotPassword).toHaveBeenCalledWith('jane@example.com');
  });

  it('blocks submit for an invalid email', async () => {
    renderPage();
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'bad' } });
    fireEvent.click(screen.getByRole('button', { name: /send reset link/i }));

    expect(await screen.findByText(/valid email/i)).toBeInTheDocument();
    expect(forgotPassword).not.toHaveBeenCalled();
  });

  it('shows an error and stays on the form when the request fails', async () => {
    forgotPassword.mockRejectedValue(new ApiError('boom', 500));
    renderPage();
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'jane@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: /send reset link/i }));

    expect(await screen.findByText(/on our end/i)).toBeInTheDocument();
    expect(screen.queryByText(/check your email/i)).not.toBeInTheDocument();
  });
});
