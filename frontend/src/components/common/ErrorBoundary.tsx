/**
 * Base Error Boundary Component
 * Catches React errors and provides fallback UI
 */

import React, { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { errorLogger, getUserFriendlyMessage, getErrorSeverity, ErrorContext } from '@/utils/errorLogger';
import { errorRecovery } from '@/utils/errorRecovery';

export interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  onReset?: () => void;
  componentName?: string;
  showDetails?: boolean;
  autoReset?: boolean;
  resetTimeout?: number;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  isResetting: boolean;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private resetTimeoutId: NodeJS.Timeout | null = null;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      isResetting: false
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    const { componentName, onError } = this.props;

    // Log the error
    const context: Partial<ErrorContext> = {
      componentName: componentName || 'Unknown',
      userAction: 'component_error',
      additionalInfo: {
        componentStack: errorInfo.componentStack
      }
    };

    const severity = getErrorSeverity(error);
    errorLogger.log(error, context, severity);

    // Update state with error info
    this.setState({ errorInfo });

    // Call custom error handler
    if (onError) {
      onError(error, errorInfo);
    }

    // Auto-reset if enabled
    if (this.props.autoReset && this.props.resetTimeout) {
      this.resetTimeoutId = setTimeout(() => {
        this.handleReset();
      }, this.props.resetTimeout);
    }
  }

  componentWillUnmount(): void {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
    }
  }

  handleReset = async (): Promise<void> => {
    const { onReset, componentName } = this.props;
    
    this.setState({ isResetting: true });

    try {
      // Attempt recovery
      if (componentName) {
        await errorRecovery.recover(
          this.state.error!,
          componentName,
          {
            clearState: true,
            retryAction: onReset
          }
        );
      }

      // Reset state
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
        isResetting: false
      });

      // Call custom reset handler
      if (onReset) {
        onReset();
      }
    } catch (error) {
      console.error('Failed to reset error boundary:', error);
      this.setState({ isResetting: false });
    }
  };

  handleGoBack = (): void => {
    window.history.back();
  };

  handleGoHome = (): void => {
    window.location.href = '/';
  };

  render(): ReactNode {
    const { hasError, error, errorInfo, isResetting } = this.state;
    const { children, fallback, showDetails = false } = this.props;

    if (hasError && error) {
      // Use custom fallback if provided
      if (fallback) {
        return fallback;
      }

      // Default fallback UI
      const userFriendlyMessage = getUserFriendlyMessage(error);

      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
          <Card className="max-w-2xl w-full">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <CardTitle className="text-xl">Something went wrong</CardTitle>
                  <CardDescription>
                    We encountered an unexpected error
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* User-friendly message */}
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-800">{userFriendlyMessage}</p>
              </div>

              {/* Error details (if enabled) */}
              {showDetails && (
                <div className="space-y-2">
                  <details className="bg-gray-100 rounded-lg p-4">
                    <summary className="cursor-pointer font-medium text-sm text-gray-700">
                      Technical Details
                    </summary>
                    <div className="mt-3 space-y-2">
                      <div>
                        <p className="text-xs font-medium text-gray-600">Error Message:</p>
                        <p className="text-xs text-gray-800 font-mono bg-white p-2 rounded mt-1">
                          {error.message}
                        </p>
                      </div>
                      {error.stack && (
                        <div>
                          <p className="text-xs font-medium text-gray-600">Stack Trace:</p>
                          <pre className="text-xs text-gray-800 font-mono bg-white p-2 rounded mt-1 overflow-x-auto">
                            {error.stack}
                          </pre>
                        </div>
                      )}
                      {errorInfo?.componentStack && (
                        <div>
                          <p className="text-xs font-medium text-gray-600">Component Stack:</p>
                          <pre className="text-xs text-gray-800 font-mono bg-white p-2 rounded mt-1 overflow-x-auto">
                            {errorInfo.componentStack}
                          </pre>
                        </div>
                      )}
                    </div>
                  </details>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex flex-wrap gap-3">
                <Button
                  onClick={this.handleReset}
                  disabled={isResetting}
                  className="flex items-center gap-2"
                >
                  <RefreshCw className={`h-4 w-4 ${isResetting ? 'animate-spin' : ''}`} />
                  {isResetting ? 'Resetting...' : 'Try Again'}
                </Button>
                <Button
                  variant="outline"
                  onClick={this.handleGoBack}
                  className="flex items-center gap-2"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Go Back
                </Button>
                <Button
                  variant="outline"
                  onClick={this.handleGoHome}
                  className="flex items-center gap-2"
                >
                  <Home className="h-4 w-4" />
                  Go Home
                </Button>
              </div>

              {/* Support message */}
              <div className="text-sm text-gray-600 border-t pt-4">
                <p>
                  If this problem persists, please{' '}
                  <a href="/support" className="text-blue-600 hover:underline">
                    contact support
                  </a>{' '}
                  with the error details above.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return children;
  }
}

export default ErrorBoundary;