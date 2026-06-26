import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTenantDashboard } from '@/contexts/TenantDashboardContext';
import PaymentMethodManager from './PaymentMethodManager';
import MakePaymentForm from './MakePaymentForm';
import {
  CreditCard,
  DollarSign,
  Download,
  Calendar,
  CheckCircle,
  Clock,
  AlertCircle,
  TrendingUp
} from 'lucide-react';

export default function PaymentDashboard() {
  const { payments, dashboardStats } = useTenantDashboard();
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [showPaymentMethods, setShowPaymentMethods] = useState(false);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4" />;
      case 'pending':
        return <Clock className="h-4 w-4" />;
      case 'processing':
        return <Clock className="h-4 w-4" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const upcomingPayment = dashboardStats.upcoming_payment;
  const completedPayments = payments.filter(p => p.status === 'completed');
  const pendingPayments = payments.filter(p => p.status === 'pending');

  return (
    <div className="space-y-6">
      {/* Payment Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Next Payment Due</p>
                {upcomingPayment ? (
                  <>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                      ${upcomingPayment.total_amount.toLocaleString()}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      Due {formatDate(upcomingPayment.due_date)}
                    </p>
                  </>
                ) : (
                  <p className="text-lg text-gray-500 mt-1">No upcoming payments</p>
                )}
              </div>
              <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Days Until Due</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {dashboardStats.days_until_payment}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  {dashboardStats.days_until_payment <= 3 ? 'Payment due soon' : 'On track'}
                </p>
              </div>
              <div className="h-12 w-12 bg-yellow-100 rounded-full flex items-center justify-center">
                <Calendar className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Paid This Year</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  ${dashboardStats.total_paid_this_year.toLocaleString()}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  {completedPayments.length} payments
                </p>
              </div>
              <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      {upcomingPayment && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Rent Payment Due in {dashboardStats.days_until_payment} Days
                </h3>
                <p className="text-gray-600 mt-1">
                  ${upcomingPayment.total_amount.toLocaleString()} due on {formatDate(upcomingPayment.due_date)}
                </p>
              </div>
              <div className="flex space-x-3">
                <Button onClick={() => setShowPaymentForm(true)}>
                  <CreditCard className="h-4 w-4 mr-2" />
                  Pay Now
                </Button>
                <Button variant="outline" onClick={() => setShowPaymentMethods(true)}>
                  Manage Payment Methods
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payment Tabs */}
      <Tabs defaultValue="history" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="history">Payment History</TabsTrigger>
          <TabsTrigger value="pending">Pending Payments</TabsTrigger>
          <TabsTrigger value="methods">Payment Methods</TabsTrigger>
        </TabsList>

        <TabsContent value="history" className="space-y-4 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Payment History</CardTitle>
            </CardHeader>
            <CardContent>
              {completedPayments.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No payment history available
                </div>
              ) : (
                <div className="space-y-4">
                  {completedPayments.map((payment) => (
                    <Card key={payment.id} className="border">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <h3 className="text-lg font-semibold">
                              {payment.payment_type.charAt(0).toUpperCase() + payment.payment_type.slice(1)} Payment
                            </h3>
                            <p className="text-sm text-gray-600">
                              Transaction ID: {payment.transaction_id}
                            </p>
                          </div>
                          <Badge className={getStatusColor(payment.status)}>
                            <span className="flex items-center space-x-1">
                              {getStatusIcon(payment.status)}
                              <span>{payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}</span>
                            </span>
                          </Badge>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          <div>
                            <p className="text-sm text-gray-600">Amount</p>
                            <p className="text-xl font-bold text-green-600">
                              ${payment.total_amount.toLocaleString()}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Due Date</p>
                            <p className="font-medium">{formatDate(payment.due_date)}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Paid Date</p>
                            <p className="font-medium">
                              {payment.paid_date ? formatDate(payment.paid_date) : 'N/A'}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Receipt</p>
                            {payment.receipt_url ? (
                              <Button
                                variant="link"
                                className="p-0 h-auto font-medium text-blue-600"
                                onClick={() => window.open(payment.receipt_url, '_blank')}
                              >
                                <Download className="h-4 w-4 mr-1" />
                                Download
                              </Button>
                            ) : (
                              <p className="text-sm text-gray-500">Not available</p>
                            )}
                          </div>
                        </div>

                        {payment.late_fee > 0 && (
                          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
                            <p className="text-sm text-yellow-800">
                              Late fee applied: ${payment.late_fee.toLocaleString()}
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pending" className="space-y-4 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Pending Payments</CardTitle>
            </CardHeader>
            <CardContent>
              {pendingPayments.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No pending payments
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingPayments.map((payment) => (
                    <Card key={payment.id} className="border">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <h3 className="text-lg font-semibold">
                              {payment.payment_type.charAt(0).toUpperCase() + payment.payment_type.slice(1)} Payment
                            </h3>
                            <p className="text-sm text-gray-600">
                              Due: {formatDate(payment.due_date)}
                            </p>
                          </div>
                          <Badge className={getStatusColor(payment.status)}>
                            <span className="flex items-center space-x-1">
                              {getStatusIcon(payment.status)}
                              <span>{payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}</span>
                            </span>
                          </Badge>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                          <div>
                            <p className="text-sm text-gray-600">Amount Due</p>
                            <p className="text-2xl font-bold text-gray-900">
                              ${payment.total_amount.toLocaleString()}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Days Until Due</p>
                            <p className="text-xl font-semibold">
                              {Math.ceil((new Date(payment.due_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Late Fee (if late)</p>
                            <p className="text-xl font-semibold text-red-600">
                              ${payment.late_fee.toLocaleString()}
                            </p>
                          </div>
                        </div>

                        <Button onClick={() => setShowPaymentForm(true)} className="w-full">
                          <CreditCard className="h-4 w-4 mr-2" />
                          Pay Now
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="methods" className="mt-6">
          <PaymentMethodManager />
        </TabsContent>
      </Tabs>

      {/* Payment Form Modal */}
      {showPaymentForm && upcomingPayment && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <MakePaymentForm
              payment={upcomingPayment}
              onSuccess={() => setShowPaymentForm(false)}
              onCancel={() => setShowPaymentForm(false)}
            />
          </div>
        </div>
      )}

      {/* Payment Methods Modal */}
      {showPaymentMethods && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">Payment Methods</h2>
                <Button variant="ghost" onClick={() => setShowPaymentMethods(false)}>
                  Close
                </Button>
              </div>
              <PaymentMethodManager />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}