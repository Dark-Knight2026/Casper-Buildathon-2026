import { useState } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { bulkOperationsService } from '@/services/bulkOperationsService';
import type { BulkOperationType, BulkOperationResult } from '@/types/bulkOperations';

interface BulkOperationsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  operation: BulkOperationType;
  selectedIds: string[];
  operationData?: Record<string, unknown>;
  onComplete?: (result: BulkOperationResult) => void;
}

export default function BulkOperationsModal({
  open,
  onOpenChange,
  operation,
  selectedIds,
  operationData,
  onComplete,
}: BulkOperationsModalProps) {
  const [isExecuting, setIsExecuting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<BulkOperationResult | null>(null);

  const getOperationLabel = (op: BulkOperationType): string => {
    switch (op) {
      case 'update_status':
        return 'Update Status';
      case 'delete':
        return 'Delete';
      case 'assign_vendor':
        return 'Assign Vendor';
      case 'send_notification':
        return 'Send Notification';
      case 'update_property_manager':
        return 'Update Property Manager';
      case 'update_priority':
        return 'Update Priority';
      case 'mark_as_paid':
        return 'Mark as Paid';
      case 'export':
        return 'Export';
      default:
        return 'Bulk Operation';
    }
  };

  const getOperationDescription = (op: BulkOperationType): string => {
    const count = selectedIds.length;
    switch (op) {
      case 'delete':
        return `This will permanently delete ${count} item(s). This action cannot be undone.`;
      case 'update_status':
        return `This will update the status of ${count} item(s).`;
      case 'assign_vendor':
        return `This will assign a vendor to ${count} maintenance request(s).`;
      case 'send_notification':
        return `This will send a notification to ${count} user(s).`;
      default:
        return `This will affect ${count} item(s).`;
    }
  };

  const handleExecute = async () => {
    setIsExecuting(true);
    setProgress(0);

    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setProgress((prev) => Math.min(prev + 10, 90));
      }, 200);

      const operationResult = await bulkOperationsService.executeBulkOperation({
        operation,
        ids: selectedIds,
        data: operationData,
      });

      clearInterval(progressInterval);
      setProgress(100);
      setResult(operationResult);

      if (onComplete) {
        onComplete(operationResult);
      }

      // Auto-close on success after 2 seconds
      if (operationResult.success) {
        setTimeout(() => {
          onOpenChange(false);
          resetState();
        }, 2000);
      }
    } catch (error) {
      setResult({
        success: false,
        successCount: 0,
        failureCount: selectedIds.length,
        errors: [
          {
            id: 'general',
            error: error instanceof Error ? error.message : 'Unknown error',
          },
        ],
      });
    } finally {
      setIsExecuting(false);
    }
  };

  const resetState = () => {
    setProgress(0);
    setResult(null);
  };

  const handleClose = () => {
    if (!isExecuting) {
      onOpenChange(false);
      resetState();
    }
  };

  const isDestructive = operation === 'delete';

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{getOperationLabel(operation)}</DialogTitle>
          <DialogDescription>
            {getOperationDescription(operation)}
          </DialogDescription>
        </DialogHeader>

        {isDestructive && !result && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Warning: This action cannot be undone.
            </AlertDescription>
          </Alert>
        )}

        {isExecuting && (
          <div className="space-y-2">
            <Progress value={progress} />
            <p className="text-sm text-center text-gray-600">
              Processing... {Math.round(progress)}%
            </p>
          </div>
        )}

        {result && (
          <div className="space-y-2">
            {result.success ? (
              <Alert>
                <AlertDescription>
                  Successfully processed {result.successCount} item(s).
                </AlertDescription>
              </Alert>
            ) : (
              <Alert variant="destructive">
                <AlertDescription>
                  Failed to process {result.failureCount} item(s).
                  {result.errors && result.errors.length > 0 && (
                    <ul className="mt-2 list-disc list-inside">
                      {result.errors.slice(0, 5).map((error, index) => (
                        <li key={index} className="text-xs">
                          {error.error}
                        </li>
                      ))}
                      {result.errors.length > 5 && (
                        <li className="text-xs">
                          ... and {result.errors.length - 5} more errors
                        </li>
                      )}
                    </ul>
                  )}
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isExecuting}
          >
            {result ? 'Close' : 'Cancel'}
          </Button>
          {!result && (
            <Button
              variant={isDestructive ? 'destructive' : 'default'}
              onClick={handleExecute}
              disabled={isExecuting}
            >
              {isExecuting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isExecuting ? 'Processing...' : 'Confirm'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}