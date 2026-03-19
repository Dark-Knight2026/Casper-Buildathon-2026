import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { TransactionStatusToast } from '@/pages/ico/components/shared/TransactionStatusToast';

const defaultProps = {
  isVisible: true,
  onClose: vi.fn(),
  step: 'confirmed' as const,
  txHash: '0x1234567890abcdef1234567890abcdef12345678',
  tokensReceived: '1,000,000',
  error: null,
  tokenSymbol: 'BIG',
};

describe('TransactionStatusToast', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('visibility', () => {
    it('should render when isVisible is true', () => {
      render(<TransactionStatusToast {...defaultProps} />);

      expect(screen.getByText('Purchase Successful!')).toBeInTheDocument();
    });

    it('should not render when isVisible is false', () => {
      render(<TransactionStatusToast {...defaultProps} isVisible={false} />);

      expect(screen.queryByText('Purchase Successful!')).not.toBeInTheDocument();
    });
  });

  describe('success state', () => {
    it('should display success title', () => {
      render(<TransactionStatusToast {...defaultProps} />);

      expect(screen.getByText('Purchase Successful!')).toBeInTheDocument();
    });

    it('should display tokens received', () => {
      render(<TransactionStatusToast {...defaultProps} />);

      expect(screen.getByText('1,000,000 BIG')).toBeInTheDocument();
    });

    it('should display truncated transaction hash', () => {
      render(<TransactionStatusToast {...defaultProps} />);

      expect(screen.getByText('0x12345678...345678')).toBeInTheDocument();
    });

    it('should auto-close after delay', () => {
      const onClose = vi.fn();
      render(
        <TransactionStatusToast {...defaultProps} onClose={onClose} autoCloseDelay={5000} />
      );

      expect(onClose).not.toHaveBeenCalled();

      act(() => {
        vi.advanceTimersByTime(5000);
      });

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('should use default 8s auto-close delay', () => {
      const onClose = vi.fn();
      render(<TransactionStatusToast {...defaultProps} onClose={onClose} />);

      act(() => {
        vi.advanceTimersByTime(7999);
      });

      expect(onClose).not.toHaveBeenCalled();

      act(() => {
        vi.advanceTimersByTime(1);
      });

      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('failed state', () => {
    const failedProps = {
      ...defaultProps,
      step: 'failed' as const,
      txHash: null,
      tokensReceived: null,
      error: 'Insufficient balance',
    };

    it('should display failure title', () => {
      render(<TransactionStatusToast {...failedProps} />);

      expect(screen.getByText('Purchase Failed')).toBeInTheDocument();
    });

    it('should display error message', () => {
      render(<TransactionStatusToast {...failedProps} />);

      expect(screen.getByText('Insufficient balance')).toBeInTheDocument();
    });

    it('should not auto-close on failure', () => {
      const onClose = vi.fn();
      render(<TransactionStatusToast {...failedProps} onClose={onClose} />);

      act(() => {
        vi.advanceTimersByTime(10000);
      });

      expect(onClose).not.toHaveBeenCalled();
    });
  });

  describe('processing state', () => {
    const processingProps = {
      ...defaultProps,
      step: 'submitting-purchase' as const,
      txHash: null,
      tokensReceived: null,
    };

    it('should display processing title', () => {
      render(<TransactionStatusToast {...processingProps} />);

      expect(screen.getByText('Processing...')).toBeInTheDocument();
    });

    it('should not auto-close while processing', () => {
      const onClose = vi.fn();
      render(<TransactionStatusToast {...processingProps} onClose={onClose} />);

      act(() => {
        vi.advanceTimersByTime(10000);
      });

      expect(onClose).not.toHaveBeenCalled();
    });
  });

  describe('close button', () => {
    it('should call onClose when close button clicked', () => {
      const onClose = vi.fn();
      render(<TransactionStatusToast {...defaultProps} onClose={onClose} />);

      fireEvent.click(screen.getByLabelText('Close notification'));

      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('transaction hash link', () => {
    it('should render explorer link when txHash is provided', () => {
      render(<TransactionStatusToast {...defaultProps} />);

      const link = screen.getByText('0x12345678...345678').closest('a');
      expect(link).toHaveAttribute('href', expect.stringContaining('/deploy/0x1234567890abcdef'));
      expect(link).toHaveAttribute('target', '_blank');
    });

    it('should not render link when txHash is null', () => {
      render(<TransactionStatusToast {...defaultProps} txHash={null} />);

      expect(screen.queryByRole('link')).not.toBeInTheDocument();
    });
  });
});
