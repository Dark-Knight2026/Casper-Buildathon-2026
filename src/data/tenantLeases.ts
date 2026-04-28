import type { Property } from '@/types/property';
import { FEATURED_PROPERTIES } from './featuredProperties';

export const CURRENT_TENANT_ID = 'mock-tenant-1';

export type TenantLeaseStatus = 'active' | 'expired' | 'terminated' | 'pending';

export interface TenantLease {
  id: string;
  tenantId: string;
  propertyId: string;
  status: TenantLeaseStatus;
  startDate: Date;
  endDate: Date;
  monthlyRent: number;
  securityDeposit: number;
  paymentDueDay: number;
}

// TODO: replace with GET /api/v1/leases?tenantId=me when backend is ready.
// Property IDs reference FEATURED_PROPERTIES so cards render with real images/data.
export const MOCK_TENANT_LEASES: TenantLease[] = [
  {
    id: 'lease-current-1',
    tenantId: CURRENT_TENANT_ID,
    propertyId: 'prop-2',
    status: 'active',
    startDate: new Date('2025-04-15'),
    endDate: new Date('2026-04-14'),
    monthlyRent: 2100,
    securityDeposit: 4200,
    paymentDueDay: 1,
  },
  {
    id: 'lease-past-1',
    tenantId: CURRENT_TENANT_ID,
    propertyId: 'prop-1',
    status: 'expired',
    startDate: new Date('2023-05-01'),
    endDate: new Date('2025-04-14'),
    monthlyRent: 3000,
    securityDeposit: 6000,
    paymentDueDay: 1,
  },
  {
    id: 'lease-past-2',
    tenantId: CURRENT_TENANT_ID,
    propertyId: 'prop-3',
    status: 'expired',
    startDate: new Date('2022-06-01'),
    endDate: new Date('2023-04-30'),
    monthlyRent: 1750,
    securityDeposit: 3500,
    paymentDueDay: 1,
  },
];

export interface LeasedProperty {
  lease: TenantLease;
  property: Property;
}

function getMyLeases(tenantId: string = CURRENT_TENANT_ID): TenantLease[] {
  return MOCK_TENANT_LEASES.filter((l) => l.tenantId === tenantId);
}

function pairWithProperty(leases: TenantLease[]): LeasedProperty[] {
  return leases
    .map((lease): LeasedProperty | null => {
      const property: Property | undefined = FEATURED_PROPERTIES.find(
        (p) => p.id === lease.propertyId,
      );
      return property ? { lease, property } : null;
    })
    .filter((x): x is LeasedProperty => x !== null);
}

export function getMyCurrentProperties(tenantId: string = CURRENT_TENANT_ID): LeasedProperty[] {
  return pairWithProperty(
    getMyLeases(tenantId).filter((l) => l.status === 'active' || l.status === 'pending'),
  ).sort((a, b) => b.lease.startDate.getTime() - a.lease.startDate.getTime());
}

export function getMyPastProperties(tenantId: string = CURRENT_TENANT_ID): LeasedProperty[] {
  return pairWithProperty(
    getMyLeases(tenantId).filter((l) => l.status === 'expired' || l.status === 'terminated'),
  ).sort((a, b) => b.lease.endDate.getTime() - a.lease.endDate.getTime());
}

export function getLeasesByProperty(
  propertyId: string,
  tenantId: string = CURRENT_TENANT_ID,
): TenantLease[] {
  return getMyLeases(tenantId)
    .filter((l) => l.propertyId === propertyId)
    .sort((a, b) => b.startDate.getTime() - a.startDate.getTime());
}

// ─── Payments ──────────────────────────────────────────────────────────────

export type PaymentStatus = 'completed' | 'pending' | 'failed';

export interface MockPayment {
  id: string;
  leaseId: string;
  amount: number;
  paymentDate: Date;
  method: 'bank_transfer' | 'credit_card' | 'crypto';
  status: PaymentStatus;
}

