/**
 * Payment Method Manager Component
 * Manage payment methods for tenants
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { CreditCard, Plus, Trash2, Star } from 'lucide-react';

interface PaymentMethod {
  id: string;
  type: 'card' | 'bank';
  last4: string;
  brand?: string;
  expiryMonth?: number;
  expiryYear?: number;
  bankName?: string;
  isDefault: boolean;
  createdAt: string;
}

export function PaymentMethodManager() {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [isAddingMethod, setIsAddingMethod] = useState(false);
  const [newMethod, setNewMethod] = useState({
    cardNumber: '',
    expiryMonth: '',
    expiryYear: '',
    cvv: '',
    nameOnCard: '',
  });

  useEffect(() => {
    loadPaymentMethods();
  }, []);

  const loadPaymentMethods = () => {
    // Mock data - replace with actual API call
    setPaymentMethods([
      {
        id: '1',
        type: 'card',
        last4: '4242',
        brand: 'Visa',
        expiryMonth: 12,
        expiryYear: 2025,
        isDefault: true,
        createdAt: '2024-01-15',
      },
      {
        id: '2',
        type: 'card',
        last4: '5555',
        brand: 'Mastercard',
        expiryMonth: 6,
        expiryYear: 2026,
        isDefault: false,
        createdAt: '2024-02-20',
      },
    ]);
  };

  const handleAddMethod = async () => {
    // Validate card number
    if (newMethod.cardNumber.length !== 16) {
      alert('Please enter a valid 16-digit card number');
      return;
    }

    // Mock adding payment method
    const method: PaymentMethod = {
      id: Date.now().toString(),
      type: 'card',
      last4: newMethod.cardNumber.slice(-4),
      brand: getBrandFromNumber(newMethod.cardNumber),
      expiryMonth: parseInt(newMethod.expiryMonth),
      expiryYear: parseInt(newMethod.expiryYear),
      isDefault: paymentMethods.length === 0,
      createdAt: new Date().toISOString(),
    };

    setPaymentMethods([...paymentMethods, method]);
    setIsAddingMethod(false);
    setNewMethod({
      cardNumber: '',
      expiryMonth: '',
      expiryYear: '',
      cvv: '',
      nameOnCard: '',
    });
  };

  const getBrandFromNumber = (cardNumber: string): string => {
    if (cardNumber.startsWith('4')) return 'Visa';
    if (cardNumber.startsWith('5')) return 'Mastercard';
    if (cardNumber.startsWith('3')) return 'American Express';
    return 'Unknown';
  };

  const handleSetDefault = (methodId: string) => {
    setPaymentMethods(
      paymentMethods.map((method) => ({
        ...method,
        isDefault: method.id === methodId,
      }))
    );
  };

  const handleDeleteMethod = (methodId: string) => {
    if (window.confirm('Are you sure you want to delete this payment method?')) {
      setPaymentMethods(paymentMethods.filter((method) => method.id !== methodId));
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Payment Methods</CardTitle>
            <CardDescription>Manage your saved payment methods</CardDescription>
          </div>
          <Dialog open={isAddingMethod} onOpenChange={setIsAddingMethod}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Method
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Payment Method</DialogTitle>
                <DialogDescription>Add a new credit or debit card</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <Label htmlFor="cardNumber">Card Number</Label>
                  <Input
                    id="cardNumber"
                    placeholder="1234 5678 9012 3456"
                    maxLength={16}
                    value={newMethod.cardNumber}
                    onChange={(e) => setNewMethod({ ...newMethod, cardNumber: e.target.value.replace(/\s/g, '') })}
                  />
                </div>
                <div>
                  <Label htmlFor="nameOnCard">Name on Card</Label>
                  <Input
                    id="nameOnCard"
                    placeholder="John Doe"
                    value={newMethod.nameOnCard}
                    onChange={(e) => setNewMethod({ ...newMethod, nameOnCard: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="expiryMonth">Month</Label>
                    <Input
                      id="expiryMonth"
                      placeholder="MM"
                      maxLength={2}
                      value={newMethod.expiryMonth}
                      onChange={(e) => setNewMethod({ ...newMethod, expiryMonth: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="expiryYear">Year</Label>
                    <Input
                      id="expiryYear"
                      placeholder="YYYY"
                      maxLength={4}
                      value={newMethod.expiryYear}
                      onChange={(e) => setNewMethod({ ...newMethod, expiryYear: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="cvv">CVV</Label>
                    <Input
                      id="cvv"
                      placeholder="123"
                      maxLength={4}
                      type="password"
                      value={newMethod.cvv}
                      onChange={(e) => setNewMethod({ ...newMethod, cvv: e.target.value })}
                    />
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleAddMethod} className="flex-1">
                  Add Card
                </Button>
                <Button variant="outline" onClick={() => setIsAddingMethod(false)} className="flex-1">
                  Cancel
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {paymentMethods.length === 0 ? (
          <div className="text-center py-12">
            <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No payment methods saved</p>
            <p className="text-sm text-gray-500 mt-2">Add a payment method to make payments easier</p>
          </div>
        ) : (
          <div className="space-y-4">
            {paymentMethods.map((method) => (
              <div key={method.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-4">
                  <CreditCard className="h-8 w-8 text-blue-600" />
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold">
                        {method.brand} •••• {method.last4}
                      </p>
                      {method.isDefault && (
                        <Badge variant="default" className="flex items-center gap-1">
                          <Star className="h-3 w-3" />
                          Default
                        </Badge>
                      )}
                    </div>
                    {method.expiryMonth && method.expiryYear && (
                      <p className="text-sm text-gray-600">
                        Expires {method.expiryMonth}/{method.expiryYear}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {!method.isDefault && (
                    <Button variant="outline" size="sm" onClick={() => handleSetDefault(method.id)}>
                      Set as Default
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" onClick={() => handleDeleteMethod(method.id)}>
                    <Trash2 className="h-4 w-4 text-red-600" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}