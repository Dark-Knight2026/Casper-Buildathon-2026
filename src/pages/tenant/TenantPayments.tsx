/**
 * Tenant Payments Page
 * Payment history and receipt management for tenants
 */

import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DollarSign,
  Download,
  Calendar,
  CreditCard,
  Loader2,
  AlertCircle,
  Filter,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  Plus,
  Settings
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/lib/supabase/client';
import { leaseManagementService } from '@/services/leaseManagementService';
import { paymentService, type Payment } from '@/services/paymentService';

export function TenantPayments() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [filteredPayments, setFilteredPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [yearFilter, setYearFilter] = useState<string>('all');
  const navigate = useNavigate();

  const loadPayments = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate('/auth/login');
        return;
      }

      // Get all leases for the tenant
      const leases = await leaseManagementService.getLeases({
        tenantId: user.id
      });

      // Get payments for all leases
      const allPayments: Payment[] = [];
      for (const lease of leases) {
        const leasePayments = await paymentService.getPaymentsByLeaseId(lease.id);
        allPayments.push(...leasePayments);
      }

      // Sort by date (newest first)
      allPayments.sort((a, b) => 
        new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime()
      );

      setPayments(allPayments);
    } catch (err) {
      console.error('Error loading payments:', err);
      setError(err instanceof Error ? err.message : 'Failed to load payments');
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  const filterPayments = useCallback(() => {
    let filtered = payments;

    if (statusFilter !== 'all') {
      filtered = filtered.filter(payment => payment.paymentStatus === statusFilter);
    }

    if (yearFilter !== 'all') {
      const year = parseInt(yearFilter);
      filtered = filtered.filter(payment => 
        new Date(payment.paymentDate).getFullYear() === year
      );
    }

    setFilteredPayments(filtered);
  }, [payments, statusFilter, yearFilter]);

  useEffect(() => {
    loadPayments();
  }, [loadPayments]);

  useEffect(() => {
    filterPayments();
  }, [filterPayments]);

  const getAvailableYears = (): number[] => {
    const years = new Set<number>();
    payments.forEach(payment => {
      years.add(new Date(payment.paymentDate).getFullYear());
    });
    return Array.from(years).sort((a, b) => b - a);
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

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { color: string; icon: React.ReactNode }> = {
      completed: {
        color: 'bg-green-100 text-green-800',
        icon: <CheckCircle className="h-3 w-3" />
      },
      pending: {
        color: 'bg-yellow-100 text-yellow-800',
        icon: <Clock className="h-3 w-3" />
      },
      processing: {
        color: 'bg-blue-100 text-blue-800',
        icon: <Clock className="h-3 w-3" />
      },
      failed: {
        color: 'bg-red-100 text-red-800',
        icon: <XCircle className="h-3 w-3" />
      },
      refunded: {
        color: 'bg-gray-100 text-gray-800',
        icon: <FileText className="h-3 w-3" />
      },
      cancelled: {
        color: 'bg-gray-100 text-gray-800',
        icon: <XCircle className="h-3 w-3" />
      }
    };

    const config = statusConfig[status] || statusConfig.pending;

    return (
      <Badge className={`${config.color} flex items-center gap-1`}>
        {config.icon}
        {status.toUpperCase()}
      </Badge>
    );
  };

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case 'credit_card':
        return <CreditCard className="h-4 w-4" />;
      case 'bank_transfer':
        return <DollarSign className="h-4 w-4" />;
      default:
        return <DollarSign className="h-4 w-4" />;
    }
  };

  const getTotalPaid = (): number => {
    return filteredPayments
      .filter(p => p.paymentStatus === 'completed')
      .reduce((sum, p) => sum + p.amount, 0);
  };

  const handleDownloadReceipt = async (paymentId: string) => {
    try {
      // Get receipts for this payment
      const receipts = await paymentService.getPaymentReceipts(paymentId);
      
      if (receipts.files && receipts.files.length > 0) {
        // Download the first receipt
        const receipt = receipts.files[0];
        window.open(receipt.url, '_blank');
      } else {
        alert('No receipt available for this payment');
      }
    } catch (err) {
      console.error('Error downloading receipt:', err);
      alert('Failed to download receipt');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  const availableYears = getAvailableYears();

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Payment History</h1>
          <p className="text-gray-600">View your rent payments and download receipts</p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => navigate('/tenant/payments/methods')}
          >
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
            <DollarSign className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(getTotalPaid())}</div>
            <p className="text-xs text-gray-500 mt-1">
              {filteredPayments.filter(p => p.paymentStatus === 'completed').length} completed payments
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Payments</CardTitle>
            <Clock className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {filteredPayments.filter(p => p.paymentStatus === 'pending' || p.paymentStatus === 'processing').length}
            </div>
            <p className="text-xs text-gray-500 mt-1">Awaiting processing</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Payments</CardTitle>
            <FileText className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredPayments.length}</div>
            <p className="text-xs text-gray-500 mt-1">All time</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
            <Filter className="h-5 w-5 text-gray-400" />
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="refunded">Refunded</SelectItem>
                </SelectContent>
              </Select>

              <Select value={yearFilter} onValueChange={setYearFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by year" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Years</SelectItem>
                  {availableYears.map(year => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="text-sm text-gray-500">
              {filteredPayments.length} {filteredPayments.length === 1 ? 'payment' : 'payments'}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payments List */}
      {filteredPayments.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <DollarSign className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Payments Found</h3>
            <p className="text-sm text-gray-500 text-center mb-4">
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
          {filteredPayments.map((payment) => (
            <Card key={payment.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      {getPaymentMethodIcon(payment.paymentMethod)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-lg">{formatCurrency(payment.amount)}</h3>
                        {getStatusBadge(payment.paymentStatus)}
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Calendar className="h-4 w-4" />
                          <span>{formatDate(payment.paymentDate)}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <CreditCard className="h-4 w-4" />
                          <span className="capitalize">{payment.paymentMethod.replace('_', ' ')}</span>
                        </div>
                        {payment.transactionId && (
                          <div className="text-xs text-gray-500">
                            Transaction ID: {payment.transactionId}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    {payment.paymentStatus === 'completed' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownloadReceipt(payment.id)}
                      >
                        <Download className="mr-2 h-4 w-4" />
                        Receipt
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}