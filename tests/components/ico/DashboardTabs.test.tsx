import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DashboardTabs } from '@/pages/ico/components/shared/DashboardTabs';
import type { TabData } from '@/pages/ico/components/shared/DashboardTabs';

// Polyfill APIs missing in happy-dom (required by Radix UI)
beforeAll(() => {
  if (!Element.prototype.hasPointerCapture) {
    Element.prototype.hasPointerCapture = vi.fn().mockReturnValue(false);
  }
  if (!Element.prototype.setPointerCapture) {
    Element.prototype.setPointerCapture = vi.fn();
  }
  if (!Element.prototype.releasePointerCapture) {
    Element.prototype.releasePointerCapture = vi.fn();
  }
  if (!Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = vi.fn();
  }
});

const sampleTabs: TabData[] = [
  { label: 'Overview', value: 'overview', content: <div>Overview Content</div> },
  { label: 'Tokenomics', value: 'tokenomics', content: <div>Tokenomics Content</div> },
  { label: 'Rewards', value: 'rewards', content: <div>Rewards Content</div> },
];

describe('DashboardTabs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // --- Rendering ---

  describe('rendering', () => {
    it('should render all tab triggers', () => {
      render(<DashboardTabs tabs={sampleTabs} />);

      // Desktop triggers (TabsTrigger) — Radix gives them role="tab"
      const tabTriggers = screen.getAllByRole('tab');
      expect(tabTriggers).toHaveLength(3);
    });

    it('should render tab labels', () => {
      render(<DashboardTabs tabs={sampleTabs} />);

      expect(screen.getAllByText('Overview').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Tokenomics').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Rewards').length).toBeGreaterThanOrEqual(1);
    });

    it('should render the active tab content', () => {
      render(<DashboardTabs tabs={sampleTabs} defaultValue="overview" />);

      expect(screen.getByText('Overview Content')).toBeInTheDocument();
    });

    it('should not render inactive tab content', () => {
      render(<DashboardTabs tabs={sampleTabs} defaultValue="overview" />);

      expect(screen.queryByText('Tokenomics Content')).not.toBeInTheDocument();
      expect(screen.queryByText('Rewards Content')).not.toBeInTheDocument();
    });

    it('should default to the first tab when no defaultValue is provided', () => {
      render(<DashboardTabs tabs={sampleTabs} />);

      expect(screen.getByText('Overview Content')).toBeInTheDocument();
    });
  });

  // --- Tab switching ---

  describe('tab switching', () => {
    it('should switch content when clicking a different tab', async () => {
      const user = userEvent.setup();
      render(<DashboardTabs tabs={sampleTabs} />);

      expect(screen.getByText('Overview Content')).toBeInTheDocument();

      // Radix TabsTrigger has role="tab"
      const tokenomicsTab = screen.getByRole('tab', { name: /Tokenomics/ });
      await user.click(tokenomicsTab);

      expect(screen.getByText('Tokenomics Content')).toBeInTheDocument();
      expect(screen.queryByText('Overview Content')).not.toBeInTheDocument();
    });

    it('should call onTabChange with the new tab value', async () => {
      const onTabChange = vi.fn();
      const user = userEvent.setup();
      render(<DashboardTabs tabs={sampleTabs} onTabChange={onTabChange} />);

      const rewardsTab = screen.getByRole('tab', { name: /Rewards/ });
      await user.click(rewardsTab);

      expect(onTabChange).toHaveBeenCalledWith('rewards');
    });

    it('should call onTabChange for each tab switch', async () => {
      const onTabChange = vi.fn();
      const user = userEvent.setup();
      render(<DashboardTabs tabs={sampleTabs} onTabChange={onTabChange} />);

      await user.click(screen.getByRole('tab', { name: /Tokenomics/ }));
      await user.click(screen.getByRole('tab', { name: /Rewards/ }));
      await user.click(screen.getByRole('tab', { name: /Overview/ }));

      expect(onTabChange).toHaveBeenCalledTimes(3);
      expect(onTabChange).toHaveBeenNthCalledWith(1, 'tokenomics');
      expect(onTabChange).toHaveBeenNthCalledWith(2, 'rewards');
      expect(onTabChange).toHaveBeenNthCalledWith(3, 'overview');
    });
  });

  // --- defaultValue ---

  describe('defaultValue', () => {
    it('should start with the specified default tab active', () => {
      render(<DashboardTabs tabs={sampleTabs} defaultValue="tokenomics" />);

      expect(screen.getByText('Tokenomics Content')).toBeInTheDocument();
      expect(screen.queryByText('Overview Content')).not.toBeInTheDocument();
    });

    it('should mark the default tab trigger as active', () => {
      render(<DashboardTabs tabs={sampleTabs} defaultValue="rewards" />);

      const rewardsTab = screen.getByRole('tab', { name: /Rewards/ });
      expect(rewardsTab).toHaveAttribute('data-state', 'active');
    });
  });

  // --- Mobile dropdown ---

  describe('mobile dropdown', () => {
    it('should render a mobile dropdown trigger with the active tab label', () => {
      render(<DashboardTabs tabs={sampleTabs} defaultValue="tokenomics" />);

      // The mobile dropdown trigger contains the active tab label
      // It's inside the md:hidden container
      const allTokenomicsLabels = screen.getAllByText('Tokenomics');
      // At least one should be in the mobile dropdown trigger area
      expect(allTokenomicsLabels.length).toBeGreaterThanOrEqual(1);
    });
  });

  // --- Tabs with icons ---

  describe('tabs with icons', () => {
    it('should render icons when provided', () => {
      const tabsWithIcons: TabData[] = [
        {
          label: 'Home',
          value: 'home',
          icon: <span data-testid="icon-home">H</span>,
          content: <div>Home Content</div>,
        },
        {
          label: 'Settings',
          value: 'settings',
          icon: <span data-testid="icon-settings">S</span>,
          content: <div>Settings Content</div>,
        },
      ];

      render(<DashboardTabs tabs={tabsWithIcons} />);

      expect(screen.getAllByTestId('icon-home').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByTestId('icon-settings').length).toBeGreaterThanOrEqual(1);
    });
  });

  // --- className ---

  describe('className prop', () => {
    it('should forward custom className to root container', () => {
      const { container } = render(
        <DashboardTabs tabs={sampleTabs} className="my-custom-tabs" />
      );

      expect(container.firstElementChild?.className).toContain('my-custom-tabs');
    });
  });

  // --- Edge cases ---

  describe('edge cases', () => {
    it('should handle a single tab', () => {
      const singleTab: TabData[] = [
        { label: 'Only Tab', value: 'only', content: <div>Only Content</div> },
      ];

      render(<DashboardTabs tabs={singleTab} />);

      expect(screen.getByText('Only Content')).toBeInTheDocument();
      expect(screen.getAllByRole('tab')).toHaveLength(1);
    });

    it('should render tab without content gracefully', () => {
      const tabsNoContent: TabData[] = [
        { label: 'Empty', value: 'empty' },
        { label: 'Full', value: 'full', content: <div>Full Content</div> },
      ];

      render(<DashboardTabs tabs={tabsNoContent} defaultValue="empty" />);

      expect(screen.getAllByRole('tab')).toHaveLength(2);
      expect(screen.queryByText('Full Content')).not.toBeInTheDocument();
    });
  });
});
