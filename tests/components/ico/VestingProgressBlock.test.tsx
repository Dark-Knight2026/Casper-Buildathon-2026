import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { VestingProgressBlock, VestingEntry } from '@/pages/ico/components/shared/VestingProgressBlock';

// Mock CountdownTimer
vi.mock('@/pages/ico/components/shared/CountdownTimer', () => ({
  CountdownTimer: ({ targetTimestamp }: { targetTimestamp: number }) => (
    <span data-testid="countdown-timer">{targetTimestamp}</span>
  ),
}));

// Mock ProgressBar
vi.mock('@/pages/ico/components/shared/ProgressBar', () => ({
  ProgressBar: ({ label, rightElement }: { label: string; rightElement?: React.ReactNode }) => (
    <div data-testid="progress-bar">
      <span>{label}</span>
      {rightElement}
    </div>
  ),
}));

describe('VestingProgressBlock', () => {
  const now = Date.now();
  const oneDay = 24 * 60 * 60 * 1000;

  const createMockEntry = (
    id: string,
    lockedAmount: number,
    daysUntilUnlock: number,
    unlockedAmount?: number
  ): VestingEntry => ({
    id,
    lockedAmount,
    unlockTimestamp: now + daysUntilUnlock * oneDay,
    purchaseTimestamp: now - 30 * oneDay,
    vestingEndTimestamp: now + (daysUntilUnlock + 60) * oneDay,
    unlockedAmount,
  });

  const mockEntries: VestingEntry[] = [
    createMockEntry('1', 1000, 10),
    createMockEntry('2', 2000, 20),
    createMockEntry('3', 3000, 30),
  ];

  describe('rendering', () => {
    it('should render with vesting entries', () => {
      render(<VestingProgressBlock vestingEntries={mockEntries} />);

      expect(screen.getByText(/Locked Tokens/)).toBeInTheDocument();
    });

    it('should render progress bar when there are upcoming unlocks', () => {
      render(<VestingProgressBlock vestingEntries={mockEntries} />);

      expect(screen.getByTestId('progress-bar')).toBeInTheDocument();
      expect(screen.getByText('Next Unlock')).toBeInTheDocument();
    });

    it('should render countdown timer for next unlock', () => {
      render(<VestingProgressBlock vestingEntries={mockEntries} />);

      expect(screen.getByTestId('countdown-timer')).toBeInTheDocument();
    });

    it('should not render locked section when no upcoming unlocks', () => {
      // All entries are in the past → upcomingUnlocks = [] → component renders nothing
      const pastEntries: VestingEntry[] = [
        {
          id: '1',
          lockedAmount: 1000,
          unlockTimestamp: now - oneDay,
          purchaseTimestamp: now - 30 * oneDay,
          vestingEndTimestamp: now - oneDay,
        },
      ];

      render(<VestingProgressBlock vestingEntries={pastEntries} />);

      expect(screen.queryByText(/Locked Tokens/)).not.toBeInTheDocument();
      expect(screen.queryByTestId('progress-bar')).not.toBeInTheDocument();
    });

    it('should not render entries list when all unlocked', () => {
      const pastEntries: VestingEntry[] = [
        {
          id: '1',
          lockedAmount: 1000,
          unlockTimestamp: now - oneDay,
          purchaseTimestamp: now - 30 * oneDay,
          vestingEndTimestamp: now - oneDay,
        },
      ];

      render(<VestingProgressBlock vestingEntries={pastEntries} />);

      expect(screen.queryByText(/Locked Tokens/)).not.toBeInTheDocument();
    });
  });

  describe('entries count display', () => {
    it('should display singular "entry" for one entry', () => {
      const singleEntry = [createMockEntry('1', 1000, 10)];

      render(<VestingProgressBlock vestingEntries={singleEntry} />);

      expect(screen.getByText(/1 entry/)).toBeInTheDocument();
    });

    it('should display plural "entries" for multiple entries', () => {
      render(<VestingProgressBlock vestingEntries={mockEntries} />);

      expect(screen.getByText(/3 entries/)).toBeInTheDocument();
    });
  });

  describe('token display', () => {
    // formatNumber uses toLocaleString with 2 decimal places → "1,000.00"
    it('should display default token symbol "BIG"', () => {
      const singleEntry = [createMockEntry('1', 1000, 10)];

      render(<VestingProgressBlock vestingEntries={singleEntry} />);

      const elements = screen.getAllByText(/1,000\.00 BIG/);
      expect(elements.length).toBeGreaterThanOrEqual(1);
    });

    it('should display custom token symbol', () => {
      const singleEntry = [createMockEntry('1', 1000, 10)];

      render(<VestingProgressBlock vestingEntries={singleEntry} tokenSymbol="LSFI" />);

      const elements = screen.getAllByText(/1,000\.00 LSFI/);
      expect(elements.length).toBeGreaterThanOrEqual(1);
    });

    it('should format token amounts with locale string', () => {
      const singleEntry = [createMockEntry('1', 1000000, 10)];

      render(<VestingProgressBlock vestingEntries={singleEntry} />);

      const elements = screen.getAllByText(/1,000,000\.00 BIG/);
      expect(elements.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('USD value calculations', () => {
    it('should display USD values when tokenPrice is provided', () => {
      const singleEntry = [createMockEntry('1', 1000, 10)];

      render(<VestingProgressBlock vestingEntries={singleEntry} tokenPrice={0.01} />);

      // USD appears in both entry and total sections
      const elements = screen.getAllByText(/≈ \$10.00/);
      expect(elements.length).toBeGreaterThanOrEqual(1);
    });

    it('should not display USD values when tokenPrice is not provided', () => {
      const singleEntry = [createMockEntry('1', 1000, 10)];

      render(<VestingProgressBlock vestingEntries={singleEntry} />);

      expect(screen.queryByText(/≈ \$/)).not.toBeInTheDocument();
    });
  });

  describe('total locked calculation', () => {
    it('should display total locked amount', () => {
      render(<VestingProgressBlock vestingEntries={mockEntries} />);

      // 1000 + 2000 + 3000 = 6000
      expect(screen.getByText('Total Locked')).toBeInTheDocument();
      expect(screen.getByText(/6,000\.00 BIG/)).toBeInTheDocument();
    });

    it('should show total as sum of lockedAmount (not subtracted by unlockedAmount)', () => {
      // totalLocked = sum(entry.lockedAmount) — component does not subtract unlockedAmount
      const entriesWithUnlocked: VestingEntry[] = [
        createMockEntry('1', 1000, 10, 200),
        createMockEntry('2', 2000, 20, 500),
      ];

      render(<VestingProgressBlock vestingEntries={entriesWithUnlocked} />);

      // 1000 + 2000 = 3000 (lockedAmount as-is)
      expect(screen.getByText(/3,000\.00 BIG/)).toBeInTheDocument();
    });

    it('should display total USD value when tokenPrice provided', () => {
      const singleEntry = [createMockEntry('1', 10000, 10)];

      render(<VestingProgressBlock vestingEntries={singleEntry} tokenPrice={0.01} />);

      // Total locked section should show USD
      const totalSection = screen.getByText('Total Locked').parentElement;
      expect(totalSection).toHaveTextContent('$100.00');
    });
  });

  describe('entry sorting', () => {
    it('should sort entries by unlock date ascending', () => {
      const unsortedEntries: VestingEntry[] = [
        createMockEntry('1', 1000, 30), // furthest
        createMockEntry('2', 2000, 10), // closest
        createMockEntry('3', 3000, 20), // middle
      ];

      render(<VestingProgressBlock vestingEntries={unsortedEntries} />);

      const entryDivs = screen.getAllByText(/BIG/).filter(el =>
        el.className.includes('font-medium')
      );

      // First entry should be 2000 (closest unlock) — formatNumber adds .00
      expect(entryDivs[0]).toHaveTextContent('2,000.00 BIG');
    });
  });

  describe('next unlock indicator', () => {
    it('should show "Next unlock" label on first entry', () => {
      render(<VestingProgressBlock vestingEntries={mockEntries} />);

      expect(screen.getByText('Next unlock')).toBeInTheDocument();
    });

    it('should only show "Next unlock" on one entry', () => {
      render(<VestingProgressBlock vestingEntries={mockEntries} />);

      const nextUnlockLabels = screen.getAllByText('Next unlock');
      expect(nextUnlockLabels).toHaveLength(1);
    });
  });

  describe('entry numbering', () => {
    it('should display entry numbers starting from 1', () => {
      render(<VestingProgressBlock vestingEntries={mockEntries} />);

      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
    });
  });

  describe('className prop', () => {
    it('should forward custom className', () => {
      const { container } = render(
        <VestingProgressBlock vestingEntries={mockEntries} className="my-custom-class" />
      );

      expect(container.firstElementChild?.className).toContain('my-custom-class');
    });

    it('should merge custom className with base styles', () => {
      const { container } = render(
        <VestingProgressBlock vestingEntries={mockEntries} className="p-4" />
      );

      expect(container.firstElementChild?.className).toContain('p-4');
      expect(container.firstElementChild?.className).toContain('w-full');
    });
  });

  describe('empty state', () => {
    it('should handle empty entries array', () => {
      // Empty entries → no upcoming unlocks → locked section not rendered
      render(<VestingProgressBlock vestingEntries={[]} />);

      expect(screen.queryByText(/Locked Tokens/)).not.toBeInTheDocument();
      expect(screen.queryByTestId('progress-bar')).not.toBeInTheDocument();
    });
  });
});
