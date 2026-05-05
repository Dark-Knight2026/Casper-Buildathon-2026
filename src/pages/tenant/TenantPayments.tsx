/**
 * Tenant Payments Page
 * Payment history and receipt management for tenants
 */

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DollarSign, Download, Calendar, CreditCard,
  FileText, CheckCircle, XCircle, Clock, Plus, Settings
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FilterBar } from '@/components/ui/filter-bar';
import { useToast } from '@/hooks/use-toast';
import type { Payment } from '@/services/paymentService';

// TODO: remove when GET /api/v1/payments?tenantId=me is ready
const MOCK_PAYMENTS: Payment[] = [
  { id: 'p1', amount: 1500, paymentDate: new Date('2026-03-01'), paymentMethod: 'bank_transfer',  paymentStatus: 'completed',  leaseId: 'mock-lease-1', transactionId: 'txn_001' } as Payment,
  { id: 'p2', amount: 1500, paymentDate: new Date('2026-02-01'), paymentMethod: 'bank_transfer',  paymentStatus: 'completed',  leaseId: 'mock-lease-1', transactionId: 'txn_002' } as Payment,
  { id: 'p3', amount: 1500, paymentDate: new Date('2026-01-01'), paymentMethod: 'credit_card',    paymentStatus: 'completed',  leaseId: 'mock-lease-1', transactionId: 'txn_003' } as Payment,
  { id: 'p4', amount: 1500, paymentDate: new Date('2025-12-01'), paymentMethod: 'bank_transfer',  paymentStatus: 'completed',  leaseId: 'mock-lease-1', transactionId: 'txn_004' } as Payment,
  { id: 'p5', amount: 1500, paymentDate: new Date('2025-11-01'), paymentMethod: 'credit_card',    paymentStatus: 'failed',     leaseId: 'mock-lease-1' } as Payment,
  { id: 'p6', amount: 1500, paymentDate: new Date('2025-10-01'), paymentMethod: 'bank_transfer',  paymentStatus: 'completed',  leaseId: 'mock-lease-1', transactionId: 'txn_006' } as Payment,
];

const STATUS_CONFIG: Record<string, { color: string; icon: React.ReactNode }> = {
  completed:  { color: 'bg-green-100 text-green-800',   icon: <CheckCircle className="h-3 w-3" /> },
  pending:    { color: 'bg-yellow-100 text-yellow-800', icon: <Clock className="h-3 w-3" /> },
  processing: { color: 'bg-blue-100 text-blue-800',     icon: <Clock className="h-3 w-3" /> },
  failed:     { color: 'bg-red-100 text-red-800',       icon: <XCircle className="h-3 w-3" /> },
  refunded:   { color: 'bg-secondary text-secondary-foreground', icon: <FileText className="h-3 w-3" /> },
  cancelled:  { color: 'bg-secondary text-secondary-foreground', icon: <XCircle className="h-3 w-3" /> },
};

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

const formatDate = (date: Date) =>
  new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'short', day: 'numeric' }).format(new Date(date));

