// =============================================================================
// DEMO-ONLY — Task 7 (Tenant Score System), Phase 1.
// =============================================================================
//
// Client request (verbatim):
//   "I would like to create a tenant score system based on time rent
//    payments, maintenance documentation (changing out air filters, mowing
//    grass, home repairs or improvements), renting long term (longer the
//    tenant stays in one property the higher the score)."
//
// Phase 1 scope — what FE delivers now:
//   - Read-only "My Score" card on the tenant dashboard
//   - /tenant/score full page with components breakdown + events feed
//   - Three demo scenarios (excellent / average / unscored) so the UI can
//     be reviewed against real-shaped data
//
// Out of scope for Phase 1 — pending client/legal answers:
//   - Landlord-side score gate (Q8 fair-housing review required)
//   - Auto-rejection or filtering of applications (same)
//   - Manual override / dispute / appeal flow (Q5, Q9)
//   - Final scale and weights (Q1, Q2 — currently placeholder 0–100, 50/30/20)
//
// BE handoff (TO BUILD):
//   - GET  /api/v1/tenants/me/score                   → TenantScore
//   - GET  /api/v1/tenants/me/score/history?limit=…   → ScoreEvent[]
//   - Daily recompute job (event-driven for big changes, batch for tenancy
//     duration drift) — Q6 hybrid recommendation
// =============================================================================

import type { ScoreComponent, ScoreEvent, TenantScore } from '@/types/tenantScore';
import { bandFromScore, weightedAverage } from '@/types/tenantScore';

// Same demo tenant id used elsewhere in the mock data layer.
export const DEMO_TENANT_ID = 'mock-tenant-1';

// Until N events accumulate the tenant is "unscored" — surfaces the
// explicit badge instead of guessing a number. (Q3: explicit-unscored
// default; we picked it over "neutral 70" for transparency.)
export const MIN_EVENTS_TO_SCORE = 3;

const NOW = new Date();
function daysAgo(n: number): Date {
  return new Date(NOW.getTime() - n * 86400000);
}

// ── Scenario seeds ───────────────────────────────────────────────────────────
//
// Each scenario is a triple (components, events). Scoring is derived
// (weighted average) so we don't have to keep `overall` in sync by hand.

const EXCELLENT_COMPONENTS: ScoreComponent[] = [
  {
    key: 'on_time_payments',
    value: 100,
    label: 'On-time payments',
    detail: '12 of 12 payments on time over the last year',
  },
  {
    key: 'tenancy_duration',
    value: 78,
    label: 'Tenancy duration',
    detail: '14 months at the current property',
  },
  {
    key: 'maintenance_documentation',
    value: 80,
    label: 'Maintenance documentation',
    detail: '4 verified maintenance entries this year',
  },
];

const AVERAGE_COMPONENTS: ScoreComponent[] = [
  {
    key: 'on_time_payments',
    value: 80,
    label: 'On-time payments',
    detail: '10 of 12 payments on time, 2 within the grace period',
  },
  {
    key: 'tenancy_duration',
    value: 55,
    label: 'Tenancy duration',
    detail: '8 months at the current property',
  },
  {
    key: 'maintenance_documentation',
    value: 50,
    label: 'Maintenance documentation',
    detail: '1 verified maintenance entry, 1 awaiting verification',
  },
];

