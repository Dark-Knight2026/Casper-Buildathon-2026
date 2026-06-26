/**
 * Enhanced Lease Wizard with Error Boundary Wrapper
 * Provides comprehensive error handling for the lease generation workflow
 */

import React from 'react';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { WarningErrorBoundary } from '@/components/common/WarningErrorBoundary';
import EnhancedLeaseWizard from './EnhancedLeaseWizard';
import { errorLogger } from '@/utils/errorLogger';
import { errorRecovery } from '@/utils/errorRecovery';
import { useToast } from '@/hooks/use-toast';

interface EnhancedLeaseWizardWithErrorBoundaryProps {
  templateId?: string;
  existingLeaseId?: string;
  onComplete?: (leaseId: string) => void;
  onCancel?: () => void;
}

export default function EnhancedLeaseWizardWithErrorBoundary(
  props: EnhancedLeaseWizardWithErrorBoundaryProps
) {
  const { toast } = useToast();

  const handleError = (error: Error, errorInfo: React.ErrorInfo) => {
    // Log the error with context
    errorLogger.log(
      error,
      {
        componentName: 'EnhancedLeaseWizard',
        userAction: 'lease_generation',
        additionalInfo: {
          templateId: props.templateId,
          existingLeaseId: props.existingLeaseId,
          componentStack: errorInfo.componentStack
        }
      },
      'critical'
    );

    // Show toast notification
    toast({
      title: 'Error in Lease Wizard',
      description: 'An error occurred while creating the lease. Your progress has been saved.',
      variant: 'destructive'
    });
  };

  const handleReset = async () => {
    // Attempt to recover
    await errorRecovery.recover(
      new Error('Wizard reset requested'),
      'EnhancedLeaseWizard',
      {
        autoSave: true,
        clearState: false
      }
    );

    // Show success message
    toast({
      title: 'Wizard Reset',
      description: 'The lease wizard has been reset. You can start over.'
    });
  };

  return (
    <ErrorBoundary
      componentName="EnhancedLeaseWizard"
      onError={handleError}
      onReset={handleReset}
      showDetails={process.env.NODE_ENV === 'development'}
    >
      <EnhancedLeaseWizard {...props} />
    </ErrorBoundary>
  );
}