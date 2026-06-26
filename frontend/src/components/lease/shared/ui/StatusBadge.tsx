import React from 'react';
import { Badge } from '@/components/ui/badge';
import { LeaseStatus } from '@/types/lease';
import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: LeaseStatus;
  className?: string;
}

const statusConfig: Record<LeaseStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' }> = {
  'draft': { label: 'Draft', variant: 'secondary' },
  'pending_approval': { label: 'Pending Approval', variant: 'warning' },
  'approved': { label: 'Approved', variant: 'success' },
  'under-review': { label: 'Under Review', variant: 'warning' },
  'negotiating': { label: 'Negotiating', variant: 'warning' },
  'pending-signatures': { label: 'Pending Signatures', variant: 'warning' },
  'partially-signed': { label: 'Partially Signed', variant: 'warning' },
  'fully-executed': { label: 'Fully Executed', variant: 'success' },
  'active': { label: 'Active', variant: 'success' },
  'expiring-soon': { label: 'Expiring Soon', variant: 'warning' },
  'expired': { label: 'Expired', variant: 'destructive' },
  'terminated': { label: 'Terminated', variant: 'destructive' },
  'renewed': { label: 'Renewed', variant: 'success' },
};

// Extend Badge variants if needed via classNames since shadcn Badge usually has limited variants
const getBadgeStyles = (variant: string) => {
  switch (variant) {
    case 'success': return 'bg-green-100 text-green-800 hover:bg-green-200 border-green-200';
    case 'warning': return 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200 border-yellow-200';
    case 'destructive': return 'bg-red-100 text-red-800 hover:bg-red-200 border-red-200';
    case 'secondary': return 'bg-gray-100 text-gray-800 hover:bg-gray-200 border-gray-200';
    default: return '';
  }
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className }) => {
  const config = statusConfig[status] || { label: status, variant: 'default' };
  
  return (
    <Badge 
      variant={config.variant === 'success' || config.variant === 'warning' ? 'outline' : config.variant}
      className={cn(getBadgeStyles(config.variant), className)}
    >
      {config.label}
    </Badge>
  );
};