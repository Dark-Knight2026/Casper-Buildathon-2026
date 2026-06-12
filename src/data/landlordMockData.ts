/**
 * DEMO-ONLY — shared mock fixtures for the landlord flow.
 *
 * Landlord-flow pages render this in production as deliberate demo/preview
 * content (same accepted pattern as the tenant pages) while the Rust backend
 * is in flight. This is a product decision, not a deferred bug.
 *
 * TODO(BE): replace consumers with `GET /api/v1/landlord/*` once the contract
 * exists — BE-blocked (LeaseFi MVP spec §3.7). Keep one source here so
 * fixtures stay consistent across landlord pages as they are migrated off
 * Supabase.
 */

export interface LandlordDashboardStats {
  totalProperties: number;
  occupiedProperties: number;
  totalTenants: number;
  activeLeases: number;
  monthlyRevenue: number;
  pendingMaintenance: number;
  overduePayments: number;
  expiringLeases: number;
}

export interface LandlordRecentActivity {
  id: string;
  type: 'payment' | 'maintenance' | 'lease';
  title: string;
  description: string;
  /** ISO 8601 timestamp. */
  timestamp: string;
  status: string;
}

/** One row of the portfolio table (design reference §2: the PM "surface"). */
export interface LandlordPortfolioRow {
  id: string;
  property: string;
  tenant: string;
  rent: number;
  status: 'paid' | 'due' | 'late' | 'dispute' | 'confirming';
  /** Human label shown inside the status pill, e.g. "Paid Dec 1", "3d late". */
  statusLabel: string;
  /** Where the status pill navigates — pills are link affordances (§2.4). */
  statusHref: string;
}

/** Simulated latency for mock loaders so the existing skeleton UI still shows. */
export const MOCK_LANDLORD_LOAD_MS = 600;

export const MOCK_LANDLORD_DASHBOARD_STATS: LandlordDashboardStats = {
  totalProperties: 8,
  occupiedProperties: 6,
  totalTenants: 6,
  activeLeases: 6,
  monthlyRevenue: 14250,
  pendingMaintenance: 3,
  overduePayments: 2,
  expiringLeases: 1,
};

// Timestamps are derived at module load so the demo activity always reads as
// recent relative to whenever the dashboard is viewed.
const now = Date.now();
const hoursAgo = (h: number): string => new Date(now - h * 3_600_000).toISOString();

export const MOCK_LANDLORD_RECENT_ACTIVITIES: LandlordRecentActivity[] = [
  {
    id: 'act-1',
    type: 'payment',
    title: 'Payment paid',
    description: '$2,400 from Olivia Carter — 14 Maple Ave, Unit 2',
    timestamp: hoursAgo(3),
    status: 'paid',
  },
  {
    id: 'act-2',
    type: 'maintenance',
    title: 'Maintenance: Plumbing',
    description: 'Kitchen sink leak reported — awaiting vendor assignment',
    timestamp: hoursAgo(9),
    status: 'pending',
  },
  {
    id: 'act-3',
    type: 'payment',
    title: 'Payment overdue',
    description: '$1,950 from Marcus Lee — 5 Birch St — 6 days overdue',
    timestamp: hoursAgo(28),
    status: 'overdue',
  },
  {
    id: 'act-4',
    type: 'lease',
    title: 'Lease signed',
    description: 'New 12-month lease — 22 Cedar Rd, Unit 1',
    timestamp: hoursAgo(50),
    status: 'completed',
  },
  {
    id: 'act-5',
    type: 'payment',
    title: 'Payment partial',
    description: '$900 of $1,800 from Priya Shah — 5 Birch St',
    timestamp: hoursAgo(74),
    status: 'partial',
  },
  {
    id: 'act-6',
    type: 'maintenance',
    title: 'Maintenance: HVAC',
    description: 'Annual heating inspection completed by vendor',
    timestamp: hoursAgo(120),
    status: 'completed',
  },
];

// Portfolio table — the central PM surface (design §2). Statuses span the full
// lifecycle: settled (paid), upcoming (due), escalation (late), informational
// (dispute), and on-chain pending (confirming). Dispute has no dedicated route
// yet, so its pill points at the lease list until the disputes view exists.
export const MOCK_LANDLORD_PORTFOLIO: LandlordPortfolioRow[] = [
  { id: 'pf-1', property: '123 Main St',  tenant: 'Sarah K.',  rent: 1500, status: 'paid',       statusLabel: 'Paid Dec 1',    statusHref: '/landlord/payments' },
  { id: 'pf-2', property: '456 Oak Ave',  tenant: 'Tom R.',    rent: 2200, status: 'due',        statusLabel: 'Due Dec 5',     statusHref: '/landlord/payments' },
  { id: 'pf-3', property: '789 Elm Rd',   tenant: 'Mei L.',    rent: 1800, status: 'late',       statusLabel: '3d late',       statusHref: '/landlord/payments?filter=overdue' },
  { id: 'pf-4', property: '234 Pine St',  tenant: 'Jordan A.', rent: 2800, status: 'paid',       statusLabel: 'Paid Dec 1',    statusHref: '/landlord/payments' },
  { id: 'pf-5', property: '512 Birch Ln', tenant: 'Priya N.',  rent: 1650, status: 'dispute',    statusLabel: 'Dispute open',  statusHref: '/landlord/leases' },
  { id: 'pf-6', property: '670 Cedar Ct', tenant: 'Ravi S.',   rent: 2100, status: 'confirming', statusLabel: 'Confirming',    statusHref: '/landlord/payments' },
];
