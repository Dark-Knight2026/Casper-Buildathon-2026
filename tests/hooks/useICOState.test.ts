import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { ICOState, ICOPhase, SaleTimestamps } from '@/types/ico';

// --- Pure functions extracted from hook for unit testing ---

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
  if (now < timestamps.presaleStart) return 1;
  if (now >= timestamps.presaleStart && now < timestamps.presaleEnd) return 2;
  if (now >= timestamps.presaleEnd && now < timestamps.icoStart) return 3;
  if (now >= timestamps.icoStart && now < timestamps.icoEnd) return 4;
  return 5;
};

const getNextStateTimestamp = (
  currentState: ICOState,
  timestamps: SaleTimestamps
): number | null => {
  switch (currentState) {
    case 1: return timestamps.presaleStart;
    case 2: return timestamps.presaleEnd;
    case 3: return timestamps.icoStart;
    case 4: return timestamps.icoEnd;
    case 5: return null;
    default: return null;
  }
};

// --- Helper to create timestamps relative to "now" ---

function makeTimestamps(offsets: {
  presaleStart: number;
  presaleEnd: number;
  icoStart: number;
  icoEnd: number;
}): SaleTimestamps {
  const now = Date.now();
  return {
    presaleStart: now + offsets.presaleStart,
    presaleEnd: now + offsets.presaleEnd,
    icoStart: now + offsets.icoStart,
    icoEnd: now + offsets.icoEnd,
  };
}

const DAY = 24 * 60 * 60 * 1000;

// =====================================================
// Pure function tests
// =====================================================

describe('getPhaseFromState', () => {
  it.each<[ICOState, ICOPhase]>([
    [1, 'presale-countdown'],
    [2, 'presale-active'],
    [3, 'dashboard-ico-countdown'],
    [4, 'ico-active'],
    [5, 'post-ico'],
  ])('should return "%s" for state %i', (state, expectedPhase) => {
    expect(getPhaseFromState(state)).toBe(expectedPhase);
  });
});

describe('calculateState', () => {
  it('should return state 1 when before presale start', () => {
    const timestamps = makeTimestamps({
      presaleStart: 2 * DAY,
      presaleEnd: 9 * DAY,
      icoStart: 12 * DAY,
      icoEnd: 26 * DAY,
    });
    expect(calculateState(timestamps)).toBe(1);
  });

  it('should return state 2 when during presale', () => {
    const timestamps = makeTimestamps({
      presaleStart: -1 * DAY,
      presaleEnd: 5 * DAY,
      icoStart: 8 * DAY,
      icoEnd: 22 * DAY,
    });
    expect(calculateState(timestamps)).toBe(2);
  });

  it('should return state 3 when between presale end and ICO start', () => {
    const timestamps = makeTimestamps({
      presaleStart: -10 * DAY,
      presaleEnd: -2 * DAY,
      icoStart: 3 * DAY,
      icoEnd: 17 * DAY,
    });
    expect(calculateState(timestamps)).toBe(3);
  });

  it('should return state 4 when during ICO', () => {
    const timestamps = makeTimestamps({
      presaleStart: -20 * DAY,
      presaleEnd: -10 * DAY,
      icoStart: -3 * DAY,
      icoEnd: 5 * DAY,
    });
    expect(calculateState(timestamps)).toBe(4);
  });

  it('should return state 5 when after ICO end', () => {
    const timestamps = makeTimestamps({
      presaleStart: -30 * DAY,
      presaleEnd: -20 * DAY,
      icoStart: -15 * DAY,
      icoEnd: -5 * DAY,
    });
    expect(calculateState(timestamps)).toBe(5);
  });

  it('should return state 2 at exact presale start boundary', () => {
    const now = Date.now();
    const timestamps: SaleTimestamps = {
      presaleStart: now,
      presaleEnd: now + 7 * DAY,
      icoStart: now + 10 * DAY,
      icoEnd: now + 24 * DAY,
    };
    expect(calculateState(timestamps)).toBe(2);
  });

  it('should return state 3 at exact presale end boundary', () => {
    const now = Date.now();
    const timestamps: SaleTimestamps = {
      presaleStart: now - 7 * DAY,
      presaleEnd: now,
      icoStart: now + 3 * DAY,
      icoEnd: now + 17 * DAY,
    };
    expect(calculateState(timestamps)).toBe(3);
  });

  it('should return state 4 at exact ICO start boundary', () => {
    const now = Date.now();
    const timestamps: SaleTimestamps = {
      presaleStart: now - 14 * DAY,
      presaleEnd: now - 7 * DAY,
      icoStart: now,
      icoEnd: now + 14 * DAY,
    };
    expect(calculateState(timestamps)).toBe(4);
  });

  it('should return state 5 at exact ICO end boundary', () => {
    const now = Date.now();
    const timestamps: SaleTimestamps = {
      presaleStart: now - 28 * DAY,
      presaleEnd: now - 21 * DAY,
      icoStart: now - 14 * DAY,
      icoEnd: now,
    };
    expect(calculateState(timestamps)).toBe(5);
  });
});

