import { useState, useCallback, useMemo, useEffect } from 'react';
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
    return 2;
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

  // Zero timestamps are a sentinel for "not yet loaded".
  // calculateState() with all-zero timestamps always returns state 3 (post-ICO)
  // because Date.now() > 0 makes every presale condition false.
  // This is intentionally safe: ICOPage passes `timestamps: undefined` while
  // useICOSchedules is loading and renders a spinner before consuming `state`,
  // so the wrong state 3 value never reaches the UI.
  // If this hook is ever used outside ICOPage, the consumer must guard
  // against isLoading before rendering state-dependent UI.
  const timestamps: SaleTimestamps = useMemo(() => {
    return customTimestamps || {
      presaleStart: 0,
      presaleEnd: 0,
    };
  }, [customTimestamps]);

  // Dev mode: manual state override
  const [devState, setDevState] = useState<ICOState | null>(initialDevState);
  const isDevOverride = devState !== null;

  const [calculatedState, setCalculatedState] = useState<ICOState>(() =>
    calculateState(timestamps)
  );

  // Re-evaluate immediately when timestamps reference changes
  useEffect(() => {
    setCalculatedState(calculateState(timestamps));
  }, [timestamps]);

  // Poll to catch state transitions triggered by time passing
  useEffect(() => {
    if (isDevOverride) return;
    const id = setInterval(
      () => setCalculatedState(calculateState(timestamps)),
      pollInterval
    );
    return () => clearInterval(id);
  }, [isDevOverride, pollInterval, timestamps]);

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

  const refetch = useCallback(() => {
    setCalculatedState(calculateState(timestamps));
  }, [timestamps]);

  return {
    state,
    phase,
    status,
    timestamps,
    isLoading: customTimestamps === undefined,
    error: null,
    nextStateTimestamp,
    refetch,
    setDevState,
    isDevOverride,
  };
}

export default useICOState;
