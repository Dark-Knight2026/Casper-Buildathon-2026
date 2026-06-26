// =============================================================================
// Task 7 — Tenant Score System (Phase 1: tenant-side read-only demo).
// =============================================================================
// Open product questions still pending client/legal sign-off (see backlog
// CLIENT_FEEDBACK_BACKLOG.md, Task 7 §"Open product questions"). Until those
// land, this module:
//   - hard-codes the 0–100 scale (Q1 default — FICO-shaped, easy to display)
//   - hard-codes the 50/30/20 weight split (Q2 placeholder)
//   - exposes "unscored" state for new tenants (Q3 default — explicit badge)
//   - is consumed only by tenant-facing surfaces; the landlord-side gate
//     (which has fair-housing implications, Q8) is intentionally NOT built.
// =============================================================================

export type ScoreBand = 'excellent' | 'good' | 'fair' | 'poor';

// Score components and their weights — the three signals the client called
// out by name. Weights sum to 1.0; tweak via SCORE_WEIGHTS, not here.
export type ScoreComponentKey = 'on_time_payments' | 'tenancy_duration' | 'maintenance_documentation';

export interface ScoreComponent {
  key: ScoreComponentKey;
  // 0..100 — the component's own contribution score. Multiplied by its
  // weight when rolled up into the overall score.
  value: number;
  // Human-readable factual statement. Backend will render the same shape;
  // FE just displays.
  label: string;
  // E.g. "12 of 12 payments on time" — the proof point behind `value`.
  detail: string;
}

export interface TenantScore {
  tenantId: string;
  // Aggregate score, any integer in [0, 100]. Null when the tenant has no
  // events to score from yet — renderers must check `status` before showing
  // a number.
  overall: number | null;
  band: ScoreBand | null;
  status: 'scored' | 'unscored';
  components: ScoreComponent[];
  // Last time the score was recomputed. BE will own this; the FE just
  // formats it for the "as of" stamp on the score card.
  computedAt: Date;
}

// Items in the score history feed — drives the "what changed your score"
// list on /tenant/score and the trend line if/when one ships.
export type ScoreEventDirection = 'positive' | 'negative' | 'neutral';

export interface ScoreEvent {
  id: string;
  occurredAt: Date;
  direction: ScoreEventDirection;
  component: ScoreComponentKey;
  // Headline shown in the events list, e.g. "Rent paid on time"
  title: string;
  // Sub-line, e.g. "April 1 — payment recorded"
  detail: string;
  // Optional delta the BE may surface ("+0.4 to On-time payments").
  // Stored as a string so we don't commit to a unit yet.
  delta?: string;
}

export const SCORE_BAND_THRESHOLDS: Record<ScoreBand, number> = {
  excellent: 80,
  good: 70,
  fair: 60,
  poor: 0,
};

export function bandFromScore(overall: number | null): ScoreBand | null {
  if (overall === null) return null;
  if (overall >= SCORE_BAND_THRESHOLDS.excellent) return 'excellent';
  if (overall >= SCORE_BAND_THRESHOLDS.good) return 'good';
  if (overall >= SCORE_BAND_THRESHOLDS.fair) return 'fair';
  return 'poor';
}

export const BAND_LABEL: Record<ScoreBand, string> = {
  excellent: 'Excellent',
  good: 'Good',
  fair: 'Fair',
  poor: 'Needs improvement',
};

// Display copy per band — kept here so a single source of truth covers the
// card subtitle, the page hero, and any tooltip.
export const BAND_SUMMARY: Record<ScoreBand, string> = {
  excellent: 'You\'re a top-tier tenant. Landlords prioritise applications at this band.',
  good: 'Solid track record. Most landlords accept applications at this band.',
  fair: 'Room to grow. Stay current on rent and log maintenance to climb.',
  poor: 'Focus on on-time payments to recover. Reach out if a late mark is wrong.',
};

export const COMPONENT_LABEL: Record<ScoreComponentKey, string> = {
  on_time_payments: 'On-time payments',
  tenancy_duration: 'Tenancy duration',
  maintenance_documentation: 'Maintenance documentation',
};

// Weights are placeholders pending client confirmation (Q2). Sum must be 1.
export const SCORE_WEIGHTS: Record<ScoreComponentKey, number> = {
  on_time_payments: 0.5,
  tenancy_duration: 0.3,
  maintenance_documentation: 0.2,
};

export function weightedAverage(components: ScoreComponent[]): number {
  const sum = components.reduce(
    (acc, c) => acc + c.value * SCORE_WEIGHTS[c.key],
    0
  );
  return Math.round(sum);
}
