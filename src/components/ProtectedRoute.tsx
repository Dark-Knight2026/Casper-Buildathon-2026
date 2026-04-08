import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { RouteRole } from '@/types/user';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: RouteRole[];
}

export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { profile, loading, isAuthenticated } = useAuth();

  // Show loading spinner while checking authentication
  if (loading) {
    return <LoadingSpinner fullScreen />;
  }

  // If there's a JWT token in storage, trust it while profile hydrates
  const hasStoredToken = !!localStorage.getItem('leasefi_jwt');
  if (!isAuthenticated || !profile) {
    if (hasStoredToken) return <LoadingSpinner fullScreen />;
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
    // Redirect to appropriate dashboard based on user's role
    const redirectPath = userRole === 'landlord' ? '/landlord/dashboard' : '/tenant/dashboard';
    return <Navigate to={redirectPath} replace />;
  }

  return <>{children}</>;
}