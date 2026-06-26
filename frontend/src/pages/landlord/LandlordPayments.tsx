import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/lib/supabase/client';
import { DollarSign, TrendingUp, TrendingDown, AlertCircle, Download, Search, Calendar } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';

interface Payment {
  id: string;
  amount: number;
  payment_date: string;
  due_date: string;
  status: string;
  payment_method: string;
  transaction_id: string;
  created_at: string;
  leases: {
    id: string;
    monthly_rent: number;
    tenants: {
      full_name: string;
      email: string;
    };
    properties: {
      address: string;
      city: string;
      state: string;
    };
  };
}

export default function LandlordPayments() {
  const [searchParams] = useSearchParams();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [filteredPayments, setFilteredPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('filter') || 'all');
  const [yearFilter, setYearFilter] = useState(new Date().getFullYear().toString());

  const fetchPayments = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('payments')
        .select(`
          *,
          leases!inner (
            id,
            monthly_rent,
            tenants (
              full_name,
              email
            ),
            properties!inner (
              landlord_id,
              address,
              city,
              state
            )
          )
        `)
        .eq('leases.properties.landlord_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setPayments(data || []);
      setFilteredPayments(data || []);
    } catch (error) {
      console.error('Error fetching payments:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  useEffect(() => {
    let filtered = payments;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (payment) =>
          payment.leases.tenants.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          payment.leases.properties.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
          payment.transaction_id.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      if (statusFilter === 'overdue') {
        const today = new Date().toISOString().split('T')[0];
        filtered = filtered.filter(
          (payment) => payment.status === 'pending' && payment.due_date < today
        );
      } else {
        filtered = filtered.filter((payment) => payment.status === statusFilter);
      }
    }

    // Year filter
    if (yearFilter !== 'all') {
      filtered = filtered.filter(
        (payment) => new Date(payment.payment_date).getFullYear().toString() === yearFilter
      );
    }

    setFilteredPayments(filtered);
  }, [searchTerm, statusFilter, yearFilter, payments]);

  const getTotalRevenue = () => {
    return payments
      .filter((p) => p.status === 'paid')
      .reduce((sum, p) => sum + p.amount, 0);
  };

  const getMonthlyRevenue = () => {
    const currentMonth = new Date().toISOString().slice(0, 7);
    return payments
      .filter((p) => p.status === 'paid' && p.payment_date.startsWith(currentMonth))
      .reduce((sum, p) => sum + p.amount, 0);
  };

  const getOverdueAmount = () => {
    const today = new Date().toISOString().split('T')[0];
    return payments
      .filter((p) => p.status === 'pending' && p.due_date < today)
      .reduce((sum, p) => sum + p.amount, 0);
  };

  const getPendingAmount = () => {
    return payments
      .filter((p) => p.status === 'pending')
      .reduce((sum, p) => sum + p.amount, 0);
  };

  const getOverdueCount = () => {
    const today = new Date().toISOString().split('T')[0];
    return payments.filter((p) => p.status === 'pending' && p.due_date < today).length;
  };

  const exportToCSV = () => {
    const headers = ['Date', 'Tenant', 'Property', 'Amount', 'Status', 'Payment Method', 'Transaction ID'];
    const rows = filteredPayments.map((payment) => [
      new Date(payment.payment_date).toLocaleDateString(),
      payment.leases.tenants.full_name,
      payment.leases.properties.address,
      payment.amount,
      payment.status,
      payment.payment_method,
      payment.transaction_id,
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payments_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg">Loading payments...</div>
      </div>
    );
  }

  const overduePayments = payments.filter((p) => {
    const today = new Date().toISOString().split('T')[0];
    return p.status === 'pending' && p.due_date < today;
  });

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Payment Monitoring</h1>
          <p className="text-muted-foreground">Track rental income and payment status</p>
        </div>
        <Button onClick={exportToCSV}>
          <Download className="mr-2 h-4 w-4" />
          Export Report
        </Button>
      </div>

      {/* Overdue Payments Alert */}
      {overduePayments.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <CardTitle className="text-red-900">Overdue Payments</CardTitle>
            </div>
            <CardDescription className="text-red-700">
              {overduePayments.length} payment{overduePayments.length > 1 ? 's' : ''} overdue - Total: ${getOverdueAmount().toLocaleString()}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {overduePayments.slice(0, 3).map((payment) => (
                <div key={payment.id} className="flex items-center justify-between p-3 bg-white rounded-lg">
                  <div>
                    <p className="font-medium">{payment.leases.tenants.full_name}</p>
                    <p className="text-sm text-muted-foreground">
                      ${payment.amount.toLocaleString()} - Due {new Date(payment.due_date).toLocaleDateString()}
                    </p>
                  </div>
                  <Button variant="outline" size="sm">
                    Send Reminder
                  </Button>
                </div>
              ))}
              {overduePayments.length > 3 && (
                <Button
                  variant="link"
                  className="text-red-600 p-0 h-auto"
                  onClick={() => setStatusFilter('overdue')}
                >
                  View all {overduePayments.length} overdue payments →
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Revenue Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${getTotalRevenue().toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              ${getMonthlyRevenue().toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">Current month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Calendar className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              ${getPendingAmount().toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">Awaiting payment</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              ${getOverdueAmount().toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">{getOverdueCount()} payments</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filter Payments</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by tenant, property, or transaction..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={yearFilter} onValueChange={setYearFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by year" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Years</SelectItem>
                <SelectItem value="2024">2024</SelectItem>
                <SelectItem value="2025">2025</SelectItem>
                <SelectItem value="2026">2026</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Payments List */}
      {filteredPayments.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center">
            <DollarSign className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No payments found</h3>
            <p className="text-muted-foreground">
              {payments.length === 0
                ? "Payment history will appear here"
                : "Try adjusting your filters"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Payment History</CardTitle>
            <CardDescription>
              Showing {filteredPayments.length} of {payments.length} payments
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {filteredPayments.map((payment) => {
                const isOverdue = payment.status === 'pending' && payment.due_date < new Date().toISOString().split('T')[0];
                
                return (
                  <div key={payment.id} className="flex items-center justify-between border-b pb-4 last:border-0">
                    <div className="space-y-1">
                      <p className="font-medium">{payment.leases.tenants.full_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {payment.leases.properties.address}, {payment.leases.properties.city}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>Payment Date: {new Date(payment.payment_date).toLocaleDateString()}</span>
                        <span>Due: {new Date(payment.due_date).toLocaleDateString()}</span>
                        <span>Method: {payment.payment_method}</span>
                      </div>
                    </div>
                    <div className="text-right space-y-2">
                      <p className="text-xl font-bold">${payment.amount.toLocaleString()}</p>
                      <Badge
                        variant={
                          payment.status === 'paid' ? 'default' :
                          isOverdue ? 'destructive' :
                          payment.status === 'failed' ? 'destructive' :
                          'secondary'
                        }
                      >
                        {isOverdue ? 'Overdue' : payment.status}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}