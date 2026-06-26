import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { RecommendedProperties } from '@/components/tenant/RecommendedProperties';
import { FEATURED_PROPERTIES } from '@/data/featuredProperties';
import { clearStoredPreferences, setStoredPreferences } from '@/data/tenantPreferences';
import { ALL_MATCH_CATEGORIES } from '@/types/tenantPreferences';
import type { Property } from '@/types/property';

const NOW = new Date('2026-05-05T12:00:00Z');
const TENANT_ID = 'rec-test-tenant';

// pick a real property for "current home" so derive logic has all fields
const CURRENT_PROPERTY: Property = FEATURED_PROPERTIES.find((p) => p.id === 'prop-2')!;

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
  clearStoredPreferences(TENANT_ID);
});

function renderSection(opts: { leaseEndDate: Date; explicitPrefs?: boolean; variant?: 'compact' | 'full' }) {
  if (opts.explicitPrefs) {
    setStoredPreferences(TENANT_ID, {
      budgetMin: 1500,
      budgetMax: 2500,
      bedroomsMin: 2,
      bathroomsMin: null,
      squareFeetMin: null,
      locations: [{ city: 'Norfolk', state: 'VA' }],
      propertyTypes: ['Condo'],
      amenities: [],
    });
  }
  return render(
    <MemoryRouter>
      <RecommendedProperties
        tenantId={TENANT_ID}
        leaseEndDate={opts.leaseEndDate}
        monthlyRent={2100}
        currentProperty={CURRENT_PROPERTY}
        variant={opts.variant ?? 'compact'}
      />
    </MemoryRouter>
  );
}

describe('RecommendedProperties', () => {
  describe('180-day window gate', () => {
    it('renders nothing when the lease ends beyond 180 days', () => {
      const farOut = new Date(NOW.getTime() + 200 * 86400000);
      const { container } = renderSection({ leaseEndDate: farOut });
      expect(
        container.firstChild,
        'lease > 180 days out — Task 6 must stay silent until the tenant enters the renewal window'
      ).toBeNull();
    });

    it('renders nothing for an already-expired lease', () => {
      const past = new Date(NOW.getTime() - 86400000);
      const { container } = renderSection({ leaseEndDate: past });
      expect(
        container.firstChild,
        'expired lease has nothing to recommend against — section must not surface'
      ).toBeNull();
    });

    it('renders the section when lease ends inside the 180-day window', () => {
      const inWindow = new Date(NOW.getTime() + 100 * 86400000);
      renderSection({ leaseEndDate: inWindow });
      expect(
        screen.getByRole('heading', { name: /recommended for you/i }),
        'within-window lease must render the section heading so it appears on the dashboard'
      ).toBeInTheDocument();
    });
  });

  describe('B.3 implicit-fallback banner', () => {
    const inWindow = new Date(NOW.getTime() + 100 * 86400000);

    it('shows the "Based on your current home" banner when preferences are unset', () => {
      renderSection({ leaseEndDate: inWindow });
      expect(
        screen.getByText(/based on your current home/i),
        'no explicit prefs → implicit-fallback path must surface so tenant knows the source of matches'
      ).toBeInTheDocument();
    });

    it('hides the implicit banner once preferences are saved', () => {
      renderSection({ leaseEndDate: inWindow, explicitPrefs: true });
      expect(
        screen.queryByText(/based on your current home/i),
        'explicit prefs replace the implicit derivation — banner must disappear'
      ).toBeNull();
    });

    it('shows an Edit-preferences button only after preferences are set', () => {
      renderSection({ leaseEndDate: inWindow });
      expect(
        screen.queryByRole('button', { name: /edit preferences/i }),
        'no prefs yet → CTA is "Set your preferences" inside the banner, not "Edit"'
      ).toBeNull();
    });
  });

  describe('match badges', () => {
    const inWindow = new Date(NOW.getTime() + 100 * 86400000);

    it('renders a "Matches X/Y" badge per recommended card', () => {
      renderSection({ leaseEndDate: inWindow });
      const total = ALL_MATCH_CATEGORIES.length;
      const badges = screen.getAllByText(new RegExp(`^Matches \\d+/${total}$`));
      expect(
        badges.length,
        'every recommendation must carry the match badge — drives transparency on why the card is in the list'
      ).toBeGreaterThan(0);
    });
  });

  describe('see-all link', () => {
    const inWindow = new Date(NOW.getTime() + 100 * 86400000);

    it('compact variant exposes "See all matches" → /tenant/recommended', () => {
      renderSection({ leaseEndDate: inWindow, variant: 'compact' });
      const link = screen.getByRole('link', { name: /see all matches/i });
      expect(
        link,
        'compact variant on dashboard caps the card count — link routes to the full page'
      ).toHaveAttribute('href', '/tenant/recommended');
    });

    it('full variant hides the see-all link', () => {
      renderSection({ leaseEndDate: inWindow, variant: 'full' });
      expect(
        screen.queryByRole('link', { name: /see all matches/i }),
        'full variant already shows everything — duplicate link would be noise'
      ).toBeNull();
    });
  });

  describe('preferences modal trigger', () => {
    const inWindow = new Date(NOW.getTime() + 100 * 86400000);

    it('opens the preferences modal from the implicit-banner CTA', () => {
      renderSection({ leaseEndDate: inWindow });
      fireEvent.click(screen.getByRole('button', { name: /set your preferences/i }));
      // Dialog title is the source of truth for "modal opened".
      expect(
        screen.getByRole('dialog'),
        'banner CTA must open the same modal the profile page uses'
      ).toBeInTheDocument();
    });
  });
});
