/**
 * No Applications Empty State
 * Displayed when application list is empty
 */

import { ClipboardList, Share2 } from 'lucide-react';
import { EmptyState } from './EmptyState';

interface NoApplicationsProps {
  compact?: boolean;
  onShare?: () => void;
}

export function NoApplications({ compact = false, onShare }: NoApplicationsProps) {
  return (
    <EmptyState
      icon={ClipboardList}
      heading="No applications yet"
      message="Applications from prospective tenants will appear here. Share your property listings to attract applicants."
      action={
        onShare
          ? {
              label: 'Share Property Link',
              onClick: onShare,
              icon: Share2,
            }
          : undefined
      }
      compact={compact}
    />
  );
}