import { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import type { CountdownTime } from '@/types/ico';
import { Card } from './Card';

interface CountdownTimerProps {
  targetTimestamp: number;
  onExpire?: () => void;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'compact' | 'minimal';
  showLabels?: boolean;
  className?: string;
}

const calculateTimeLeft = (targetTimestamp: number): CountdownTime => {
  const now = Date.now();
  const difference = targetTimestamp - now;

  if (difference <= 0) {
    return {
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      isExpired: true,
    };
  }

  return {
    days: Math.floor(difference / (1000 * 60 * 60 * 24)),
    hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((difference / (1000 * 60)) % 60),
    seconds: Math.floor((difference / 1000) % 60),
    isExpired: false,
  };
};

export function CountdownTimer({
  targetTimestamp,
  onExpire,
  size = 'md',
  variant = 'default',
  showLabels = true,
  className,
}: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState<CountdownTime>(() =>
    calculateTimeLeft(targetTimestamp)
  );

  const handleExpire = useCallback(() => {
    onExpire?.();
  }, [onExpire]);

  useEffect(() => {
    const timer = setInterval(() => {
      const newTime = calculateTimeLeft(targetTimestamp);
      setTimeLeft(newTime);

      if (newTime.isExpired) {
        clearInterval(timer);
        handleExpire();
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [targetTimestamp, handleExpire]);

  const formatNumber = (num: number): string => {
    return num.toString().padStart(2, '0');
  };

  const sizeClasses = {
    sm: {
      container: 'gap-2',
      card: 'w-14 h-16 md:w-16 md:h-18',
      digit: 'text-xl md:text-2xl',
      label: 'text-[10px] md:text-xs',
      separator: 'text-xl md:text-2xl',
    },
    md: {
      container: 'gap-3',
      card: 'w-20 h-20 md:w-20 md:h-24',
      digit: 'text-3xl md:text-4xl',
      label: 'text-xs md:text-sm',
      separator: 'text-3xl md:text-4xl',
    },
    lg: {
      container: 'gap-2 md:gap-6',
      card: 'w-24 h-24 md:w-36 md:h-36',
      digit: 'text-2xl md:text-5xl lg:text-6xl',
      label: 'text-sm',
      separator: 'text-4xl md:text-5xl lg:text-6xl',
    },
  };

  const classes = sizeClasses[size];

  if (variant === 'minimal') {
    return (
      <span className={cn('font-mono font-semibold', className)}>
        {timeLeft.days > 0 && `${timeLeft.days}d `}
        {formatNumber(timeLeft.hours)}:{formatNumber(timeLeft.minutes)}:
        {formatNumber(timeLeft.seconds)}
      </span>
    );
  }

  if (variant === 'compact') {
    return (
      <Card className='p-4 flex justify-center items-center'>
        <div className={cn('flex items-center justify-center gap-2 font-mono text-white', className)}>
          {timeLeft.days > 0 && (
            <>
              <span className="text-xl font-semibold">{timeLeft.days}</span>
              <span className="text-[hsl(var(--ico-timer-label))]">Days</span>
            </>
          )}
          <div className='text-xl flex gap-1'>
            <span className="font-semibold">{formatNumber(timeLeft.hours)}</span>
            <span className="text-[hsl(var(--ico-timer-label))]">:</span>
            <span className="font-semibold">{formatNumber(timeLeft.minutes)}</span>
            <span className="text-[hsl(var(--ico-timer-label))]">:</span>
            <span className="font-semibold">{formatNumber(timeLeft.seconds)}</span>
          </div>
        </div>
      </Card>
    );
  }

  // Default variant
  const timeUnits = [
    { value: timeLeft.days, label: 'Days' },
    { value: timeLeft.hours, label: 'Hours' },
    { value: timeLeft.minutes, label: 'Minutes' },
    { value: timeLeft.seconds, label: 'Seconds' },
  ];

  return (
    <div className={cn('flex items-center justify-center', classes.container, className)}>
      {timeUnits.map((unit) => (
        <div key={unit.label} className="flex items-center">
          <Card className={classes.card}>
            <span
              className={cn(
                'relative font-mono font-bold text-white',
                classes.digit
              )}
            >
              {formatNumber(unit.value)}
            </span>
            {showLabels && (
              <span
                className={cn(
                  'relative uppercase tracking-wider font-medium text-white/70',
                  classes.label
                )}
              >
                {unit.label}
              </span>
            )}
          </Card>
        </div>
      ))}
    </div>
  );
}

export default CountdownTimer;
