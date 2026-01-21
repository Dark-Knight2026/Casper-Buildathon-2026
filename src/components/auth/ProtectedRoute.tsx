/**
 * Protected Route Component
 * Wraps routes that require authentication and role-based access
 */

import { useEffect, useState, useCallback } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { authService, type UserRole } from '@/services/authService';
import { sessionManager } from '@/lib/auth/sessionManager';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: UserRole | UserRole[];
  redirectTo?: string;
}

interface LocationState {
  requiredRole?: UserRole | UserRole[];
  userRole?: UserRole;
  from?: Location;
}

export function ProtectedRoute({
  children,
  requiredRole,
  redirectTo = '/auth/login'
}: ProtectedRouteProps) {
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [hasAccess, setHasAccess] = useState(false);
  const [userRole, setUserRole] = useState<UserRole | null>(null);

  const checkAuth = useCallback(async () => {
    try {
      // Check if session is active
      const sessionActive = await sessionManager.isSessionActive();
      
      if (!sessionActive) {
        setIsAuthenticated(false);
        setLoading(false);
        return;
      }

      // Get current user
      const user = await authService.getCurrentUser();
      
      if (!user) {
        setIsAuthenticated(false);
        setLoading(false);
        return;
      }

      setIsAuthenticated(true);

      // Get user profile to check role
      const profile = await authService.getUserProfile(user.id);
      
      if (!profile) {
        setIsAuthenticated(false);
        setLoading(false);
        return;
      }

      setUserRole(profile.role);

      // Check role-based access
      if (requiredRole) {
        const hasRoleAccess = authService.hasRole(profile.role, requiredRole);
        setHasAccess(hasRoleAccess);
      } else {
        setHasAccess(true);
      }
    } catch (error) {
      console.error('Auth check error:', error);
      setIsAuthenticated(false);
      setHasAccess(false);
    } finally {
      setLoading(false);
    }
  }, [requiredRole]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    // Redirect to login, but save the attempted location
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  if (!hasAccess) {
    // User is authenticated but doesn't have required role
    return (
      <Navigate
        to="/unauthorized"
        state={{ requiredRole, userRole, from: location }}
        replace
      />
    );
  }

  // User is authenticated and has required role
  return <>{children}</>;
}

/**
 * Unauthorized Page Component
 */
export function UnauthorizedPage() {
  const location = useLocation();
  const state = location.state as LocationState | null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-100 p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="mx-auto mb-4 w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
          <svg
            className="h-8 w-8 text-red-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
        
        <p className="text-gray-600 mb-6">
          You don't have permission to access this page.
          {state?.requiredRole && (
            <span className="block mt-2 text-sm">
              Required role: <strong>{Array.isArray(state.requiredRole) ? state.requiredRole.join(', ') : state.requiredRole}</strong>
              <br />
              Your role: <strong>{state.userRole}</strong>
            </span>
          )}
        </p>

        <div className="space-y-2">
          <button
            onClick={() => window.history.back()}
            className="w-full px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors"
          >
            Go Back
          </button>
          
          <button
            onClick={() => window.location.href = '/'}
            className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
          >
            Go to Home
          </button>
        </div>
      </div>
    </div>
  );
}