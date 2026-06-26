import React, { useEffect, useState } from 'react';
import { Outlet, useParams, useNavigate, useLocation } from 'react-router-dom';
import { LeaseContextProvider } from '@/contexts/LeaseContext';
import { useLeaseStateMachine } from '@/hooks/useLeaseStateMachine';
import { LeaseAgreement } from '@/types/lease';
import { PageLoadingFallback } from '@/components/common/LoadingFallback';
import { Button } from '@/components/ui/button';
import { ChevronLeft } from 'lucide-react';
import mockLeases from '@/data/mock_leases.json'; // We will use the generated mock data

export const LeaseContextLayout: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [lease, setLease] = useState<LeaseAgreement | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Initialize state machine
  // We'll update the machine state when lease data is loaded
  const { state, dispatch } = useLeaseStateMachine('draft');

  useEffect(() => {
    const fetchLease = async () => {
      if (!id) return;
      
      setIsLoading(true);
      try {
        // Simulate API call with mock data
        // In real app: const data = await leaseService.getById(id);
        await new Promise(resolve => setTimeout(resolve, 500)); // Fake delay
        
        const foundLease = (mockLeases as LeaseAgreement[]).find(l => l.id === id);
        
        if (foundLease) {
          setLease(foundLease);
          // Sync state machine with fetched lease status
          // We might need a way to force-set the state in the machine if it differs from initial
          // For now, we assume the reducer handles transitions, but initial load is special.
          // In a real implementation, useLeaseStateMachine might accept an initializer or useEffect to sync.
        } else {
          setError(new Error('Lease not found'));
        }
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown error'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchLease();
  }, [id]);

  const refreshLease = async () => {
    // Re-fetch logic
    if (id) {
      const foundLease = (mockLeases as LeaseAgreement[]).find(l => l.id === id);
      if (foundLease) setLease(foundLease);
    }
  };

  if (isLoading) {
    return <PageLoadingFallback />;
  }

  if (error || !lease) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8">
        <h2 className="text-2xl font-bold text-red-600 mb-4">Error Loading Lease</h2>
        <p className="text-gray-600 mb-6">{error?.message || 'Lease not found'}</p>
        <Button onClick={() => navigate('/leases')}>Back to Leases</Button>
      </div>
    );
  }

  return (
    <LeaseContextProvider
      value={{
        lease,
        isLoading,
        error,
        state: lease.status, // Use the lease status directly for now, or sync with machine
        dispatch,
        refreshLease
      }}
    >
      <div className="flex flex-col h-full">
        {/* Context Header / Breadcrumbs could go here if not in global layout */}
        <div className="flex items-center gap-2 p-4 border-b bg-white dark:bg-gray-900">
           <Button variant="ghost" size="sm" onClick={() => navigate('/leases')}>
             <ChevronLeft className="h-4 w-4 mr-1" />
             Back to List
           </Button>
           <div className="h-4 w-px bg-gray-300 mx-2" />
           <span className="font-semibold text-sm text-gray-500">
             {lease.propertyAddress}
           </span>
           <span className="text-gray-400">/</span>
           <span className="font-medium text-sm">
             {location.pathname.split('/').pop()?.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Details'}
           </span>
        </div>
        
        <div className="flex-1 overflow-auto p-4">
          <Outlet />
        </div>
      </div>
    </LeaseContextProvider>
  );
};