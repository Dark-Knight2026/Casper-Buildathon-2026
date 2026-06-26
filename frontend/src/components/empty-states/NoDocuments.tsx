/**
 * No Documents Empty State
 * Displayed when document list is empty
 */

import { File, Upload } from 'lucide-react';
import { EmptyState } from './EmptyState';

interface NoDocumentsProps {
  compact?: boolean;
  onUpload?: () => void;
}

export function NoDocuments({ compact = false, onUpload }: NoDocumentsProps) {
  return (
    <EmptyState
      icon={File}
      heading="No documents uploaded"
      message="Upload documents like leases, receipts, or inspection reports."
      action={
        onUpload
          ? {
              label: 'Upload Document',
              onClick: onUpload,
              icon: Upload,
            }
          : undefined
      }
      compact={compact}
    />
  );
}