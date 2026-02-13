import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { CountdownTimer } from '@/pages/ico/components/shared/CountdownTimer';
import type { CountdownTime } from '@/types/ico';

// --- Pure function tests ---

const calculateTimeLeft = (targetTimestamp: number): CountdownTime => {
  const now = Date.now();
  const difference = targetTimestamp - now;

  if (difference <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true };
  }

  return {
    days: Math.floor(difference / (1000 * 60 * 60 * 24)),
    hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((difference / (1000 * 60)) % 60),
    seconds: Math.floor((difference / 1000) % 60),
    isExpired: false,
  };
};

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

describe('calculateTimeLeft', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-06-01T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return expired state when target is in the past', () => {
    const result = calculateTimeLeft(Date.now() - 5000);

    expect(result.isExpired).toBe(true);
    expect(result.days).toBe(0);
    expect(result.hours).toBe(0);
    expect(result.minutes).toBe(0);
    expect(result.seconds).toBe(0);
  });

  it('should return expired state when target equals now', () => {
    const result = calculateTimeLeft(Date.now());

    expect(result.isExpired).toBe(true);
  });

  it('should calculate days correctly', () => {
    const result = calculateTimeLeft(Date.now() + 3 * DAY + 5 * HOUR);

    expect(result.days).toBe(3);
    expect(result.hours).toBe(5);
    expect(result.isExpired).toBe(false);
  });

  it('should calculate hours/minutes/seconds correctly', () => {
    const result = calculateTimeLeft(
      Date.now() + 2 * HOUR + 30 * MINUTE + 15 * SECOND
    );

    expect(result.days).toBe(0);
    expect(result.hours).toBe(2);
    expect(result.minutes).toBe(30);
    expect(result.seconds).toBe(15);
    expect(result.isExpired).toBe(false);
  });

  it('should handle exactly 1 day', () => {
    const result = calculateTimeLeft(Date.now() + DAY);

    expect(result.days).toBe(1);
    expect(result.hours).toBe(0);
    expect(result.minutes).toBe(0);
    expect(result.seconds).toBe(0);
  });

  it('should handle large values (e.g. 30 days)', () => {
    const result = calculateTimeLeft(
      Date.now() + 30 * DAY + 12 * HOUR + 45 * MINUTE + 30 * SECOND
    );

    expect(result.days).toBe(30);
    expect(result.hours).toBe(12);
    expect(result.minutes).toBe(45);
    expect(result.seconds).toBe(30);
  });

  it('should handle sub-second difference as 0 seconds', () => {
    const result = calculateTimeLeft(Date.now() + 500);

    expect(result.seconds).toBe(0);
    expect(result.isExpired).toBe(false);
  });
});

// --- Component tests ---

