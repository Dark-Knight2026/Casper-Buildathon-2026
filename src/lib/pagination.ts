/**
 * Pagination Utilities
 * Provides cursor-based and offset-based pagination for efficient data fetching
 */

import type { PaginatedResponse } from '@/types/listingContract';

export interface PaginationParams {
  page?: number;
  limit?: number;
  cursor?: string;
}

export interface PaginationResult<T> {
  data: T[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    nextCursor?: string;
    previousCursor?: string;
  };
}

export interface CursorPaginationResult<T> {
  data: T[];
  nextCursor: string | null;
  hasMore: boolean;
}

/**
 * Default pagination settings
 */
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

/**
 * Fetches every item across all pages of a `PaginatedResponse` endpoint. Use for
 * aggregates that must see ALL rows (dashboard KPIs, counts), where reading only
 * the first page would silently undercount. Page 1 is fetched first to learn
 * `pageCount`; the remaining pages are then fetched in parallel. `pageSize` is
 * capped at `MAX_PAGE_SIZE` to keep the round-trip count low.
 */
export async function fetchAllPages<T>(
  fetchPage: (page: number, pageSize: number) => Promise<PaginatedResponse<T>>,
  pageSize: number = MAX_PAGE_SIZE
): Promise<T[]> {
  const size = Math.min(pageSize, MAX_PAGE_SIZE);
  const first = await fetchPage(1, size);
  if (first.pageCount <= 1) return first.data;

  const rest = await Promise.all(
    Array.from({ length: first.pageCount - 1 }, (_, i) =>
      fetchPage(i + 2, size)
    )
  );
  return rest.reduce((all, page) => all.concat(page.data), [...first.data]);
}

/**
 * Validate and normalize pagination parameters
 */
export function normalizePaginationParams(params: PaginationParams): {
  page: number;
  limit: number;
  offset: number;
} {
  const page = Math.max(1, params.page || 1);
  const limit = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, params.limit || DEFAULT_PAGE_SIZE)
  );
  const offset = (page - 1) * limit;

  return { page, limit, offset };
}

/**
 * Calculate pagination metadata
 */
export function calculatePaginationMetadata(
  totalItems: number,
  page: number,
  limit: number
): PaginationResult<never>['pagination'] {
  const totalPages = Math.ceil(totalItems / limit);
  const hasNextPage = page < totalPages;
  const hasPreviousPage = page > 1;

  return {
    currentPage: page,
    totalPages,
    totalItems,
    hasNextPage,
    hasPreviousPage,
  };
}

/**
 * Create cursor from item ID and timestamp
 */
export function createCursor(id: string, timestamp: Date | string): string {
  const ts =
    typeof timestamp === 'string' ? timestamp : timestamp.toISOString();
  return Buffer.from(`${id}:${ts}`).toString('base64');
}

/**
 * Parse cursor to extract ID and timestamp
 */
export function parseCursor(
  cursor: string
): { id: string; timestamp: string } | null {
  try {
    const decoded = Buffer.from(cursor, 'base64').toString('utf-8');
    const [id, timestamp] = decoded.split(':');

    if (!id || !timestamp) {
      return null;
    }

    return { id, timestamp };
  } catch {
    return null;
  }
}

/**
 * Generate page numbers for pagination UI
 */
export function generatePageNumbers(
  currentPage: number,
  totalPages: number,
  maxVisible: number = 5
): (number | '...')[] {
  if (totalPages <= maxVisible) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const pages: (number | '...')[] = [];
  const halfVisible = Math.floor(maxVisible / 2);

  // Always show first page
  pages.push(1);

  let startPage = Math.max(2, currentPage - halfVisible);
  let endPage = Math.min(totalPages - 1, currentPage + halfVisible);

  // Adjust if we're near the start
  if (currentPage <= halfVisible + 1) {
    endPage = maxVisible - 1;
  }

  // Adjust if we're near the end
  if (currentPage >= totalPages - halfVisible) {
    startPage = totalPages - maxVisible + 2;
  }

  // Add ellipsis after first page if needed
  if (startPage > 2) {
    pages.push('...');
  }

  // Add middle pages
  for (let i = startPage; i <= endPage; i++) {
    pages.push(i);
  }

  // Add ellipsis before last page if needed
  if (endPage < totalPages - 1) {
    pages.push('...');
  }

  // Always show last page
  if (totalPages > 1) {
    pages.push(totalPages);
  }

  return pages;
}
