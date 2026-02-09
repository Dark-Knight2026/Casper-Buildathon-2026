import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MainButton } from '@/pages/ico/components/shared/MainButton';

describe('MainButton', () => {
  describe('rendering', () => {
    it('should render button text', () => {
      render(<MainButton text="Click me" />);

      expect(screen.getByText('Click me')).toBeInTheDocument();
    });

    it('should render as a button element', () => {
      render(<MainButton text="Test" />);

      expect(screen.getByRole('button')).toBeInTheDocument();
    });
  });

  describe('click handling', () => {
    it('should call onClick when clicked', () => {
      const handleClick = vi.fn();
      render(<MainButton text="Click" onClick={handleClick} />);

      fireEvent.click(screen.getByText('Click'));

      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('should not call onClick when disabled', () => {
      const handleClick = vi.fn();
      render(<MainButton text="Click" onClick={handleClick} disabled />);

      fireEvent.click(screen.getByText('Click'));

      expect(handleClick).not.toHaveBeenCalled();
    });

    it('should not call onClick when loading', () => {
      const handleClick = vi.fn();
      render(<MainButton text="Click" onClick={handleClick} loading />);

      fireEvent.click(screen.getByText('Click'));

      expect(handleClick).not.toHaveBeenCalled();
    });
  });

  describe('disabled state', () => {
    it('should be disabled when disabled prop is true', () => {
      render(<MainButton text="Test" disabled />);

      expect(screen.getByRole('button')).toBeDisabled();
    });

    it('should be disabled when loading prop is true', () => {
      render(<MainButton text="Test" loading />);

      expect(screen.getByRole('button')).toBeDisabled();
    });

    it('should have opacity class when disabled', () => {
      render(<MainButton text="Test" disabled />);

      expect(screen.getByRole('button').className).toContain('opacity-50');
    });

    it('should have cursor-not-allowed when disabled', () => {
      render(<MainButton text="Test" disabled />);

      expect(screen.getByRole('button').className).toContain('cursor-not-allowed');
    });
  });

  describe('enabled state', () => {
    it('should not be disabled by default', () => {
      render(<MainButton text="Test" />);

      expect(screen.getByRole('button')).not.toBeDisabled();
    });

    it('should have cursor-pointer when enabled', () => {
      render(<MainButton text="Test" />);

      expect(screen.getByRole('button').className).toContain('cursor-pointer');
    });
  });

  describe('className prop', () => {
    it('should forward custom className', () => {
      render(<MainButton text="Test" className="my-custom-class" />);

      expect(screen.getByRole('button').className).toContain('my-custom-class');
    });
  });

});
