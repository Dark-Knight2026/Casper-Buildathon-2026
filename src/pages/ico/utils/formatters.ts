/**
 * Shared formatting utilities for ICO components
 */

/**
 * Formats a number with locale-specific thousand separators
 */
export const formatNumber = (value: string | number, precision = 2): string => {
  return Number(value).toLocaleString(undefined, {
    minimumFractionDigits: precision,
    maximumFractionDigits: precision,
  });
};

/**
 * Formats a number as USD currency with 2 decimal places
 */
export const formatUSD = (value: string | number): string => {
  return `$${Number(value).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

/**
 * Formats a timestamp as a date string (e.g., "Jan 15, 2024")
 */
export const formatDate = (timestamp: number): string => {
  return new Date(timestamp).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

/**
 * Formats a Date object as a date-time string (e.g., "Jan 15, 10:30 AM")
 */
export const formatDateTime = (date: Date): string => {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};
