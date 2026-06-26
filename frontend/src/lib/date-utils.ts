/**
 * Date Utilities
 * Comprehensive date handling with timezone support and validation
 */

import { logger } from '@/utils/logger';

/**
 * Check if date is valid
 */
export function isValidDate(date: Date | string | null | undefined): boolean {
  if (!date) return false;
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj instanceof Date && !isNaN(dateObj.getTime());
}

/**
 * Parse date safely
 */
export function parseDate(date: Date | string | null | undefined): Date | null {
  if (!date) return null;
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;

  if (!isValidDate(dateObj)) {
    return null;
  }

  return dateObj;
}

/**
 * Format date with fallback
 */
export function formatDate(
  date: Date | string | null | undefined,
  options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }
): string {
  const dateObj = parseDate(date);
  if (!dateObj) {
    return 'Invalid date';
  }

  try {
    return new Intl.DateTimeFormat('en-US', options).format(dateObj);
  } catch (error) {
    logger.error('Error formatting date:', error);
    return 'Invalid date';
  }
}

/**
 * Format date with time
 */
export function formatDateTime(date: Date | string | null | undefined): string {
  return formatDate(date, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Format date as ISO string
 */
export function formatISODate(date: Date | string | null | undefined): string {
  const dateObj = parseDate(date);
  if (!dateObj) {
    return '';
  }
  return dateObj.toISOString();
}

/**
 * Get relative time (e.g., "2 days ago")
 */
export function getRelativeTime(date: Date | string | null | undefined): string {
  const dateObj = parseDate(date);
  if (!dateObj) {
    return 'Invalid date';
  }

  const now = new Date();
  const diffMs = now.getTime() - dateObj.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  const diffMonth = Math.floor(diffDay / 30);
  const diffYear = Math.floor(diffDay / 365);

  if (diffSec < 60) {
    return 'just now';
  } else if (diffMin < 60) {
    return `${diffMin} minute${diffMin !== 1 ? 's' : ''} ago`;
  } else if (diffHour < 24) {
    return `${diffHour} hour${diffHour !== 1 ? 's' : ''} ago`;
  } else if (diffDay < 30) {
    return `${diffDay} day${diffDay !== 1 ? 's' : ''} ago`;
  } else if (diffMonth < 12) {
    return `${diffMonth} month${diffMonth !== 1 ? 's' : ''} ago`;
  } else {
    return `${diffYear} year${diffYear !== 1 ? 's' : ''} ago`;
  }
}

/**
 * Check if date is in the past
 */
export function isPastDate(date: Date | string | null | undefined): boolean {
  const dateObj = parseDate(date);
  if (!dateObj) {
    return false;
  }
  return dateObj.getTime() < Date.now();
}

/**
 * Check if date is in the future
 */
export function isFutureDate(date: Date | string | null | undefined): boolean {
  const dateObj = parseDate(date);
  if (!dateObj) {
    return false;
  }
  return dateObj.getTime() > Date.now();
}

/**
 * Whole days remaining until `endDate`. Rounds up so partial days count as
 * a remaining day (e.g. 12 h left → 1, not 0). Negative if the date is past.
 */
export function daysUntil(endDate: Date): number {
  return Math.ceil((endDate.getTime() - Date.now()) / 86400000);
}

/**
 * Check if date is today
 */
export function isToday(date: Date | string | null | undefined): boolean {
  const dateObj = parseDate(date);
  if (!dateObj) {
    return false;
  }

  const today = new Date();
  return (
    dateObj.getDate() === today.getDate() &&
    dateObj.getMonth() === today.getMonth() &&
    dateObj.getFullYear() === today.getFullYear()
  );
}

/**
 * Add days to date
 */
export function addDays(date: Date | string, days: number): Date {
  const dateObj = parseDate(date);
  if (!dateObj) {
    throw new Error('Invalid date');
  }

  const result = new Date(dateObj);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Add months to date
 */
export function addMonths(date: Date | string, months: number): Date {
  const dateObj = parseDate(date);
  if (!dateObj) {
    throw new Error('Invalid date');
  }

  const result = new Date(dateObj);
  result.setMonth(result.getMonth() + months);
  return result;
}

/**
 * Get days between two dates
 */
export function getDaysBetween(
  startDate: Date | string | null | undefined,
  endDate: Date | string | null | undefined
): number {
  const start = parseDate(startDate);
  const end = parseDate(endDate);

  if (!start || !end) {
    return 0;
  }

  const diffMs = end.getTime() - start.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Get months between two dates
 */
export function getMonthsBetween(
  startDate: Date | string | null | undefined,
  endDate: Date | string | null | undefined
): number {
  const start = parseDate(startDate);
  const end = parseDate(endDate);

  if (!start || !end) {
    return 0;
  }

  const yearDiff = end.getFullYear() - start.getFullYear();
  const monthDiff = end.getMonth() - start.getMonth();
  return yearDiff * 12 + monthDiff;
}

/**
 * Check if date range is valid
 */
export function isValidDateRange(
  startDate: Date | string | null | undefined,
  endDate: Date | string | null | undefined
): boolean {
  const start = parseDate(startDate);
  const end = parseDate(endDate);

  if (!start || !end) {
    return false;
  }

  return end.getTime() > start.getTime();
}

/**
 * Get start of day
 */
export function getStartOfDay(date: Date | string | null | undefined): Date | null {
  const dateObj = parseDate(date);
  if (!dateObj) {
    return null;
  }

  const result = new Date(dateObj);
  result.setHours(0, 0, 0, 0);
  return result;
}

/**
 * Get end of day
 */
export function getEndOfDay(date: Date | string | null | undefined): Date | null {
  const dateObj = parseDate(date);
  if (!dateObj) {
    return null;
  }

  const result = new Date(dateObj);
  result.setHours(23, 59, 59, 999);
  return result;
}

/**
 * Handle leap year
 */
export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/**
 * Get days in month
 */
export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

/**
 * Convert to user's timezone
 */
export function toUserTimezone(date: Date | string | null | undefined): Date | null {
  const dateObj = parseDate(date);
  if (!dateObj) {
    return null;
  }

  // Get user's timezone offset
  const offset = new Date().getTimezoneOffset();
  const userDate = new Date(dateObj.getTime() - offset * 60 * 1000);
  return userDate;
}

/**
 * Convert to UTC
 */
export function toUTC(date: Date | string | null | undefined): Date | null {
  const dateObj = parseDate(date);
  if (!dateObj) {
    return null;
  }

  return new Date(dateObj.toISOString());
}

/**
 * Format date for input field
 */
export function formatDateForInput(date: Date | string | null | undefined): string {
  const dateObj = parseDate(date);
  if (!dateObj) {
    return '';
  }

  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parse date from input field
 */
export function parseDateFromInput(value: string): Date | null {
  if (!value) return null;

  const date = new Date(value);
  if (!isValidDate(date)) {
    return null;
  }

  return date;
}