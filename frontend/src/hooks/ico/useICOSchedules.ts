import { useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getAllSchedules } from '@/services/ico/icoContractService';
import type { SaleTimestamps } from '@/types/ico';
import type { ICOSchedule, ICOScheduleWithId } from '@/services/ico/contractTypes';

// ── Types ────────────────────────────────────────────────────────────

export interface ScheduleProgress {
  tokensSold: number;
  totalAllocation: number;
  tokensRemaining: number;
  amountRaised: number;
  hardCapUsd: number;
  priceUsd: number;
  percentSold: number;
}

export interface ICOScheduleData {
  timestamps: SaleTimestamps | null;
  presaleProgress: ScheduleProgress | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

// ── Constants ────────────────────────────────────────────────────────

const POLL_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes

// ── Helpers ──────────────────────────────────────────────────────────

/** Normalizes a contract timestamp to milliseconds (handles both seconds and ms) */
function toMs(ts: bigint): bigint {
  return ts > 1_000_000_000_000n ? ts : ts * 1000n;
}

const TOKEN_DECIMALS = 18;
const PRICE_DECIMALS = 6; // USD price uses 6 decimals (like USDC/USDT)
const DECIMALS_DIVISOR = 10n ** BigInt(TOKEN_DECIMALS);
const PRICE_DIVISOR = 10n ** BigInt(PRICE_DECIMALS);

// ── Conversion helpers ───────────────────────────────────────────────

function fromDecimals(raw: bigint, decimals: bigint = DECIMALS_DIVISOR): number {
  const whole = raw / decimals;
  const frac = raw % decimals;
  return Number(whole) + Number(frac) / Number(decimals);
}

function scheduleToProgress(schedule: ICOSchedule): ScheduleProgress {
  const tokensSold = fromDecimals(schedule.soldAmount);
  const totalAllocation = fromDecimals(schedule.saleAmount);
  const tokensRemaining = totalAllocation - tokensSold;
  const priceUsd = fromDecimals(schedule.price, PRICE_DIVISOR);

  const amountRaisedRaw = (schedule.soldAmount * schedule.price) / DECIMALS_DIVISOR;
  const amountRaised = fromDecimals(amountRaisedRaw, PRICE_DIVISOR);

  const percentSold = totalAllocation > 0
    ? (tokensSold / totalAllocation) * 100
    : 0;

  const hardCapUsd = totalAllocation * priceUsd;

  return {
    tokensSold,
    totalAllocation,
    tokensRemaining,
    amountRaised,
    hardCapUsd,
    priceUsd,
    percentSold,
  };
}

// ── Fetch function ──────────────────────────────────────────────────

async function fetchSchedules(): Promise<ICOScheduleWithId[]> {
  try {
    return await getAllSchedules();
  } catch (err) {
    throw err instanceof Error ? err : new Error('Failed to fetch ICO schedules');
  }
}

/**
 * Finds the relevant schedule to display:
 * 1. Active schedule (now is within start..end)
 * 2. Next upcoming schedule (nearest start in the future)
 * 3. null → no schedule → show post-ICO dashboard
 */
function findRelevantSchedule(schedules: ICOScheduleWithId[]): ICOScheduleWithId | null {
  const nowMs = BigInt(Date.now());

  // 1. Active schedule
  const active = schedules.find(({ schedule: s }) => {
    const startMs = toMs(s.startTimestamp);
    const endMs = toMs(s.endTimestamp);
    return nowMs >= startMs && nowMs < endMs;
  });
  if (active) return active;

  // 2. Next upcoming (sorted by nearest start)
  const upcoming = schedules
    .filter(({ schedule: s }) => nowMs < toMs(s.startTimestamp))
    .sort((a, b) => {
      const diff = toMs(a.schedule.startTimestamp) - toMs(b.schedule.startTimestamp);
      return diff < 0n ? -1 : diff > 0n ? 1 : 0;
    });

  return upcoming[0] ?? null;
}

// ── Hook ─────────────────────────────────────────────────────────────

export function useICOSchedules(): ICOScheduleData {
  const {
    data,
    isLoading,
    error: queryError,
    refetch: queryRefetch,
  } = useQuery<ICOScheduleWithId[], Error>({
    queryKey: ['ico-schedules'],
    queryFn: fetchSchedules,
    staleTime: POLL_INTERVAL_MS,
    refetchInterval: POLL_INTERVAL_MS,
    refetchOnWindowFocus: false,
  });

  const result = useMemo((): Omit<ICOScheduleData, 'isLoading' | 'error' | 'refetch'> => {
    if (!data) {
      return {
        timestamps: null,
        presaleProgress: null,
      };
    }

    const relevant = findRelevantSchedule(data);

    const timestamps: SaleTimestamps | null = relevant
      ? {
          presaleStart: Number(toMs(relevant.schedule.startTimestamp)),
          presaleEnd: Number(toMs(relevant.schedule.endTimestamp)),
        }
      : null;

    const presaleProgress = relevant ? scheduleToProgress(relevant.schedule) : null;

    return {
      timestamps,
      presaleProgress,
    };
  }, [data]);

  const refetch = useCallback(() => {
    queryRefetch();
  }, [queryRefetch]);

  return {
    ...result,
    isLoading,
    error: queryError ?? null,
    refetch,
  };
}
