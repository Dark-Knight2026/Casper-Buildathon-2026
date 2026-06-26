/**
 * Autopay Setup Component
 * Allows tenants to enroll in automatic rent payments
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, CreditCard, Loader2, AlertCircle, CheckCircle, Info } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { stripeService, type PaymentMethodData } from '@/services/stripeService';
import { supabase } from '@/lib/supabase/client';

interface AutopaySettings {
  id: string;
  lease_id: string;
  payment_method_id: string;
  enabled: boolean;
  payment_day: number;
  amount: number;
  created_at: string;
  updated_at: string;
}

interface AutopaySetupProps {
  leaseId: string;
  customerId: string;
  rentAmount: number;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function AutopaySetup({
  leaseId,
  customerId,
  rentAmount,
  onSuccess,
  onCancel,
}: AutopaySetupProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodData[]>([]);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('');
  const [autopayEnabled, setAutopayEnabled] = useState(false);
  const [paymentDay, setPaymentDay] = useState('1');
  const [existingAutopay, setExistingAutopay] = useState<AutopaySettings | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // Load payment methods
      const pmResult = await stripeService.listPaymentMethods(customerId);
      if (pmResult.success && pmResult.paymentMethods) {
        setPaymentMethods(pmResult.paymentMethods);
        if (pmResult.paymentMethods.length > 0) {
          setSelectedPaymentMethod(pmResult.paymentMethods[0].id);
        }
      }

      // Check for existing autopay setup
      const { data: autopayData } = await supabase
        .from('autopay_settings')
        .select('*')
        .eq('lease_id', leaseId)
        .single();

      if (autopayData) {
        const settings = autopayData as AutopaySettings;
        setExistingAutopay(settings);
        setAutopayEnabled(settings.enabled);
        setSelectedPaymentMethod(settings.payment_method_id);
        setPaymentDay(settings.payment_day.toString());
      }
    } catch (err) {
      console.error('Error loading autopay data:', err);
      setError('Failed to load autopay settings');
    } finally {
      setLoading(false);
    }
  }, [customerId, leaseId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSave = async () => {
    if (!selectedPaymentMethod) {
      setError('Please select a payment method');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const autopaySettings = {
        lease_id: leaseId,
        payment_method_id: selectedPaymentMethod,
        enabled: autopayEnabled,
        payment_day: parseInt(paymentDay),
        amount: rentAmount,
        updated_at: new Date().toISOString(),
      };

      if (existingAutopay) {
        // Update existing autopay
        const { error: updateError } = await supabase
          .from('autopay_settings')
          .update(autopaySettings)
          .eq('id', existingAutopay.id);

        if (updateError) throw updateError;
      } else {
        // Create new autopay
        const { error: insertError } = await supabase
          .from('autopay_settings')
          .insert(autopaySettings);

        if (insertError) throw insertError;
      }

      setSuccess(true);
      setTimeout(() => {
        if (onSuccess) onSuccess();
      }, 2000);
    } catch (err) {
      console.error('Error saving autopay settings:', err);
      setError(err instanceof Error ? err.message : 'Failed to save autopay settings');
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

  const getPaymentMethodLabel = (pm: PaymentMethodData): string => {
    if (pm.type === 'card' && pm.card) {
      return `${pm.card.brand.toUpperCase()} •••• ${pm.card.last4}`;
    }
    return 'Bank Account';
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </CardContent>
      </Card>
    );
  }

  if (success) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <h3 className="text-xl font-semibold mb-2">Autopay {autopayEnabled ? 'Enabled' : 'Updated'}!</h3>
          <p className="text-gray-600 text-center">
            {autopayEnabled
              ? `Your rent will be automatically charged on the ${paymentDay}${getOrdinalSuffix(parseInt(paymentDay))} of each month.`
              : 'Your autopay settings have been updated.'}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Autopay Setup
        </CardTitle>
        <CardDescription>
          Set up automatic rent payments for convenience
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Autopay will automatically charge your selected payment method on the specified day each month.
            You'll receive a confirmation email after each payment.
          </AlertDescription>
        </Alert>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label className="text-base">Enable Autopay</Label>
            <p className="text-sm text-gray-500">
              Automatically pay rent each month
            </p>
          </div>
          <Switch
            checked={autopayEnabled}
            onCheckedChange={setAutopayEnabled}
            disabled={saving}
          />
        </div>

        {autopayEnabled && (
          <>
            <div className="space-y-2">
              <Label>Payment Method</Label>
              {paymentMethods.length === 0 ? (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    No payment methods available. Please add a payment method first.
                  </AlertDescription>
                </Alert>
              ) : (
                <RadioGroup value={selectedPaymentMethod} onValueChange={setSelectedPaymentMethod}>
                  {paymentMethods.map((pm) => (
                    <div key={pm.id} className="flex items-center space-x-2 border rounded-lg p-3">
                      <RadioGroupItem value={pm.id} id={`autopay-${pm.id}`} />
                      <Label htmlFor={`autopay-${pm.id}`} className="flex-1 cursor-pointer">
                        <div className="flex items-center gap-2">
                          <CreditCard className="h-4 w-4" />
                          <span>{getPaymentMethodLabel(pm)}</span>
                        </div>
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="paymentDay">Payment Day</Label>
              <Select value={paymentDay} onValueChange={setPaymentDay}>
                <SelectTrigger id="paymentDay">
                  <SelectValue placeholder="Select payment day" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                    <SelectItem key={day} value={day.toString()}>
                      {day}{getOrdinalSuffix(day)} of each month
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500">
                Choose the day of the month when rent should be automatically charged
              </p>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Monthly Rent</span>
                <span className="font-medium">{formatCurrency(rentAmount)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Payment Day</span>
                <span className="font-medium">
                  {paymentDay}{getOrdinalSuffix(parseInt(paymentDay))} of each month
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Payment Method</span>
                <span className="font-medium">
                  {paymentMethods.find(pm => pm.id === selectedPaymentMethod)
                    ? getPaymentMethodLabel(paymentMethods.find(pm => pm.id === selectedPaymentMethod)!)
                    : 'Not selected'}
                </span>
              </div>
            </div>
          </>
        )}

        <div className="flex gap-3 pt-4">
          <Button
            onClick={handleSave}
            disabled={saving || (autopayEnabled && !selectedPaymentMethod)}
            className="flex-1"
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Settings'
            )}
          </Button>
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={saving}
            >
              Cancel
            </Button>
          )}
        </div>

        <p className="text-xs text-center text-gray-500">
          You can disable autopay at any time from your payment settings.
        </p>
      </CardContent>
    </Card>
  );
}

function getOrdinalSuffix(day: number): string {
  if (day > 3 && day < 21) return 'th';
  switch (day % 10) {
    case 1: return 'st';
    case 2: return 'nd';
    case 3: return 'rd';
    default: return 'th';
  }
}