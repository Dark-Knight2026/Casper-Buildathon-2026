/**
 * Signature Workflow Manager with Error Boundary Wrapper
 * Provides comprehensive error handling for the signature workflow
 */

import React from 'react';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import SignatureWorkflowManager from './SignatureWorkflowManager';
import { errorLogger } from '@/utils/errorLogger';
import { errorRecovery } from '@/utils/errorRecovery';
import { useToast } from '@/hooks/use-toast';
import { LeaseAgreement } from '@/types/lease';

interface SignatureWorkflowManagerWithErrorBoundaryProps {
  lease: LeaseAgreement;
  documentUrl: string;
  onComplete?: (certificateId: string) => void;
}

export default function SignatureWorkflowManagerWithErrorBoundary(
  props: SignatureWorkflowManagerWithErrorBoundaryProps
) {
  const { toast } = useToast();

  const handleError = (error: Error, errorInfo: React.ErrorInfo) => {
    // Log the error with context
    errorLogger.log(
      error,
      {
        componentName: 'SignatureWorkflowManager',
        userAction: 'signature_workflow',
        additionalInfo: {
          leaseId: props.lease.id,
          componentStack: errorInfo.componentStack
        }
      },
      'warning'
    );

    // Show toast notification
    toast({
      title: 'Signature Workflow Error',
      description: 'An error occurred during the signature process. You can retry or go back.',
      variant: 'destructive'
    });
  };

  const handleReset = async () => {
    // Attempt to recover
    await errorRecovery.recover(
      new Error('Signature workflow reset requested'),
      'SignatureWorkflowManager',
      {
        autoSave: true,
        clearState: false
      }
    );

    toast({
      title: 'Workflow Reset',
      description: 'The signature workflow has been reset. You can start over.'
    });
  };

  return (
    <ErrorBoundary
      componentName="SignatureWorkflowManager"
      onError={handleError}
      onReset={handleReset}
      showDetails={process.env.NODE_ENV === 'development'}
    >
      <SignatureWorkflowManager {...props} />
    </ErrorBoundary>
  );
}