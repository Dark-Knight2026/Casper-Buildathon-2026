/**
 * Document Storage Components with Error Boundary Wrapper
 * Provides comprehensive error handling for document storage operations
 */

import React from 'react';
import { WarningErrorBoundary } from '@/components/common/WarningErrorBoundary';
import { errorLogger } from '@/utils/errorLogger';
import { useToast } from '@/hooks/use-toast';

interface DocumentStorageErrorBoundaryProps {
  children: React.ReactNode;
  componentName: string;
  operation?: 'upload' | 'download' | 'view' | 'delete';
}

export function DocumentStorageErrorBoundary({
  children,
  componentName,
  operation = 'view'
}: DocumentStorageErrorBoundaryProps) {
  const { toast } = useToast();

  const handleError = (error: Error, errorInfo: React.ErrorInfo) => {
    // Log the error with context
    errorLogger.log(
      error,
      {
        componentName,
        userAction: `document_${operation}`,
        additionalInfo: {
          operation,
          componentStack: errorInfo.componentStack
        }
      },
      'warning'
    );

    // Show toast notification
    const operationText = operation.charAt(0).toUpperCase() + operation.slice(1);
    toast({
      title: `Document ${operationText} Error`,
      description: `An error occurred while ${operation}ing the document. Please try again.`,
      variant: 'destructive'
    });
  };

  return (
    <WarningErrorBoundary
      componentName={componentName}
      onError={handleError}
      title={`Document ${operation} failed`}
      allowDismiss={true}
    >
      {children}
    </WarningErrorBoundary>
  );
}

export default DocumentStorageErrorBoundary;