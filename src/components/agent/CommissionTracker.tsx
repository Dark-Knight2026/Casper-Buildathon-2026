import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Plus, CheckCircle2, Clock, Calendar } from 'lucide-react';
import type { CommissionRecord } from '@/types/financial';
import { format } from 'date-fns';

interface CommissionTrackerProps {
  commissions: CommissionRecord[];
}

export default function CommissionTracker({ commissions }: CommissionTrackerProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'received':
        return 'bg-green-100 text-green-800';
      case 'expected':
        return 'bg-blue-100 text-blue-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'paid_out':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'received':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'expected':
      case 'pending':
        return <Clock className="h-4 w-4 text-blue-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const receivedCommissions = commissions.filter(c => c.status === 'received');
  const expectedCommissions = commissions.filter(c => c.status === 'expected' || c.status === 'pending');

  const totalReceived = receivedCommissions.reduce((sum, c) => sum + c.net_commission, 0);
  const totalExpected = expectedCommissions.reduce((sum, c) => sum + c.net_commission, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Commission Tracker</h3>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Commission
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Received</p>
                <p className="text-2xl font-bold text-green-600">${totalReceived.toLocaleString()}</p>
                <p className="text-xs text-gray-500 mt-1">{receivedCommissions.length} commissions</p>
              </div>
              <CheckCircle2 className="h-12 w-12 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Expected/Pending</p>
                <p className="text-2xl font-bold text-blue-600">${totalExpected.toLocaleString()}</p>
                <p className="text-xs text-gray-500 mt-1">{expectedCommissions.length} commissions</p>
              </div>
              <Clock className="h-12 w-12 text-blue-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Commissions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {commissions.map((commission) => (
              <div key={commission.id} className="p-4 border rounded-lg hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h4 className="font-semibold text-lg">{commission.client_name}</h4>
                    <p className="text-sm text-gray-600">{commission.property_address}</p>
                    <Badge variant="outline" className="mt-1">
                      {commission.transaction_type}
                    </Badge>
                  </div>
                  <Badge className={getStatusColor(commission.status)}>
                    {getStatusIcon(commission.status)}
                    <span className="ml-1 capitalize">{commission.status}</span>
                  </Badge>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                  <div>
                    <p className="text-xs text-gray-500">Sale Price</p>
                    <p className="font-semibold">${commission.sale_price.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Rate</p>
                    <p className="font-semibold">{commission.commission_rate}%</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Gross Commission</p>
                    <p className="font-semibold">${commission.gross_commission.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Net Commission</p>
                    <p className="font-bold text-green-600">${commission.net_commission.toLocaleString()}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-gray-500 pt-3 border-t">
                  <div>
                    <span>Broker Split: {commission.broker_split_percentage}% (${commission.broker_split_amount.toLocaleString()})</span>
                  </div>
                  <div className="flex items-center space-x-4">
                    {commission.expected_date && (
                      <span className="flex items-center">
                        <Calendar className="h-3 w-3 mr-1" />
                        Expected: {format(new Date(commission.expected_date), 'MMM d, yyyy')}
                      </span>
                    )}
                    {commission.received_date && (
                      <span className="flex items-center text-green-600">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Received: {format(new Date(commission.received_date), 'MMM d, yyyy')}
                      </span>
                    )}
                  </div>
                </div>

                {commission.notes && (
                  <p className="text-xs text-gray-600 mt-2 italic">{commission.notes}</p>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}