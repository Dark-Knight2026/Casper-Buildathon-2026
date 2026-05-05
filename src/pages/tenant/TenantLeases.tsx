/**
 * Tenant Leases Page
 * Displays all leases for the tenant with filtering and document access
 */

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Download, Eye, Calendar, DollarSign, Home } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FilterBar } from '@/components/ui/filter-bar';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import type { LeaseAgreement } from '@/types/lease';

type MockLease = LeaseAgreement & { propertyAddress: string; paymentDueDay: number };

const MOCK_BASE = {
  tenantIds: ['mock-tenant-1'],
  type: 'residential-long-term' as const,
  utilities: [
    { utilityType: 'water' as const, responsibleParty: 'landlord' as const },
    { utilityType: 'trash' as const, responsibleParty: 'landlord' as const },
  ],
  clauses: [],
  addendums: [],
  createdByRole: 'landlord' as const,
  approvalStatus: 'approved' as LeaseAgreement['approvalStatus'],
  approvalHistory: [],
  signatureStatus: 'signed' as LeaseAgreement['signatureStatus'],
  signatureProgress: {
    landlord: { signed: true,  timestamp: new Date('2024-12-15') },
    tenant:   { signed: true,  timestamp: new Date('2024-12-20') },
    agent:    { signed: false, timestamp: null },
  } as LeaseAgreement['signatureProgress'],
  documentLinks: {
    generatedPDF: null,
    signedPDF:    null,
    attachments:  [],
  } as LeaseAgreement['documentLinks'],
  complianceScore: 95,
  complianceIssues: [],
  stateSpecificRules: [
    'NY RPL § 226-b — 30-day notice required for month-to-month termination',
    'NY Admin. Code § 27-2013 — Landlord responsible for heat & hot water',
  ],
  versionHistory: [],
  currentVersion: 1,
  comments: [],
  signingWorkflow: {
    id: 'sw-mock',
    leaseId: 'mock',
    workflowType: 'sequential' as const,
    steps: [],
    currentStep: 2,
    status: 'completed' as const,
    createdAt: new Date('2024-12-01'),
  } as LeaseAgreement['signingWorkflow'],
  signatures: [] as LeaseAgreement['signatures'],
  createdAt: new Date('2024-12-01'),
  updatedAt: new Date('2024-12-01'),
  createdBy: 'mock-landlord-1',
  lastModifiedBy: 'mock-landlord-1',
};

// TODO: remove when GET /api/v1/leases?tenantId=me is ready
const MOCK_LEASES: MockLease[] = [
  {
    ...MOCK_BASE,
    id: 'mock-lease-1',
    propertyId: 'mock-prop-1',
    landlordId: 'mock-landlord-1',
    propertyAddress: '123 Demo Street, New York, NY 10001',
    paymentDueDay: 1,
    status: 'active',
    startDate: new Date('2025-01-01'),
    endDate: new Date('2026-01-01'),
    monthlyRent: 1500,
    securityDeposit: 3000,
    signatures: [
      {
        id: 'sig1', leaseId: 'mock-lease-1', signerId: 'mock-landlord-1',
        signerName: 'John Smith', signerRole: 'Landlord',
        signatureType: 'electronic', signatureData: '', ipAddress: '', userAgent: '',
        timestamp: new Date('2024-12-15'), authenticationMethod: 'email',
        authenticationVerified: true, status: 'completed',
      },
      {
        id: 'sig2', leaseId: 'mock-lease-1', signerId: 'mock-tenant-1',
        signerName: 'Jane Doe', signerRole: 'Tenant',
        signatureType: 'electronic', signatureData: '', ipAddress: '', userAgent: '',
        timestamp: new Date('2024-12-20'), authenticationMethod: 'email',
        authenticationVerified: true, status: 'completed',
      },
    ] as LeaseAgreement['signatures'],
    comments: [
      {
        id: 'c1', leaseId: 'mock-lease-1', userId: 'mock-landlord-1',
        userName: 'John Smith',
        content: 'Lease has been finalized and signed by both parties. Welcome!',
        isResolved: true, replies: [],
        createdAt: new Date('2024-12-20'), updatedAt: new Date('2024-12-20'),
      },
    ] as LeaseAgreement['comments'],
    versionHistory: [
      {
        id: 'v1', versionNumber: 1, leaseId: 'mock-lease-1', content: 'Initial version',
        changes: ['Lease created', 'Terms agreed between parties'],
        createdBy: 'mock-landlord-1', createdByName: 'John Smith',
        createdAt: new Date('2024-12-01'), isCurrent: true,
      },
    ] as LeaseAgreement['versionHistory'],
    updatedAt: new Date('2024-12-20'),
    lastModifiedBy: 'mock-tenant-1',
  },
  {
    ...MOCK_BASE,
    id: 'mock-lease-2',
    propertyId: 'mock-prop-2',
    landlordId: 'mock-landlord-2',
    propertyAddress: '456 Park Avenue, Brooklyn, NY 11201',
    paymentDueDay: 5,
    status: 'expired',
    startDate: new Date('2024-01-01'),
    endDate: new Date('2024-12-31'),
    monthlyRent: 1350,
    securityDeposit: 2700,
    signatureProgress: {
      landlord: { signed: true, timestamp: new Date('2023-12-10') },
      tenant:   { signed: true, timestamp: new Date('2023-12-15') },
      agent:    { signed: false, timestamp: null },
    } as LeaseAgreement['signatureProgress'],
    signatures: [
      {
        id: 'sig3', leaseId: 'mock-lease-2', signerId: 'mock-landlord-2',
        signerName: 'Bob Wilson', signerRole: 'Landlord',
        signatureType: 'electronic', signatureData: '', ipAddress: '', userAgent: '',
        timestamp: new Date('2023-12-10'), authenticationMethod: 'email',
        authenticationVerified: true, status: 'completed',
      },
      {
        id: 'sig4', leaseId: 'mock-lease-2', signerId: 'mock-tenant-1',
        signerName: 'Jane Doe', signerRole: 'Tenant',
        signatureType: 'electronic', signatureData: '', ipAddress: '', userAgent: '',
        timestamp: new Date('2023-12-15'), authenticationMethod: 'email',
        authenticationVerified: true, status: 'completed',
      },
    ] as LeaseAgreement['signatures'],
    createdAt: new Date('2023-12-01'),
    updatedAt: new Date('2023-12-15'),
    lastModifiedBy: 'mock-tenant-1',
  },
];

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-800',
  pending: 'bg-yellow-100 text-yellow-800',
  expired: 'bg-red-100 text-red-800',
  terminated: 'bg-secondary text-secondary-foreground',
  draft: 'bg-blue-100 text-blue-800',
};

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

