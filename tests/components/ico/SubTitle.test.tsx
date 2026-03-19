import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SubTitle } from '@/pages/ico/components/shared/SubTitle';

describe('SubTitle', () => {
  describe('rendering', () => {
    it('should render children text', () => {
      render(<SubTitle>Hello World</SubTitle>);
      expect(screen.getByText('Hello World')).toBeInTheDocument();
    });

    it('should render as h2 element', () => {
      render(<SubTitle>Heading</SubTitle>);
      expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument();
    });

    it('should render nested elements', () => {
      render(
        <SubTitle>
          <span>Nested</span>
        </SubTitle>
      );
      expect(screen.getByText('Nested')).toBeInTheDocument();
    });
  });

  describe('styling', () => {
    it('should have base font styles', () => {
      const { container } = render(<SubTitle>Styled</SubTitle>);
      expect(container.firstElementChild?.className).toContain('font-bold');
    });

    it('should have correct text size', () => {
      const { container } = render(<SubTitle>Sized</SubTitle>);
      expect(container.firstElementChild?.className).toContain('text-2xl');
    });
  });

  describe('className prop', () => {
    it('should forward custom className', () => {
      const { container } = render(<SubTitle className="mb-4">Custom</SubTitle>);
      expect(container.firstElementChild?.className).toContain('mb-4');
    });

    it('should merge with base styles', () => {
      const { container } = render(<SubTitle className="text-center">Merged</SubTitle>);
      const className = container.firstElementChild?.className ?? '';
      expect(className).toContain('text-center');
      expect(className).toContain('font-bold');
    });
  });
});
