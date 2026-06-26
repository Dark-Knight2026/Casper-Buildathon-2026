/**
 * Bulk Operations Type Definitions
 */

export type BulkOperationType =
  | 'update_status'
  | 'delete'
  | 'assign_vendor'
  | 'send_notification'
  | 'update_property_manager'
  | 'update_priority'
  | 'mark_as_paid'
  | 'export';

export interface BulkOperationParams {
  operation: BulkOperationType;
  ids: string[];
  data?: Record<string, unknown>;
}

export interface BulkOperationResult {
  success: boolean;
  successCount: number;
  failureCount: number;
  errors?: Array<{
    id: string;
    error: string;
  }>;
}

export interface BulkSelectionState {
  selectedIds: Set<string>;
  selectAll: boolean;
}