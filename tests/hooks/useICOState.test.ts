import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import type { ICOState, ICOPhase, SaleTimestamps } from '@/types/ico';

// --- Pure functions extracted from hook for unit testing ---

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
  if (now < timestamps.presaleStart) return 1;
  if (now >= timestamps.presaleStart && now < timestamps.presaleEnd) return 2;
  return 3;
};

const getNextStateTimestamp = (
  currentState: ICOState,
  timestamps: SaleTimestamps
): number | null => {
  switch (currentState) {
    case 1: return timestamps.presaleStart;
    case 2: return timestamps.presaleEnd;
    case 3: return null;
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
    [1, 'private-sale-countdown'],
    [2, 'private-sale-active'],
    [3, 'post-ico-dashboard'],
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

  it('should return state 3 when after presale end', () => {
    const timestamps = makeTimestamps({
      presaleStart: -10 * DAY,
      presaleEnd: -2 * DAY,
      icoStart: 3 * DAY,
      icoEnd: 17 * DAY,
    });
    expect(calculateState(timestamps)).toBe(3);
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

  it('should return null for state 3 (final state)', () => {
    expect(getNextStateTimestamp(3, timestamps)).toBeNull();
  });
});

// =====================================================
// Hook integration tests
// =====================================================

describe('useICOState hook', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.useFakeTimers();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
  });

  afterEach(() => {
    queryClient.clear();
    vi.useRealTimers();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);

  // We need to dynamically import the hook so fake timers are active
  async function importHook() {
    const mod = await import('@/hooks/ico/useICOState');
    return mod.useICOState;
  }

  /** Flush React Query's internal async resolution after renderHook */
  async function flushQueryUpdates() {
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
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

    const { result } = renderHook(() => useICOState({ timestamps }), { wrapper });
    await flushQueryUpdates();

    expect(result.current.state).toBe(1);
    expect(result.current.phase).toBe('private-sale-countdown');
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

    const { result } = renderHook(() => useICOState({ timestamps }), { wrapper });
    await flushQueryUpdates();

    expect(result.current.state).toBe(2);
    expect(result.current.phase).toBe('private-sale-active');
    expect(result.current.status.isActive).toBe(true);
  });

  it('should return state 3 after presale ends', async () => {
    const now = Date.now();
    vi.setSystemTime(now);

    const useICOState = await importHook();
    const timestamps: SaleTimestamps = {
      presaleStart: now - 30 * DAY,
      presaleEnd: now - 20 * DAY,
      icoStart: now - 15 * DAY,
      icoEnd: now - 5 * DAY,
    };

    const { result } = renderHook(() => useICOState({ timestamps }), { wrapper });
    await flushQueryUpdates();

    expect(result.current.state).toBe(3);
    expect(result.current.phase).toBe('post-ico-dashboard');
    expect(result.current.status.isActive).toBe(false);
    expect(result.current.nextStateTimestamp).toBeNull();
  });

  it('should mark isActive only for state 2', async () => {
    const now = Date.now();
    vi.setSystemTime(now);

    const useICOState = await importHook();

    // State 3 (after presale) should not be active
    const timestamps: SaleTimestamps = {
      presaleStart: now - 10 * DAY,
      presaleEnd: now - 3 * DAY,
      icoStart: now + 2 * DAY,
      icoEnd: now + 16 * DAY,
    };

    const { result } = renderHook(() => useICOState({ timestamps }), { wrapper });
    await flushQueryUpdates();

    expect(result.current.state).toBe(3);
    expect(result.current.status.isActive).toBe(false);
  });

  it('should use dev override state when provided', async () => {
    const now = Date.now();
    vi.setSystemTime(now);

    const useICOState = await importHook();

    // Timestamps say state 1, but dev override says state 2
    const timestamps: SaleTimestamps = {
      presaleStart: now + 2 * DAY,
      presaleEnd: now + 9 * DAY,
      icoStart: now + 12 * DAY,
      icoEnd: now + 26 * DAY,
    };

    const { result } = renderHook(
      () => useICOState({ timestamps, devOverrideState: 2 }),
      { wrapper }
    );
    await flushQueryUpdates();

    expect(result.current.state).toBe(2);
    expect(result.current.phase).toBe('private-sale-active');
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

    const { result } = renderHook(() => useICOState({ timestamps }), { wrapper });
    await flushQueryUpdates();

    expect(result.current.state).toBe(1);
    expect(result.current.isDevOverride).toBe(false);

    act(() => {
      result.current.setDevState(3);
    });

    expect(result.current.state).toBe(3);
    expect(result.current.phase).toBe('post-ico-dashboard');
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

    const { result } = renderHook(
      () => useICOState({ timestamps, devOverrideState: 2 }),
      { wrapper }
    );
    await flushQueryUpdates();

    expect(result.current.isDevOverride).toBe(true);

    act(() => {
      result.current.setDevState(null);
    });

    expect(result.current.isDevOverride).toBe(false);
    expect(result.current.state).toBe(1); // back to calculated
  });

  // --- Loading state ---

  describe('loading state', () => {
    it('should start with isLoading=true when no timestamps provided', async () => {
      const now = Date.now();
      vi.setSystemTime(now);

      const useICOState = await importHook();
      const { result } = renderHook(() => useICOState(), { wrapper });

      expect(result.current.isLoading).toBe(true);
    });

    it('should start with isLoading=false when timestamps provided', async () => {
      const now = Date.now();
      vi.setSystemTime(now);

      const useICOState = await importHook();
      const timestamps: SaleTimestamps = {
        presaleStart: now + 2 * DAY,
        presaleEnd: now + 9 * DAY,
        icoStart: now + 12 * DAY,
        icoEnd: now + 26 * DAY,
      };

      const { result } = renderHook(() => useICOState({ timestamps }), { wrapper });
      await flushQueryUpdates();

      expect(result.current.isLoading).toBe(false);
    });

    it('should transition from loading to loaded when timestamps arrive', async () => {
      const now = Date.now();
      vi.setSystemTime(now);

      const useICOState = await importHook();
      const timestamps: SaleTimestamps = {
        presaleStart: now + 2 * DAY,
        presaleEnd: now + 9 * DAY,
        icoStart: now + 12 * DAY,
        icoEnd: now + 26 * DAY,
      };

      // Start without timestamps — loading
      const { result, rerender } = renderHook(
        (props: { timestamps?: SaleTimestamps }) => useICOState(props),
        { initialProps: {}, wrapper }
      );

      expect(result.current.isLoading).toBe(true);

      // Provide timestamps — should transition to loaded
      rerender({ timestamps });
      await flushQueryUpdates();

      expect(result.current.isLoading).toBe(false);
      expect(result.current.state).toBe(1);
    });

    it('should use zero timestamps and not calculate state while loading', async () => {
      const now = Date.now();
      vi.setSystemTime(now);

      const useICOState = await importHook();
      const { result } = renderHook(() => useICOState(), { wrapper });

      // Without real timestamps, timestamps are all zeros
      // With useQuery, calculateState(zeros) returns 3 since now >= presaleEnd(0)
      expect(result.current.isLoading).toBe(true);
      expect(result.current.timestamps).toEqual({
        presaleStart: 0,
        presaleEnd: 0,
        icoStart: 0,
        icoEnd: 0,
      });
    });

    it('should not run poll timer without real timestamps', async () => {
      const now = Date.now();
      vi.setSystemTime(now);

      const useICOState = await importHook();
      const { result } = renderHook(() => useICOState({ pollInterval: 1000 }), { wrapper });

      expect(result.current.isLoading).toBe(true);

      // Advance time — state should remain unchanged since no real timestamps
      act(() => {
        vi.advanceTimersByTime(5000);
      });

      expect(result.current.isLoading).toBe(true);
    });

    it('refetch should be a no-op without real timestamps', async () => {
      const now = Date.now();
      vi.setSystemTime(now);

      const useICOState = await importHook();
      const { result } = renderHook(() => useICOState(), { wrapper });

      expect(result.current.isLoading).toBe(true);

      act(() => {
        result.current.refetch();
      });

      // isLoading should remain true — refetch did nothing
      expect(result.current.isLoading).toBe(true);
    });
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

    const { result } = renderHook(() => useICOState({ timestamps }), { wrapper });
    await flushQueryUpdates();

    expect(result.current.state).toBe(1);
    expect(result.current.error).toBeNull();

    await act(async () => {
      result.current.refetch();
      await vi.advanceTimersByTimeAsync(0);
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

    const { result } = renderHook(() => useICOState({ timestamps }), { wrapper });
    await flushQueryUpdates();

    expect(result.current.timestamps).toEqual(timestamps);
  });
});
