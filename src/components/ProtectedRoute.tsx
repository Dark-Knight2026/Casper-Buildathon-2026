import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { RouteRole, getDashboardRoute } from '@/types/user';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: RouteRole[];
}

export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { profile, loading, isAuthenticated } = useAuth();

  // Show loading spinner while AuthContext is verifying the cookie-backed
  // session via /auth/refresh on mount.
  if (loading) {
    return <LoadingSpinner fullScreen />;
  }

  if (!isAuthenticated || !profile) {
    return <Navigate to="/auth/login" replace />;
  }

  // Check if user's role is allowed
  const userRole = profile.role;
  
  // There is no shared 'both' role: tenant and landlord are distinct. A feature
  // both can use is mounted under each layout (reusing the component), not gated
  // by widening this check — so a single role-membership test is enough.
  if (!allowedRoles.includes(userRole as RouteRole)) {
    return <Navigate to={getDashboardRoute(userRole)} replace />;
  }

  return <>{children}</>;
}