export function TenantPayments() {
  const [statusFilter, setStatusFilter] = useState('all');
  const [yearFilter, setYearFilter]     = useState('all');
  const navigate = useNavigate();
  const { toast } = useToast();

  // TODO: replace with GET /api/v1/payments?tenantId=me when backend is ready
  const payments = MOCK_PAYMENTS;

  const filteredPayments = useMemo(() => {
    return payments.filter(p => {
      const statusOk = statusFilter === 'all' || p.paymentStatus === statusFilter;
      const yearOk   = yearFilter === 'all' || new Date(p.paymentDate).getFullYear() === parseInt(yearFilter);
      return statusOk && yearOk;
    });
  }, [payments, statusFilter, yearFilter]);

  const availableYears = useMemo(() => {
    const years = new Set(payments.map(p => new Date(p.paymentDate).getFullYear()));
    return Array.from(years).sort((a, b) => b - a);
  }, [payments]);

  const totalPaid = useMemo(() =>
    filteredPayments.filter(p => p.paymentStatus === 'completed').reduce((s, p) => s + p.amount, 0),
    [filteredPayments]
  );

  const pendingCount = filteredPayments.filter(p =>
    p.paymentStatus === 'pending' || p.paymentStatus === 'processing'
  ).length;

  // TODO: replace with real receipt download when backend is ready
  const handleDownloadReceipt = (paymentId: string) => {
    toast({ title: 'Receipt (mock)', description: `Receipt for payment ${paymentId} — available after backend integration` });
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Payment History</h1>
          <p className="text-muted-foreground">View your rent payments and download receipts</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => navigate('/tenant/payments/methods')}>
            <Settings className="mr-2 h-4 w-4" />
            Payment Methods
          </Button>
          <Button onClick={() => navigate('/tenant/payments/make')}>
            <Plus className="mr-2 h-4 w-4" />
            Make Payment
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Paid</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{formatCurrency(totalPaid)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {filteredPayments.filter(p => p.paymentStatus === 'completed').length} completed payments
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{pendingCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Awaiting processing</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Payments</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{filteredPayments.length}</div>
            <p className="text-xs text-muted-foreground mt-1">All time</p>
          </CardContent>
        </Card>
      </div>

      <FilterBar
        filters={[
          {
            value: statusFilter,
            onChange: setStatusFilter,
            placeholder: 'Filter by status',
            options: [
              { value: 'all',        label: 'All Statuses' },
              { value: 'completed',  label: 'Completed'    },
              { value: 'pending',    label: 'Pending'      },
              { value: 'processing', label: 'Processing'   },
              { value: 'failed',     label: 'Failed'       },
              { value: 'refunded',   label: 'Refunded'     },
            ],
          },
          {
            value: yearFilter,
            onChange: setYearFilter,
            placeholder: 'Filter by year',
            options: [
              { value: 'all', label: 'All Years' },
              ...availableYears.map(y => ({ value: y.toString(), label: y.toString() })),
            ],
          },
        ]}
        count={filteredPayments.length}
        countLabel="payment"
      />

      {/* Payments List */}
      {filteredPayments.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <DollarSign className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No Payments Found</h3>
            <p className="text-sm text-muted-foreground text-center mb-4">
              {statusFilter === 'all' && yearFilter === 'all'
                ? "You don't have any payment history yet."
                : 'No payments match your current filters.'}
            </p>
            {statusFilter === 'all' && yearFilter === 'all' && (
              <Button onClick={() => navigate('/tenant/payments/make')}>
                <Plus className="mr-2 h-4 w-4" />
                Make Your First Payment
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredPayments.map((payment) => {
            const statusCfg = STATUS_CONFIG[payment.paymentStatus] ?? STATUS_CONFIG.pending;
            return (
              <Card key={payment.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4 flex-1 min-w-0">
                      <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-primary">
                        {payment.paymentMethod === 'credit_card'
                          ? <CreditCard className="h-5 w-5" />
                          : <DollarSign className="h-5 w-5" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2 flex-wrap">
                          <span className="font-semibold text-lg text-foreground">{formatCurrency(payment.amount)}</span>
                          <Badge className={`${statusCfg.color} flex items-center gap-1`}>
                            {statusCfg.icon}
                            {payment.paymentStatus.toUpperCase()}
                          </Badge>
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Calendar className="h-4 w-4 shrink-0" />
                            <span>{formatDate(payment.paymentDate)}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <CreditCard className="h-4 w-4 shrink-0" />
                            <span className="capitalize">{payment.paymentMethod.replace('_', ' ')}</span>
                          </div>
                          {payment.transactionId && (
                            <p className="text-xs text-muted-foreground">
                              Transaction ID: {payment.transactionId}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                    {payment.paymentStatus === 'completed' && (
                      <Button variant="outline" size="sm" onClick={() => handleDownloadReceipt(payment.id)}>
                        <Download className="mr-2 h-4 w-4" />
                        Receipt
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
