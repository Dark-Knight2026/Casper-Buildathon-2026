/**
 * Validation Utilities
 * Comprehensive validation functions for forms, inputs, and data sanitization
 */

import { z } from 'zod';
import DOMPurify from 'dompurify';

// ============================================================================
// Schema Definitions
// ============================================================================

export const emailSchema = z.string().email('Invalid email format');

export const phoneSchema = z
  .string()
  .regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format')
  .or(z.string().regex(/^\(\d{3}\)\s?\d{3}-\d{4}$/, 'Invalid phone number format'));

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');

export const currencySchema = z
  .number()
  .positive('Amount must be positive')
  .max(1000000000, 'Amount exceeds maximum allowed value');

export const dateSchema = z.coerce.date();

export const dateRangeSchema = z
  .object({
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
  })
  .refine((data) => data.endDate > data.startDate, {
    message: 'End date must be after start date',
    path: ['endDate'],
  });

export const futureDateSchema = z.coerce.date().refine(
  (date) => date > new Date(),
  'Date must be in the future'
);

export const pastDateSchema = z.coerce.date().refine(
  (date) => date < new Date(),
  'Date must be in the past'
);

export const urlSchema = z.string().url('Invalid URL format');

export const fileSchema = z.object({
  name: z.string().min(1, 'File name is required'),
  size: z.number().max(10 * 1024 * 1024, 'File size must be less than 10MB'),
  type: z.string().refine(
    (type) =>
      [
        'application/pdf',
        'image/jpeg',
        'image/png',
        'image/gif',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ].includes(type),
    'Invalid file type. Allowed: PDF, JPEG, PNG, GIF, DOC, DOCX'
  ),
});

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Validate email format
 */
export function validateEmail(email: string): { valid: boolean; error?: string } {
  try {
    emailSchema.parse(email);
    return { valid: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { valid: false, error: error.errors[0].message };
    }
    return { valid: false, error: 'Invalid email' };
  }
}

/**
 * Validate phone number format
 */
export function validatePhone(phone: string): { valid: boolean; error?: string } {
  try {
    phoneSchema.parse(phone);
    return { valid: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { valid: false, error: error.errors[0].message };
    }
    return { valid: false, error: 'Invalid phone number' };
  }
}

/**
 * Validate password strength
 */
export function validatePassword(password: string): {
  valid: boolean;
  error?: string;
  strength: 'weak' | 'medium' | 'strong';
} {
  try {
    passwordSchema.parse(password);
    
    // Calculate strength
    let strength: 'weak' | 'medium' | 'strong' = 'weak';
    if (password.length >= 12) {
      strength = 'strong';
    } else if (password.length >= 10) {
      strength = 'medium';
    }
    
    return { valid: true, strength };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { valid: false, error: error.errors[0].message, strength: 'weak' };
    }
    return { valid: false, error: 'Invalid password', strength: 'weak' };
  }
}

/**
 * Validate currency amount
 */
export function validateCurrency(amount: number): { valid: boolean; error?: string } {
  try {
    currencySchema.parse(amount);
    return { valid: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { valid: false, error: error.errors[0].message };
    }
    return { valid: false, error: 'Invalid amount' };
  }
}

/**
 * Validate date range
 */
export function validateDateRange(
  startDate: Date | string,
  endDate: Date | string
): { valid: boolean; error?: string } {
  try {
    dateRangeSchema.parse({
      startDate: typeof startDate === 'string' ? new Date(startDate) : startDate,
      endDate: typeof endDate === 'string' ? new Date(endDate) : endDate,
    });
    return { valid: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { valid: false, error: error.errors[0].message };
    }
    return { valid: false, error: 'Invalid date range' };
  }
}

/**
 * Validate file upload
 */
export function validateFile(file: File): { valid: boolean; error?: string } {
  try {
    fileSchema.parse({
      name: file.name,
      size: file.size,
      type: file.type,
    });
    return { valid: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { valid: false, error: error.errors[0].message };
    }
    return { valid: false, error: 'Invalid file' };
  }
}

// ============================================================================
// Sanitization Functions
// ============================================================================

/**
 * Sanitize HTML content to prevent XSS attacks
 */
export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br'],
    ALLOWED_ATTR: ['href', 'target'],
  });
}

/**
 * Sanitize plain text input
 */
export function sanitizeText(text: string): string {
  return text
    .trim()
    .replace(/[<>]/g, '') // Remove < and >
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, ''); // Remove event handlers
}

/**
 * Sanitize search query
 */
