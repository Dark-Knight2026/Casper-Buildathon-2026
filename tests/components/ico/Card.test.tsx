import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Card } from '@/pages/ico/components/shared/Card';

describe('Card', () => {
  describe('rendering', () => {
    it('should render children', () => {
      render(
        <Card>
          <span>Card content</span>
        </Card>
      );

      expect(screen.getByText('Card content')).toBeInTheDocument();
    });

    it('should render multiple children', () => {
      render(
        <Card>
          <span>First</span>
          <span>Second</span>
          <span>Third</span>
        </Card>
      );

      expect(screen.getByText('First')).toBeInTheDocument();
      expect(screen.getByText('Second')).toBeInTheDocument();
      expect(screen.getByText('Third')).toBeInTheDocument();
    });

    it('should render nested components', () => {
      render(
        <Card>
          <div>
            <h2>Title</h2>
            <p>Description</p>
          </div>
        </Card>
      );

      expect(screen.getByText('Title')).toBeInTheDocument();
      expect(screen.getByText('Description')).toBeInTheDocument();
    });
  });

  describe('styling', () => {
    it('should have rounded corners', () => {
      const { container } = render(<Card>Content</Card>);

      expect(container.firstElementChild?.className).toContain('rounded-md');
    });

    it('should have border', () => {
      const { container } = render(<Card>Content</Card>);

      expect(container.firstElementChild?.className).toContain('border');
    });

    it('should have shadow', () => {
      const { container } = render(<Card>Content</Card>);

      expect(container.firstElementChild?.className).toContain('shadow');
    });

    it('should have flex column layout', () => {
      const { container } = render(<Card>Content</Card>);

      expect(container.firstElementChild?.className).toContain('flex');
      expect(container.firstElementChild?.className).toContain('flex-col');
    });
  });

  describe('className prop', () => {
    it('should forward custom className', () => {
      const { container } = render(
        <Card className="my-custom-class">Content</Card>
      );

      expect(container.firstElementChild?.className).toContain('my-custom-class');
    });

    it('should merge custom className with base styles', () => {
      const { container } = render(
        <Card className="p-4">Content</Card>
      );

      expect(container.firstElementChild?.className).toContain('p-4');
      expect(container.firstElementChild?.className).toContain('rounded-md');
    });
  });

});
