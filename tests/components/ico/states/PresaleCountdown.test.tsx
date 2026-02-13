import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter, useNavigate } from 'react-router-dom';
import { PresaleCountdown } from '@/pages/ico/components/states/PresaleCountdown';
import { ICO_CONFIG } from '@/constants/ico';

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

describe('PresaleCountdown', () => {
  const mockTargetTimestamp = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days from now
  const mockEndTimestamp = Date.now() + 30 * 24 * 60 * 60 * 1000; // 30 days from now

  beforeEach(() => {
    mockNavigate.mockClear();
  });

  describe('rendering', () => {
    it('should render the component with title', () => {
      renderWithRouter(
        <PresaleCountdown targetTimestamp={mockTargetTimestamp} endTimestamp={mockEndTimestamp} />
      );

      expect(screen.getByText(`${ICO_CONFIG.TOKEN.symbol} Token Presale`)).toBeInTheDocument();
    });

    it('should render the presale starts in text', () => {
      renderWithRouter(
        <PresaleCountdown targetTimestamp={mockTargetTimestamp} endTimestamp={mockEndTimestamp} />
      );

      expect(screen.getByText('Presale Sale Starts In')).toBeInTheDocument();
    });

    it('should render the countdown timer', () => {
      renderWithRouter(
        <PresaleCountdown targetTimestamp={mockTargetTimestamp} endTimestamp={mockEndTimestamp} />
      );

      expect(screen.getByTestId('countdown-timer')).toBeInTheDocument();
    });

    it('should render the info card with presale details', () => {
      renderWithRouter(
        <PresaleCountdown targetTimestamp={mockTargetTimestamp} endTimestamp={mockEndTimestamp} />
      );

      expect(screen.getByTestId('info-card')).toBeInTheDocument();
    });

    it('should display token price', () => {
      renderWithRouter(
        <PresaleCountdown targetTimestamp={mockTargetTimestamp} endTimestamp={mockEndTimestamp} />
      );

      expect(screen.getByText('Token Price')).toBeInTheDocument();
      expect(screen.getByText(`$${ICO_CONFIG.PRE_SALE.price}`)).toBeInTheDocument();
    });

    it('should display allocation', () => {
      renderWithRouter(
        <PresaleCountdown targetTimestamp={mockTargetTimestamp} endTimestamp={mockEndTimestamp} />
      );

      expect(screen.getByText('Allocation')).toBeInTheDocument();
    });

    it('should display hard cap', () => {
      renderWithRouter(
        <PresaleCountdown targetTimestamp={mockTargetTimestamp} endTimestamp={mockEndTimestamp} />
      );

      expect(screen.getByText('Hard Cap')).toBeInTheDocument();
    });

    it('should display presale ends date', () => {
      renderWithRouter(
        <PresaleCountdown targetTimestamp={mockTargetTimestamp} endTimestamp={mockEndTimestamp} />
      );

      expect(screen.getByText('Presale Ends:')).toBeInTheDocument();
    });

    it('should render the Learn More button', () => {
      renderWithRouter(
        <PresaleCountdown targetTimestamp={mockTargetTimestamp} endTimestamp={mockEndTimestamp} />
      );

      expect(screen.getByTestId('main-button')).toBeInTheDocument();
      expect(screen.getByText('Learn More')).toBeInTheDocument();
    });
  });

  describe('navigation', () => {
    it('should navigate to whitepaper when Learn More is clicked', () => {
      renderWithRouter(
        <PresaleCountdown targetTimestamp={mockTargetTimestamp} endTimestamp={mockEndTimestamp} />
      );

      fireEvent.click(screen.getByText('Learn More'));

      expect(mockNavigate).toHaveBeenCalledWith('/ico/whitepaper');
    });
  });

  describe('custom className', () => {
    it('should apply custom className', () => {
      const { container } = renderWithRouter(
        <PresaleCountdown
          targetTimestamp={mockTargetTimestamp}
          endTimestamp={mockEndTimestamp}
          className="custom-class"
        />
      );

      expect(container.firstChild).toHaveClass('custom-class');
    });
  });
});