const formatDate = (date: Date) =>
  new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'short', day: 'numeric' }).format(new Date(date));

export function TenantLeases() {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const navigate = useNavigate();

  // TODO: replace with GET /api/v1/leases?tenantId=me when backend is ready
  const leases = MOCK_LEASES;

  const filteredLeases = useMemo(() =>
    statusFilter === 'all' ? leases : leases.filter(l => l.status === statusFilter),
    [leases, statusFilter]
  );

  return (
    <ErrorBoundary>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">My Leases</h1>
          <p className="text-muted-foreground">View and manage your rental agreements</p>
        </div>

        <FilterBar
          filters={[
            {
              value: statusFilter,
              onChange: setStatusFilter,
              placeholder: 'Filter by status',
              options: [
                { value: 'all',        label: 'All Leases'  },
                { value: 'active',     label: 'Active'      },
                { value: 'pending',    label: 'Pending'     },
                { value: 'expired',    label: 'Expired'     },
                { value: 'terminated', label: 'Terminated'  },
              ],
            },
          ]}
          count={filteredLeases.length}
          countLabel="lease"
        />


        {/* List */}
        {filteredLeases.length === 0 ? (
          <EmptyState
            icon={FileText}
            title={statusFilter === 'all' ? 'No Leases Found' : `No ${statusFilter} leases`}
            description={
              statusFilter === 'all'
                ? "You don't have any leases yet. Contact your landlord to get started."
                : `No ${statusFilter} leases found.`
            }
            action={statusFilter !== 'all' ? { label: 'View All', onClick: () => setStatusFilter('all') } : undefined}
          />
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {filteredLeases.map((lease) => (
              <Card key={lease.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1 flex-wrap">
                        <CardTitle className="text-xl truncate">{lease.propertyAddress}</CardTitle>
                        <Badge className={STATUS_COLORS[lease.status] ?? STATUS_COLORS.pending}>
                          {lease.status.toUpperCase()}
                        </Badge>
                      </div>
                      <CardDescription>Lease ID: {lease.id.slice(0, 8)}…</CardDescription>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => navigate(`/tenant/leases/${lease.id}`, { state: { lease } })}>
                      <Eye className="mr-2 h-4 w-4" />
                      View Details
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="flex items-start gap-3">
                      <Calendar className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-foreground">Lease Period</p>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(lease.startDate)} – {formatDate(lease.endDate)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <DollarSign className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-foreground">Monthly Rent</p>
                        <p className="text-lg font-bold text-primary">{formatCurrency(lease.monthlyRent)}</p>
                        <p className="text-xs text-muted-foreground">Due on day {lease.paymentDueDay}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <Home className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-foreground">Security Deposit</p>
                        <p className="text-lg font-bold text-foreground">{formatCurrency(lease.securityDeposit)}</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <FileText className="h-4 w-4" />
                      <span>
                        {lease.status === 'active'
                          ? `${Math.ceil((new Date(lease.endDate).getTime() - Date.now()) / 86400000)} days remaining`
                          : `Ended ${formatDate(lease.endDate)}`}
                      </span>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => navigate(`/tenant/leases/${lease.id}`, { state: { lease } })}>
                      <Download className="mr-2 h-4 w-4" />
                      Documents
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
}
