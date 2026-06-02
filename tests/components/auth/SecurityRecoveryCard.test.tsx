import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

const mockUseAuth = vi.fn();
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => mockUseAuth() }));

import { SecurityRecoveryCard } from '@/components/auth/SecurityRecoveryCard';

const KEY = (id: string) => `leasefi_security_recovery_acked_at_${id}`;

describe('SecurityRecoveryCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mockUseAuth.mockReturnValue({ profile: { id: 'userA' } });
  });

  it('shows the card for a user who has not acknowledged it', () => {
    render(<SecurityRecoveryCard />);
    expect(screen.getByText(/keep your account recoverable/i)).toBeInTheDocument();
  });

  it('renders nothing synchronously (no flash) when already acked — ARCH-06', () => {
    localStorage.setItem(KEY('userA'), new Date('2026-01-01').toISOString());
    render(<SecurityRecoveryCard />);
    // Lazy initializer reads localStorage on first render, so the card is never
    // mounted — no hidden→visible transition.
    expect(screen.queryByText(/keep your account recoverable/i)).not.toBeInTheDocument();
  });

  it('persists dismissal under a per-user key and hides the card — TEST-08', () => {
    render(<SecurityRecoveryCard />);
    fireEvent.click(screen.getByRole('button', { name: /i've done this/i }));
    expect(screen.queryByText(/keep your account recoverable/i)).not.toBeInTheDocument();
    expect(localStorage.getItem(KEY('userA'))).not.toBeNull();
  });

  it('does not hide the card for a different user on the same device — TEST-08', () => {
    // userA dismissed earlier on this device…
    localStorage.setItem(KEY('userA'), new Date('2026-01-01').toISOString());
    // …but userB has never seen it.
    mockUseAuth.mockReturnValue({ profile: { id: 'userB' } });
    render(<SecurityRecoveryCard />);
    expect(screen.getByText(/keep your account recoverable/i)).toBeInTheDocument();
  });

  it('shows the card and skips persistence when there is no user id', () => {
    mockUseAuth.mockReturnValue({ profile: null });
    render(<SecurityRecoveryCard />);
    expect(screen.getByText(/keep your account recoverable/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /i've done this/i }));
    // Nothing user-scoped to write; storage stays empty.
    expect(localStorage.length).toBe(0);
  });
});