const EXCELLENT_EVENTS: ScoreEvent[] = [
  {
    id: 'evt-ex-1',
    occurredAt: daysAgo(4),
    direction: 'positive',
    component: 'on_time_payments',
    title: 'Rent paid on time',
    detail: 'Payment recorded on the due date',
    delta: '+0.4 to On-time payments',
  },
  {
    id: 'evt-ex-2',
    occurredAt: daysAgo(20),
    direction: 'positive',
    component: 'maintenance_documentation',
    title: 'Air filter change logged',
    detail: 'Photo + date verified by landlord',
    delta: '+0.6 to Maintenance documentation',
  },
  {
    id: 'evt-ex-3',
    occurredAt: daysAgo(34),
    direction: 'positive',
    component: 'on_time_payments',
    title: 'Rent paid on time',
    detail: 'Payment recorded one day early',
    delta: '+0.4 to On-time payments',
  },
  {
    id: 'evt-ex-4',
    occurredAt: daysAgo(60),
    direction: 'neutral',
    component: 'tenancy_duration',
    title: 'Lease anniversary',
    detail: '12 months at this property',
    delta: '+0.5 to Tenancy duration',
  },
  {
    id: 'evt-ex-5',
    occurredAt: daysAgo(95),
    direction: 'positive',
    component: 'maintenance_documentation',
    title: 'Lawn care logged',
    detail: 'Photo verified by landlord',
    delta: '+0.4 to Maintenance documentation',
  },
];

const AVERAGE_EVENTS: ScoreEvent[] = [
  {
    id: 'evt-av-1',
    occurredAt: daysAgo(2),
    direction: 'negative',
    component: 'on_time_payments',
    title: 'Rent paid within the grace period',
    detail: 'Payment recorded 3 days after the due date',
    delta: '−0.6 to On-time payments',
  },
  {
    id: 'evt-av-2',
    occurredAt: daysAgo(28),
    direction: 'positive',
    component: 'maintenance_documentation',
    title: 'Air filter change logged',
    detail: 'Awaiting landlord verification',
  },
  {
    id: 'evt-av-3',
    occurredAt: daysAgo(45),
    direction: 'positive',
    component: 'on_time_payments',
    title: 'Rent paid on time',
    detail: 'Payment recorded on the due date',
    delta: '+0.4 to On-time payments',
  },
];

function buildScore(
  tenantId: string,
  components: ScoreComponent[],
  status: TenantScore['status']
): TenantScore {
  const overall = status === 'scored' ? weightedAverage(components) : null;
  return {
    tenantId,
    overall,
    band: bandFromScore(overall),
    status,
    components,
    computedAt: daysAgo(1),
  };
}

const UNSCORED_COMPONENTS: ScoreComponent[] = [
  {
    key: 'on_time_payments',
    value: 0,
    label: 'On-time payments',
    detail: 'No payment history yet',
  },
  {
    key: 'tenancy_duration',
    value: 0,
    label: 'Tenancy duration',
    detail: 'Lease started this month',
  },
  {
    key: 'maintenance_documentation',
    value: 0,
    label: 'Maintenance documentation',
    detail: 'No entries logged yet',
  },
];

// Public mock seeds. Real impl returns this shape from the backend, so
// callers should not assume the underlying data layout is stable.
export const SCORE_SCENARIOS = {
  excellent: {
    score: buildScore(DEMO_TENANT_ID, EXCELLENT_COMPONENTS, 'scored'),
    events: EXCELLENT_EVENTS,
  },
  average: {
    score: buildScore(DEMO_TENANT_ID, AVERAGE_COMPONENTS, 'scored'),
    events: AVERAGE_EVENTS,
  },
  unscored: {
    score: buildScore(DEMO_TENANT_ID, UNSCORED_COMPONENTS, 'unscored'),
    events: [],
  },
} as const;

export type ScoreScenarioKey = keyof typeof SCORE_SCENARIOS;

// In-memory active-scenario selector. Demo-only; in prod the BE response
// is the source of truth and there is no scenario switching.
let activeScenario: ScoreScenarioKey = 'excellent';

export function getActiveScenario(): ScoreScenarioKey {
  return activeScenario;
}

export function setActiveScenario(scenario: ScoreScenarioKey): void {
  activeScenario = scenario;
}

export function getMockScore(): TenantScore {
  return SCORE_SCENARIOS[activeScenario].score;
}

export function getMockScoreEvents(): ScoreEvent[] {
  return SCORE_SCENARIOS[activeScenario].events;
}
