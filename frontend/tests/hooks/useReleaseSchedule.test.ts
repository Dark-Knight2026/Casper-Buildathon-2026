import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// ── Mocks ──────────────────────────────────────────────────────────────────

const mockGet = vi.fn();
vi.mock('@/lib/api-client', () => ({
  backendClient: { get: (...args: unknown[]) => mockGet(...args) },
}));

import { useReleaseSchedule } from '@/hooks/ico/useReleaseSchedule';

// ── Wrapper ────────────────────────────────────────────────────────────────

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return React.createElement(QueryClientProvider, { client: qc }, children);
}

// ── Constants ──────────────────────────────────────────────────────────────

const mockScheduleData = {
  schedules: [
    { date: '2025-01-01', amount: '100000' },
    { date: '2025-06-01', amount: '200000' },
  ],
};

// ── Tests ──────────────────────────────────────────────────────────────────

describe('useReleaseSchedule', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls correct endpoint /api/v1/vesting/release-schedule', async () => {
    mockGet.mockResolvedValue(mockScheduleData);
    const { result } = renderHook(() => useReleaseSchedule(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockGet).toHaveBeenCalledWith('/api/v1/vesting/release-schedule');
  });

  it('returns data on success', async () => {
    mockGet.mockResolvedValue(mockScheduleData);
    const { result } = renderHook(() => useReleaseSchedule(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockScheduleData);
  });

  it('returns error on failure', async () => {
    const boom = new Error('Not found');
    mockGet.mockRejectedValue(boom);
    const { result } = renderHook(() => useReleaseSchedule(), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(Error);
    expect((result.current.error as Error).message).toBe('Not found');
  });
});
