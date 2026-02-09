import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { InfoCard } from '@/pages/ico/components/shared/InfoCard';

describe('InfoCard', () => {
  describe('rendering', () => {
    it('should render children', () => {
      render(
        <InfoCard>
          <span>Info content</span>
        </InfoCard>
      );

      expect(screen.getByText('Info content')).toBeInTheDocument();
    });

    it('should render multiple children', () => {
      render(
        <InfoCard>
          <div>Item 1</div>
          <div>Item 2</div>
          <div>Item 3</div>
          <div>Item 4</div>
        </InfoCard>
      );

      expect(screen.getByText('Item 1')).toBeInTheDocument();
      expect(screen.getByText('Item 2')).toBeInTheDocument();
      expect(screen.getByText('Item 3')).toBeInTheDocument();
      expect(screen.getByText('Item 4')).toBeInTheDocument();
    });
  });

  describe('styling', () => {
    it('should have grid layout', () => {
      const { container } = render(<InfoCard>Content</InfoCard>);

      expect(container.firstElementChild?.className).toContain('grid');
    });

    it('should have single column on mobile', () => {
      const { container } = render(<InfoCard>Content</InfoCard>);

      expect(container.firstElementChild?.className).toContain('grid-cols-1');
    });

    it('should have 4 columns on md breakpoint', () => {
      const { container } = render(<InfoCard>Content</InfoCard>);

      expect(container.firstElementChild?.className).toContain('md:grid-cols-4');
    });

    it('should have black background', () => {
      const { container } = render(<InfoCard>Content</InfoCard>);

      expect(container.firstElementChild?.className).toContain('bg-black');
    });

    it('should have rounded corners', () => {
      const { container } = render(<InfoCard>Content</InfoCard>);

      expect(container.firstElementChild?.className).toContain('rounded-xl');
    });
  });

  describe('className prop', () => {
    it('should forward custom className', () => {
      const { container } = render(
        <InfoCard className="my-custom-class">Content</InfoCard>
      );

      expect(container.firstElementChild?.className).toContain('my-custom-class');
    });

    it('should merge custom className with base styles', () => {
      const { container } = render(
        <InfoCard className="p-4 gap-2">Content</InfoCard>
      );

      expect(container.firstElementChild?.className).toContain('p-4');
      expect(container.firstElementChild?.className).toContain('gap-2');
      expect(container.firstElementChild?.className).toContain('grid');
    });
  });
});
