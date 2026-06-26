/**
 * Quick Actions Widget
 * Displays quick action buttons
 */

import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import {
  Plus,
  DollarSign,
  Wrench,
  FileText,
  Mail,
  Users,
} from 'lucide-react';

export function QuickActionsWidget() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isLandlord = user?.role === 'landlord';

  const landlordActions = [
    {
      label: 'Add Property',
      icon: Plus,
      onClick: () => navigate('/landlord/properties/create'),
    },
    {
      label: 'Record Payment',
      icon: DollarSign,
      onClick: () => navigate('/landlord/payments/record'),
    },
    {
      label: 'Create Lease',
      icon: FileText,
      onClick: () => navigate('/landlord/leases/create'),
    },
    {
      label: 'Invite Tenant',
      icon: Users,
      onClick: () => navigate('/landlord/tenants/invite'),
    },
  ];

  const tenantActions = [
    {
      label: 'Make Payment',
      icon: DollarSign,
      onClick: () => navigate('/tenant/payments/make'),
    },
    {
      label: 'Submit Request',
      icon: Wrench,
      onClick: () => navigate('/tenant/maintenance/create'),
    },
    {
      label: 'View Lease',
      icon: FileText,
      onClick: () => navigate('/tenant/lease'),
    },
    {
      label: 'Message Landlord',
      icon: Mail,
      onClick: () => navigate('/tenant/messages'),
    },
  ];

  const actions = isLandlord ? landlordActions : tenantActions;

  return (
    <div className="grid grid-cols-2 gap-3">
      {actions.map((action) => (
        <Button
          key={action.label}
          variant="outline"
          className="h-auto flex-col gap-2 p-4"
          onClick={action.onClick}
        >
          <action.icon className="h-6 w-6" />
          <span className="text-sm">{action.label}</span>
        </Button>
      ))}
    </div>
  );
}