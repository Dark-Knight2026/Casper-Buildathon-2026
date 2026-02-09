import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { UserTokenBalance } from '@/pages/ico/components/shared/UserTokenBalance';

const defaultProps = {
  tokensPurchased: 1000000,
  totalSpentUSD: 1000,
  tokenPrice: 0.001,
  tokenSymbol: 'BIG',
};

describe('UserTokenBalance', () => {
  describe('rendering', () => {
    it('should render title with token symbol', () => {
      render(<UserTokenBalance {...defaultProps} />);

      expect(screen.getByText('Your BIG Balance')).toBeInTheDocument();
    });

    it('should render all three sections', () => {
      render(<UserTokenBalance {...defaultProps} />);

      expect(screen.getByText('Tokens Purchased')).toBeInTheDocument();
      expect(screen.getByText('Total Spent')).toBeInTheDocument();
      expect(screen.getByText('Current Value')).toBeInTheDocument();
    });
  });

  describe('tokens purchased display', () => {
    it('should display formatted token amount', () => {
      render(<UserTokenBalance {...defaultProps} />);

      expect(screen.getByText('1,000,000 BIG')).toBeInTheDocument();
    });

    it('should format large numbers correctly', () => {
      render(
        <UserTokenBalance
          {...defaultProps}
          tokensPurchased={5000000}
        />
      );

      expect(screen.getByText('5,000,000 BIG')).toBeInTheDocument();
    });
  });

  describe('total spent display', () => {
    it('should display total spent with $ prefix', () => {
      render(<UserTokenBalance {...defaultProps} />);

      // Note: With default props, Total Spent and Current Value are both $1,000
      const elements = screen.getAllByText('$1,000');
      expect(elements.length).toBeGreaterThanOrEqual(1);
    });

    it('should format large amounts correctly', () => {
      render(
        <UserTokenBalance
          {...defaultProps}
          totalSpentUSD={50000}
        />
      );

      expect(screen.getByText('$50,000')).toBeInTheDocument();
    });
  });

  describe('current value calculation', () => {
    it('should calculate current value correctly', () => {
      // 1,000,000 tokens * $0.001 = $1,000
      render(<UserTokenBalance {...defaultProps} />);

      // There should be two $1,000 values - total spent and current value
      const values = screen.getAllByText('$1,000');
      expect(values).toHaveLength(2);
    });

    it('should show profit when token price increased', () => {
      // 1,000,000 tokens * $0.002 = $2,000 (profit from $1,000 spent)
      render(
        <UserTokenBalance
          {...defaultProps}
          tokenPrice={0.002}
        />
      );

      expect(screen.getByText('$2,000')).toBeInTheDocument();
    });

    it('should show loss when token price decreased', () => {
      // 1,000,000 tokens * $0.0005 = $500 (loss from $1,000 spent)
      render(
        <UserTokenBalance
          {...defaultProps}
          tokenPrice={0.0005}
        />
      );

      expect(screen.getByText('$500')).toBeInTheDocument();
    });
  });

  describe('token symbol', () => {
    it('should use custom token symbol', () => {
      render(
        <UserTokenBalance
          {...defaultProps}
          tokenSymbol="KEY"
        />
      );

      expect(screen.getByText('Your KEY Balance')).toBeInTheDocument();
      expect(screen.getByText('1,000,000 KEY')).toBeInTheDocument();
    });
  });

  describe('className prop', () => {
    it('should forward custom className', () => {
      const { container } = render(
        <UserTokenBalance {...defaultProps} className="my-custom-class" />
      );

      expect(container.firstElementChild?.className).toContain('my-custom-class');
    });
  });
});