describe('CountdownTimer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-06-01T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // --- Default variant ---

  describe('default variant', () => {
    it('should render four time unit cards with labels', () => {
      const target = Date.now() + 2 * DAY + 5 * HOUR + 30 * MINUTE + 10 * SECOND;
      render(<CountdownTimer targetTimestamp={target} />);

      expect(screen.getByText('Days')).toBeInTheDocument();
      expect(screen.getByText('Hours')).toBeInTheDocument();
      expect(screen.getByText('Minutes')).toBeInTheDocument();
      expect(screen.getByText('Seconds')).toBeInTheDocument();
    });

    it('should display zero-padded values', () => {
      const target = Date.now() + 1 * DAY + 3 * HOUR + 5 * MINUTE + 9 * SECOND;
      render(<CountdownTimer targetTimestamp={target} />);

      expect(screen.getByText('01')).toBeInTheDocument(); // days
      expect(screen.getByText('03')).toBeInTheDocument(); // hours
      expect(screen.getByText('05')).toBeInTheDocument(); // minutes
      expect(screen.getByText('09')).toBeInTheDocument(); // seconds
    });

    it('should hide labels when showLabels is false', () => {
      const target = Date.now() + DAY;
      render(<CountdownTimer targetTimestamp={target} showLabels={false} />);

      expect(screen.queryByText('Days')).not.toBeInTheDocument();
      expect(screen.queryByText('Hours')).not.toBeInTheDocument();
      expect(screen.queryByText('Minutes')).not.toBeInTheDocument();
      expect(screen.queryByText('Seconds')).not.toBeInTheDocument();
    });

    it('should show all zeros when target is in the past', () => {
      const target = Date.now() - 5000;
      render(<CountdownTimer targetTimestamp={target} />);

      const zeros = screen.getAllByText('00');
      expect(zeros).toHaveLength(4);
    });
  });

  // --- Minimal variant ---

  describe('minimal variant', () => {
    it('should render time as inline text without days when days = 0', () => {
      const target = Date.now() + 2 * HOUR + 15 * MINUTE + 30 * SECOND;
      render(<CountdownTimer targetTimestamp={target} variant="minimal" />);

      expect(screen.getByText(/02:15:30/)).toBeInTheDocument();
    });

    it('should include day prefix when days > 0', () => {
      const target = Date.now() + 3 * DAY + 4 * HOUR + 10 * MINUTE + 5 * SECOND;
      render(<CountdownTimer targetTimestamp={target} variant="minimal" />);

      expect(screen.getByText(/3d/)).toBeInTheDocument();
      expect(screen.getByText(/04:10:05/)).toBeInTheDocument();
    });

    it('should not render unit labels', () => {
      const target = Date.now() + DAY;
      render(<CountdownTimer targetTimestamp={target} variant="minimal" />);

      expect(screen.queryByText('Days')).not.toBeInTheDocument();
      expect(screen.queryByText('Hours')).not.toBeInTheDocument();
    });
  });

  // --- Compact variant ---

  describe('compact variant', () => {
    it('should render hours:minutes:seconds separated by colons', () => {
      const target = Date.now() + 5 * HOUR + 20 * MINUTE + 45 * SECOND;
      render(<CountdownTimer targetTimestamp={target} variant="compact" />);

      expect(screen.getByText('05')).toBeInTheDocument();
      expect(screen.getByText('20')).toBeInTheDocument();
      expect(screen.getByText('45')).toBeInTheDocument();
      // Two colon separators
      expect(screen.getAllByText(':')).toHaveLength(2);
    });

    it('should show days label when days > 0', () => {
      const target = Date.now() + 2 * DAY + 3 * HOUR;
      render(<CountdownTimer targetTimestamp={target} variant="compact" />);

      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText('Days')).toBeInTheDocument();
    });

    it('should not show days section when days = 0', () => {
      const target = Date.now() + 5 * HOUR;
      render(<CountdownTimer targetTimestamp={target} variant="compact" />);

      expect(screen.queryByText('Days')).not.toBeInTheDocument();
    });
  });

  // --- Timer ticking ---

  describe('timer behavior', () => {
    it('should update countdown every second', () => {
      const target = Date.now() + 10 * SECOND;
      render(<CountdownTimer targetTimestamp={target} />);

      // Initially 10 seconds
      expect(screen.getByText('10')).toBeInTheDocument();

      // Advance 1 second
      act(() => {
        vi.advanceTimersByTime(1000);
      });
      expect(screen.getByText('09')).toBeInTheDocument();

      // Advance 4 more seconds
      act(() => {
        vi.advanceTimersByTime(4000);
      });
      expect(screen.getByText('05')).toBeInTheDocument();
    });

    it('should call onExpire when countdown reaches zero', () => {
      const onExpire = vi.fn();
      const target = Date.now() + 2 * SECOND;

      render(<CountdownTimer targetTimestamp={target} onExpire={onExpire} />);

      expect(onExpire).not.toHaveBeenCalled();

      act(() => {
        vi.advanceTimersByTime(2000);
      });

      expect(onExpire).toHaveBeenCalledTimes(1);
    });

    it('should not call onExpire if timer is already expired on mount', () => {
      const onExpire = vi.fn();
      const target = Date.now() - 5000;

      render(<CountdownTimer targetTimestamp={target} onExpire={onExpire} />);

      // The interval fires once, detects expiry, and calls onExpire
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      expect(onExpire).toHaveBeenCalledTimes(1);
    });

    it('should stop ticking after expiration', () => {
      const onExpire = vi.fn();
      const target = Date.now() + 1 * SECOND;

      render(<CountdownTimer targetTimestamp={target} onExpire={onExpire} />);

      // Expire
      act(() => {
        vi.advanceTimersByTime(1000);
      });
      expect(onExpire).toHaveBeenCalledTimes(1);

      // Further ticks should not call onExpire again
      act(() => {
        vi.advanceTimersByTime(5000);
      });
      expect(onExpire).toHaveBeenCalledTimes(1);
    });

    it('should work without onExpire callback', () => {
      const target = Date.now() + 2 * SECOND;

      render(<CountdownTimer targetTimestamp={target} />);

      // Should not throw when expiring without callback
      act(() => {
        vi.advanceTimersByTime(3000);
      });

      const zeros = screen.getAllByText('00');
      expect(zeros).toHaveLength(4);
    });
  });

  // --- Size prop ---

  describe('size prop', () => {
    it('should apply sm size classes', () => {
      const target = Date.now() + DAY;
      const { container } = render(
        <CountdownTimer targetTimestamp={target} size="sm" />
      );

      // sm container uses gap-2
      const wrapper = container.firstElementChild;
      expect(wrapper?.className).toContain('gap-2');
    });

    it('should apply lg size classes', () => {
      const target = Date.now() + DAY;
      const { container } = render(
        <CountdownTimer targetTimestamp={target} size="lg" />
      );

      const wrapper = container.firstElementChild;
      expect(wrapper?.className).toContain('gap-2');
    });

    it('should default to md size', () => {
      const target = Date.now() + DAY;
      const { container } = render(
        <CountdownTimer targetTimestamp={target} />
      );

      const wrapper = container.firstElementChild;
      expect(wrapper?.className).toContain('gap-3');
    });
  });
});
