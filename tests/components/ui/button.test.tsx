import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Button } from '@/components/ui/button';

describe('Button', () => {
  describe('variant="white"', () => {
    it('applies the white border class', () => {
      render(<Button variant="white">CTA</Button>);
      const button = screen.getByRole('button', { name: 'CTA' });
      expect(button.className, 'white variant should apply border-white').toContain('border-white');
    });

    it('applies the white text class', () => {
      render(<Button variant="white">CTA</Button>);
      const button = screen.getByRole('button', { name: 'CTA' });
      expect(button.className, 'white variant should apply text-white').toContain('text-white');
    });

    it('uses a transparent background', () => {
      render(<Button variant="white">CTA</Button>);
      const button = screen.getByRole('button', { name: 'CTA' });
      expect(
        button.className,
        'white variant should be transparent so the parent surface shows through'
      ).toContain('bg-transparent');
    });
  });

  describe('loading prop', () => {
    it('renders the Loader2 spinner when loading=true', () => {
      render(<Button loading>Saving</Button>);
      const button = screen.getByRole('button', { name: 'Saving' });
      const spinner = button.querySelector('svg');
      expect(spinner, 'loading button should render an inline spinner <svg>').not.toBeNull();
      expect(
        spinner?.getAttribute('class') ?? '',
        'loading spinner should use the animate-spin class'
      ).toContain('animate-spin');
    });

    it('sets aria-disabled="true" when loading=true', () => {
      render(<Button loading>Saving</Button>);
      const button = screen.getByRole('button', { name: 'Saving' });
      expect(
        button,
        'loading button must expose aria-disabled="true" for assistive tech'
      ).toHaveAttribute('aria-disabled', 'true');
    });

    it('passes disabled to the underlying <button> when loading=true', () => {
      render(<Button loading>Saving</Button>);
      const button = screen.getByRole('button', { name: 'Saving' });
      expect(
        button,
        'loading button should also be natively disabled to block clicks'
      ).toBeDisabled();
    });

    it('does not render a spinner when loading=false', () => {
      render(<Button>Submit</Button>);
      const button = screen.getByRole('button', { name: 'Submit' });
      expect(
        button.querySelector('svg'),
        'non-loading button should not render the spinner svg'
      ).toBeNull();
    });

    it('sets aria-disabled="true" when disabled but not loading', () => {
      render(<Button disabled>Disabled</Button>);
      const button = screen.getByRole('button', { name: 'Disabled' });
      expect(
        button,
        'disabled button should also expose aria-disabled="true"'
      ).toHaveAttribute('aria-disabled', 'true');
    });
  });
});
