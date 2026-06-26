/**
 * No Properties Empty State
 * Displayed when property list is empty
 */

import { Building, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { EmptyState } from './EmptyState';

interface NoPropertiesProps {
  compact?: boolean;
}

export function NoProperties({ compact = false }: NoPropertiesProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isLandlord = user?.role === 'landlord';

  const handleAction = () => {
    if (isLandlord) {
      navigate('/landlord/properties/create');
    } else {
      navigate('/tenant/properties');
    }
  };

  return (
    <EmptyState
      icon={Building}
      heading="No properties yet"
      message={
        isLandlord
          ? 'Get started by adding your first property to the platform.'
          : 'Browse available properties to find your next home.'
      }
      action={{
        label: isLandlord ? 'Add Property' : 'Browse Properties',
        onClick: handleAction,
        icon: isLandlord ? Plus : undefined,
      }}
      compact={compact}
    />
  );
}