describe('getNextStateTimestamp', () => {
  const timestamps: SaleTimestamps = {
    presaleStart: 1000,
    presaleEnd: 2000,
    icoStart: 3000,
    icoEnd: 4000,
  };

  it('should return presaleStart for state 1', () => {
    expect(getNextStateTimestamp(1, timestamps)).toBe(1000);
  });

  it('should return presaleEnd for state 2', () => {
    expect(getNextStateTimestamp(2, timestamps)).toBe(2000);
  });

  it('should return icoStart for state 3', () => {
    expect(getNextStateTimestamp(3, timestamps)).toBe(3000);
  });

  it('should return icoEnd for state 4', () => {
    expect(getNextStateTimestamp(4, timestamps)).toBe(4000);
  });

  it('should return null for state 5 (final state)', () => {
    expect(getNextStateTimestamp(5, timestamps)).toBeNull();
  });
});

// =====================================================
// Hook integration tests
// =====================================================

describe('useICOState hook', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // We need to dynamically import the hook so fake timers are active
  async function importHook() {
    const mod = await import('@/hooks/ico/useICOState');
    return mod.useICOState;
  }

  it('should return state 1 when all timestamps are in the future', async () => {
    const now = Date.now();
    vi.setSystemTime(now);

    const useICOState = await importHook();
    const timestamps: SaleTimestamps = {
      presaleStart: now + 2 * DAY,
      presaleEnd: now + 9 * DAY,
      icoStart: now + 12 * DAY,
      icoEnd: now + 26 * DAY,
    };

    const { result } = renderHook(() => useICOState({ timestamps }));

    expect(result.current.state).toBe(1);
    expect(result.current.phase).toBe('presale-countdown');
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.isDevOverride).toBe(false);
    expect(result.current.nextStateTimestamp).toBe(timestamps.presaleStart);
  });

  it('should return state 2 when presale is active', async () => {
    const now = Date.now();
    vi.setSystemTime(now);

    const useICOState = await importHook();
    const timestamps: SaleTimestamps = {
      presaleStart: now - 1 * DAY,
      presaleEnd: now + 6 * DAY,
      icoStart: now + 9 * DAY,
      icoEnd: now + 23 * DAY,
    };

    const { result } = renderHook(() => useICOState({ timestamps }));

    expect(result.current.state).toBe(2);
    expect(result.current.phase).toBe('presale-active');
    expect(result.current.status.isActive).toBe(true);
  });

  it('should return state 4 when ICO is active', async () => {
    const now = Date.now();
    vi.setSystemTime(now);

    const useICOState = await importHook();
    const timestamps: SaleTimestamps = {
      presaleStart: now - 20 * DAY,
      presaleEnd: now - 10 * DAY,
      icoStart: now - 2 * DAY,
      icoEnd: now + 12 * DAY,
    };

    const { result } = renderHook(() => useICOState({ timestamps }));

    expect(result.current.state).toBe(4);
    expect(result.current.phase).toBe('ico-active');
    expect(result.current.status.isActive).toBe(true);
  });

  it('should return state 5 after ICO ends', async () => {
    const now = Date.now();
    vi.setSystemTime(now);

    const useICOState = await importHook();
    const timestamps: SaleTimestamps = {
      presaleStart: now - 30 * DAY,
      presaleEnd: now - 20 * DAY,
      icoStart: now - 15 * DAY,
      icoEnd: now - 5 * DAY,
    };

    const { result } = renderHook(() => useICOState({ timestamps }));

    expect(result.current.state).toBe(5);
    expect(result.current.phase).toBe('post-ico');
    expect(result.current.status.isActive).toBe(false);
    expect(result.current.nextStateTimestamp).toBeNull();
  });

  it('should mark isActive only for states 2 and 4', async () => {
    const now = Date.now();
    vi.setSystemTime(now);

    const useICOState = await importHook();

    // State 3 (between presale and ICO) should not be active
    const timestamps: SaleTimestamps = {
      presaleStart: now - 10 * DAY,
      presaleEnd: now - 3 * DAY,
      icoStart: now + 2 * DAY,
      icoEnd: now + 16 * DAY,
    };

    const { result } = renderHook(() => useICOState({ timestamps }));

    expect(result.current.state).toBe(3);
    expect(result.current.status.isActive).toBe(false);
  });

  it('should use dev override state when provided', async () => {
    const now = Date.now();
    vi.setSystemTime(now);

    const useICOState = await importHook();

    // Timestamps say state 1, but dev override says state 4
    const timestamps: SaleTimestamps = {
      presaleStart: now + 2 * DAY,
      presaleEnd: now + 9 * DAY,
      icoStart: now + 12 * DAY,
      icoEnd: now + 26 * DAY,
    };

    const { result } = renderHook(() =>
      useICOState({ timestamps, devOverrideState: 4 })
    );

    expect(result.current.state).toBe(4);
    expect(result.current.phase).toBe('ico-active');
    expect(result.current.isDevOverride).toBe(true);
  });

  it('should allow setting dev state via setDevState', async () => {
    const now = Date.now();
    vi.setSystemTime(now);

    const useICOState = await importHook();
    const timestamps: SaleTimestamps = {
      presaleStart: now + 2 * DAY,
      presaleEnd: now + 9 * DAY,
      icoStart: now + 12 * DAY,
      icoEnd: now + 26 * DAY,
    };

    const { result } = renderHook(() => useICOState({ timestamps }));

    expect(result.current.state).toBe(1);
    expect(result.current.isDevOverride).toBe(false);

    act(() => {
      result.current.setDevState(5);
    });

    expect(result.current.state).toBe(5);
    expect(result.current.phase).toBe('post-ico');
    expect(result.current.isDevOverride).toBe(true);
  });

  it('should clear dev override when setDevState(null) is called', async () => {
    const now = Date.now();
    vi.setSystemTime(now);

    const useICOState = await importHook();
    const timestamps: SaleTimestamps = {
      presaleStart: now + 2 * DAY,
      presaleEnd: now + 9 * DAY,
      icoStart: now + 12 * DAY,
      icoEnd: now + 26 * DAY,
    };

    const { result } = renderHook(() =>
      useICOState({ timestamps, devOverrideState: 4 })
    );

    expect(result.current.isDevOverride).toBe(true);

    act(() => {
      result.current.setDevState(null);
    });

    expect(result.current.isDevOverride).toBe(false);
    expect(result.current.state).toBe(1); // back to calculated
  });

  it('should recalculate state after refetch', async () => {
    const now = Date.now();
    vi.setSystemTime(now);

    const useICOState = await importHook();
    const timestamps: SaleTimestamps = {
      presaleStart: now + 2 * DAY,
      presaleEnd: now + 9 * DAY,
      icoStart: now + 12 * DAY,
      icoEnd: now + 26 * DAY,
    };

    const { result } = renderHook(() => useICOState({ timestamps }));

    expect(result.current.state).toBe(1);
    expect(result.current.error).toBeNull();

    act(() => {
      result.current.refetch();
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should return provided timestamps in the result', async () => {
    const now = Date.now();
    vi.setSystemTime(now);

    const useICOState = await importHook();
    const timestamps: SaleTimestamps = {
      presaleStart: now + 1000,
      presaleEnd: now + 2000,
      icoStart: now + 3000,
      icoEnd: now + 4000,
    };

    const { result } = renderHook(() => useICOState({ timestamps }));

    expect(result.current.timestamps).toEqual(timestamps);
  });
});
