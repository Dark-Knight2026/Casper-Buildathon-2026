/**
 * Financial Terms Step
 * Rent, deposits, and payment details
 */

import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { LeaseFormData } from '@/types/lease';
import { DollarSign, CreditCard, Info } from 'lucide-react';

interface FinancialTermsStepProps {
  formData: Partial<LeaseFormData>;
  updateFormData: (data: Partial<LeaseFormData>) => void;
  errors: Record<string, string>;
}

const paymentMethods = [
  { value: 'bank-transfer', label: 'Bank Transfer' },
  { value: 'check', label: 'Check' },
  { value: 'cash', label: 'Cash' },
  { value: 'online-payment', label: 'Online Payment' },
  { value: 'credit-card', label: 'Credit Card' }
];

export default function FinancialTermsStep({
  formData,
  updateFormData,
  errors
}: FinancialTermsStepProps) {
  const calculateMoveInCost = () => {
    const rent = formData.monthlyRent || 0;
    const deposit = formData.securityDeposit || 0;
    const petDeposit = formData.petDeposit || 0;
    return rent + deposit + petDeposit;
  };

  const moveInCost = calculateMoveInCost();

  return (
    <div className="space-y-6">
      {/* Rent Information */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <DollarSign className="h-5 w-5 text-green-600" />
            <h3 className="text-lg font-semibold">Rent Information</h3>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="monthlyRent">Monthly Rent *</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="monthlyRent"
                  type="number"
                  min="0"
                  step="0.01"
                  className={`pl-9 ${errors.monthlyRent ? 'border-red-500' : ''}`}
                  placeholder="0.00"
                  value={formData.monthlyRent || ''}
                  onChange={(e) => updateFormData({ monthlyRent: parseFloat(e.target.value) || 0 })}
                />
              </div>
              {errors.monthlyRent && (
                <p className="text-sm text-red-500">{errors.monthlyRent}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="rentDueDay">Rent Due Day</Label>
              <Select
                value={formData.rentDueDay || '1'}
                onValueChange={(value) => updateFormData({ rentDueDay: value })}
              >
                <SelectTrigger id="rentDueDay">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                    <SelectItem key={day} value={day.toString()}>
                      {day}
                      {day === 1 ? 'st' : day === 2 ? 'nd' : day === 3 ? 'rd' : 'th'} of month
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="lateFeeAmount">Late Fee Amount</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="lateFeeAmount"
                  type="number"
                  min="0"
                  step="0.01"
                  className="pl-9"
                  placeholder="0.00"
                  value={formData.lateFeeAmount || ''}
                  onChange={(e) =>
                    updateFormData({ lateFeeAmount: parseFloat(e.target.value) || 0 })
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="lateFeeGracePeriod">Grace Period (days)</Label>
              <Input
                id="lateFeeGracePeriod"
                type="number"
                min="0"
                placeholder="5"
                value={formData.lateFeeGracePeriod || '5'}
                onChange={(e) =>
                  updateFormData({ lateFeeGracePeriod: e.target.value })
                }
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Deposits */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <h3 className="text-lg font-semibold mb-4">Deposits</h3>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="securityDeposit">Security Deposit *</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="securityDeposit"
                  type="number"
                  min="0"
                  step="0.01"
                  className={`pl-9 ${errors.securityDeposit ? 'border-red-500' : ''}`}
                  placeholder="0.00"
                  value={formData.securityDeposit || ''}
                  onChange={(e) => updateFormData({ securityDeposit: parseFloat(e.target.value) || 0 })}
                />
              </div>
              {errors.securityDeposit && (
                <p className="text-sm text-red-500">{errors.securityDeposit}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="petDeposit">Pet Deposit (if applicable)</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="petDeposit"
                  type="number"
                  min="0"
                  step="0.01"
                  className="pl-9"
                  placeholder="0.00"
                  value={formData.petDeposit || ''}
                  onChange={(e) =>
                    updateFormData({ petDeposit: parseFloat(e.target.value) || 0 })
                  }
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment Methods */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <CreditCard className="h-5 w-5 text-blue-600" />
            <h3 className="text-lg font-semibold">Accepted Payment Methods</h3>
          </div>

          <div className="space-y-2">
            {paymentMethods.map((method) => (
              <div key={method.value} className="flex items-center space-x-2">
                <Checkbox
                  id={method.value}
                  checked={formData.paymentMethods?.includes(method.value) || false}
                  onCheckedChange={(checked) => {
                    const current = formData.paymentMethods || [];
                    const updated = checked
                      ? [...current, method.value]
                      : current.filter((m) => m !== method.value);
                    updateFormData({ paymentMethods: updated });
                  }}
                />
                <Label htmlFor={method.value} className="cursor-pointer">
                  {method.label}
                </Label>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Move-in Cost Summary */}
      {moveInCost > 0 && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              <p className="font-semibold">Total Move-in Cost</p>
              <div className="text-sm space-y-1">
                <div className="flex justify-between">
                  <span>First Month's Rent:</span>
                  <span className="font-medium">${formData.monthlyRent?.toLocaleString() || '0'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Security Deposit:</span>
                  <span className="font-medium">${formData.securityDeposit?.toLocaleString() || '0'}</span>
                </div>
                {formData.petDeposit && formData.petDeposit > 0 && (
                  <div className="flex justify-between">
                    <span>Pet Deposit:</span>
                    <span className="font-medium">${formData.petDeposit?.toLocaleString()}</span>
                  </div>
                )}
                <Separator className="my-2" />
                <div className="flex justify-between font-bold text-base">
                  <span>Total:</span>
                  <span className="text-green-600">${moveInCost.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}