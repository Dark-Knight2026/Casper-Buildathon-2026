import type { ReactNode } from 'react';
import { CheckCircle, Clock, XCircle } from 'lucide-react';
import type {
  TenantLeaseStatus,
  PaymentStatus,
  MaintenanceStatus,
  MaintenancePriority,
} from '@/data/tenantLeases';

export const FALLBACK_PROPERTY_IMAGE = 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800';

export const formatDateLong = (d: Date) =>
  new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'short', day: 'numeric' }).format(d);

export const formatCurrency = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(n);

export const LEASE_STATUS_BADGE: Record<TenantLeaseStatus, string> = {
  active: 'bg-green-100 text-green-800',
  expired: 'bg-gray-100 text-gray-700',
  terminated: 'bg-red-100 text-red-800',
  pending: 'bg-yellow-100 text-yellow-800',
};

export const PAYMENT_STATUS_CONFIG: Record<PaymentStatus, { color: string; icon: ReactNode }> = {
  completed: { color: 'bg-green-100 text-green-800',  icon: <CheckCircle className="h-3 w-3" /> },
  pending:   { color: 'bg-yellow-100 text-yellow-800', icon: <Clock className="h-3 w-3" /> },
  failed:    { color: 'bg-red-100 text-red-800',       icon: <XCircle className="h-3 w-3" /> },
};

export const MAINTENANCE_STATUS_BADGE: Record<MaintenanceStatus, string> = {
  open: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-yellow-100 text-yellow-800',
  resolved: 'bg-green-100 text-green-800',
  cancelled: 'bg-gray-100 text-gray-700',
};

export const MAINTENANCE_PRIORITY_BADGE: Record<MaintenancePriority, string> = {
  low: 'bg-gray-100 text-gray-700',
  medium: 'bg-blue-100 text-blue-800',
  high: 'bg-orange-100 text-orange-800',
  urgent: 'bg-red-100 text-red-800',
};
