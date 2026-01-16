/**
 * Payment Method Card Component
 * Displays saved payment method with actions
 */

import React from 'react';
import { CreditCard, Trash2, Check } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { PaymentMethodData } from '@/services/stripeService';

interface PaymentMethodCardProps {
  paymentMethod: PaymentMethodData;
  isDefault?: boolean;
  onSetDefault?: (paymentMethodId: string) => void;
  onRemove?: (paymentMethodId: string) => void;
  loading?: boolean;
}

export function PaymentMethodCard({
  paymentMethod,
  isDefault = false,
  onSetDefault,
  onRemove,
  loading = false,
}: PaymentMethodCardProps) {
  const getCardBrand = (brand: string) => {
    const brands: Record<string, string> = {
      visa: 'Visa',
      mastercard: 'Mastercard',
      amex: 'American Express',
      discover: 'Discover',
      diners: 'Diners Club',
      jcb: 'JCB',
      unionpay: 'UnionPay',
    };
    return brands[brand.toLowerCase()] || brand;
  };

  const formatExpiry = (month: number, year: number) => {
    return `${month.toString().padStart(2, '0')}/${year.toString().slice(-2)}`;
  };

  return (
    <Card className={`hover:shadow-md transition-shadow ${isDefault ? 'ring-2 ring-primary' : ''}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <CreditCard className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold">
                  {paymentMethod.type === 'card' && paymentMethod.card
                    ? getCardBrand(paymentMethod.card.brand)
                    : 'Bank Account'}
                </h3>
                {isDefault && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <Check className="h-3 w-3" />
                    Default
                  </Badge>
                )}
              </div>
              <div className="text-sm text-gray-600">
                {paymentMethod.type === 'card' && paymentMethod.card ? (
                  <>
                    <p>•••• •••• •••• {paymentMethod.card.last4}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Expires {formatExpiry(paymentMethod.card.exp_month, paymentMethod.card.exp_year)}
                    </p>
                  </>
                ) : paymentMethod.type === 'us_bank_account' && paymentMethod.us_bank_account ? (
                  <>
                    <p>{paymentMethod.us_bank_account.bank_name}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      •••• {paymentMethod.us_bank_account.last4}
                    </p>
                  </>
                ) : null}
              </div>
              {paymentMethod.billing_details.name && (
                <p className="text-xs text-gray-500 mt-1">
                  {paymentMethod.billing_details.name}
                </p>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-2">
            {!isDefault && onSetDefault && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onSetDefault(paymentMethod.id)}
                disabled={loading}
              >
                Set Default
              </Button>
            )}
            {onRemove && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onRemove(paymentMethod.id)}
                disabled={loading || isDefault}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}