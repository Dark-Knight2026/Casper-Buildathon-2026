import { useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getAllSchedules } from '@/services/ico/icoContractService';
import type { SaleTimestamps } from '@/types/ico';
import type { ICOSchedule } from '@/services/ico/contractTypes';

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

interface FetchedData {
  presale: ICOSchedule | null;
  ico: ICOSchedule | null;
}

async function fetchSchedules(): Promise<FetchedData> {
  try {
    const schedules = await getAllSchedules();

    const presale = schedules.find((s) => s.id === 0n)?.schedule ?? null;
    const ico = schedules.find((s) => s.id === 1n)?.schedule ?? null;

    return { presale, ico };
  } catch (err) {
    throw err instanceof Error ? err : new Error('Failed to fetch ICO schedules');
  }
}

// ── Hook ─────────────────────────────────────────────────────────────

export function useICOSchedules(): ICOScheduleData {
  const {
    data,
    isLoading,
    error: queryError,
    refetch: queryRefetch,
  } = useQuery<FetchedData, Error>({
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

    const { presale, ico } = data;

    // Build timestamps from contract schedules
    const timestamps: SaleTimestamps | null = (presale || ico) ? {
      presaleStart: presale ? Number(presale.startTimestamp) : 0,
      presaleEnd: presale ? Number(presale.endTimestamp) : 0,
    } : null;

    const presaleProgress = presale ? scheduleToProgress(presale) : null;

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
