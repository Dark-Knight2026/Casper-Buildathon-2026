/**
 * No Leases Empty State
 * Displayed when lease list is empty
 */

import { FileText, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { EmptyState } from './EmptyState';

interface NoLeasesProps {
  compact?: boolean;
}

export function NoLeases({ compact = false }: NoLeasesProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isLandlord = user?.role === 'landlord';

  const handleAction = () => {
    if (isLandlord) {
      navigate('/landlord/leases/create');
    }
  };

  return (
    <EmptyState
      icon={FileText}
      heading="No leases yet"
      message={
        isLandlord
          ? 'Create your first lease agreement to get started.'
          : 'Your lease agreements will appear here once created.'
      }
      action={
        isLandlord
          ? {
              label: 'Create Lease',
              onClick: handleAction,
              icon: Plus,
            }
          : undefined
      }
      compact={compact}
    />
  );
}