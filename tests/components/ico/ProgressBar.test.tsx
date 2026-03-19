import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProgressBar } from '@/pages/ico/components/shared/ProgressBar';

describe('ProgressBar', () => {
  // --- Percentage calculation ---

  describe('percentage calculation', () => {
    it('should display correct percentage for partial progress', () => {
      render(<ProgressBar currentValue={50} maxValue={200} />);

      expect(screen.getByText(/25\.0%/)).toBeInTheDocument();
    });

    it('should display 0.0% when currentValue is 0', () => {
      render(<ProgressBar currentValue={0} maxValue={100} />);

      expect(screen.getByText(/0\.0%/)).toBeInTheDocument();
    });

    it('should display 100.0% when full', () => {
      render(<ProgressBar currentValue={100} maxValue={100} />);

      expect(screen.getByText(/100\.0%/)).toBeInTheDocument();
    });

    it('should handle 0 maxValue without crashing (0%)', () => {
      render(<ProgressBar currentValue={50} maxValue={0} />);

      expect(screen.getByText(/0\.0%/)).toBeInTheDocument();
    });

    it('should display decimal percentage correctly', () => {
      render(<ProgressBar currentValue={1} maxValue={3} />);

      expect(screen.getByText(/33\.3%/)).toBeInTheDocument();
    });
  });

  // --- Fill bar width ---

  describe('fill bar width', () => {
    it('should set correct width style on the fill element', () => {
      const { container } = render(
        <ProgressBar currentValue={75} maxValue={100} />
      );

      const fill = container.querySelector('[style*="width"]') as HTMLElement;
      expect(fill?.style.width).toBe('75%');
    });

    it('should cap width at 100% even if currentValue exceeds maxValue', () => {
      const { container } = render(
        <ProgressBar currentValue={150} maxValue={100} />
      );

      const fill = container.querySelector('[style*="width"]') as HTMLElement;
      expect(fill?.style.width).toBe('100%');
    });

    it('should set width to 0% when currentValue is 0', () => {
      const { container } = render(
        <ProgressBar currentValue={0} maxValue={100} />
      );

      const fill = container.querySelector('[style*="width"]') as HTMLElement;
      expect(fill?.style.width).toBe('0%');
    });
  });

  // --- Label ---

  describe('label', () => {
    it('should display default label "Progress"', () => {
      render(<ProgressBar currentValue={0} maxValue={100} />);

      expect(screen.getByText(/^Progress/)).toBeInTheDocument();
    });

    it('should display custom label', () => {
      render(
        <ProgressBar currentValue={50} maxValue={100} label="Vesting Progress" />
      );

      expect(screen.getByText(/^Vesting Progress/)).toBeInTheDocument();
    });

    it('should include percentage after label by default', () => {
      render(
        <ProgressBar currentValue={50} maxValue={100} label="Sale" />
      );

      expect(screen.getByText('Sale: 50.0%')).toBeInTheDocument();
    });

    it('should hide percentage when showPercentage is false', () => {
      render(
        <ProgressBar
          currentValue={50}
          maxValue={100}
          label="Sale"
          showPercentage={false}
        />
      );

      expect(screen.getByText('Sale')).toBeInTheDocument();
      expect(screen.queryByText(/50\.0%/)).not.toBeInTheDocument();
    });
  });

  // --- Right side ---

  describe('right label and element', () => {
    it('should display rightLabel when provided', () => {
      render(
        <ProgressBar
          currentValue={50}
          maxValue={100}
          rightLabel="$500,000 raised"
        />
      );

      expect(screen.getByText('$500,000 raised')).toBeInTheDocument();
    });

    it('should render rightElement when provided', () => {
      render(
        <ProgressBar
          currentValue={50}
          maxValue={100}
          rightElement={<span data-testid="custom-element">Timer</span>}
        />
      );

      expect(screen.getByTestId('custom-element')).toBeInTheDocument();
    });

    it('should prefer rightElement over rightLabel', () => {
      render(
        <ProgressBar
          currentValue={50}
          maxValue={100}
          rightLabel="Text Label"
          rightElement={<span data-testid="element">Element</span>}
        />
      );

      expect(screen.getByTestId('element')).toBeInTheDocument();
      expect(screen.queryByText('Text Label')).not.toBeInTheDocument();
    });

    it('should show nothing on the right when neither is provided', () => {
      const { container } = render(
        <ProgressBar currentValue={50} maxValue={100} />
      );

      // The header row has one child (the left label), no right element
      const headerRow = container.querySelector('.flex.justify-between');
      expect(headerRow?.children).toHaveLength(1);
    });
  });

  // --- Info columns ---

  describe('info columns', () => {
    const columns = [
      { label: 'Tokens Sold', value: '750M' },
      { label: 'Raised', value: '$500K' },
      { label: 'Remaining', value: '250M' },
    ];

    it('should render info columns when provided', () => {
      render(
        <ProgressBar currentValue={50} maxValue={100} infoColumns={columns} />
      );

      expect(screen.getByText('Tokens Sold')).toBeInTheDocument();
      expect(screen.getByText('750M')).toBeInTheDocument();
      expect(screen.getByText('Raised')).toBeInTheDocument();
      expect(screen.getByText('$500K')).toBeInTheDocument();
      expect(screen.getByText('Remaining')).toBeInTheDocument();
      expect(screen.getByText('250M')).toBeInTheDocument();
    });

    it('should render dividers between columns', () => {
      const { container } = render(
        <ProgressBar currentValue={50} maxValue={100} infoColumns={columns} />
      );

      // Dividers are between columns (n-1 dividers for n columns)
      const dividers = container.querySelectorAll('.w-px.h-12');
      expect(dividers).toHaveLength(2);
    });

    it('should not render info section when infoColumns is empty', () => {
      const { container } = render(
        <ProgressBar currentValue={50} maxValue={100} infoColumns={[]} />
      );

      expect(container.querySelector('.border-t')).not.toBeInTheDocument();
    });

    it('should not render info section when infoColumns is not provided', () => {
      const { container } = render(
        <ProgressBar currentValue={50} maxValue={100} />
      );

      expect(container.querySelector('.border-t')).not.toBeInTheDocument();
    });

    it('should render a single column without dividers', () => {
      const { container } = render(
        <ProgressBar
          currentValue={50}
          maxValue={100}
          infoColumns={[{ label: 'Total', value: '1B' }]}
        />
      );

      expect(screen.getByText('Total')).toBeInTheDocument();
      expect(screen.getByText('1B')).toBeInTheDocument();
      expect(container.querySelectorAll('.w-px.h-12')).toHaveLength(0);
    });
  });

  // --- Size ---

  describe('size prop', () => {
    it('should apply sm height class', () => {
      const { container } = render(
        <ProgressBar currentValue={50} maxValue={100} size="sm" />
      );

      const track = container.querySelector('.rounded-full.overflow-hidden');
      expect(track?.className).toContain('h-2');
    });

    it('should apply md height class', () => {
      const { container } = render(
        <ProgressBar currentValue={50} maxValue={100} size="md" />
      );

      const track = container.querySelector('.rounded-full.overflow-hidden');
      expect(track?.className).toContain('h-3');
    });

    it('should default to lg height class', () => {
      const { container } = render(
        <ProgressBar currentValue={50} maxValue={100} />
      );

      const track = container.querySelector('.rounded-full.overflow-hidden');
      expect(track?.className).toContain('h-4');
    });
  });

  // --- withCard ---

  describe('withCard prop', () => {
    it('should wrap in Card component by default', () => {
      const { container } = render(
        <ProgressBar currentValue={50} maxValue={100} />
      );

      // Card renders with specific classes
      expect(container.firstElementChild?.className).toContain('rounded-md');
      expect(container.firstElementChild?.className).toContain('border');
    });

    it('should render as plain div when withCard is false', () => {
      const { container } = render(
        <ProgressBar currentValue={50} maxValue={100} withCard={false} />
      );

      // No Card border/shadow classes, just w-full
      expect(container.firstElementChild?.className).toContain('w-full');
      expect(container.firstElementChild?.className).not.toContain('shadow-2xl');
    });
  });

  // --- className ---

  describe('className prop', () => {
    it('should forward className when using Card', () => {
      const { container } = render(
        <ProgressBar
          currentValue={50}
          maxValue={100}
          className="my-progress"
        />
      );

      expect(container.firstElementChild?.className).toContain('my-progress');
    });

    it('should forward className when withCard is false', () => {
      const { container } = render(
        <ProgressBar
          currentValue={50}
          maxValue={100}
          withCard={false}
          className="my-progress"
        />
      );

      expect(container.firstElementChild?.className).toContain('my-progress');
    });
  });
});
