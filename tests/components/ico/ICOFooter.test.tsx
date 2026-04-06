import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ICOFooter } from '@/pages/ico/components/ICOFooter';
import { ICO_CONFIG } from '@/constants/ico';

describe('ICOFooter', () => {
  describe('rendering', () => {
    it('should render footer element', () => {
      render(<ICOFooter />);

      expect(document.querySelector('footer')).toBeInTheDocument();
    });

    it('should display "Powered by Casper Network"', () => {
      render(<ICOFooter />);

      expect(screen.getByText('Powered by Casper Network')).toBeInTheDocument();
    });

    it('should display BIG Whitepaper link', () => {
      render(<ICOFooter />);

      expect(screen.getByText('BIG Whitepaper')).toBeInTheDocument();
    });
  });

  describe('block explorer link', () => {
    it('should render Block Explorer link', () => {
      render(<ICOFooter />);

      expect(screen.getByText('Block Explorer')).toBeInTheDocument();
    });

    it('should link to Casper explorer', () => {
      render(<ICOFooter />);

      const link = screen.getByText('Block Explorer');
      expect(link).toHaveAttribute('href', ICO_CONFIG.CASPER.explorerUrl);
    });

    it('should open link in new tab', () => {
      render(<ICOFooter />);

      const link = screen.getByText('Block Explorer');
      expect(link).toHaveAttribute('target', '_blank');
    });

    it('should have security attributes', () => {
      render(<ICOFooter />);

      const link = screen.getByText('Block Explorer');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    });
  });

  describe('layout', () => {
    it('should have container class', () => {
      const { container } = render(<ICOFooter />);

      expect(container.querySelector('.container')).toBeInTheDocument();
    });
  });
});
