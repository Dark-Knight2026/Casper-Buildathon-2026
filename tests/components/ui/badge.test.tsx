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

  describe('variant="secondary"', () => {
    it('renders without crashing', () => {
      render(<Badge variant="secondary">Secondary</Badge>);
      expect(screen.getByText('Secondary')).toBeInTheDocument();
    });

    it('applies secondary background class', () => {
      render(<Badge variant="secondary">Secondary</Badge>);
      const badge = screen.getByText('Secondary');
      expect(badge.className).toContain('bg-secondary');
    });

    it('applies secondary foreground text class', () => {
      render(<Badge variant="secondary">Secondary</Badge>);
      const badge = screen.getByText('Secondary');
      expect(badge.className).toContain('text-secondary-foreground');
    });

    it('has no visible border (border-transparent)', () => {
      render(<Badge variant="secondary">Secondary</Badge>);
      const badge = screen.getByText('Secondary');
      expect(badge.className).toContain('border-transparent');
    });
  });

  describe('variant="destructive"', () => {
    it('renders without crashing', () => {
      render(<Badge variant="destructive">Destructive</Badge>);
      expect(screen.getByText('Destructive')).toBeInTheDocument();
    });

    it('applies destructive background class', () => {
      render(<Badge variant="destructive">Destructive</Badge>);
      const badge = screen.getByText('Destructive');
      expect(badge.className).toContain('bg-destructive');
    });

    it('applies destructive foreground text class', () => {
      render(<Badge variant="destructive">Destructive</Badge>);
      const badge = screen.getByText('Destructive');
      expect(badge.className).toContain('text-destructive-foreground');
    });

    it('has no visible border (border-transparent)', () => {
      render(<Badge variant="destructive">Destructive</Badge>);
      const badge = screen.getByText('Destructive');
      expect(badge.className).toContain('border-transparent');
    });
  });

  describe('variant="outline"', () => {
    it('renders without crashing', () => {
      render(<Badge variant="outline">Outline</Badge>);
      expect(screen.getByText('Outline')).toBeInTheDocument();
    });

    it('applies foreground text class', () => {
      render(<Badge variant="outline">Outline</Badge>);
      const badge = screen.getByText('Outline');
      expect(badge.className).toContain('text-foreground');
    });

    it('does not apply any background fill class', () => {
      render(<Badge variant="outline">Outline</Badge>);
      const badge = screen.getByText('Outline');
      expect(badge.className).not.toMatch(/\bbg-(primary|secondary|destructive|badge-success|badge-info)\b/);
    });
  });
});
