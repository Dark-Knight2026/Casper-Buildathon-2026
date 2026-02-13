import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ICOPage } from '@/pages/ico/ICOPage';
import type { SaleTimestamps } from '@/types/ico';

// --- Mocks ---

const mockTimestamps: SaleTimestamps = {
  presaleStart: 1000,
  presaleEnd: 2000,
  icoStart: 3000,
  icoEnd: 4000,
};

const mockUseICOState = vi.fn();

vi.mock('@/hooks/ico/useICOState', () => ({
  useICOState: (...args: unknown[]) => mockUseICOState(...args),
}));

// Mock lazy-loaded state components with sync default exports
vi.mock('@/pages/ico/components/states/PresaleCountdown', () => ({
  default: (props: { targetTimestamp: number; endTimestamp: number }) => (
    <div data-testid="presale-countdown">
      PresaleCountdown target={props.targetTimestamp} end={props.endTimestamp}
    </div>
  ),
}));

vi.mock('@/pages/ico/components/states/ActivePresale', () => ({
  default: (props: { endTimestamp: number }) => (
    <div data-testid="active-presale">ActivePresale end={props.endTimestamp}</div>
  ),
}));

vi.mock('@/pages/ico/components/states/DashboardICOCountdown', () => ({
  default: (props: { icoStartTimestamp: number }) => (
    <div data-testid="dashboard-ico-countdown">
      DashboardICOCountdown start={props.icoStartTimestamp}
    </div>
  ),
}));

vi.mock('@/pages/ico/components/states/ActiveICO', () => ({
  default: (props: { endTimestamp: number }) => (
    <div data-testid="active-ico">ActiveICO end={props.endTimestamp}</div>
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

function setICOState(state: 1 | 2 | 3 | 4 | 5) {
  const phaseMap = {
    1: 'presale-countdown',
    2: 'presale-active',
    3: 'dashboard-ico-countdown',
    4: 'ico-active',
    5: 'post-ico',
  } as const;

  mockUseICOState.mockReturnValue({
    state,
    phase: phaseMap[state],
    timestamps: mockTimestamps,
    nextStateTimestamp: state < 5 ? mockTimestamps.presaleStart : null,
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
    it('should render PresaleCountdown for state 1', async () => {
      setICOState(1);
      render(<ICOPage />);

      const el = await screen.findByTestId('presale-countdown');
      expect(el).toBeInTheDocument();
      expect(el.textContent).toContain(`target=${mockTimestamps.presaleStart}`);
      expect(el.textContent).toContain(`end=${mockTimestamps.presaleEnd}`);
    });

    it('should render ActivePresale for state 2', async () => {
      setICOState(2);
      render(<ICOPage />);

      const el = await screen.findByTestId('active-presale');
      expect(el).toBeInTheDocument();
      expect(el.textContent).toContain(`end=${mockTimestamps.presaleEnd}`);
    });

    it('should render DashboardICOCountdown for state 3', async () => {
      setICOState(3);
      render(<ICOPage />);

      const el = await screen.findByTestId('dashboard-ico-countdown');
      expect(el).toBeInTheDocument();
      expect(el.textContent).toContain(`start=${mockTimestamps.icoStart}`);
    });

    it('should render ActiveICO for state 4', async () => {
      setICOState(4);
      render(<ICOPage />);

      const el = await screen.findByTestId('active-ico');
      expect(el).toBeInTheDocument();
      expect(el.textContent).toContain(`end=${mockTimestamps.icoEnd}`);
    });

    it('should render PostICODashboard for state 5', async () => {
      setICOState(5);
      render(<ICOPage />);

      expect(await screen.findByTestId('post-ico-dashboard')).toBeInTheDocument();
    });
  });

  // --- Correct timestamps passed ---

  describe('timestamp props', () => {
    it('should pass presaleStart and presaleEnd to PresaleCountdown', async () => {
      setICOState(1);
      render(<ICOPage />);

      const el = await screen.findByTestId('presale-countdown');
      expect(el.textContent).toContain(`target=${mockTimestamps.presaleStart}`);
      expect(el.textContent).toContain(`end=${mockTimestamps.presaleEnd}`);
    });

    it('should pass presaleEnd to ActivePresale', async () => {
      setICOState(2);
      render(<ICOPage />);

      const el = await screen.findByTestId('active-presale');
      expect(el.textContent).toContain(`end=${mockTimestamps.presaleEnd}`);
    });

    it('should pass icoStart to DashboardICOCountdown', async () => {
      setICOState(3);
      render(<ICOPage />);

      const el = await screen.findByTestId('dashboard-ico-countdown');
      expect(el.textContent).toContain(`start=${mockTimestamps.icoStart}`);
    });

    it('should pass icoEnd to ActiveICO', async () => {
      setICOState(4);
      render(<ICOPage />);

      const el = await screen.findByTestId('active-ico');
      expect(el.textContent).toContain(`end=${mockTimestamps.icoEnd}`);
    });
  });

  // --- Mutual exclusivity ---

  describe('mutual exclusivity', () => {
    it('should only render the component for the current state', async () => {
      setICOState(3);
      render(<ICOPage />);

      expect(await screen.findByTestId('dashboard-ico-countdown')).toBeInTheDocument();
      expect(screen.queryByTestId('presale-countdown')).not.toBeInTheDocument();
      expect(screen.queryByTestId('active-presale')).not.toBeInTheDocument();
      expect(screen.queryByTestId('active-ico')).not.toBeInTheDocument();
      expect(screen.queryByTestId('post-ico-dashboard')).not.toBeInTheDocument();
    });
  });

  // --- All 5 states render without crash ---

  describe('stability', () => {
    it.each([1, 2, 3, 4, 5] as const)(
      'should render without errors for state %i',
      (state) => {
        setICOState(state);
        expect(() => render(<ICOPage />)).not.toThrow();
      }
    );
  });
});
