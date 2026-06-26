import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { TenantScoreCard } from '@/components/tenant/TenantScoreCard';
import { SCORE_SCENARIOS } from '@/data/tenantScore';
import type { TenantScore } from '@/types/tenantScore';

function renderCard(score: TenantScore, variant: 'compact' | 'full' = 'compact') {
  return render(
    <MemoryRouter>
      <TenantScoreCard score={score} variant={variant} />
    </MemoryRouter>
  );
}

describe('TenantScoreCard', () => {
  describe('scored — compact variant', () => {
    const score = SCORE_SCENARIOS.excellent.score;

    it('renders the overall number and Excellent band label', () => {
      renderCard(score);
      expect(
        screen.getByLabelText(`Score ${score.overall} out of 100`),
        'numeric score must carry an explicit aria-label so AT users hear the value, not just the digits'
      ).toBeInTheDocument();
      expect(
        screen.getByText('Excellent'),
        'excellent band → "Excellent" badge — bands are the headline label, not the raw number'
      ).toBeInTheDocument();
    });

    it('does NOT render component progress bars on the dashboard card', () => {
      renderCard(score);
      expect(
        screen.queryAllByRole('progressbar').length,
        'compact variant lives on the dashboard — bars are intentionally deferred to the /tenant/score page to keep the widget short'
      ).toBe(0);
    });

    it('exposes a "View details" link to /tenant/score', () => {
      renderCard(score);
      expect(
        screen.getByRole('link', { name: /view details/i }),
        'compact variant on dashboard must offer a way into the full /tenant/score page'
      ).toHaveAttribute('href', '/tenant/score');
    });
  });

  describe('scored — full variant', () => {
    it('hides the "View details" link (already on the details page)', () => {
      const score = SCORE_SCENARIOS.excellent.score;
      renderCard(score, 'full');
      expect(
        screen.queryByRole('link', { name: /view details/i }),
        'full variant lives on /tenant/score itself — duplicate link would be noise'
      ).toBeNull();
    });

    it('shows the per-component detail line', () => {
      const score = SCORE_SCENARIOS.excellent.score;
      renderCard(score, 'full');
      // detail copy ("12 of 12 payments on time …") is hidden in the
      // compact variant; surfacing it here lets the user read why a
      // component value is what it is.
      expect(
        screen.getByText(/12 of 12 payments on time/i),
        'full variant must reveal the per-component detail'
      ).toBeInTheDocument();
    });

    it('renders three component progress bars', () => {
      const score = SCORE_SCENARIOS.excellent.score;
      renderCard(score, 'full');
      expect(
        screen.getAllByRole('progressbar').length,
        'full variant on /tenant/score is the only place the per-component breakdown surfaces'
      ).toBe(3);
    });
  });

  describe('unscored', () => {
    const score = SCORE_SCENARIOS.unscored.score;

    it('renders the explainer copy without a number', () => {
      renderCard(score);
      expect(
        screen.getByText(/coming soon/i),
        'unscored tenants must see an explainer headline rather than a guess at a number'
      ).toBeInTheDocument();
      expect(
        screen.queryByLabelText(/Score \d+ out of 100/),
        'no numeric label must render in the unscored state — UI cannot fabricate a value'
      ).toBeNull();
    });

    it('does not render any band badge', () => {
      renderCard(score);
      // Band badges are only meaningful when there is a band; the unscored
      // case hides them so users don't read a placeholder as a verdict.
      expect(screen.queryByText(/^Excellent$/)).toBeNull();
      expect(screen.queryByText(/^Good$/)).toBeNull();
      expect(screen.queryByText(/^Fair$/)).toBeNull();
      expect(screen.queryByText(/^Needs improvement$/)).toBeNull();
    });
  });
});
