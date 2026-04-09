import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Badge } from '@/components/ui/badge';

describe('Badge', () => {
  describe('variant="success"', () => {
    it('renders without crashing', () => {
      render(<Badge variant="success">Active</Badge>);
      expect(screen.getByText('Active')).toBeInTheDocument();
    });

    it('applies success background class', () => {
      render(<Badge variant="success">Active</Badge>);
      const badge = screen.getByText('Active');
      expect(badge.className).toContain('bg-badge-success');
    });

    it('applies success foreground text class', () => {
      render(<Badge variant="success">Active</Badge>);
      const badge = screen.getByText('Active');
      expect(badge.className).toContain('text-badge-success-foreground');
    });

    it('has no visible border (border-transparent)', () => {
      render(<Badge variant="success">Active</Badge>);
      const badge = screen.getByText('Active');
      expect(badge.className).toContain('border-transparent');
    });
  });

  describe('variant="info"', () => {
    it('renders without crashing', () => {
      render(<Badge variant="info">Info</Badge>);
      expect(screen.getByText('Info')).toBeInTheDocument();
    });

    it('applies info background class', () => {
      render(<Badge variant="info">Info</Badge>);
      const badge = screen.getByText('Info');
      expect(badge.className).toContain('bg-badge-info');
    });

    it('applies info foreground text class', () => {
      render(<Badge variant="info">Info</Badge>);
      const badge = screen.getByText('Info');
      expect(badge.className).toContain('text-badge-info-foreground');
    });

    it('has no visible border (border-transparent)', () => {
      render(<Badge variant="info">Info</Badge>);
      const badge = screen.getByText('Info');
      expect(badge.className).toContain('border-transparent');
    });
  });

  describe('default variant', () => {
    it('applies primary background by default', () => {
      render(<Badge>Default</Badge>);
      const badge = screen.getByText('Default');
      expect(badge.className).toContain('bg-primary');
    });
  });
});
