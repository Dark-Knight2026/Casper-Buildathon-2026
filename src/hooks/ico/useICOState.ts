import { useState, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getIcoTimestamps } from '@/constants/ico';
import type { ICOState, ICOPhase, SaleTimestamps, SaleStatus } from '@/types/ico';

interface UseICOStateOptions {
  timestamps?: SaleTimestamps;
  pollInterval?: number;
  /** Dev mode: manually override state (disables auto-calculation) */
  devOverrideState?: ICOState | null;
}

interface UseICOStateReturn {
  state: ICOState;
  phase: ICOPhase;
  status: SaleStatus;
  timestamps: SaleTimestamps;
  isLoading: boolean;
  error: Error | null;
  nextStateTimestamp: number | null;
  refetch: () => void;
  /** Dev mode: set manual state override */
  setDevState: (state: ICOState | null) => void;
  /** Dev mode: is currently using manual override */
  isDevOverride: boolean;
}

const getPhaseFromState = (state: ICOState): ICOPhase => {
  const phaseMap: Record<ICOState, ICOPhase> = {
    1: 'presale-countdown',
    2: 'presale-active',
    3: 'dashboard-ico-countdown',
    4: 'ico-active',
    5: 'post-ico',
  };
  return phaseMap[state];
};

const calculateState = (timestamps: SaleTimestamps): ICOState => {
  const now = Date.now();

  // State 1: Before presale starts
  if (now < timestamps.presaleStart) {
    return 1;
  }

  // State 2: During presale
  if (now >= timestamps.presaleStart && now < timestamps.presaleEnd) {
    return 2;
  }

  // State 3: After presale, before ICO
  if (now >= timestamps.presaleEnd && now < timestamps.icoStart) {
    return 3;
  }

  // State 4: During ICO
  if (now >= timestamps.icoStart && now < timestamps.icoEnd) {
    return 4;
  }

  // State 5: After ICO
  return 5;
};

const getNextStateTimestamp = (
  currentState: ICOState,
  timestamps: SaleTimestamps
): number | null => {
  switch (currentState) {
    case 1:
      return timestamps.presaleStart;
    case 2:
      return timestamps.presaleEnd;
    case 3:
      return timestamps.icoStart;
    case 4:
      return timestamps.icoEnd;
    case 5:
      return null; // No next state
    default:
      return null;
  }
};

export function useICOState(options: UseICOStateOptions = {}): UseICOStateReturn {
  const {
    timestamps: customTimestamps,
    pollInterval = 10000, // 10 seconds - sufficient for state transitions
    devOverrideState: initialDevState = null,
  } = options;

  // Use custom timestamps or compute fresh mock timestamps
  const timestamps: SaleTimestamps = useMemo(() => {
    return customTimestamps || getIcoTimestamps();
  }, [customTimestamps]);

  // Dev mode: manual state override
  const [devState, setDevState] = useState<ICOState | null>(initialDevState);
  const isDevOverride = devState !== null;

  const {
    data: calculatedState,
    isLoading,
    error: queryError,
    refetch: queryRefetch,
  } = useQuery<ICOState, Error>({
    queryKey: ['ico-state', timestamps],
    queryFn: () => calculateState(timestamps),
    refetchInterval: isDevOverride ? false : pollInterval,
    staleTime: 5000,
  });

  // Use dev override if set, otherwise use query data (with sync fallback for first render)
  const state = devState ?? calculatedState ?? calculateState(timestamps);

  const phase = useMemo(() => getPhaseFromState(state), [state]);
  const nextStateTimestamp = useMemo(
    () => getNextStateTimestamp(state, timestamps),
    [state, timestamps]
  );

  const status: SaleStatus = useMemo(() => ({
    state,
    phase,
    isActive: state === 2 || state === 4,
    currentTimestamp: Date.now(),
    nextStateTimestamp,
  }), [state, phase, nextStateTimestamp]);

  // Wrap refetch to preserve () => void signature
  const refetch = useCallback(() => {
    queryRefetch();
  }, [queryRefetch]);

  return {
    state,
    phase,
    status,
    timestamps,
    isLoading,
    error: queryError ?? null,
    nextStateTimestamp,
    refetch,
    setDevState,
    isDevOverride,
  };
}

export default useICOState;
