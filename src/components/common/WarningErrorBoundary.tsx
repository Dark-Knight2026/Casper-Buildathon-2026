/**
 * Warning Error Boundary
 * Inline warning display for recoverable errors
 */

import React, { ReactNode } from 'react';
import { ErrorBoundary, ErrorBoundaryProps } from './ErrorBoundary';
import { AlertCircle, RefreshCw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface WarningErrorBoundaryProps extends Omit<ErrorBoundaryProps, 'fallback'> {
  title?: string;
  allowDismiss?: boolean;
}

export function WarningErrorBoundary({
  children,
  componentName = 'Component',
  title = 'Something went wrong',
  allowDismiss = true,
  ...props
}: WarningErrorBoundaryProps) {
  const [isDismissed, setIsDismissed] = React.useState(false);

  const handleDismiss = () => {
    setIsDismissed(true);
  };

  const handleReset = () => {
    setIsDismissed(false);
    if (props.onReset) {
      props.onReset();
    }
  };

  const warningFallback = (
    <div className="w-full">
      {!isDismissed && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle className="flex items-center justify-between">
            <span>{title}</span>
            {allowDismiss && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDismiss}
                className="h-6 w-6 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </AlertTitle>
          <AlertDescription className="mt-2">
            <p className="mb-3">
              This section encountered an error and couldn't load properly. 
              You can try refreshing this section or continue using other parts of the application.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-3 w-3" />
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}
      
      {/* Show a placeholder or minimal UI when dismissed */}
      {isDismissed && (
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
          <AlertCircle className="h-8 w-8 mx-auto mb-2 text-gray-400" />
          <p className="text-sm text-gray-600 mb-3">
            This section is temporarily unavailable
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            className="flex items-center gap-2 mx-auto"
          >
            <RefreshCw className="h-3 w-3" />
            Try Again
          </Button>
        </div>
      )}
    </div>
  );

  return (
    <ErrorBoundary
      {...props}
      componentName={componentName}
      fallback={warningFallback}
      showDetails={false}
      onReset={handleReset}
    >
      {children}
    </ErrorBoundary>
  );
}

export default WarningErrorBoundary;