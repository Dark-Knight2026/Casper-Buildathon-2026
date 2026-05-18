import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Home } from 'lucide-react';

import { QuickActionCard } from '@/components/help/QuickActionCard';

function renderCard(ui: React.ReactNode) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

describe('QuickActionCard', () => {
  describe('disabled mode', () => {
    it('renders neither a link nor a button and exposes aria-disabled', () => {
      renderCard(
        <QuickActionCard
          icon={Home}
          title="Property manager account"
          description="Coming soon"
          badge="Coming soon"
          disabled
        />
      );
      // The disabled variant intentionally drops the interactive role —
      // tabbing past it must skip without focusing a non-actionable surface.
      expect(
        screen.queryByRole('link'),
        'disabled card must not expose a link role'
      ).toBeNull();
      expect(
        screen.queryByRole('button'),
        'disabled card must not expose a button role'
      ).toBeNull();
      expect(
        screen.getByText(/property manager account/i).closest('[aria-disabled="true"]'),
        'disabled card must carry aria-disabled so AT users hear the state'
      ).not.toBeNull();
    });

    it('hides the "Get started" CTA when disabled', () => {
      renderCard(
        <QuickActionCard
          icon={Home}
          title="Property manager account"
          description="Coming soon"
          disabled
        />
      );
      expect(
        screen.queryByText(/get started/i),
        'disabled card must not promise a Get started action it cannot deliver'
      ).toBeNull();
    });
  });

  describe('href mode', () => {
    it('renders as a Link with the given href', () => {
      renderCard(
        <QuickActionCard
          icon={Home}
          title="Create landlord account"
          description="List rentals"
          href="/auth/register?role=landlord"
        />
      );
      const link = screen.getByRole('link', { name: /create landlord account/i });
      expect(
        link,
        'href mode must render as a real <a> so right-click and middle-click work'
      ).toHaveAttribute('href', '/auth/register?role=landlord');
    });

    it('renders metadata (duration, requirements, badge) when provided', () => {
      renderCard(
        <QuickActionCard
          icon={Home}
          title="Create landlord account"
          description="List rentals"
          href="/auth/register?role=landlord"
          duration="2 min"
          requirements="email, ID"
          badge="Free"
        />
      );
      expect(
        screen.getByText(/takes 2 min/i),
        'duration metadata helps the user budget time'
      ).toBeInTheDocument();
      expect(
        screen.getByText(/you'll need: email, ID/i),
        'requirements metadata sets expectations before the user clicks in'
      ).toBeInTheDocument();
      expect(
        screen.getByText('Free'),
        'badge must surface to label the card'
      ).toBeInTheDocument();
    });
  });

  describe('onClick mode', () => {
    it('renders as role=button and invokes onClick on click', () => {
      const onClick = vi.fn();
      renderCard(
        <QuickActionCard
          icon={Home}
          title="Contact support"
          description="Send us a note"
          onClick={onClick}
        />
      );
      const card = screen.getByRole('button', { name: /contact support/i });
      fireEvent.click(card);
      expect(
        onClick,
        'onClick mode must invoke the handler on a plain click'
      ).toHaveBeenCalledTimes(1);
    });

    it('invokes onClick on Enter and Space for keyboard users', () => {
      const onClick = vi.fn();
      renderCard(
        <QuickActionCard
          icon={Home}
          title="Contact support"
          description="Send us a note"
          onClick={onClick}
        />
      );
      const card = screen.getByRole('button', { name: /contact support/i });
      fireEvent.keyDown(card, { key: 'Enter' });
      fireEvent.keyDown(card, { key: ' ' });
      expect(
        onClick,
        'a div with role=button must replicate native Enter/Space behavior'
      ).toHaveBeenCalledTimes(2);
    });

    it('is reachable by keyboard via tabIndex=0', () => {
      renderCard(
        <QuickActionCard
          icon={Home}
          title="Contact support"
          description="Send us a note"
          onClick={() => {}}
        />
      );
      expect(
        screen.getByRole('button', { name: /contact support/i }),
        'tabIndex=0 lets the synthetic button join the tab order'
      ).toHaveAttribute('tabIndex', '0');
    });
  });
});
