import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const mockUseAuth = vi.fn();
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => mockUseAuth() }));

const mockToast = vi.fn();
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: mockToast }) }));

const sendVerificationEmail = vi.fn();
const resendVerificationEmail = vi.fn();
vi.mock('@/services/ico/backendAuthService', () => ({
  sendVerificationEmail: (...a: unknown[]) => sendVerificationEmail(...a),
  resendVerificationEmail: (...a: unknown[]) => resendVerificationEmail(...a),
}));

import { EmailVerificationCard } from '@/components/profile/EmailVerificationCard';

function renderCard() {
  return render(
    <MemoryRouter>
      <EmailVerificationCard />
    </MemoryRouter>,
  );
}

describe('EmailVerificationCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ profile: { verificationLevel: 'none', email: 'real@example.com' } });
  });

  it('shows the verified badge when verificationLevel is email or above', () => {
    mockUseAuth.mockReturnValue({ profile: { verificationLevel: 'email', email: 'real@example.com' } });
    renderCard();
    expect(screen.getByText(/email verified/i)).toBeInTheDocument();
  });

  it('renders nothing for a placeholder wallet email', () => {
    mockUseAuth.mockReturnValue({
      profile: { verificationLevel: 'none', email: 'wallet_abc@leasefi.local' },
    });
    const { container } = renderCard();
    expect(container).toBeEmptyDOMElement();
  });

  it('requests a verification email and toasts on success', async () => {
    sendVerificationEmail.mockResolvedValue({});
    renderCard();
    fireEvent.click(screen.getByRole('button', { name: /send verification email/i }));
    await waitFor(() => expect(sendVerificationEmail).toHaveBeenCalledTimes(1));
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Verification email requested' }),
    );
  });

  it('does not throw when the component unmounts mid-send (TEST-02)', async () => {
    let resolveSend: (v: unknown) => void = () => {};
    sendVerificationEmail.mockReturnValue(new Promise((res) => { resolveSend = res; }));

    const { unmount } = renderCard();
    fireEvent.click(screen.getByRole('button', { name: /send verification email/i }));

    // Unmount while the request is still in flight, then let it resolve — the
    // mountedRef guard must keep the finally's setSending(false) from running on
    // the unmounted component.
    unmount();
    await act(async () => {
      resolveSend({});
    });
    // Reaching here without an unhandled error is the assertion.
    expect(sendVerificationEmail).toHaveBeenCalledTimes(1);
  });
});
