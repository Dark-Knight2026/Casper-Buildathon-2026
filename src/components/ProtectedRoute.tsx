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
  
  // 'both' means the route is accessible to both landlords and tenants
  if (allowedRoles.includes('both')) {
    return <>{children}</>;
  }

  // Check if user's role matches any of the allowed roles
  if (!allowedRoles.includes(userRole as RouteRole)) {
    return <Navigate to={getDashboardRoute(userRole)} replace />;
  }

  return <>{children}</>;
}