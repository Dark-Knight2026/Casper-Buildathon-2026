import React, { ReactNode } from 'react';
import { ErrorBoundary } from './ErrorBoundary';

interface PageErrorBoundaryProps {
  children: ReactNode;
  pageName?: string;
}

/**
 * Page-level error boundary wrapper
 * Automatically logs page name for better error tracking
 */
export const PageErrorBoundary: React.FC<PageErrorBoundaryProps> = ({ 
  children, 
  pageName = 'Unknown Page' 
}) => {
  return (
    <ErrorBoundary
      level="page"
      onError={(error, errorInfo) => {
        // Enhanced logging with page context
        console.error(`[${pageName}] Error:`, {
          error: error.message,
          stack: error.stack,
          componentStack: errorInfo.componentStack,
          page: pageName,
          timestamp: new Date().toISOString(),
        });
      }}
    >
      {children}
    </ErrorBoundary>
  );
};