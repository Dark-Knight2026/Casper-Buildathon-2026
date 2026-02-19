import { useState, useEffect, useCallback, useMemo } from 'react';
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
    1: 'private-sale-countdown',
    2: 'private-sale-active',
    3: 'post-ico-dashboard',
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
    return 3;
  }

  // State 3: After ICO
  return 3;
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

  // Use custom timestamps only - no fallback to mock data
  // This ensures we don't show wrong state while loading real data
  const timestamps: SaleTimestamps = useMemo(() => {
    return customTimestamps || {
      presaleStart: 0,
      presaleEnd: 0,
      icoStart: 0,
      icoEnd: 0,
    };
  }, [customTimestamps]);

  // Track if we have real timestamps
  const hasRealTimestamps = !!customTimestamps;

  // Dev mode: manual state override
  const [devState, setDevState] = useState<ICOState | null>(initialDevState);
  const isDevOverride = devState !== null;

  const [calculatedState, setCalculatedState] = useState<ICOState>(() =>
    hasRealTimestamps ? calculateState(timestamps) : 1
  );
  const [isLoading, setIsLoading] = useState(!hasRealTimestamps);
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
    isActive: state === 2,
    currentTimestamp: Date.now(),
    nextStateTimestamp,
  }), [state, phase, nextStateTimestamp]);

  // Update state based on time (only if not in dev override mode and have real timestamps)
  useEffect(() => {
    if (isDevOverride || !hasRealTimestamps) return;

    // Immediately calculate state when real timestamps arrive
    const newState = calculateState(timestamps);
    if (newState !== calculatedState) {
      setCalculatedState(newState);
    }
    setIsLoading(false);

    const updateState = () => {
      const updatedState = calculateState(timestamps);
      if (updatedState !== calculatedState) {
        setCalculatedState(updatedState);
      }
    };

    const timer = setInterval(updateState, pollInterval);
    return () => clearInterval(timer);
  }, [timestamps, calculatedState, pollInterval, isDevOverride, hasRealTimestamps]);

  // Refetch function (for future API integration)
  const refetch = useCallback(() => {
    if (!hasRealTimestamps) return;

    setIsLoading(true);
    try {
      const newState = calculateState(timestamps);
      setCalculatedState(newState);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch ICO state'));
    } finally {
      setIsLoading(false);
    }
  }, [timestamps, hasRealTimestamps]);

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
