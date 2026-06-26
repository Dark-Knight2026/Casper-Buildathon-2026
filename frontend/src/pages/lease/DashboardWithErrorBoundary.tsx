/**
 * Lease Dashboard with Error Boundary Wrapper
 * Provides comprehensive error handling for the lease management dashboard
 */

import React from 'react';
import { CriticalErrorBoundary } from '@/components/common/CriticalErrorBoundary';
import { WarningErrorBoundary } from '@/components/common/WarningErrorBoundary';
import LeaseDashboard from './dashboard';
import { errorLogger } from '@/utils/errorLogger';
import { useToast } from '@/hooks/use-toast';

export default function DashboardWithErrorBoundary() {
  const { toast } = useToast();

  const handleError = (error: Error, errorInfo: React.ErrorInfo) => {
    // Log the error with context
    errorLogger.log(
      error,
      {
        componentName: 'LeaseDashboard',
        userAction: 'dashboard_view',
        additionalInfo: {
          componentStack: errorInfo.componentStack
        }
      },
      'critical'
    );

    // Show toast notification
    toast({
      title: 'Dashboard Error',
      description: 'An error occurred while loading the dashboard. Please refresh the page.',
      variant: 'destructive'
    });
  };

  return (
    <CriticalErrorBoundary
      componentName="LeaseDashboard"
      onError={handleError}
      showReloadButton={true}
    >
      <LeaseDashboard />
    </CriticalErrorBoundary>
  );
}