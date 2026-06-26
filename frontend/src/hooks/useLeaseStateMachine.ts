import { useReducer, useCallback } from 'react';
import { LeaseStatus } from '@/types/lease';

export type LeaseState = LeaseStatus;

export type LeaseAction =
  | { type: 'SAVE_DRAFT' }
  | { type: 'SUBMIT_FOR_SIGNATURE' }
  | { type: 'SIGNATURE_COMPLETED' }
  | { type: 'RECALL_TO_DRAFT' }
  | { type: 'ACTIVATE' }
  | { type: 'AMEND' }
  | { type: 'AUTO_CHECK_DATE'; currentDate: Date; endDate: Date }
  | { type: 'TERMINATE'; reason: string }
  | { type: 'RENEW' }
  | { type: 'EXPIRE' }
  | { type: 'ARCHIVE' };

// Helper to map UI status to internal state if needed, but we use LeaseStatus directly
const isValidTransition = (currentState: LeaseState, action: LeaseAction): boolean => {
  switch (currentState) {
    case 'draft':
      return ['SAVE_DRAFT', 'SUBMIT_FOR_SIGNATURE'].includes(action.type);
    case 'pending_signature':
      return ['SIGNATURE_COMPLETED', 'RECALL_TO_DRAFT', 'ACTIVATE'].includes(action.type);
    case 'active':
      return ['AMEND', 'AUTO_CHECK_DATE', 'TERMINATE', 'RENEW'].includes(action.type);
    case 'expiring_soon':
      return ['RENEW', 'EXPIRE', 'TERMINATE'].includes(action.type);
    case 'expired':
      return ['RENEW', 'TERMINATE', 'ARCHIVE'].includes(action.type);
    case 'terminated':
      return ['ARCHIVE'].includes(action.type);
    default:
      return false;
  }
};

const leaseReducer = (state: LeaseState, action: LeaseAction): LeaseState => {
  if (!isValidTransition(state, action)) {
    console.warn(`Invalid transition: ${state} -> ${action.type}`);
    return state;
  }

  switch (action.type) {
    case 'SAVE_DRAFT':
      return 'draft';
    case 'SUBMIT_FOR_SIGNATURE':
      return 'pending_signature';
    case 'RECALL_TO_DRAFT':
      return 'draft';
    case 'SIGNATURE_COMPLETED':
      // Usually goes to active, but might need manual activation or check
      return 'active'; 
    case 'ACTIVATE':
      return 'active';
    case 'AMEND':
      // Creating an amendment usually creates a NEW draft, 
      // but if we are tracking the status of THIS lease, it might stay active 
      // while the amendment is drafted. 
      // However, if this state machine represents the "Amendment" itself, it starts as draft.
      // For the parent lease, it remains active.
      return 'active';
    case 'AUTO_CHECK_DATE': {
      // Logic to check if expiring
      const daysUntilEnd = Math.ceil((action.endDate.getTime() - action.currentDate.getTime()) / (1000 * 60 * 60 * 24));
      if (daysUntilEnd <= 90 && daysUntilEnd > 0) return 'expiring_soon';
      if (daysUntilEnd <= 0) return 'expired';
      return state;
    }
    case 'TERMINATE':
      return 'terminated';
    case 'RENEW':
      // Renewal creates a new lease, this one might eventually be terminated or expired
      return state; 
    case 'EXPIRE':
      return 'expired';
    case 'ARCHIVE':
      return 'archived'; // Assuming 'archived' is a valid status or we map it
    default:
      return state;
  }
};

export const useLeaseStateMachine = (initialState: LeaseState = 'draft') => {
  const [state, dispatch] = useReducer(leaseReducer, initialState);

  const transition = useCallback((action: LeaseAction) => {
    dispatch(action);
  }, []);

  return { state, dispatch: transition };
};