import { describe, it, expect, beforeEach } from 'vitest';

import {
  SCORE_SCENARIOS,
  getActiveScenario,
  getMockScore,
  getMockScoreEvents,
  setActiveScenario,
} from '@/data/tenantScore';
import {
  SCORE_BAND_THRESHOLDS,
  SCORE_WEIGHTS,
  bandFromScore,
  weightedAverage,
} from '@/types/tenantScore';

beforeEach(() => {
  setActiveScenario('excellent');
});

describe('SCORE_WEIGHTS', () => {
  it('weights sum to 1 — required for the weighted average to land in [0,100]', () => {
    const total = Object.values(SCORE_WEIGHTS).reduce((s, v) => s + v, 0);
    expect(total, 'rounding error tolerance: 1.0 ± 1e-9').toBeCloseTo(1, 9);
  });
});

describe('weightedAverage', () => {
  it('returns the weighted blend of component values', () => {
    // 100 * 0.5 + 60 * 0.3 + 50 * 0.2 = 50 + 18 + 10 = 78
    const value = weightedAverage([
      { key: 'on_time_payments', value: 100, label: '', detail: '' },
      { key: 'tenancy_duration', value: 60, label: '', detail: '' },
      { key: 'maintenance_documentation', value: 50, label: '', detail: '' },
    ]);
    expect(
      value,
      'weights are 50/30/20 → check the arithmetic so a future weight tweak surfaces here as a failure'
    ).toBe(78);
  });

  it('rounds to an integer', () => {
    const value = weightedAverage([
      { key: 'on_time_payments', value: 33, label: '', detail: '' },
      { key: 'tenancy_duration', value: 33, label: '', detail: '' },
      { key: 'maintenance_documentation', value: 33, label: '', detail: '' },
    ]);
    expect(
      value,
      'displayed scores are integers — never expose 33.000…1'
    ).toBe(33);
  });
});

describe('bandFromScore', () => {
  it('maps null → null (unscored tenants)', () => {
    expect(
      bandFromScore(null),
      'unscored state must NOT collapse onto a band — UI uses null to render the "coming soon" copy'
    ).toBeNull();
  });

  it('maps boundary values to the inclusive lower band', () => {
    expect(bandFromScore(SCORE_BAND_THRESHOLDS.excellent), 'exactly 80 is Excellent').toBe('excellent');
    expect(bandFromScore(SCORE_BAND_THRESHOLDS.good), 'exactly 70 is Good').toBe('good');
    expect(bandFromScore(SCORE_BAND_THRESHOLDS.fair), 'exactly 60 is Fair').toBe('fair');
    expect(bandFromScore(0), '0 is Poor — bottom of the scale').toBe('poor');
  });

  it('maps mid-band values correctly', () => {
    expect(bandFromScore(95)).toBe('excellent');
    expect(bandFromScore(75)).toBe('good');
    expect(bandFromScore(65)).toBe('fair');
    expect(bandFromScore(40)).toBe('poor');
  });
});

describe('SCORE_SCENARIOS', () => {
  it('excellent scenario lands in the Excellent band', () => {
    const { score } = SCORE_SCENARIOS.excellent;
    expect(
      score.status,
      'excellent scenario must be a fully-scored tenant — the demo headline state'
    ).toBe('scored');
    expect(score.band).toBe('excellent');
    expect(score.overall, 'overall must be ≥80 to qualify').toBeGreaterThanOrEqual(80);
  });

  it('average scenario falls inside the Fair/Good range', () => {
    const { score } = SCORE_SCENARIOS.average;
    expect(score.status).toBe('scored');
    // Average components yield a score that sits between Fair and Good —
    // pinning the exact band avoids accidental drift if the seed is tweaked.
    expect(['fair', 'good']).toContain(score.band);
  });

  it('unscored scenario hides the numeric overall', () => {
    const { score, events } = SCORE_SCENARIOS.unscored;
    expect(
      score.status,
      'a brand-new tenant must be marked unscored so the UI does not invent a number'
    ).toBe('unscored');
    expect(score.overall).toBeNull();
    expect(score.band).toBeNull();
    expect(events, 'no history yet — feed must be empty for the unscored case').toEqual([]);
  });

  it('all scored scenarios populate the three components', () => {
    for (const key of ['excellent', 'average'] as const) {
      const { score } = SCORE_SCENARIOS[key];
      expect(
        score.components.length,
        `${key} scenario must include all 3 client-named factors so the UI breakdown renders`
      ).toBe(3);
    }
  });
});

describe('active-scenario selector', () => {
  it('round-trips through get/set and drives the mock fetchers', () => {
    setActiveScenario('average');
    expect(getActiveScenario()).toBe('average');
    expect(getMockScore().band, 'getMockScore must follow the active scenario').toBe(
      SCORE_SCENARIOS.average.score.band
    );
    expect(getMockScoreEvents()).toEqual(SCORE_SCENARIOS.average.events);
  });

  it('switching to unscored reflects in both score and events', () => {
    setActiveScenario('unscored');
    expect(getMockScore().status).toBe('unscored');
    expect(getMockScoreEvents()).toHaveLength(0);
  });
});
