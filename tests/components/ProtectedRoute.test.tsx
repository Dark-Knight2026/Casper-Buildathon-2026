import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import type { RouteRole } from '@/types/user';

const mockUseAuth = vi.fn();
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => mockUseAuth() }));

import ProtectedRoute from '@/components/ProtectedRoute';

// Render the guard at /guarded with sibling routes that name the redirect
// targets, so a redirect is observable by the text it lands on.
function renderGuarded(allowedRoles: RouteRole[]) {
  return render(
    <MemoryRouter initialEntries={['/guarded']}>
      <Routes>
        <Route
          path="/guarded"
          element={
            <ProtectedRoute allowedRoles={allowedRoles}>
              <div>Protected content</div>
            </ProtectedRoute>
          }
        />
        <Route path="/auth/login" element={<div>Login page</div>} />
        <Route path="/tenant/dashboard" element={<div>Tenant dashboard</div>} />
        <Route path="/landlord/dashboard" element={<div>Landlord dashboard</div>} />
        <Route path="/" element={<div>Public root</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ProtectedRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows a loading spinner while the session is being verified', () => {
    mockUseAuth.mockReturnValue({ profile: null, loading: true, isAuthenticated: false });
    renderGuarded(['tenant']);
    // Neither the children nor any redirect target is rendered…
    expect(screen.queryByText('Protected content')).not.toBeInTheDocument();
    expect(screen.queryByText('Login page')).not.toBeInTheDocument();
    // …only the spinner (Loader2 carries the animate-spin class).
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('redirects unauthenticated users to /auth/login', () => {
    mockUseAuth.mockReturnValue({ profile: null, loading: false, isAuthenticated: false });
    renderGuarded(['tenant']);
    expect(screen.getByText('Login page')).toBeInTheDocument();
    expect(screen.queryByText('Protected content')).not.toBeInTheDocument();
  });

  it('redirects to /auth/login when authenticated but the profile has not hydrated', () => {
    mockUseAuth.mockReturnValue({ profile: null, loading: false, isAuthenticated: true });
    renderGuarded(['tenant']);
    expect(screen.getByText('Login page')).toBeInTheDocument();
  });

  it('redirects to the role dashboard when the role is not allowed', () => {
    mockUseAuth.mockReturnValue({
      profile: { id: '1', role: 'tenant' },
      loading: false,
      isAuthenticated: true,
    });
    renderGuarded(['landlord']);
    expect(screen.getByText('Tenant dashboard')).toBeInTheDocument();
    expect(screen.queryByText('Protected content')).not.toBeInTheDocument();
  });

  it('falls back to the public root for a role with no dashboard', () => {
    mockUseAuth.mockReturnValue({
      profile: { id: '1', role: 'agent' },
      loading: false,
      isAuthenticated: true,
    });
    renderGuarded(['landlord']);
    expect(screen.getByText('Public root')).toBeInTheDocument();
  });

  it('renders children when authenticated and the role matches', () => {
    mockUseAuth.mockReturnValue({
      profile: { id: '1', role: 'landlord' },
      loading: false,
      isAuthenticated: true,
    });
    renderGuarded(['landlord']);
    expect(screen.getByText('Protected content')).toBeInTheDocument();
  });
});
