/**
 * Critical Error Boundary
 * Full-page error display for fatal errors
 */

import React, { ReactNode } from 'react';
import { ErrorBoundary, ErrorBoundaryProps } from './ErrorBoundary';
import { AlertTriangle, RefreshCw, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface CriticalErrorBoundaryProps extends Omit<ErrorBoundaryProps, 'fallback'> {
  supportEmail?: string;
  showReloadButton?: boolean;
}

export function CriticalErrorBoundary({
  children,
  componentName = 'Application',
  supportEmail = 'support@example.com',
  showReloadButton = true,
  ...props
}: CriticalErrorBoundaryProps) {
  const handleReload = () => {
    window.location.reload();
  };

  const handleContactSupport = () => {
    window.location.href = `mailto:${supportEmail}?subject=Critical Error in ${componentName}`;
  };

  const criticalFallback = (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-red-50 to-orange-50">
      <Card className="max-w-2xl w-full border-2 border-red-200 shadow-xl">
        <CardHeader className="bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-t-lg">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center">
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
            <div>
              <CardTitle className="text-2xl font-bold">Critical Error</CardTitle>
              <CardDescription className="text-red-50">
                The application encountered a fatal error
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          {/* Error message */}
          <div className="bg-red-50 border-2 border-red-200 rounded-lg p-6">
            <h3 className="font-semibold text-red-900 mb-2">What happened?</h3>
            <p className="text-red-800">
              A critical error has occurred that prevents the application from continuing. 
              This error has been automatically logged and our team has been notified.
            </p>
          </div>

          {/* What to do */}
          <div className="space-y-3">
            <h3 className="font-semibold text-gray-900">What can you do?</h3>
            <ul className="list-disc list-inside space-y-2 text-gray-700">
              <li>Try reloading the page</li>
              <li>Clear your browser cache and cookies</li>
              <li>Try again in a few minutes</li>
              <li>Contact support if the problem persists</li>
            </ul>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-3 pt-4">
            {showReloadButton && (
              <Button
                onClick={handleReload}
                size="lg"
                className="flex items-center gap-2 bg-red-600 hover:bg-red-700"
              >
                <RefreshCw className="h-5 w-5" />
                Reload Application
              </Button>
            )}
            <Button
              variant="outline"
              size="lg"
              onClick={handleContactSupport}
              className="flex items-center gap-2"
            >
              <Mail className="h-5 w-5" />
              Contact Support
            </Button>
          </div>

          {/* Additional info */}
          <div className="text-sm text-gray-600 border-t pt-4">
            <p className="mb-2">
              <strong>Error ID:</strong> {Date.now().toString(36)}
            </p>
            <p>
              Please include this error ID when contacting support for faster assistance.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <ErrorBoundary
      {...props}
      componentName={componentName}
      fallback={criticalFallback}
      showDetails={false}
    >
      {children}
    </ErrorBoundary>
  );
}

export default CriticalErrorBoundary;