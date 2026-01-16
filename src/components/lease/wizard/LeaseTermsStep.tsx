import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { LeaseFormData } from '@/types/lease';

interface LeaseTermsStepProps {
  leaseData: Partial<LeaseFormData>;
  onUpdate: (data: Partial<LeaseFormData>) => void;
}

export default function LeaseTermsStep({ leaseData, onUpdate }: LeaseTermsStepProps) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Lease Terms & Policies</h3>
        <p className="text-sm text-gray-600">
          Configure renewal options, termination conditions, and property policies
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="autoRenewal"
            checked={leaseData.autoRenewal}
            onCheckedChange={(checked) => onUpdate({ autoRenewal: checked as boolean })}
          />
          <Label htmlFor="autoRenewal" className="font-normal cursor-pointer">
            Enable Auto-Renewal
          </Label>
        </div>

        <div>
          <Label htmlFor="renewalNoticePeriod">Renewal Notice Period (days)</Label>
          <Input
            id="renewalNoticePeriod"
            type="number"
            value={leaseData.renewalNoticePeriod || ''}
            onChange={(e) => onUpdate({ renewalNoticePeriod: parseInt(e.target.value) })}
            placeholder="30"
            min="0"
          />
        </div>

        <div>
          <Label htmlFor="noticePeriod">Termination Notice Period (days)</Label>
          <Input
            id="noticePeriod"
            type="number"
            value={leaseData.noticePeriod || ''}
            onChange={(e) => onUpdate({ noticePeriod: parseInt(e.target.value) })}
            placeholder="30"
            min="0"
          />
        </div>

        <div>
          <Label htmlFor="earlyTerminationFee">Early Termination Fee</Label>
          <div className="relative">
            <span className="absolute left-3 top-3 text-gray-500">$</span>
            <Input
              id="earlyTerminationFee"
              type="number"
              value={leaseData.earlyTerminationFee || ''}
              onChange={(e) => onUpdate({ earlyTerminationFee: parseFloat(e.target.value) })}
              className="pl-7"
              placeholder="0.00"
              step="0.01"
              min="0"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
