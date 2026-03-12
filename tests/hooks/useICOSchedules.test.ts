import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useICOSchedules } from '@/hooks/ico/useICOSchedules';
import type { ICOSchedule } from '@/services/ico/contractTypes';

// Mock the contract service
const mockGetAllSchedules = vi.fn();
vi.mock('@/services/ico/icoContractService', () => ({
  getAllSchedules: () => mockGetAllSchedules(),
}));

// Sample schedule data matching contract structure
const mockPresaleSchedule: ICOSchedule = {
  startTimestamp: 1704067200000n, // 2024-01-01
  endTimestamp: 1706745600000n,   // 2024-02-01
  price: 100000n,                  // $0.10 with 6 decimals
  saleAmount: 10000000000000000000000000n, // 10M tokens with 18 decimals
  soldAmount: 1000000000000000000000000n,  // 1M tokens sold
};

const mockICOSchedule: ICOSchedule = {
  startTimestamp: 1706745600000n, // 2024-02-01
  endTimestamp: 1709424000000n,   // 2024-03-03
  price: 150000n,                  // $0.15 with 6 decimals
  saleAmount: 50000000000000000000000000n, // 50M tokens with 18 decimals
  soldAmount: 5000000000000000000000000n,  // 5M tokens sold
};

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
}

describe('useICOSchedules', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // --- Initial state ---

  describe('initial state', () => {
    it('should start with loading state', () => {
      mockGetAllSchedules.mockReturnValue(new Promise(() => {})); // Never resolves
      const { result } = renderHook(() => useICOSchedules(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(true);
      expect(result.current.timestamps).toBeNull();
      expect(result.current.presaleProgress).toBeNull();
      expect(result.current.icoProgress).toBeNull();
      expect(result.current.error).toBeNull();
    });
  });

  // --- Successful fetch ---

  describe('successful fetch', () => {
    it('should fetch and parse schedules correctly', async () => {
      mockGetAllSchedules.mockResolvedValue([
        { id: 0n, schedule: mockPresaleSchedule },
        { id: 1n, schedule: mockICOSchedule },
      ]);

      const { result } = renderHook(() => useICOSchedules(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBeNull();
      expect(result.current.timestamps).not.toBeNull();
      expect(result.current.presaleProgress).not.toBeNull();
      expect(result.current.icoProgress).not.toBeNull();
    });

    it('should convert timestamps correctly', async () => {
      mockGetAllSchedules.mockResolvedValue([
        { id: 0n, schedule: mockPresaleSchedule },
        { id: 1n, schedule: mockICOSchedule },
      ]);

      const { result } = renderHook(() => useICOSchedules(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.timestamps?.presaleStart).toBe(Number(mockPresaleSchedule.startTimestamp));
      expect(result.current.timestamps?.presaleEnd).toBe(Number(mockPresaleSchedule.endTimestamp));
    });

    it('should calculate progress data correctly', async () => {
      mockGetAllSchedules.mockResolvedValue([
        { id: 0n, schedule: mockPresaleSchedule },
        { id: 1n, schedule: mockICOSchedule },
      ]);

      const { result } = renderHook(() => useICOSchedules(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const presaleProgress = result.current.presaleProgress!;
      expect(presaleProgress.tokensSold).toBe(1000000); // 1M
      expect(presaleProgress.totalAllocation).toBe(10000000); // 10M
      expect(presaleProgress.tokensRemaining).toBe(9000000); // 9M
      expect(presaleProgress.priceUsd).toBe(0.1); // $0.10
      expect(presaleProgress.percentSold).toBe(10); // 10%
    });

    it('should calculate hardCapUsd and amountRaised correctly', async () => {
      mockGetAllSchedules.mockResolvedValue([
        { id: 0n, schedule: mockPresaleSchedule },
        { id: 1n, schedule: mockICOSchedule },
      ]);

      const { result } = renderHook(() => useICOSchedules(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const presaleProgress = result.current.presaleProgress!;
      // hardCapUsd = totalAllocation * priceUsd = 10M * 0.10 = 1M
      expect(presaleProgress.hardCapUsd).toBe(1000000);
      // amountRaised = soldAmount * price / decimals = 1M * 0.10 = 100K
      expect(presaleProgress.amountRaised).toBe(100000);

      const icoProgress = result.current.icoProgress!;
      // hardCapUsd = 50M * 0.15 = 7.5M
      expect(icoProgress.hardCapUsd).toBe(7500000);
      // amountRaised = 5M * 0.15 = 750K
      expect(icoProgress.amountRaised).toBe(750000);
    });

    it('should handle only presale schedule', async () => {
      mockGetAllSchedules.mockResolvedValue([
        { id: 0n, schedule: mockPresaleSchedule },
      ]);

      const { result } = renderHook(() => useICOSchedules(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.presaleProgress).not.toBeNull();
      expect(result.current.icoProgress).toBeNull();
    });

    it('should handle only ICO schedule', async () => {
      mockGetAllSchedules.mockResolvedValue([
        { id: 1n, schedule: mockICOSchedule },
      ]);

      const { result } = renderHook(() => useICOSchedules(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.presaleProgress).toBeNull();
      expect(result.current.icoProgress).not.toBeNull();
      expect(result.current.timestamps?.presaleStart).toBe(0);
      expect(result.current.timestamps?.presaleEnd).toBe(0);
    });

    it('should handle empty schedules', async () => {
      mockGetAllSchedules.mockResolvedValue([]);

      const { result } = renderHook(() => useICOSchedules(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.timestamps).toBeNull();
      expect(result.current.presaleProgress).toBeNull();
      expect(result.current.icoProgress).toBeNull();
    });
  });

  // --- Error handling ---

  describe('error handling', () => {
    it('should set error state on fetch failure', async () => {
      mockGetAllSchedules.mockRejectedValue(new Error('Contract call failed'));

      const { result } = renderHook(() => useICOSchedules(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.error).not.toBeNull();
      });

      expect(result.current.error?.message).toBe('Contract call failed');
    });

    it('should handle non-Error rejection', async () => {
      mockGetAllSchedules.mockRejectedValue('Unknown error');

      const { result } = renderHook(() => useICOSchedules(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.error).not.toBeNull();
      });

      expect(result.current.error?.message).toBe('Failed to fetch ICO schedules');
    });
  });

  // --- Refetch ---

  describe('refetch', () => {
    it('should provide refetch function', async () => {
      mockGetAllSchedules.mockResolvedValue([
        { id: 0n, schedule: mockPresaleSchedule },
      ]);

      const { result } = renderHook(() => useICOSchedules(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(typeof result.current.refetch).toBe('function');
    });

    it('should refetch data when called', async () => {
      mockGetAllSchedules.mockResolvedValue([
        { id: 0n, schedule: mockPresaleSchedule },
      ]);

      const { result } = renderHook(() => useICOSchedules(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockGetAllSchedules).toHaveBeenCalledTimes(1);

      act(() => {
        result.current.refetch();
      });

      await waitFor(() => {
        expect(mockGetAllSchedules).toHaveBeenCalledTimes(2);
      });
    });

    it('should clear error on successful refetch', async () => {
      mockGetAllSchedules.mockRejectedValueOnce(new Error('First call failed'));

      const wrapper = createWrapper();
      const { result } = renderHook(() => useICOSchedules(), { wrapper });

      await waitFor(() => {
        expect(result.current.error).not.toBeNull();
      });

      mockGetAllSchedules.mockResolvedValueOnce([
        { id: 0n, schedule: mockPresaleSchedule },
      ]);

      act(() => {
        result.current.refetch();
      });

      await waitFor(() => {
        expect(result.current.error).toBeNull();
      });
    });
  });
});
