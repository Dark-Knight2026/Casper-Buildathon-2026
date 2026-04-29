import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Badge } from '@/components/ui/badge';

describe('Badge', () => {
  describe('variant="success"', () => {
    it('renders without crashing', () => {
      render(<Badge variant="success">Active</Badge>);
      expect(
        screen.getByText('Active'),
        'success badge should render its children'
      ).toBeInTheDocument();
    });

    it('applies success background class', () => {
      render(<Badge variant="success">Active</Badge>);
      const badge = screen.getByText('Active');
      expect(badge.className, 'success variant should apply bg-badge-success').toContain(
        'bg-badge-success'
      );
    });

    it('applies success foreground text class', () => {
      render(<Badge variant="success">Active</Badge>);
      const badge = screen.getByText('Active');
      expect(
        badge.className,
        'success variant should apply text-badge-success-foreground'
      ).toContain('text-badge-success-foreground');
    });

    it('has no visible border (border-transparent)', () => {
      render(<Badge variant="success">Active</Badge>);
      const badge = screen.getByText('Active');
      expect(badge.className, 'success variant should use border-transparent').toContain(
        'border-transparent'
      );
    });
  });

  describe('variant="info"', () => {
    it('renders without crashing', () => {
      render(<Badge variant="info">Info</Badge>);
      expect(
        screen.getByText('Info'),
        'info badge should render its children'
      ).toBeInTheDocument();
    });

    it('applies info background class', () => {
      render(<Badge variant="info">Info</Badge>);
      const badge = screen.getByText('Info');
      expect(badge.className, 'info variant should apply bg-badge-info').toContain('bg-badge-info');
    });

    it('applies info foreground text class', () => {
      render(<Badge variant="info">Info</Badge>);
      const badge = screen.getByText('Info');
      expect(
        badge.className,
        'info variant should apply text-badge-info-foreground'
      ).toContain('text-badge-info-foreground');
    });

    it('has no visible border (border-transparent)', () => {
      render(<Badge variant="info">Info</Badge>);
      const badge = screen.getByText('Info');
      expect(badge.className, 'info variant should use border-transparent').toContain(
        'border-transparent'
      );
    });
  });

  describe('default variant', () => {
    it('applies primary background by default', () => {
      render(<Badge>Default</Badge>);
      const badge = screen.getByText('Default');
      expect(badge.className, 'default variant should apply bg-primary').toContain('bg-primary');
    });
  });

  describe('variant="secondary"', () => {
    it('renders without crashing', () => {
      render(<Badge variant="secondary">Secondary</Badge>);
      expect(
        screen.getByText('Secondary'),
        'secondary badge should render its children'
      ).toBeInTheDocument();
    });

    it('applies secondary background class', () => {
      render(<Badge variant="secondary">Secondary</Badge>);
      const badge = screen.getByText('Secondary');
      expect(badge.className, 'secondary variant should apply bg-secondary').toContain(
        'bg-secondary'
      );
    });

    it('applies secondary foreground text class', () => {
      render(<Badge variant="secondary">Secondary</Badge>);
      const badge = screen.getByText('Secondary');
      expect(
        badge.className,
        'secondary variant should apply text-secondary-foreground'
      ).toContain('text-secondary-foreground');
    });

    it('has no visible border (border-transparent)', () => {
      render(<Badge variant="secondary">Secondary</Badge>);
      const badge = screen.getByText('Secondary');
      expect(badge.className, 'secondary variant should use border-transparent').toContain(
        'border-transparent'
      );
    });
  });

  describe('variant="destructive"', () => {
    it('renders without crashing', () => {
      render(<Badge variant="destructive">Destructive</Badge>);
      expect(
        screen.getByText('Destructive'),
        'destructive badge should render its children'
      ).toBeInTheDocument();
    });

    it('applies destructive background class', () => {
      render(<Badge variant="destructive">Destructive</Badge>);
      const badge = screen.getByText('Destructive');
      expect(
        badge.className,
        'destructive variant should apply bg-destructive'
      ).toContain('bg-destructive');
    });

    it('applies destructive foreground text class', () => {
      render(<Badge variant="destructive">Destructive</Badge>);
      const badge = screen.getByText('Destructive');
      expect(
        badge.className,
        'destructive variant should apply text-destructive-foreground'
      ).toContain('text-destructive-foreground');
    });

    it('has no visible border (border-transparent)', () => {
      render(<Badge variant="destructive">Destructive</Badge>);
      const badge = screen.getByText('Destructive');
      expect(
        badge.className,
        'destructive variant should use border-transparent'
      ).toContain('border-transparent');
    });
  });

  describe('variant="outline"', () => {
    it('renders without crashing', () => {
      render(<Badge variant="outline">Outline</Badge>);
      expect(
        screen.getByText('Outline'),
        'outline badge should render its children'
      ).toBeInTheDocument();
    });

    it('applies foreground text class', () => {
      render(<Badge variant="outline">Outline</Badge>);
      const badge = screen.getByText('Outline');
      expect(badge.className, 'outline variant should apply text-foreground').toContain(
        'text-foreground'
      );
    });

    it('does not apply any background fill class', () => {
      render(<Badge variant="outline">Outline</Badge>);
      const badge = screen.getByText('Outline');
      expect(
        badge.className,
        'outline variant must not apply any solid bg-* fill class'
      ).not.toMatch(/\bbg-(primary|secondary|destructive|badge-success|badge-info)\b/);
    });
  });
});
