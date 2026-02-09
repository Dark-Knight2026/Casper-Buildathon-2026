import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { PostICODashboard } from '@/pages/ico/components/states/PostICODashboard';

// Mock the child components
vi.mock('@/pages/ico/components/shared/DashboardTabs', () => ({
  DashboardTabs: ({ tabs, defaultValue }: { tabs: Array<{ label: string; value: string }>; defaultValue: string }) => (
    <div data-testid="dashboard-tabs">
      <span data-testid="default-value">{defaultValue}</span>
      {tabs.map((tab) => (
        <div key={tab.value} data-testid={`tab-${tab.value}`}>
          {tab.label}
        </div>
      ))}
    </div>
  ),
}));

vi.mock('@/pages/ico/components/states/OverviewTab', () => ({
  OverviewTab: () => <div data-testid="overview-tab-content">Overview Content</div>,
}));

vi.mock('@/pages/ico/components/states/RewardsTab', () => ({
  RewardsTab: () => <div data-testid="rewards-tab-content">Rewards Content</div>,
}));

vi.mock('@/pages/ico/components/states/TokenomicsTab', () => ({
  TokenomicsTab: () => <div data-testid="tokenomics-tab-content">Tokenomics Content</div>,
}));

vi.mock('@/pages/ico/components/states/WhitepaperTab', () => ({
  WhitepaperTab: () => <div data-testid="whitepaper-tab-content">Whitepaper Content</div>,
}));

const renderWithRouter = (ui: React.ReactElement) => {
  return render(<BrowserRouter>{ui}</BrowserRouter>);
};

describe('PostICODashboard', () => {
  describe('rendering', () => {
    it('should render the dashboard tabs component', () => {
      renderWithRouter(<PostICODashboard />);

      expect(screen.getByTestId('dashboard-tabs')).toBeInTheDocument();
    });

    it('should have overview as the default tab', () => {
      renderWithRouter(<PostICODashboard />);

      expect(screen.getByTestId('default-value')).toHaveTextContent('overview');
    });
  });

  describe('tabs configuration', () => {
    it('should render Exchange tab', () => {
      renderWithRouter(<PostICODashboard />);

      expect(screen.getByTestId('tab-exchange')).toBeInTheDocument();
      expect(screen.getByText('Exchange')).toBeInTheDocument();
    });

    it('should render Overview tab', () => {
      renderWithRouter(<PostICODashboard />);

      expect(screen.getByTestId('tab-overview')).toBeInTheDocument();
      expect(screen.getByText('Overview')).toBeInTheDocument();
    });

    it('should render Rewards tab', () => {
      renderWithRouter(<PostICODashboard />);

      expect(screen.getByTestId('tab-rewards')).toBeInTheDocument();
      expect(screen.getByText('Rewards')).toBeInTheDocument();
    });

    it('should render Tokenomics tab', () => {
      renderWithRouter(<PostICODashboard />);

      expect(screen.getByTestId('tab-tokenomics')).toBeInTheDocument();
      expect(screen.getByText('Tokenomics')).toBeInTheDocument();
    });

    it('should render WhitePaper tab', () => {
      renderWithRouter(<PostICODashboard />);

      expect(screen.getByTestId('tab-whitepaper')).toBeInTheDocument();
      expect(screen.getByText('WhitePaper')).toBeInTheDocument();
    });

    it('should have 5 tabs total', () => {
      renderWithRouter(<PostICODashboard />);

      const tabs = [
        'tab-exchange',
        'tab-overview',
        'tab-rewards',
        'tab-tokenomics',
        'tab-whitepaper',
      ];

      tabs.forEach((tabTestId) => {
        expect(screen.getByTestId(tabTestId)).toBeInTheDocument();
      });
    });
  });

  describe('custom className', () => {
    it('should apply custom className', () => {
      const { container } = renderWithRouter(<PostICODashboard className="custom-class" />);

      expect(container.firstChild).toHaveClass('custom-class');
    });
  });
});
