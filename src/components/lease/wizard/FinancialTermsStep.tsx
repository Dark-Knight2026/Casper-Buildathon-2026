import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import type { LeaseFormData } from '@/types/lease';

interface FinancialTermsStepProps {
  leaseData: Partial<LeaseFormData>;
  onUpdate: (data: Partial<LeaseFormData>) => void;
}

export default function FinancialTermsStep({ leaseData, onUpdate }: FinancialTermsStepProps) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Financial Terms</h3>
        <p className="text-sm text-gray-600">
          Configure rent, deposits, fees, and payment details
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <Label htmlFor="rentDueDay">Rent Due Day</Label>
          <Select
            value={leaseData.rentDueDay}
            onValueChange={(value) => onUpdate({ rentDueDay: value })}
          >
            <SelectTrigger id="rentDueDay">
              <SelectValue placeholder="Select day" />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                <SelectItem key={day} value={day.toString()}>
                  Day {day} of month
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="lateFeeAmount">Late Fee Amount</Label>
          <div className="relative">
            <span className="absolute left-3 top-3 text-gray-500">$</span>
            <Input
              id="lateFeeAmount"
              type="number"
              value={leaseData.lateFeeAmount || ''}
              onChange={(e) => onUpdate({ lateFeeAmount: parseFloat(e.target.value) })}
              className="pl-7"
              placeholder="0.00"
              step="0.01"
              min="0"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="lateFeeGracePeriod">Late Fee Grace Period</Label>
          <Select
            value={leaseData.lateFeeGracePeriod}
            onValueChange={(value) => onUpdate({ lateFeeGracePeriod: value })}
          >
            <SelectTrigger id="lateFeeGracePeriod">
              <SelectValue placeholder="Select grace period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">No grace period</SelectItem>
              <SelectItem value="3">3 days</SelectItem>
              <SelectItem value="5">5 days</SelectItem>
              <SelectItem value="7">7 days</SelectItem>
              <SelectItem value="10">10 days</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="petDeposit">Pet Deposit (if applicable)</Label>
          <div className="relative">
            <span className="absolute left-3 top-3 text-gray-500">$</span>
            <Input
              id="petDeposit"
              type="number"
              value={leaseData.petDeposit || ''}
              onChange={(e) => onUpdate({ petDeposit: parseFloat(e.target.value) })}
              className="pl-7"
              placeholder="0.00"
              step="0.01"
              min="0"
            />
          </div>
        </div>
      </div>

      <div>
        <Label>Payment Methods Accepted</Label>
        <div className="space-y-2 mt-2">
          {['Bank Transfer', 'Credit Card', 'Debit Card', 'Check', 'Cash'].map((method) => (
            <div key={method} className="flex items-center space-x-2">
              <Checkbox
                id={method}
                checked={leaseData.paymentMethods?.includes(method)}
                onCheckedChange={(checked) => {
                  const current = leaseData.paymentMethods || [];
                  const updated = checked
                    ? [...current, method]
                    : current.filter((m) => m !== method);
                  onUpdate({ paymentMethods: updated });
                }}
              />
              <Label htmlFor={method} className="font-normal cursor-pointer">
                {method}
              </Label>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}