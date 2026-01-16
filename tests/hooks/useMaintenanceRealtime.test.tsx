/**
 * useMaintenanceRealtime Hook Unit Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useMaintenanceRealtime } from '@/hooks/useMaintenanceRealtime';
import { supabase } from '@/lib/supabase/client';

vi.mock('@/lib/supabase/client');

describe('useMaintenanceRealtime', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with empty requests and loading state', () => {
    const mockChannel = {
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(),
    };

    (supabase.from as any).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    });

    (supabase.channel as any).mockReturnValue(mockChannel);

    const { result } = renderHook(() =>
      useMaintenanceRealtime({
        userId: 'tenant-123',
        userType: 'tenant',
      })
    );

    expect(result.current.loading).toBe(true);
    expect(result.current.requests).toEqual([]);
  });

  it('should fetch maintenance requests on mount', async () => {
    const mockRequests = [
      {
        id: 'request-1',
        tenant_id: 'tenant-123',
        title: 'Leaking faucet',
        status: 'open',
        created_at: new Date().toISOString(),
      },
      {
        id: 'request-2',
        tenant_id: 'tenant-123',
        title: 'Broken window',
        status: 'in_progress',
        created_at: new Date().toISOString(),
      },
    ];

    const mockChannel = {
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(),
    };

    (supabase.from as any).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: mockRequests, error: null }),
    });

    (supabase.channel as any).mockReturnValue(mockChannel);

    const { result } = renderHook(() =>
      useMaintenanceRealtime({
        userId: 'tenant-123',
        userType: 'tenant',
      })
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.requests).toHaveLength(2);
    expect(result.current.requests[0].id).toBe('request-1');
  });

  it('should setup realtime subscription', async () => {
    const mockChannel = {
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(),
    };

    (supabase.from as any).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    });

    (supabase.channel as any).mockReturnValue(mockChannel);

    renderHook(() =>
      useMaintenanceRealtime({
        userId: 'tenant-123',
        userType: 'tenant',
      })
    );

    await waitFor(() => {
      expect(supabase.channel).toHaveBeenCalledWith(
        'maintenance_tenant_tenant-123'
      );
      expect(mockChannel.on).toHaveBeenCalled();
      expect(mockChannel.subscribe).toHaveBeenCalled();
    });
  });

  it('should handle errors gracefully', async () => {
    const mockChannel = {
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(),
    };

    (supabase.from as any).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi
        .fn()
        .mockResolvedValue({ data: null, error: new Error('Database error') }),
    });

    (supabase.channel as any).mockReturnValue(mockChannel);

    const { result } = renderHook(() =>
      useMaintenanceRealtime({
        userId: 'tenant-123',
        userType: 'tenant',
      })
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBeDefined();
    expect(result.current.requests).toEqual([]);
  });

  it('should support refetch functionality', async () => {
    const mockRequests = [
      {
        id: 'request-1',
        tenant_id: 'tenant-123',
        title: 'Leaking faucet',
        status: 'open',
        created_at: new Date().toISOString(),
      },
    ];

    const mockChannel = {
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(),
    };

    (supabase.from as any).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: mockRequests, error: null }),
    });

    (supabase.channel as any).mockReturnValue(mockChannel);

    const { result } = renderHook(() =>
      useMaintenanceRealtime({
        userId: 'tenant-123',
        userType: 'tenant',
      })
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Trigger refetch
    await result.current.refetch();

    expect(supabase.from).toHaveBeenCalledTimes(2);
  });
});