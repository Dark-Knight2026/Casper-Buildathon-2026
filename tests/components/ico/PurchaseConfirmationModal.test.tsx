import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PurchaseConfirmationModal } from '@/pages/ico/components/shared/PurchaseConfirmationModal';
import type { PurchaseState } from '@/hooks/ico/usePurchaseToken';

const idleState: PurchaseState = {
  step: 'idle',
  approvalTxHash: null,
  purchaseTxHash: null,
  tokensReceived: null,
  error: null,
  isProcessing: false,
};

const processingState: PurchaseState = {
  step: 'submitting-purchase',
  approvalTxHash: null,
  purchaseTxHash: null,
  tokensReceived: null,
  error: null,
  isProcessing: true,
};

const confirmedState: PurchaseState = {
  step: 'confirmed',
  approvalTxHash: null,
  purchaseTxHash: '0xabc123def456',
  tokensReceived: '1000000',
  error: null,
  isProcessing: false,
};

const failedState: PurchaseState = {
  step: 'failed',
  approvalTxHash: null,
  purchaseTxHash: null,
  tokensReceived: null,
  error: 'Insufficient balance',
  isProcessing: false,
};

const defaultProps = {
  isOpen: true,
  onClose: vi.fn(),
  onConfirm: vi.fn(),
  amount: 1500,
  currency: 'USDC' as const,
  tokenPrice: 0.0015,
  tokenSymbol: 'BIG',
  purchaseState: idleState,
};

describe('PurchaseConfirmationModal', () => {
  describe('visibility', () => {
    it('should render when isOpen is true', () => {
      render(<PurchaseConfirmationModal {...defaultProps} />);

      expect(screen.getByRole('heading', { name: 'Confirm Purchase' })).toBeInTheDocument();
    });

    it('should not render when isOpen is false', () => {
      render(<PurchaseConfirmationModal {...defaultProps} isOpen={false} />);

      expect(screen.queryByText('Confirm Purchase')).not.toBeInTheDocument();
    });
  });

  describe('purchase details', () => {
    it('should display payment amount and currency', () => {
      render(<PurchaseConfirmationModal {...defaultProps} />);

      expect(screen.getByText('1,500 USDC')).toBeInTheDocument();
    });

    it('should display token price', () => {
      render(<PurchaseConfirmationModal {...defaultProps} />);

      expect(screen.getByText('$0.0015')).toBeInTheDocument();
    });

    it('should calculate and display tokens to receive', () => {
      render(<PurchaseConfirmationModal {...defaultProps} />);

      // 1500 USDC / 0.0015 = 1,000,000 BIG
      expect(screen.getByText('1,000,000 BIG')).toBeInTheDocument();
    });
  });

  describe('idle state buttons', () => {
    it('should show Cancel and Confirm buttons', () => {
      render(<PurchaseConfirmationModal {...defaultProps} />);

      expect(screen.getByText('Cancel')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Confirm Purchase' })).toBeInTheDocument();
    });

    it('should call onClose when Cancel is clicked', () => {
      const onClose = vi.fn();
      render(<PurchaseConfirmationModal {...defaultProps} onClose={onClose} />);

      fireEvent.click(screen.getByText('Cancel'));

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('should call onConfirm when Confirm Purchase is clicked', () => {
      const onConfirm = vi.fn();
      render(<PurchaseConfirmationModal {...defaultProps} onConfirm={onConfirm} />);

      fireEvent.click(screen.getByRole('button', { name: 'Confirm Purchase' }));

      expect(onConfirm).toHaveBeenCalledTimes(1);
    });
  });

  describe('processing state', () => {
    it('should hide action buttons during processing', () => {
      render(
        <PurchaseConfirmationModal {...defaultProps} purchaseState={processingState} />
      );

      // No Cancel/Confirm buttons visible during processing
      expect(screen.queryByText('Cancel')).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Confirm Purchase' })).not.toBeInTheDocument();
    });

    it('should hide close button during processing', () => {
      render(
        <PurchaseConfirmationModal {...defaultProps} purchaseState={processingState} />
      );

      expect(screen.queryByLabelText('Close modal')).not.toBeInTheDocument();
    });
  });

  describe('confirmed state', () => {
    it('should show Done button on success', () => {
      render(
        <PurchaseConfirmationModal {...defaultProps} purchaseState={confirmedState} />
      );

      expect(screen.getByText('Done')).toBeInTheDocument();
    });

    it('should display transaction hash link', () => {
      render(
        <PurchaseConfirmationModal {...defaultProps} purchaseState={confirmedState} />
      );

      expect(screen.getByText(/0xabc123def456/)).toBeInTheDocument();
    });
  });

  describe('failed state', () => {
    it('should show error message', () => {
      render(
        <PurchaseConfirmationModal {...defaultProps} purchaseState={failedState} />
      );

      expect(screen.getByText('Insufficient balance')).toBeInTheDocument();
    });

    it('should show Close and Try Again buttons', () => {
      render(
        <PurchaseConfirmationModal {...defaultProps} purchaseState={failedState} />
      );

      expect(screen.getByText('Close')).toBeInTheDocument();
      expect(screen.getByText('Try Again')).toBeInTheDocument();
    });

    it('should call onConfirm when Try Again is clicked', () => {
      const onConfirm = vi.fn();
      render(
        <PurchaseConfirmationModal
          {...defaultProps}
          onConfirm={onConfirm}
          purchaseState={failedState}
        />
      );

      fireEvent.click(screen.getByText('Try Again'));

      expect(onConfirm).toHaveBeenCalledTimes(1);
    });
  });

  describe('escape key', () => {
    it('should close on Escape when not processing', () => {
      const onClose = vi.fn();
      render(<PurchaseConfirmationModal {...defaultProps} onClose={onClose} />);

      fireEvent.keyDown(document, { key: 'Escape' });

      expect(onClose).toHaveBeenCalled();
    });

    it('should not close on Escape when processing', () => {
      const onClose = vi.fn();
      render(
        <PurchaseConfirmationModal
          {...defaultProps}
          onClose={onClose}
          purchaseState={processingState}
        />
      );

      fireEvent.keyDown(document, { key: 'Escape' });

      expect(onClose).not.toHaveBeenCalled();
    });
  });
});
