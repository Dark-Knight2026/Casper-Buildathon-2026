import React, { useState } from 'react';
import { Trash2, Download, Edit, X, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';

export interface BulkAction {
  id: string;
  label: string;
  icon?: React.ReactNode;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost';
  requiresConfirmation?: boolean;
  confirmationTitle?: string;
  confirmationDescription?: string;
  action: (selectedIds: string[]) => Promise<void>;
}

interface BulkActionBarProps {
  selectedCount: number;
  totalCount: number;
  actions: BulkAction[];
  onClearSelection: () => void;
  className?: string;
  position?: 'top' | 'bottom' | 'fixed';
}

/**
 * Bulk action bar for performing operations on multiple selected items
 * 
 * @example
 * const bulkActions: BulkAction[] = [
 *   {
 *     id: 'delete',
 *     label: 'Delete',
 *     icon: <Trash2 className="h-4 w-4" />,
 *     variant: 'destructive',
 *     requiresConfirmation: true,
 *     confirmationTitle: 'Delete Properties',
 *     confirmationDescription: 'Are you sure you want to delete the selected properties?',
 *     action: async (ids) => {
 *       await deleteProperties(ids);
 *     },
 *   },
 *   {
 *     id: 'export',
 *     label: 'Export',
 *     icon: <Download className="h-4 w-4" />,
 *     action: async (ids) => {
 *       await exportProperties(ids);
 *     },
 *   },
 * ];
 * 
 * <BulkActionBar
 *   selectedCount={selectedRows.length}
 *   totalCount={allRows.length}
 *   actions={bulkActions}
 *   onClearSelection={() => setSelectedRows([])}
 * />
 */
export const BulkActionBar: React.FC<BulkActionBarProps> = ({
  selectedCount,
  totalCount,
  actions,
  onClearSelection,
  className,
  position = 'bottom',
}) => {
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<BulkAction | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const handleActionClick = (action: BulkAction, ids: string[]) => {
    if (action.requiresConfirmation) {
      setPendingAction(action);
      setSelectedIds(ids);
      setIsConfirmOpen(true);
    } else {
      executeAction(action, ids);
    }
  };

  const executeAction = async (action: BulkAction, ids: string[]) => {
    setIsProcessing(true);
    setProgress(0);

    try {
      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setProgress((prev) => Math.min(prev + 10, 90));
      }, 100);

      await action.action(ids);

      clearInterval(progressInterval);
      setProgress(100);

      toast.success(`Successfully processed ${ids.length} item(s)`);
      onClearSelection();
    } catch (error) {
      toast.error(`Failed to process items: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
      setProgress(0);
      setIsConfirmOpen(false);
      setPendingAction(null);
    }
  };

  const handleConfirm = () => {
    if (pendingAction) {
      executeAction(pendingAction, selectedIds);
    }
  };

  if (selectedCount === 0) return null;

  const positionClasses = {
    top: 'top-0',
    bottom: 'bottom-0',
    fixed: 'fixed bottom-4 left-1/2 -translate-x-1/2 shadow-lg rounded-lg',
  };

  return (
    <>
      <div
        className={cn(
          'bg-primary text-primary-foreground px-4 py-3',
          'flex items-center justify-between gap-4',
          'transition-all duration-200',
          'z-10',
          positionClasses[position],
          className
        )}
      >
        {/* Selection Info */}
        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="bg-primary-foreground/20 text-primary-foreground">
            {selectedCount} selected
          </Badge>
          {selectedCount === totalCount && (
            <span className="text-sm">All items selected</span>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearSelection}
            className="h-8 text-primary-foreground hover:bg-primary-foreground/20"
          >
            <X className="h-4 w-4 mr-1" />
            Clear
          </Button>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {actions.map((action) => (
            <Button
              key={action.id}
              variant={action.variant || 'secondary'}
              size="sm"
              onClick={() => handleActionClick(action, selectedIds)}
              disabled={isProcessing}
              className={cn(
                action.variant === 'destructive'
                  ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                  : 'bg-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/30'
              )}
            >
              {action.icon}
              <span className="ml-2">{action.label}</span>
            </Button>
          ))}
        </div>
      </div>

      {/* Processing Progress */}
      {isProcessing && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-card p-6 rounded-lg shadow-lg max-w-md w-full space-y-4">
            <div className="flex items-center gap-3">
              <div className="animate-spin">
                <AlertCircle className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Processing...</h3>
                <p className="text-sm text-muted-foreground">
                  Please wait while we process {selectedCount} item(s)
                </p>
              </div>
            </div>
            <Progress value={progress} className="w-full" />
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingAction?.confirmationTitle || 'Confirm Action'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingAction?.confirmationDescription ||
                `Are you sure you want to perform this action on ${selectedCount} item(s)?`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm}>Continue</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

/**
 * Bulk action bar with status update dropdown
 */
interface BulkStatusUpdateBarProps {
  selectedCount: number;
  onStatusUpdate: (status: string, selectedIds: string[]) => Promise<void>;
  onClearSelection: () => void;
  statusOptions: Array<{ label: string; value: string }>;
  selectedIds: string[];
  className?: string;
}

export const BulkStatusUpdateBar: React.FC<BulkStatusUpdateBarProps> = ({
  selectedCount,
  onStatusUpdate,
  onClearSelection,
  statusOptions,
  selectedIds,
  className,
}) => {
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleStatusUpdate = async () => {
    if (!selectedStatus) {
      toast.error('Please select a status');
      return;
    }

    setIsProcessing(true);
    try {
      await onStatusUpdate(selectedStatus, selectedIds);
      toast.success(`Updated ${selectedCount} item(s) to ${selectedStatus}`);
      onClearSelection();
      setSelectedStatus('');
    } catch (error) {
      toast.error(`Failed to update status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  if (selectedCount === 0) return null;

  return (
    <div
      className={cn(
        'bg-primary text-primary-foreground px-4 py-3',
        'flex items-center justify-between gap-4',
        'transition-all duration-200',
        className
      )}
    >
      <div className="flex items-center gap-3">
        <Badge variant="secondary" className="bg-primary-foreground/20 text-primary-foreground">
          {selectedCount} selected
        </Badge>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearSelection}
          className="h-8 text-primary-foreground hover:bg-primary-foreground/20"
        >
          <X className="h-4 w-4 mr-1" />
          Clear
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <Select value={selectedStatus} onValueChange={setSelectedStatus}>
          <SelectTrigger className="w-[180px] bg-primary-foreground/20 text-primary-foreground border-primary-foreground/30">
            <SelectValue placeholder="Update status..." />
          </SelectTrigger>
          <SelectContent>
            {statusOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="secondary"
          size="sm"
          onClick={handleStatusUpdate}
          disabled={!selectedStatus || isProcessing}
          className="bg-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/30"
        >
          <CheckCircle className="h-4 w-4 mr-2" />
          Update
        </Button>
      </div>
    </div>
  );
};