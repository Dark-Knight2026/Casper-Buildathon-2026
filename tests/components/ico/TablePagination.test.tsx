import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TablePagination } from '@/pages/ico/components/shared/TablePagination';

// Mock shadcn Pagination UI — render minimal semantic HTML so tests remain stable
vi.mock('@/components/ui/pagination', () => ({
  Pagination: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <nav data-testid="pagination" className={className}>
      {children}
    </nav>
  ),
  PaginationContent: ({ children }: { children: React.ReactNode }) => (
    <ul>{children}</ul>
  ),
  PaginationItem: ({ children }: { children: React.ReactNode }) => (
    <li>{children}</li>
  ),
  PaginationLink: ({
    children,
    onClick,
    className,
    'aria-label': ariaLabel,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    className?: string;
    'aria-label'?: string;
  }) => (
    <button
      data-testid={ariaLabel}
      onClick={onClick}
      className={className}
      type="button"
    >
      {children}
    </button>
  ),
}));

describe('TablePagination', () => {
  // --- Visibility ---

  describe('visibility', () => {
    it('should render null when totalPages is 1', () => {
      const { container } = render(
        <TablePagination currentPage={1} totalPages={1} onPageChange={vi.fn()} />
      );
      expect(container.firstChild).toBeNull();
    });

    it('should render null when totalPages is 0', () => {
      const { container } = render(
        <TablePagination currentPage={1} totalPages={0} onPageChange={vi.fn()} />
      );
      expect(container.firstChild).toBeNull();
    });

    it('should render when totalPages > 1', () => {
      render(
        <TablePagination currentPage={1} totalPages={3} onPageChange={vi.fn()} />
      );
      expect(screen.getByTestId('pagination')).toBeInTheDocument();
    });
  });

  // --- Page numbers ---

  describe('page numbers', () => {
    it('should render all pages when totalPages <= 5', () => {
      render(
        <TablePagination currentPage={1} totalPages={4} onPageChange={vi.fn()} />
      );
      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
      expect(screen.getByText('4')).toBeInTheDocument();
    });

    it('should show pages 1-5 when on page 1 of many', () => {
      render(
        <TablePagination currentPage={1} totalPages={20} onPageChange={vi.fn()} />
      );
      for (let p = 1; p <= 5; p++) {
        expect(screen.getByText(String(p))).toBeInTheDocument();
      }
      expect(screen.queryByText('6')).not.toBeInTheDocument();
    });

    it('should show last 5 pages when on the last page', () => {
      render(
        <TablePagination currentPage={20} totalPages={20} onPageChange={vi.fn()} />
      );
      for (let p = 16; p <= 20; p++) {
        expect(screen.getByText(String(p))).toBeInTheDocument();
      }
      expect(screen.queryByText('15')).not.toBeInTheDocument();
    });

    it('should show current page with data-active attribute', () => {
      render(
        <TablePagination currentPage={3} totalPages={10} onPageChange={vi.fn()} />
      );
      // Page 3 button is the active one
      const buttons = screen.getAllByRole('button');
      const activeBtn = buttons.find((btn) => btn.getAttribute('data-active') === '');
      expect(activeBtn).toHaveTextContent('3');
    });

    it('should not mark non-current pages as active', () => {
      render(
        <TablePagination currentPage={3} totalPages={10} onPageChange={vi.fn()} />
      );
      const page2Btn = screen.getByText('2').closest('button[type="button"]');
      expect(page2Btn).not.toHaveAttribute('data-active');
    });
  });

  // --- Navigation ---

  describe('navigation', () => {
    it('should call onPageChange with clicked page number', () => {
      const onPageChange = vi.fn();
      render(
        <TablePagination currentPage={1} totalPages={5} onPageChange={onPageChange} />
      );
      fireEvent.click(screen.getByText('3'));
      expect(onPageChange).toHaveBeenCalledWith(3);
    });

    it('should call onPageChange with previous page on prev click', () => {
      const onPageChange = vi.fn();
      render(
        <TablePagination currentPage={3} totalPages={5} onPageChange={onPageChange} />
      );
      fireEvent.click(screen.getByTestId('Go to previous page'));
      expect(onPageChange).toHaveBeenCalledWith(2);
    });

    it('should call onPageChange with next page on next click', () => {
      const onPageChange = vi.fn();
      render(
        <TablePagination currentPage={3} totalPages={5} onPageChange={onPageChange} />
      );
      fireEvent.click(screen.getByTestId('Go to next page'));
      expect(onPageChange).toHaveBeenCalledWith(4);
    });

    it('should clamp to page 1 when prev is clicked on first page', () => {
      const onPageChange = vi.fn();
      render(
        <TablePagination currentPage={1} totalPages={5} onPageChange={onPageChange} />
      );
      fireEvent.click(screen.getByTestId('Go to previous page'));
      expect(onPageChange).toHaveBeenCalledWith(1);
    });

    it('should clamp to totalPages when next is clicked on last page', () => {
      const onPageChange = vi.fn();
      render(
        <TablePagination currentPage={5} totalPages={5} onPageChange={onPageChange} />
      );
      fireEvent.click(screen.getByTestId('Go to next page'));
      expect(onPageChange).toHaveBeenCalledWith(5);
    });
  });

  // --- Custom className ---

  describe('custom className', () => {
    it('should pass className to the Pagination root', () => {
      render(
        <TablePagination
          currentPage={1}
          totalPages={3}
          onPageChange={vi.fn()}
          className="custom-pagination"
        />
      );
      expect(screen.getByTestId('pagination')).toHaveClass('custom-pagination');
    });
  });
});
