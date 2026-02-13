import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { DashboardICOCountdown } from '@/pages/ico/components/states/DashboardICOCountdown';
import { ICO_CONFIG } from '@/constants/ico';

// Mock the child components
vi.mock('@/pages/ico/components/shared/CountdownTimer', () => ({
  CountdownTimer: ({ targetTimestamp }: { targetTimestamp: number }) => (
    <div data-testid="countdown-timer">Countdown: {targetTimestamp}</div>
  ),
}));

vi.mock('@/pages/ico/components/shared/Card', () => ({
  Card: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="card" className={className}>{children}</div>
  ),
}));

vi.mock('@/pages/ico/components/shared/VestingProgressBlock', () => ({
  VestingProgressBlock: () => <div data-testid="vesting-progress-block">Vesting Progress</div>,
  VestingEntry: {},
}));

vi.mock('@/pages/ico/components/shared/Title', () => ({
  Title: ({ children }: { children: React.ReactNode }) => (
    <h1 data-testid="title">{children}</h1>
  ),
}));

const renderWithRouter = (ui: React.ReactElement) => {
  return render(<BrowserRouter>{ui}</BrowserRouter>);
};

describe('DashboardICOCountdown', () => {
  const mockIcoStartTimestamp = Date.now() + 14 * 24 * 60 * 60 * 1000; // 14 days from now

  describe('rendering', () => {
    it('should render the Dashboard title', () => {
      renderWithRouter(<DashboardICOCountdown icoStartTimestamp={mockIcoStartTimestamp} />);

      expect(screen.getByTestId('title')).toHaveTextContent('Dashboard');
    });

    it('should render the Public ICO Starts In text', () => {
      renderWithRouter(<DashboardICOCountdown icoStartTimestamp={mockIcoStartTimestamp} />);

      expect(screen.getByText('Public ICO Starts In')).toBeInTheDocument();
    });

    it('should render the countdown timer', () => {
      renderWithRouter(<DashboardICOCountdown icoStartTimestamp={mockIcoStartTimestamp} />);

      expect(screen.getByTestId('countdown-timer')).toBeInTheDocument();
    });

    it('should display ICO price', () => {
      renderWithRouter(<DashboardICOCountdown icoStartTimestamp={mockIcoStartTimestamp} />);

      expect(screen.getByText(/ICO Price:/)).toBeInTheDocument();
      expect(screen.getByText(`$${ICO_CONFIG.PUBLIC_ICO.price}`)).toBeInTheDocument();
    });
  });

  describe('dashboard cards', () => {
    it('should render BIG Purchased card', () => {
      renderWithRouter(<DashboardICOCountdown icoStartTimestamp={mockIcoStartTimestamp} />);

      expect(screen.getByText('BIG Purchased')).toBeInTheDocument();
    });

    it('should render BIG Locked card', () => {
      renderWithRouter(<DashboardICOCountdown icoStartTimestamp={mockIcoStartTimestamp} />);

      expect(screen.getByText('BIG Locked')).toBeInTheDocument();
    });

    it('should render BIG Available card', () => {
      renderWithRouter(<DashboardICOCountdown icoStartTimestamp={mockIcoStartTimestamp} />);

      expect(screen.getByText('BIG Available')).toBeInTheDocument();
    });

    it('should render Est. Value card', () => {
      renderWithRouter(<DashboardICOCountdown icoStartTimestamp={mockIcoStartTimestamp} />);

      expect(screen.getByText('Est. Value')).toBeInTheDocument();
    });
  });

  describe('vesting schedule', () => {
    it('should render Vesting Schedule section', () => {
      renderWithRouter(<DashboardICOCountdown icoStartTimestamp={mockIcoStartTimestamp} />);

      expect(screen.getByText('Vesting Schedule')).toBeInTheDocument();
    });

    it('should display Vesting Starts', () => {
      renderWithRouter(<DashboardICOCountdown icoStartTimestamp={mockIcoStartTimestamp} />);

      expect(screen.getByText('Vesting Starts')).toBeInTheDocument();
      expect(screen.getByText('After ICO ends')).toBeInTheDocument();
    });

    it('should display Cliff Period', () => {
      renderWithRouter(<DashboardICOCountdown icoStartTimestamp={mockIcoStartTimestamp} />);

      expect(screen.getByText('Cliff Period')).toBeInTheDocument();
      expect(screen.getByText('3 months')).toBeInTheDocument();
    });

    it('should display Total Duration', () => {
      renderWithRouter(<DashboardICOCountdown icoStartTimestamp={mockIcoStartTimestamp} />);

      expect(screen.getByText('Total Duration')).toBeInTheDocument();
      expect(screen.getByText('12 months')).toBeInTheDocument();
    });

    it('should render the vesting progress block', () => {
      renderWithRouter(<DashboardICOCountdown icoStartTimestamp={mockIcoStartTimestamp} />);

      expect(screen.getByTestId('vesting-progress-block')).toBeInTheDocument();
    });
  });

  describe('info banner', () => {
    it('should render the Your Tokens Are Locked banner', () => {
      renderWithRouter(<DashboardICOCountdown icoStartTimestamp={mockIcoStartTimestamp} />);

      expect(screen.getByText('Your Tokens Are Locked')).toBeInTheDocument();
    });

    it('should display the vesting explanation text', () => {
      renderWithRouter(<DashboardICOCountdown icoStartTimestamp={mockIcoStartTimestamp} />);

      expect(screen.getByText(/Pre-sale tokens are secured in the vesting contract/)).toBeInTheDocument();
    });
  });

  describe('custom className', () => {
    it('should apply custom className', () => {
      const { container } = renderWithRouter(
        <DashboardICOCountdown icoStartTimestamp={mockIcoStartTimestamp} className="custom-class" />
      );

      expect(container.firstChild).toHaveClass('custom-class');
    });
  });
});
