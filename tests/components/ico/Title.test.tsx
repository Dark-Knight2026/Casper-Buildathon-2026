import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Title } from '@/pages/ico/components/shared/Title';

describe('Title', () => {
  describe('rendering', () => {
    it('should render children text', () => {
      render(<Title>Hello World</Title>);
      expect(screen.getByText('Hello World')).toBeInTheDocument();
    });

    it('should render as h1 element', () => {
      render(<Title>Heading</Title>);
      expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    });

    it('should render nested elements', () => {
      render(
        <Title>
          <span>Nested</span>
        </Title>
      );
      expect(screen.getByText('Nested')).toBeInTheDocument();
    });
  });

  describe('styling', () => {
    it('should have base font styles', () => {
      const { container } = render(<Title>Styled</Title>);
      expect(container.firstElementChild?.className).toContain('font-bold');
    });

    it('should have responsive text sizes', () => {
      const { container } = render(<Title>Responsive</Title>);
      const className = container.firstElementChild?.className ?? '';
      expect(className).toContain('text-3xl');
      expect(className).toContain('md:text-4xl');
      expect(className).toContain('lg:text-5xl');
    });
  });

  describe('className prop', () => {
    it('should forward custom className', () => {
      const { container } = render(<Title className="mb-4">Custom</Title>);
      expect(container.firstElementChild?.className).toContain('mb-4');
    });

    it('should merge with base styles', () => {
      const { container } = render(<Title className="text-center">Merged</Title>);
      const className = container.firstElementChild?.className ?? '';
      expect(className).toContain('text-center');
      expect(className).toContain('font-bold');
    });
  });
});
