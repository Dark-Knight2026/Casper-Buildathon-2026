# Error Handling Guide

Comprehensive guide to error handling in the Lease Management System.

## Table of Contents

1. [Overview](#overview)
2. [Error Boundary Components](#error-boundary-components)
3. [Error Logging](#error-logging)
4. [Error Recovery](#error-recovery)
5. [Usage Patterns](#usage-patterns)
6. [Best Practices](#best-practices)
7. [Troubleshooting](#troubleshooting)

## Overview

The Lease Management System implements a comprehensive error handling strategy using React Error Boundaries, centralized error logging, and automated recovery mechanisms.

### Key Features

- **Multi-level Error Boundaries**: Different error boundaries for different severity levels
- **Centralized Error Logging**: All errors are logged with context for debugging
- **Automated Recovery**: Automatic retry and state recovery mechanisms
- **User-Friendly Messages**: Technical errors are translated to user-friendly language
- **Error Tracking**: Integration-ready for services like Sentry or LogRocket

## Error Boundary Components

### 1. Base Error Boundary

The foundation for all error boundaries.

```tsx
import { ErrorBoundary } from '@/components/common/ErrorBoundary';

<ErrorBoundary
  componentName="MyComponent"
  onError={(error, errorInfo) => console.log(error)}
  onReset={() => console.log('Reset')}
  showDetails={true}
>
  <MyComponent />
</ErrorBoundary>
```

**Props:**
- `componentName` (string): Name of the component for logging
- `onError` (function): Custom error handler
- `onReset` (function): Called when user clicks "Try Again"
- `showDetails` (boolean): Show technical error details
- `autoReset` (boolean): Automatically reset after timeout
- `resetTimeout` (number): Timeout in milliseconds for auto-reset

### 2. Critical Error Boundary

Full-page error display for fatal errors.

```tsx
import { CriticalErrorBoundary } from '@/components/common/CriticalErrorBoundary';

<CriticalErrorBoundary
  componentName="Application"
  supportEmail="support@example.com"
  showReloadButton={true}
>
  <App />
</CriticalErrorBoundary>
```

**Use Cases:**
- Application-level errors
- Fatal errors that prevent the app from functioning
- Database connection failures
- Authentication failures

### 3. Warning Error Boundary

Inline warning display for recoverable errors.

```tsx
import { WarningErrorBoundary } from '@/components/common/WarningErrorBoundary';

<WarningErrorBoundary
  componentName="LeaseList"
  title="Failed to load leases"
  allowDismiss={true}
>
  <LeaseList />
</WarningErrorBoundary>
```

**Use Cases:**
- Component-level errors
- Network request failures
- Data loading errors
- Non-critical feature failures

## Error Logging

### Error Logger Service

Centralized error logging with context capture.

```typescript
import { errorLogger } from '@/utils/errorLogger';

// Log an error
errorLogger.log(
  error,
  {
    componentName: 'LeaseWizard',
    userId: 'user-123',
    userAction: 'create_lease',
    formData: { propertyId: 'prop-456' }
  },
  'warning' // severity: 'critical' | 'warning' | 'info'
);

// Get all logs
const logs = errorLogger.getLogs();

// Get logs by severity
const criticalErrors = errorLogger.getLogsBySeverity('critical');

// Get statistics
const stats = errorLogger.getStatistics();
// Returns: { total, critical, warning, info, byComponent }

// Export logs
const jsonLogs = errorLogger.exportLogs();

// Clear logs
errorLogger.clearLogs();
```

### Error Context

All errors are logged with the following context:

```typescript
interface ErrorContext {
  componentName?: string;      // Component where error occurred
  userId?: string;              // Current user ID
  timestamp: string;            // ISO timestamp
  userAction?: string;          // What the user was doing
  formData?: Record<string, unknown>;  // Form data if applicable
  url?: string;                 // Current URL
  userAgent?: string;           // Browser user agent
  additionalInfo?: Record<string, unknown>;  // Any additional context
}
```

### User-Friendly Messages

The error logger automatically translates technical errors to user-friendly messages:

```typescript
import { getUserFriendlyMessage } from '@/utils/errorLogger';

const error = new Error('Network request failed');
const message = getUserFriendlyMessage(error);
// Returns: "Unable to connect to the server. Please check your internet connection and try again."
```

## Error Recovery

### Error Recovery Service

Automated error recovery mechanisms.

```typescript
import { errorRecovery } from '@/utils/errorRecovery';

// Attempt to recover from an error
const result = await errorRecovery.recover(
  error,
  'LeaseWizard',
  {
    autoSave: true,           // Save current state before recovery
    redirectUrl: '/dashboard', // Redirect to safe page
    retryAction: async () => { // Action to retry
      await saveLease();
    },
    clearState: false,        // Clear component state
    showToast: true          // Show toast notification
  }
);

// Check recovery result
if (result.success) {
  console.log(result.message);
  console.log(result.action); // 'retry' | 'redirect' | 'reload' | 'clear'
}
```

### Recovery State Management

```typescript
// Save recovery state
await errorRecovery.saveCurrentState('LeaseWizard');

// Restore saved state
const state = errorRecovery.restoreState('LeaseWizard');

// Check if recovery state exists
const hasState = errorRecovery.hasRecoveryState('LeaseWizard');

// Clear recovery state
errorRecovery.clearComponentState('LeaseWizard');

// Clear all recovery states
errorRecovery.clearAllRecoveryStates();
```

### Retry with Backoff

Automatically retry failed operations with exponential backoff:

```typescript
const result = await errorRecovery.retryWithBackoff(
  async () => {
    return await fetchLeaseData();
  },
  3,      // maxRetries
  1000    // initialDelay in ms
);
```

## Usage Patterns

### Pattern 1: Wizard Component

Wrap the entire wizard with an error boundary:

```tsx
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { errorLogger } from '@/utils/errorLogger';

function LeaseWizardPage() {
  const handleError = (error: Error, errorInfo: React.ErrorInfo) => {
    errorLogger.log(error, {
      componentName: 'LeaseWizard',
      userAction: 'lease_creation',
      additionalInfo: { componentStack: errorInfo.componentStack }
    }, 'critical');
  };

  return (
    <ErrorBoundary
      componentName="LeaseWizard"
      onError={handleError}
      showDetails={false}
    >
      <EnhancedLeaseWizard />
    </ErrorBoundary>
  );
}
```

### Pattern 2: Individual Steps

Wrap each wizard step with a warning boundary:

```tsx
import { WarningErrorBoundary } from '@/components/common/WarningErrorBoundary';

function WizardSteps() {
  return (
    <>
      <WarningErrorBoundary componentName="PropertyDetailsStep">
        <PropertyDetailsStep />
      </WarningErrorBoundary>
      
      <WarningErrorBoundary componentName="PartiesInformationStep">
        <PartiesInformationStep />
      </WarningErrorBoundary>
      
      {/* More steps... */}
    </>
  );
}
```

### Pattern 3: Async Operations

Wrap async operations with try-catch and error logging:

```typescript
import { errorLogger, getUserFriendlyMessage } from '@/utils/errorLogger';
import { errorRecovery } from '@/utils/errorRecovery';

async function saveLease(data: LeaseFormData) {
  try {
    const result = await leaseApi.createLease(data);
    return result;
  } catch (error) {
    // Log the error
    errorLogger.log(
      error as Error,
      {
        componentName: 'LeaseWizard',
        userAction: 'save_lease',
        formData: data
      },
      'warning'
    );

    // Show user-friendly message
    const message = getUserFriendlyMessage(error as Error);
    toast({
      title: 'Save Failed',
      description: message,
      variant: 'destructive'
    });

    // Attempt recovery
    const recovery = await errorRecovery.recover(
      error as Error,
      'LeaseWizard',
      {
        autoSave: true,
        retryAction: () => saveLease(data)
      }
    );

    if (!recovery.success) {
      throw error;
    }
  }
}
```

### Pattern 4: Document Storage

Wrap document operations with specialized error boundaries:

```tsx
import { DocumentStorageErrorBoundary } from '@/components/lease/storage/DocumentStorageWithErrorBoundary';

function DocumentUploadPage() {
  return (
    <DocumentStorageErrorBoundary
      componentName="DocumentUploader"
      operation="upload"
    >
      <DocumentUploader leaseId="lease-123" />
    </DocumentStorageErrorBoundary>
  );
}
```

## Best Practices

### 1. Always Log Errors with Context

```typescript
// ❌ Bad
console.error(error);

// ✅ Good
errorLogger.log(error, {
  componentName: 'LeaseWizard',
  userAction: 'create_lease',
  formData: { propertyId: 'prop-123' }
}, 'warning');
```

### 2. Use Appropriate Error Boundaries

```tsx
// ❌ Bad - Using critical boundary for minor errors
<CriticalErrorBoundary>
  <LeaseList />
</CriticalErrorBoundary>

// ✅ Good - Using warning boundary for recoverable errors
<WarningErrorBoundary componentName="LeaseList">
  <LeaseList />
</WarningErrorBoundary>
```

### 3. Provide User-Friendly Messages

```typescript
// ❌ Bad
toast({
  title: 'Error',
  description: error.message // Technical message
});

// ✅ Good
toast({
  title: 'Error',
  description: getUserFriendlyMessage(error)
});
```

### 4. Implement Recovery Mechanisms

```typescript
// ❌ Bad - Just throw the error
catch (error) {
  throw error;
}

// ✅ Good - Attempt recovery
catch (error) {
  const recovery = await errorRecovery.recover(error, 'Component', {
    retryAction: () => performAction()
  });
  
  if (!recovery.success) {
    throw error;
  }
}
```

### 5. Save State Before Critical Operations

```typescript
// ✅ Good - Save state before risky operation
async function generateLease() {
  // Save current state
  await errorRecovery.saveCurrentState('LeaseWizard');
  
  try {
    const lease = await leaseApi.createLease(formData);
    return lease;
  } catch (error) {
    // State is saved, can be restored
    const savedState = errorRecovery.restoreState('LeaseWizard');
    // ... handle error
  }
}
```

## Troubleshooting

### Common Error Scenarios

#### 1. Network Errors

**Symptoms:** "Unable to connect to server" messages

**Solutions:**
- Check internet connection
- Verify API endpoints are correct
- Check for CORS issues
- Implement retry with backoff

```typescript
const result = await errorRecovery.retryWithBackoff(
  () => fetchData(),
  3,
  1000
);
```

#### 2. Validation Errors

**Symptoms:** Form submission fails with validation errors

**Solutions:**
- Check form data before submission
- Display field-specific errors
- Use proper validation schemas

```typescript
// Validate before submission
const validation = await validateLeaseData(formData);
if (!validation.isValid) {
  setErrors(validation.errors);
  return;
}
```

#### 3. State Corruption

**Symptoms:** Component behaves unexpectedly after error

**Solutions:**
- Clear component state
- Restore from saved state
- Reset to initial state

```typescript
// Clear corrupted state
errorRecovery.clearComponentState('LeaseWizard');

// Or restore from backup
const savedState = errorRecovery.restoreState('LeaseWizard');
if (savedState) {
  setFormData(savedState);
}
```

#### 4. Memory Leaks

**Symptoms:** Application slows down over time

**Solutions:**
- Clear error logs periodically
- Cleanup event listeners
- Cancel pending requests

```typescript
// Clear old logs
useEffect(() => {
  const interval = setInterval(() => {
    errorLogger.clearLogs();
  }, 3600000); // Every hour

  return () => clearInterval(interval);
}, []);
```

### Debugging Tips

1. **Enable Detailed Error Display in Development**

```tsx
<ErrorBoundary
  showDetails={process.env.NODE_ENV === 'development'}
>
  <Component />
</ErrorBoundary>
```

2. **Export Error Logs for Analysis**

```typescript
// Export logs
const logs = errorLogger.exportLogs();
console.log(logs);

// Or download as file
const blob = new Blob([logs], { type: 'application/json' });
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = 'error-logs.json';
a.click();
```

3. **Monitor Error Statistics**

```typescript
const stats = errorLogger.getStatistics();
console.log('Error Statistics:', stats);
// { total: 10, critical: 2, warning: 7, info: 1, byComponent: {...} }
```

4. **Check Recovery State**

```typescript
// Check if recovery state exists
if (errorRecovery.hasRecoveryState('LeaseWizard')) {
  const state = errorRecovery.restoreState('LeaseWizard');
  console.log('Recovered state:', state);
}
```

## Integration with Error Tracking Services

### Sentry Integration (Example)

```typescript
// In errorLogger.ts
import * as Sentry from '@sentry/react';

private sendToTrackingService(errorLog: ErrorLog): void {
  if (process.env.NODE_ENV === 'production') {
    Sentry.captureException(errorLog.error, {
      contexts: {
        custom: errorLog.context
      },
      level: errorLog.severity === 'critical' ? 'error' : 'warning'
    });
  }
}
```

### LogRocket Integration (Example)

```typescript
// In errorLogger.ts
import LogRocket from 'logrocket';

private sendToTrackingService(errorLog: ErrorLog): void {
  if (process.env.NODE_ENV === 'production') {
    LogRocket.captureException(errorLog.error, {
      tags: {
        component: errorLog.context.componentName,
        severity: errorLog.severity
      },
      extra: errorLog.context
    });
  }
}
```

## Summary

The error handling system provides:

✅ **Comprehensive Error Boundaries** - Multiple levels for different scenarios
✅ **Centralized Logging** - All errors logged with context
✅ **Automated Recovery** - Retry and state recovery mechanisms
✅ **User-Friendly Messages** - Technical errors translated for users
✅ **Debug Tools** - Export logs, view statistics, monitor errors
✅ **Integration Ready** - Easy integration with Sentry, LogRocket, etc.

For questions or issues, please contact the development team or refer to the main documentation.