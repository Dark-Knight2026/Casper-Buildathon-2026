/**
 * No Tenants Empty State
 * Displayed when tenant list is empty
 */

import { Users, UserPlus } from 'lucide-react';
import { EmptyState } from './EmptyState';

interface NoTenantsProps {
  compact?: boolean;
  onInvite?: () => void;
}

export function NoTenants({ compact = false, onInvite }: NoTenantsProps) {
  return (
    <EmptyState
      icon={Users}
      heading="No tenants yet"
      message="Invite tenants to your properties or wait for applications to come in."
      action={
        onInvite
          ? {
              label: 'Invite Tenant',
              onClick: onInvite,
              icon: UserPlus,
            }
          : undefined
      }
      compact={compact}
    />
  );
}