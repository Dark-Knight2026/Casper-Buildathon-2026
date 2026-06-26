import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useTenantDashboard } from '@/contexts/TenantDashboardContext';
import {
  CreditCard,
  Plus,
  Trash2,
  Star,
  Calendar,
  Shield,
  CheckCircle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function PaymentMethodManager() {
  const { paymentMethods, setDefaultPaymentMethod, deletePaymentMethod } = useTenantDashboard();
  const { toast } = useToast();
  const [showAddForm, setShowAddForm] = useState(false);

  const handleSetDefault = async (id: string) => {
    try {
      await setDefaultPaymentMethod(id);
      toast({
        title: 'Default Payment Method Updated',
        description: 'This payment method will be used for future payments'
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update default payment method',
        variant: 'destructive'
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to remove this payment method?')) {
      try {
        await deletePaymentMethod(id);
        toast({
          title: 'Payment Method Removed',
          description: 'The payment method has been removed from your account'
        });
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Failed to remove payment method',
          variant: 'destructive'
        });
      }
    }
  };

  const getCardIcon = (type: string) => {
    return <CreditCard className="h-5 w-5" />;
  };

  return (
    <div className="space-y-6">
      {/* Add New Payment Method Button */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Saved Payment Methods</h3>
          <p className="text-sm text-gray-600">Manage your payment methods and auto-pay settings</p>
        </div>
        <Button onClick={() => setShowAddForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Payment Method
        </Button>
      </div>

      {/* Payment Methods List */}
      {paymentMethods.length === 0 ? (
        <Card className="border-2 border-dashed">
          <CardContent className="p-12 text-center">
            <CreditCard className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Payment Methods</h3>
            <p className="text-gray-600 mb-6">
              Add a payment method to make rent payments easier and faster
            </p>
            <Button onClick={() => setShowAddForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Payment Method
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {paymentMethods.map((method) => (
            <Card key={method.id} className={method.is_default ? 'border-blue-500 border-2' : ''}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4">
                    <div className="h-12 w-12 bg-gray-100 rounded-lg flex items-center justify-center">
                      {getCardIcon(method.type)}
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <h4 className="font-semibold">
                          {method.provider} •••• {method.last_four}
                        </h4>
                        {method.is_default && (
                          <Badge className="bg-blue-100 text-blue-800">
                            <Star className="h-3 w-3 mr-1" />
                            Default
                          </Badge>
                        )}
                        {method.is_verified && (
                          <Badge className="bg-green-100 text-green-800">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Verified
                          </Badge>
                        )}
                      </div>
                      
                      <div className="space-y-1 text-sm text-gray-600">
                        <p className="capitalize">{method.type.replace('_', ' ')}</p>
                        {method.expiry_date && (
                          <p className="flex items-center">
                            <Calendar className="h-3 w-3 mr-1" />
                            Expires {method.expiry_date}
                          </p>
                        )}
                        {method.is_auto_pay && (
                          <p className="flex items-center text-blue-600">
                            <Shield className="h-3 w-3 mr-1" />
                            Auto-pay enabled (charges on day {method.auto_pay_day})
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex space-x-2">
                    {!method.is_default && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSetDefault(method.id)}
                      >
                        Set as Default
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(method.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {method.billing_address && (
                  <div className="mt-4 pt-4 border-t">
                    <p className="text-sm text-gray-600">Billing Address</p>
                    <p className="text-sm">
                      {method.billing_address.street}, {method.billing_address.city},{' '}
                      {method.billing_address.state} {method.billing_address.zip_code}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Security Notice */}
      <Card className="bg-green-50 border-green-200">
        <CardContent className="p-4">
          <div className="flex items-start space-x-3">
            <Shield className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-green-800">
              <p className="font-medium mb-1">Your Payment Information is Secure</p>
              <p>
                We use bank-level encryption to protect your payment information. Your full card
                details are never stored on our servers.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Add Payment Method Form Modal - Placeholder */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <Card className="max-w-2xl w-full">
            <CardContent className="p-6">
              <div className="text-center py-8">
                <CreditCard className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold mb-2">Add Payment Method</h3>
                <p className="text-gray-600 mb-6">
                  Payment method form would be integrated here with a secure payment processor
                </p>
                <Button onClick={() => setShowAddForm(false)}>Close</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}