// TODO: replace with GET /api/v1/payments?leaseId={id} when backend is ready
export const MOCK_PAYMENTS: MockPayment[] = [
  // current lease — prop-2
  { id: 'pay-1', leaseId: 'lease-current-1', amount: 2100, paymentDate: new Date('2026-04-01'), method: 'bank_transfer', status: 'completed' },
  { id: 'pay-2', leaseId: 'lease-current-1', amount: 2100, paymentDate: new Date('2026-03-01'), method: 'bank_transfer', status: 'completed' },
  { id: 'pay-3', leaseId: 'lease-current-1', amount: 2100, paymentDate: new Date('2026-02-01'), method: 'credit_card',   status: 'completed' },
  { id: 'pay-4', leaseId: 'lease-current-1', amount: 2100, paymentDate: new Date('2026-01-01'), method: 'bank_transfer', status: 'completed' },
  // past lease — prop-1
  { id: 'pay-5', leaseId: 'lease-past-1',    amount: 3000, paymentDate: new Date('2025-04-01'), method: 'bank_transfer', status: 'completed' },
  { id: 'pay-6', leaseId: 'lease-past-1',    amount: 3000, paymentDate: new Date('2025-03-01'), method: 'bank_transfer', status: 'completed' },
  // past lease — prop-3
  { id: 'pay-7', leaseId: 'lease-past-2',    amount: 1750, paymentDate: new Date('2023-04-01'), method: 'crypto',        status: 'completed' },
];

export function getPaymentsByProperty(propertyId: string): MockPayment[] {
  const leaseIds = getLeasesByProperty(propertyId).map((l) => l.id);
  return MOCK_PAYMENTS
    .filter((p) => leaseIds.includes(p.leaseId))
    .sort((a, b) => b.paymentDate.getTime() - a.paymentDate.getTime());
}

// ─── Maintenance ───────────────────────────────────────────────────────────

export type MaintenanceStatus = 'open' | 'in_progress' | 'resolved' | 'cancelled';
export type MaintenancePriority = 'low' | 'medium' | 'high' | 'urgent';

export interface MockMaintenanceRequest {
  id: string;
  propertyId: string;
  leaseId: string;
  title: string;
  description: string;
  status: MaintenanceStatus;
  priority: MaintenancePriority;
  createdAt: Date;
  updatedAt: Date;
}

// TODO: replace with GET /api/v1/maintenance-requests?propertyId={id}
export const MOCK_MAINTENANCE: MockMaintenanceRequest[] = [
  {
    id: 'mnt-1', propertyId: 'prop-2', leaseId: 'lease-current-1',
    title: 'Leaking kitchen faucet', description: 'Cold water tap drips constantly.',
    status: 'in_progress', priority: 'medium',
    createdAt: new Date('2026-04-10'), updatedAt: new Date('2026-04-12'),
  },
  {
    id: 'mnt-2', propertyId: 'prop-2', leaseId: 'lease-current-1',
    title: 'AC not cooling on warm days', description: 'Bedroom unit blows warm air.',
    status: 'open', priority: 'high',
    createdAt: new Date('2026-04-22'), updatedAt: new Date('2026-04-22'),
  },
  {
    id: 'mnt-3', propertyId: 'prop-1', leaseId: 'lease-past-1',
    title: 'Garage door remote replacement', description: 'Original remote stopped working.',
    status: 'resolved', priority: 'low',
    createdAt: new Date('2024-08-15'), updatedAt: new Date('2024-08-20'),
  },
];

export function getMaintenanceByProperty(propertyId: string): MockMaintenanceRequest[] {
  return MOCK_MAINTENANCE
    .filter((m) => m.propertyId === propertyId)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

// ─── Messages ──────────────────────────────────────────────────────────────

export interface MockMessage {
  id: string;
  propertyId: string;
  from: 'tenant' | 'landlord';
  subject: string;
  preview: string;
  sentAt: Date;
  unread: boolean;
}

// TODO: replace with GET /api/v1/messages?propertyId={id}
export const MOCK_MESSAGES: MockMessage[] = [
  {
    id: 'msg-1', propertyId: 'prop-2', from: 'landlord',
    subject: 'Annual inspection — May 12',
    preview: 'Just a heads up that the annual unit inspection is scheduled for…',
    sentAt: new Date('2026-04-20'), unread: true,
  },
  {
    id: 'msg-2', propertyId: 'prop-2', from: 'tenant',
    subject: 'Re: Lease renewal options',
    preview: 'Thanks for the renewal terms — could we discuss the rent increase?',
    sentAt: new Date('2026-04-15'), unread: false,
  },
  {
    id: 'msg-3', propertyId: 'prop-1', from: 'landlord',
    subject: 'Security deposit returned',
    preview: 'Deposit of $6,000 was returned to your bank account on April 30.',
    sentAt: new Date('2025-04-30'), unread: false,
  },
];

export function getMessagesByProperty(propertyId: string): MockMessage[] {
  return MOCK_MESSAGES
    .filter((m) => m.propertyId === propertyId)
    .sort((a, b) => b.sentAt.getTime() - a.sentAt.getTime());
}
