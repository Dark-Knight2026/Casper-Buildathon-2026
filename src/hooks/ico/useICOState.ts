import { useState, useEffect, useCallback, useMemo } from 'react';
import { ICO_CONFIG } from '@/constants/ico';
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
    return 2;
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
    pollInterval = 1000,
    devOverrideState: initialDevState = null,
  } = options;

  // Use custom timestamps or default from config
  const timestamps: SaleTimestamps = useMemo(() => {
    return customTimestamps || {
      presaleStart: ICO_CONFIG.TIMESTAMPS.presaleStart,
      presaleEnd: ICO_CONFIG.TIMESTAMPS.presaleEnd,
      icoStart: ICO_CONFIG.TIMESTAMPS.icoStart,
      icoEnd: ICO_CONFIG.TIMESTAMPS.icoEnd,
    };
  }, [customTimestamps]);

  // Dev mode: manual state override
  const [devState, setDevState] = useState<ICOState | null>(initialDevState);
  const isDevOverride = devState !== null;

  const [calculatedState, setCalculatedState] = useState<ICOState>(() => calculateState(timestamps));
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Use dev override if set, otherwise use calculated state
  const state = devState ?? calculatedState;

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

  // Update state based on time (only if not in dev override mode)
  useEffect(() => {
    if (isDevOverride) return;

    const updateState = () => {
      const newState = calculateState(timestamps);
      if (newState !== calculatedState) {
        setCalculatedState(newState);
      }
    };

    const timer = setInterval(updateState, pollInterval);
    return () => clearInterval(timer);
  }, [timestamps, calculatedState, pollInterval, isDevOverride]);

  // Refetch function (for future API integration)
  const refetch = useCallback(() => {
    setIsLoading(true);
    try {
      // In the future, this would fetch from API
      const newState = calculateState(timestamps);
      setCalculatedState(newState);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch ICO state'));
    } finally {
      setIsLoading(false);
    }
  }, [timestamps]);

  return {
    state,
    phase,
    status,
    timestamps,
    isLoading,
    error,
    nextStateTimestamp,
    refetch,
    setDevState,
    isDevOverride,
  };
}

export default useICOState;
