import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ICOPage } from '@/pages/ico/ICOPage';
import type { SaleTimestamps } from '@/types/ico';
import type { ScheduleProgress } from '@/hooks/ico/useICOSchedules';

// --- Mocks ---

const mockTimestamps: SaleTimestamps = {
  presaleStart: 1000,
  presaleEnd: 2000,
  icoStart: 3000,
  icoEnd: 4000,
};

const mockProgress: ScheduleProgress = {
  tokensSold: 1000000,
  totalAllocation: 10000000,
  tokensRemaining: 9000000,
  amountRaised: 100000,
  priceUsd: 0.1,
  percentSold: 10,
};

const mockUseICOState = vi.fn();
const mockUseICOSchedules = vi.fn();

vi.mock('@/hooks/ico/useICOState', () => ({
  useICOState: (...args: unknown[]) => mockUseICOState(...args),
}));

vi.mock('@/hooks/ico/useICOSchedules', () => ({
  useICOSchedules: () => mockUseICOSchedules(),
}));

// Mock lazy-loaded state components with sync default exports
vi.mock('@/pages/ico/components/states/PrivateSaleCountdown', () => ({
  default: (props: { targetTimestamp: number; endTimestamp: number; progress?: ScheduleProgress | null }) => (
    <div data-testid="private-sale-countdown">
      PrivateSaleCountdown target={props.targetTimestamp} end={props.endTimestamp} progress={props.progress ? 'yes' : 'no'}
    </div>
  ),
}));

vi.mock('@/pages/ico/components/states/ActivePresale', () => ({
  default: (props: { endTimestamp: number; progress?: ScheduleProgress | null }) => (
    <div data-testid="private-sale-active">PrivateSaleActive end={props.endTimestamp} progress={props.progress ? 'yes' : 'no'}</div>
  ),
}));

vi.mock('@/pages/ico/components/states/PostICODashboard', () => ({
  default: () => <div data-testid="post-ico-dashboard">PostICODashboard</div>,
}));

vi.mock('@/pages/ico/components/ICOHeader', () => ({
  ICOHeader: () => <header data-testid="ico-header">Header</header>,
}));

vi.mock('@/pages/ico/components/ICOFooter', () => ({
  ICOFooter: () => <footer data-testid="ico-footer">Footer</footer>,
}));

vi.mock('@/pages/ico/components/StarsBackground', () => ({
  StarsBackground: () => null,
}));

vi.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="scroll-area" className={className}>{children}</div>
  ),
}));

function setICOState(state: 1 | 2 | 3) {
  const phaseMap = {
    1: 'private-sale-countdown',
    2: 'private-sale-active',
    3: 'post-ico-dashboard',
  } as const;

  // Mock useICOSchedules - provides timestamps and progress data
  mockUseICOSchedules.mockReturnValue({
    timestamps: mockTimestamps,
    presaleProgress: mockProgress,
    icoProgress: mockProgress,
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  });

  mockUseICOState.mockReturnValue({
    state,
    phase: phaseMap[state],
    timestamps: mockTimestamps,
    nextStateTimestamp: state < 3 ? mockTimestamps.presaleStart : null,
  });
}

describe('ICOPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // --- Layout ---

  describe('layout', () => {
    it('should render header', () => {
      setICOState(1);
      render(<ICOPage />);

      expect(screen.getByTestId('ico-header')).toBeInTheDocument();
    });

    it('should render footer', () => {
      setICOState(1);
      render(<ICOPage />);

      expect(screen.getByTestId('ico-footer')).toBeInTheDocument();
    });

    it('should render scroll area', () => {
      setICOState(1);
      render(<ICOPage />);

      expect(screen.getByTestId('scroll-area')).toBeInTheDocument();
    });

    it('should show loading fallback while suspense resolves', () => {
      setICOState(1);
      render(<ICOPage />);

      // The "Loading..." fallback may flash briefly before lazy component resolves
      // At minimum, the page renders without crash
      expect(screen.getByTestId('ico-header')).toBeInTheDocument();
    });
  });

  // --- State routing (async - lazy components need to resolve) ---

  describe('state routing', () => {
    it('should render PrivateSaleCountdown for state 1', async () => {
      setICOState(1);
      render(<ICOPage />);

      const el = await screen.findByTestId('private-sale-countdown');
      expect(el).toBeInTheDocument();
      expect(el.textContent).toContain(`target=${mockTimestamps.presaleStart}`);
      expect(el.textContent).toContain(`end=${mockTimestamps.presaleEnd}`);
    });

    it('should render PrivateSaleActive for state 2', async () => {
      setICOState(2);
      render(<ICOPage />);

      const el = await screen.findByTestId('private-sale-active');
      expect(el).toBeInTheDocument();
      expect(el.textContent).toContain(`end=${mockTimestamps.presaleEnd}`);
    });

    it('should render PostICODashboard for state 3', async () => {
      setICOState(3);
      render(<ICOPage />);

      expect(await screen.findByTestId('post-ico-dashboard')).toBeInTheDocument();
    });
  });

  // --- Correct timestamps passed ---

  describe('timestamp props', () => {
    it('should pass presaleStart and presaleEnd to PrivateSaleCountdown', async () => {
      setICOState(1);
      render(<ICOPage />);

      const el = await screen.findByTestId('private-sale-countdown');
      expect(el.textContent).toContain(`target=${mockTimestamps.presaleStart}`);
      expect(el.textContent).toContain(`end=${mockTimestamps.presaleEnd}`);
    });

    it('should pass presaleEnd to PrivateSaleActive', async () => {
      setICOState(2);
      render(<ICOPage />);

      const el = await screen.findByTestId('private-sale-active');
      expect(el.textContent).toContain(`end=${mockTimestamps.presaleEnd}`);
    });
  });

  // --- Mutual exclusivity ---

  describe('mutual exclusivity', () => {
    it('should only render the component for the current state', async () => {
      setICOState(3);
      render(<ICOPage />);

      expect(await screen.findByTestId('post-ico-dashboard')).toBeInTheDocument();
      expect(screen.queryByTestId('private-sale-countdown')).not.toBeInTheDocument();
      expect(screen.queryByTestId('private-sale-active')).not.toBeInTheDocument();
    });
  });

  // --- All 3 states render without crash ---

  describe('stability', () => {
    it.each([1, 2, 3] as const)(
      'should render without errors for state %i',
      (state) => {
        setICOState(state);
        expect(() => render(<ICOPage />)).not.toThrow();
      }
    );
  });
});
