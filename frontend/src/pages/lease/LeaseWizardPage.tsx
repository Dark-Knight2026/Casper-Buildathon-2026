import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import EnhancedLeaseWizard from '@/components/lease/EnhancedLeaseWizard-optimized';
import { useLeaseContext } from '@/contexts/LeaseContext';

interface LeaseWizardPageProps {
  mode?: 'create' | 'edit';
}

export const LeaseWizardPage: React.FC<LeaseWizardPageProps> = ({ mode = 'create' }) => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  
  // If editing, we might use context, but EnhancedLeaseWizard handles fetching internally 
  // or via props. For 'create', no ID is needed.
  
  const handleComplete = (leaseId: string) => {
    // Navigate to signing or details upon completion
    navigate(`/leases/${leaseId}/signing`);
  };

  const handleCancel = () => {
    navigate('/leases');
  };

  return (
    <div className="container mx-auto py-6">
      <EnhancedLeaseWizard 
        existingLeaseId={mode === 'edit' ? id : undefined}
        onComplete={handleComplete}
        onCancel={handleCancel}
      />
    </div>
  );
};