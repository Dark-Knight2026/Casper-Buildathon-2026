import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
} from '@/components/ui/pagination';

interface TablePaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

function getPageNumbers(currentPage: number, totalPages: number): number[] {
  if (totalPages <= 5) return Array.from({ length: totalPages }, (_, i) => i + 1);
  if (currentPage <= 3) return [1, 2, 3, 4, 5];
  if (currentPage >= totalPages - 2) return [totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
  return [currentPage - 2, currentPage - 1, currentPage, currentPage + 1, currentPage + 2];
}

export function TablePagination({ currentPage, totalPages, onPageChange, className }: TablePaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <Pagination className={className}>
      <PaginationContent>
        <PaginationItem>
          <PaginationLink
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            className={cn(
              'cursor-pointer min-h-0 min-w-0 text-[hsl(var(--ico-text-secondary))]! hover:text-[hsl(var(--ico-text-primary))]!',
              currentPage === 1 && 'pointer-events-none opacity-50',
            )}
            aria-label="Go to previous page"
          >
            <ChevronLeft className="h-4 w-4" />
          </PaginationLink>
        </PaginationItem>

        {getPageNumbers(currentPage, totalPages).map((p) => (
          <PaginationItem key={p}>
            <button
              type="button"
              onClick={() => onPageChange(p)}
              className={cn(
                'inline-flex items-center justify-center size-8 min-h-0 min-w-0 text-sm font-medium cursor-pointer rounded-full transition-colors',
                p === currentPage
                  ? 'text-[hsl(var(--ico-brand-primary))]! border border-[hsl(var(--ico-border-color))]!'
                  : 'text-[hsl(var(--ico-text-secondary))]! hover:text-[hsl(var(--ico-text-primary))]!',
              )}
              data-active={p === currentPage ? '' : undefined}
              aria-current={p === currentPage ? 'page' : undefined}
            >
              {p}
            </button>
          </PaginationItem>
        ))}

        <PaginationItem>
          <PaginationLink
            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
            className={cn(
              'cursor-pointer min-h-0 min-w-0 text-[hsl(var(--ico-text-secondary))]! hover:text-[hsl(var(--ico-text-primary))]!',
              currentPage === totalPages && 'pointer-events-none opacity-50',
            )}
            aria-label="Go to next page"
          >
            <ChevronRight className="h-4 w-4" />
          </PaginationLink>
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}

export default TablePagination;
