/**
 * Tenant Dashboard
 * Main dashboard for tenant users showing lease overview, payments, and quick actions
 * Enhanced with loading states, error handling, and empty states
 */

import { useNavigate } from 'react-router-dom';
import {
  Home,
  FileText,
  DollarSign,
  Wrench,
  Calendar,
  Download,
  CreditCard,
  Bell
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import type { LeaseAgreement, UtilityResponsibility } from '@/types/lease';
import type { Payment } from '@/services/paymentService';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { LeaseExtensionBanner } from '@/components/tenant/LeaseExtensionBanner';
import { LeaseDecisionBanner } from '@/components/tenant/LeaseDecisionBanner';
import { RecommendedProperties } from '@/components/tenant/RecommendedProperties';
import { CURRENT_TENANT_ID, getMyCurrentProperties } from '@/data/tenantLeases';

// TODO: remove when backend /api/v1/leases is ready
const MOCK_LEASE: LeaseAgreement & { propertyAddress: string; paymentDueDay: number } = {
  id: 'mock-lease-1',
  propertyId: 'mock-prop-1',
  landlordId: 'mock-landlord-1',
  tenantIds: ['mock-tenant-1'],
  type: 'residential-long-term',
  status: 'active',
  startDate: new Date('2025-10-01'),
  endDate: new Date('2026-09-30'),
  monthlyRent: 1500,
  securityDeposit: 3000,
  utilities: [
    { utilityType: 'water', responsibleParty: 'landlord' } as UtilityResponsibility,
    { utilityType: 'internet', responsibleParty: 'tenant' } as UtilityResponsibility,
  ],
  propertyAddress: '123 Demo Street, New York, NY 10001',
  paymentDueDay: 1,
  clauses: [],
  addendums: [],
  createdByRole: 'landlord',
  approvalStatus: 'approved' as LeaseAgreement['approvalStatus'],
  approvalHistory: [],
  signatureStatus: 'signed',
  signatureProgress: {} as LeaseAgreement['signatureProgress'],
  documentLinks: {} as LeaseAgreement['documentLinks'],
  complianceScore: 100,
  complianceIssues: [],
  stateSpecificRules: [],
};

const MOCK_PAYMENTS: Payment[] = [
  { id: 'p1', amount: 1500, paymentDate: new Date('2025-12-01'), paymentMethod: 'bank_transfer', paymentStatus: 'completed', leaseId: 'mock-lease-1' } as Payment,
  { id: 'p2', amount: 1500, paymentDate: new Date('2025-11-01'), paymentMethod: 'bank_transfer', paymentStatus: 'completed', leaseId: 'mock-lease-1' } as Payment,
  { id: 'p3', amount: 1500, paymentDate: new Date('2025-10-01'), paymentMethod: 'credit_card',   paymentStatus: 'completed', leaseId: 'mock-lease-1' } as Payment,
];

export function TenantDashboard() {
  // TODO: replace with API calls when backend is ready
  const currentLease = MOCK_LEASE;
  const recentPayments = MOCK_PAYMENTS;

  const navigate = useNavigate();

  const getDaysUntilExpiration = (endDate: Date): number => {
    const today = new Date();
    const end = new Date(endDate);
    const diffTime = end.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (date: Date): string => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(new Date(date));
  };

  const getPaymentStatusBadge = (status: string) => {
    const statusColors: Record<string, string> = {
      completed: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      processing: 'bg-blue-100 text-blue-800',
      failed: 'bg-red-100 text-red-800',
      refunded: 'bg-gray-100 text-gray-800',
      cancelled: 'bg-gray-100 text-gray-800'
    };

    return (
      <Badge className={statusColors[status] || statusColors.pending}>
        {status.toUpperCase()}
      </Badge>
    );
  };

  const daysUntilExpiration = getDaysUntilExpiration(currentLease.endDate);
  const showExpirationWarning = daysUntilExpiration <= 60;

  return (
    <ErrorBoundary>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Welcome Back!</h1>
          <p className="text-gray-600">Here's an overview of your rental information</p>
        </div>

        {showExpirationWarning && (
          <Alert className="mb-6">
            <Bell className="h-4 w-4" />
            <AlertDescription>
              Your lease expires in {daysUntilExpiration} days. Consider reaching out to your landlord about renewal options.
            </AlertDescription>
          </Alert>
        )}

        {currentLease.status === 'active' && (
          <div className="mb-6 space-y-3">
            <LeaseExtensionBanner
              leaseId={currentLease.id}
              endDate={currentLease.endDate}
              propertyAddress={currentLease.propertyAddress}
            />
            <LeaseDecisionBanner
              leaseId={currentLease.id}
              endDate={currentLease.endDate}
              propertyAddress={currentLease.propertyAddress}
            />
          </div>
        )}

        {/* Task 6 — recommendations within 180 days of lease end. The dashboard's
            MOCK_LEASE is a stripped-down LeaseAgreement; for the recommendations
            section we need a real Property object, so we source the first active
            tenant lease via getMyCurrentProperties (same demo seed as MyProperties). */}
        {(() => {
          const [firstCurrent] = getMyCurrentProperties(CURRENT_TENANT_ID);
          if (!firstCurrent) return null;
          return (
            <div className="mb-8">
              <RecommendedProperties
                tenantId={CURRENT_TENANT_ID}
                leaseEndDate={firstCurrent.lease.endDate}
                monthlyRent={firstCurrent.lease.monthlyRent}
                currentProperty={firstCurrent.property}
                variant="compact"
              />
            </div>
          );
        })()}

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Monthly Rent</CardTitle>
              <DollarSign className="h-4 w-4 text-gray-400" aria-hidden="true" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(currentLease.monthlyRent)}</div>
              <p className="text-xs text-gray-500 mt-1">
                Due on day {currentLease.paymentDueDay} of each month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Lease Expires</CardTitle>
              <Calendar className="h-4 w-4 text-gray-400" aria-hidden="true" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatDate(currentLease.endDate)}</div>
              <p className="text-xs text-gray-500 mt-1">
                {daysUntilExpiration} days remaining
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Security Deposit</CardTitle>
              <CreditCard className="h-4 w-4 text-gray-400" aria-hidden="true" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(currentLease.securityDeposit)}</div>
              <p className="text-xs text-gray-500 mt-1">
                Held by landlord
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Lease Status</CardTitle>
              <FileText className="h-4 w-4 text-gray-400" aria-hidden="true" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold capitalize">{currentLease.status}</div>
              <p className="text-xs text-gray-500 mt-1">
                {currentLease.type.replace('-', ' ')} lease
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Current Lease & Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Current Lease</CardTitle>
              <CardDescription>Your active rental agreement details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium">Property Address</p>
                  <p className="text-sm text-gray-600">{currentLease.propertyAddress}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`/tenant/leases/${currentLease.id}`)}
                  aria-label="View lease details"
                >
                  View Details
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium">Lease Start</p>
                  <p className="text-sm text-gray-600">{formatDate(currentLease.startDate)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Lease End</p>
                  <p className="text-sm text-gray-600">{formatDate(currentLease.endDate)}</p>
                </div>
              </div>

              {currentLease.utilities && currentLease.utilities.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">Utilities Included</p>
                  <div className="flex flex-wrap gap-2">
                    {currentLease.utilities.map((utility, index) => (
                      <Badge key={index} variant="secondary">
                        {utility.utilityType}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Common tasks and shortcuts</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => navigate('/tenant/payments')}
                aria-label="Make a payment"
              >
                <DollarSign className="mr-2 h-4 w-4" aria-hidden="true" />
                Make Payment
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => navigate('/tenant/maintenance')}
                aria-label="Request maintenance"
              >
                <Wrench className="mr-2 h-4 w-4" aria-hidden="true" />
                Request Maintenance
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => navigate(`/tenant/leases/${currentLease.id}`)}
                aria-label="View lease documents"
              >
                <FileText className="mr-2 h-4 w-4" aria-hidden="true" />
                View Lease Documents
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => navigate('/tenant/profile')}
                aria-label="Update profile"
              >
                <Home className="mr-2 h-4 w-4" aria-hidden="true" />
                Update Profile
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Recent Payments */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Recent Payments</CardTitle>
                <CardDescription>Your payment history</CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/tenant/payments')}
                aria-label="View all payments"
              >
                View All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {recentPayments.length === 0 ? (
              <EmptyState
                icon={DollarSign}
                title="No Payment History"
                description="You haven't made any payments yet. Your payment history will appear here once you make your first payment."
                action={{
                  label: 'Make a Payment',
                  onClick: () => navigate('/tenant/payments')
                }}
              />
            ) : (
              <div className="space-y-4">
                {recentPayments.map((payment) => (
                  <div
                    key={payment.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2"
                    tabIndex={0}
                    role="article"
                    aria-label={`Payment of ${formatCurrency(payment.amount)} on ${formatDate(payment.paymentDate)}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center" aria-hidden="true">
                        <DollarSign className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{formatCurrency(payment.amount)}</p>
                        <p className="text-sm text-gray-500">
                          {formatDate(payment.paymentDate)} • {payment.paymentMethod.replace('_', ' ')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {getPaymentStatusBadge(payment.paymentStatus)}
                      {payment.paymentStatus === 'completed' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/tenant/payments/${payment.id}`)}
                          aria-label={`Download receipt for payment of ${formatCurrency(payment.amount)}`}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </ErrorBoundary>
  );
}