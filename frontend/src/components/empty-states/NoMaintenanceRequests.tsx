/**
 * No Maintenance Requests Empty State
 * Displayed when maintenance request list is empty
 */

import { Wrench, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { EmptyState } from './EmptyState';

interface NoMaintenanceRequestsProps {
  compact?: boolean;
}

export function NoMaintenanceRequests({ compact = false }: NoMaintenanceRequestsProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isTenant = user?.role === 'tenant';

  const handleAction = () => {
    if (isTenant) {
      navigate('/tenant/maintenance/create');
    }
  };

  return (
    <EmptyState
      icon={Wrench}
      heading={isTenant ? 'No maintenance requests' : 'All caught up!'}
      message={
        isTenant
          ? 'Submit a maintenance request if you need repairs or assistance.'
          : 'No maintenance requests at this time. All properties are in good condition.'
      }
      action={
        isTenant
          ? {
              label: 'Create Request',
              onClick: handleAction,
              icon: Plus,
            }
          : undefined
      }
      compact={compact}
    />
  );
}