import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { PrivateSaleCountdown } from '@/pages/ico/components/states/PrivateSaleCountdown';
import { ICO_CONFIG } from '@/constants/ico';
import type { ScheduleProgress } from '@/hooks/ico/useICOSchedules';

// Mock progress data for tests that need it
const mockProgress: ScheduleProgress = {
  priceUsd: 0.001,
  totalAllocation: 750000000,
  tokensSold: 100000000,
  tokensRemaining: 650000000,
  amountRaised: 100000,
  percentSold: 13.33,
  hardCapUsd: 750000,
};

// Mock react-router-dom navigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock the child components
vi.mock('@/pages/ico/components/shared/CountdownTimer', () => ({
  CountdownTimer: ({ targetTimestamp }: { targetTimestamp: number }) => (
    <div data-testid="countdown-timer">Countdown: {targetTimestamp}</div>
  ),
}));

vi.mock('@/pages/ico/components/shared/MainButton', () => ({
  MainButton: ({ text, onClick }: { text: string; onClick: () => void }) => (
    <button data-testid="main-button" onClick={onClick}>{text}</button>
  ),
}));

vi.mock('@/pages/ico/components/shared/InfoCard', () => ({
  InfoCard: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="info-card" className={className}>{children}</div>
  ),
}));

vi.mock('@/hooks/use-mobile', () => ({
  useIsMobile: () => false,
}));

const renderWithRouter = (ui: React.ReactElement) => {
  return render(<BrowserRouter>{ui}</BrowserRouter>);
};

describe('PrivateSaleCountdown', () => {
  let mockTargetTimestamp: number;
  let mockEndTimestamp: number;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-06-01T12:00:00Z'));
    mockTargetTimestamp = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days from fixed base
    mockEndTimestamp = Date.now() + 30 * 24 * 60 * 60 * 1000; // 30 days from fixed base
    mockNavigate.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('rendering', () => {
    it('should render the component with title', () => {
      renderWithRouter(
        <PrivateSaleCountdown targetTimestamp={mockTargetTimestamp} endTimestamp={mockEndTimestamp} />
      );

      expect(screen.getByText(`${ICO_CONFIG.TOKEN.symbol} Private Sale`)).toBeInTheDocument();
    });

    it('should render the starts in text', () => {
      renderWithRouter(
        <PrivateSaleCountdown targetTimestamp={mockTargetTimestamp} endTimestamp={mockEndTimestamp} />
      );

      expect(screen.getByText('Starts In')).toBeInTheDocument();
    });

    it('should render the countdown timer', () => {
      renderWithRouter(
        <PrivateSaleCountdown targetTimestamp={mockTargetTimestamp} endTimestamp={mockEndTimestamp} />
      );

      expect(screen.getByTestId('countdown-timer')).toBeInTheDocument();
    });

    it('should render the info card with private sale details when progress is provided', () => {
      renderWithRouter(
        <PrivateSaleCountdown targetTimestamp={mockTargetTimestamp} endTimestamp={mockEndTimestamp} progress={mockProgress} />
      );

      expect(screen.getByTestId('info-card')).toBeInTheDocument();
    });

    it('should display token price when progress is provided', () => {
      renderWithRouter(
        <PrivateSaleCountdown targetTimestamp={mockTargetTimestamp} endTimestamp={mockEndTimestamp} progress={mockProgress} />
      );

      expect(screen.getByText('Token Price')).toBeInTheDocument();
      expect(screen.getByText(`$${mockProgress.priceUsd.toFixed(2)}`)).toBeInTheDocument();
    });

    it('should display allocation when progress is provided', () => {
      renderWithRouter(
        <PrivateSaleCountdown targetTimestamp={mockTargetTimestamp} endTimestamp={mockEndTimestamp} progress={mockProgress} />
      );

      expect(screen.getByText('Allocation')).toBeInTheDocument();
    });

    it('should display hard cap when progress is provided', () => {
      renderWithRouter(
        <PrivateSaleCountdown targetTimestamp={mockTargetTimestamp} endTimestamp={mockEndTimestamp} progress={mockProgress} />
      );

      expect(screen.getByText('Hard Cap')).toBeInTheDocument();
    });

    it('should display private sale ends date when progress is provided', () => {
      renderWithRouter(
        <PrivateSaleCountdown targetTimestamp={mockTargetTimestamp} endTimestamp={mockEndTimestamp} progress={mockProgress} />
      );

      expect(screen.getByText('Private Sale Ends:')).toBeInTheDocument();
    });

    it('should not render info card when progress is not provided', () => {
      renderWithRouter(
        <PrivateSaleCountdown targetTimestamp={mockTargetTimestamp} endTimestamp={mockEndTimestamp} />
      );

      expect(screen.queryByTestId('info-card')).not.toBeInTheDocument();
    });

    it('should render the Learn More button', () => {
      renderWithRouter(
        <PrivateSaleCountdown targetTimestamp={mockTargetTimestamp} endTimestamp={mockEndTimestamp} />
      );

      expect(screen.getByTestId('main-button')).toBeInTheDocument();
      expect(screen.getByText('Learn More')).toBeInTheDocument();
    });
  });

  describe('navigation', () => {
    it('should navigate to whitepaper when Learn More is clicked', () => {
      renderWithRouter(
        <PrivateSaleCountdown targetTimestamp={mockTargetTimestamp} endTimestamp={mockEndTimestamp} />
      );

      fireEvent.click(screen.getByText('Learn More'));

      expect(mockNavigate).toHaveBeenCalledWith('/big-token/whitepaper');
    });
  });

  describe('custom className', () => {
    it('should apply custom className', () => {
      const { container } = renderWithRouter(
        <PrivateSaleCountdown
          targetTimestamp={mockTargetTimestamp}
          endTimestamp={mockEndTimestamp}
          className="custom-class"
        />
      );

      expect(container.firstChild).toHaveClass('custom-class');
    });
  });
});