export function sanitizeSearchQuery(query: string): string {
  return query
    .trim()
    .replace(/[<>'"]/g, '') // Remove potentially dangerous characters
    .slice(0, 200); // Limit length
}

/**
 * Sanitize file name
 */
export function sanitizeFileName(fileName: string): string {
  return fileName
    .replace(/[^a-zA-Z0-9._-]/g, '_') // Replace special chars with underscore
    .replace(/\.{2,}/g, '.') // Replace multiple dots with single dot
    .slice(0, 255); // Limit length
}

// ============================================================================
// Null/Undefined Handling Utilities
// ============================================================================

/**
 * Safe property access with default value
 */
export function safeGet<T>(obj: Record<string, unknown> | null | undefined, path: string, defaultValue: T): T {
  try {
    if (!obj) return defaultValue;
    
    const keys = path.split('.');
    let result: unknown = obj;
    
    for (const key of keys) {
      if (result === null || result === undefined) {
        return defaultValue;
      }
      result = (result as Record<string, unknown>)[key];
    }
    
    return result !== undefined && result !== null ? (result as T) : defaultValue;
  } catch {
    return defaultValue;
  }
}

/**
 * Check if value is null or undefined
 */
export function isNullOrUndefined(value: unknown): value is null | undefined {
  return value === null || value === undefined;
}

/**
 * Provide default value if null/undefined
 */
export function withDefault<T>(value: T | null | undefined, defaultValue: T): T {
  return isNullOrUndefined(value) ? defaultValue : value;
}

// ============================================================================
// Format Validation
// ============================================================================

/**
 * Validate and format phone number
 */
export function formatPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  
  if (cleaned.length === 11 && cleaned[0] === '1') {
    return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
  }
  
  return phone;
}

/**
 * Validate and format currency
 */
export function formatCurrency(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount);
}

/**
 * Validate and format date
 */
export function formatDate(date: Date | string, format: 'short' | 'long' | 'iso' = 'short'): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(dateObj.getTime())) {
    return 'Invalid date';
  }
  
  switch (format) {
    case 'short':
      return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      }).format(dateObj);
    case 'long':
      return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(dateObj);
    case 'iso':
      return dateObj.toISOString();
    default:
      return dateObj.toLocaleDateString();
  }
}

// ============================================================================
// Character Limit Utilities
// ============================================================================

/**
 * Truncate text to specified length
 */
export function truncateText(text: string, maxLength: number, suffix = '...'): string {
  if (text.length <= maxLength) {
    return text;
  }
  return text.slice(0, maxLength - suffix.length) + suffix;
}

/**
 * Get remaining characters
 */
export function getRemainingChars(text: string, maxLength: number): number {
  return Math.max(0, maxLength - text.length);
}

/**
 * Check if text exceeds limit
 */
export function exceedsLimit(text: string, maxLength: number): boolean {
  return text.length > maxLength;
}

// ============================================================================
// Retry Logic Utilities
// ============================================================================

export interface RetryOptions {
  maxAttempts?: number;
  delayMs?: number;
  backoff?: boolean;
  onRetry?: (attempt: number, error: Error) => void;
}

/**
 * Retry async function with exponential backoff
 */
export async function retryAsync<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    delayMs = 1000,
    backoff = true,
    onRetry,
  } = options;

  let lastError: Error;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Do not retry permanent client errors — retrying 401/403/404/422 wastes
      // quota and risks duplicate mutations on POST/PUT. 408 (timeout) and 5xx
      // are intentionally excluded and remain retryable.
      const NON_RETRYABLE_STATUSES = new Set([400, 401, 403, 404, 409, 410, 422]);
      if ('statusCode' in lastError && NON_RETRYABLE_STATUSES.has((lastError as { statusCode: number }).statusCode)) {
        throw lastError;
      }

      if (attempt === maxAttempts) {
        throw lastError;
      }

      if (onRetry) {
        onRetry(attempt, lastError);
      }

      const delay = backoff ? delayMs * Math.pow(2, attempt - 1) : delayMs;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}

// ============================================================================
// Error Message Utilities
// ============================================================================

/**
 * Get user-friendly error message
 */
export function getUserFriendlyError(error: unknown): string {
  if (error instanceof z.ZodError) {
    return error.errors[0].message;
  }

  if (error instanceof Error) {
    // Map common error messages to user-friendly versions
    const errorMap: Record<string, string> = {
      'Network request failed': 'Unable to connect. Please check your internet connection.',
      'Failed to fetch': 'Unable to load data. Please try again.',
      'Unauthorized': 'Your session has expired. Please log in again.',
      'Forbidden': 'You do not have permission to perform this action.',
      'Not Found': 'The requested resource was not found.',
      'Internal Server Error': 'Something went wrong on our end. Please try again later.',
    };

    for (const [key, value] of Object.entries(errorMap)) {
      if (error.message.includes(key)) {
        return value;
      }
    }

    return error.message;
  }

  return 'An unexpected error occurred. Please try again.';
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Check if error is a network error
 */
export function isNetworkError(error: unknown): boolean {
  if (error instanceof Error) {
    return (
      error.message.includes('Network') ||
      error.message.includes('fetch') ||
      error.message.includes('timeout')
    );
  }
  return false;
}

/**
 * Check if error is an authentication error
 */
export function isAuthError(error: unknown): boolean {
  if (error instanceof Error) {
    return (
      error.message.includes('Unauthorized') ||
      error.message.includes('Authentication') ||
      error.message.includes('session')
    );
  }
  
  // Check for Supabase auth errors
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = String((error as { message: unknown }).message);
    return (
      message.includes('Unauthorized') ||
      message.includes('Authentication') ||
      message.includes('session')
    );
  }
  
  return false;
}

/**
 * Check if error is a validation error
 */
export function isValidationError(error: unknown): boolean {
  return error instanceof z.ZodError;
}