import React, { createContext, useContext, ReactNode } from 'react';
import { LeaseAgreement } from '@/types/lease';
import { LeaseState, LeaseAction } from '@/hooks/useLeaseStateMachine';

interface LeaseContextType {
  lease: LeaseAgreement | null;
  isLoading: boolean;
  error: Error | null;
  state: LeaseState;
  dispatch: React.Dispatch<LeaseAction>;
  refreshLease: () => Promise<void>;
}

const LeaseContext = createContext<LeaseContextType | undefined>(undefined);

// eslint-disable-next-line react-refresh/only-export-components
export const useLeaseContext = () => {
  const context = useContext(LeaseContext);
  if (!context) {
    throw new Error('useLeaseContext must be used within a LeaseProvider');
  }
  return context;
};

export const LeaseContextProvider: React.FC<{
  value: LeaseContextType;
  children: ReactNode;
}> = ({ value, children }) => {
  return (
    <LeaseContext.Provider value={value}>
      {children}
    </LeaseContext.Provider>
  );
};