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
