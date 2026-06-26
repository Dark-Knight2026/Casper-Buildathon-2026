import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CreditCard } from 'lucide-react';
import { useTenantDashboard } from '@/hooks/useTenantDashboard';
import { useToast } from '@/hooks/use-toast';

export default function TenantPayments() {
  const { toast } = useToast();
  const { rentPayments } = useTenantDashboard();

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'Paid': return 'bg-green-100 text-green-800';
      case 'Pending': return 'bg-yellow-100 text-yellow-800';
      case 'Overdue': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleMakePayment = () => {
    toast({
      title: "Payment Initiated",
      description: "Redirecting to payment gateway...",
    });
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight text-gray-900">Payments</h1>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Payment History</CardTitle>
            <Button onClick={handleMakePayment} aria-label="Make rent payment">
              <CreditCard className="h-4 w-4 mr-2" />
              Make Payment
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {rentPayments.map((payment) => (
              <Card key={payment.id}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold">{payment.month}</h3>
                      <p className="text-muted-foreground">Payment Method: {payment.method}</p>
                    </div>
                    <Badge className={getPaymentStatusColor(payment.status)}>
                      {payment.status}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Amount</p>
                      <p className="text-xl font-bold text-green-600">${payment.amount.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Due Date</p>
                      <p className="font-medium">{payment.dueDate}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Paid Date</p>
                      <p className="font-medium">{payment.paidDate}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}