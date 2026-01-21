/**
 * Lease Terms Step
 * Duration, dates, and renewal options
 */

import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { LeaseFormData } from '@/types/lease';
import { Calendar, Info } from 'lucide-react';
import { differenceInMonths, format } from 'date-fns';

interface LeaseTermsStepProps {
  formData: Partial<LeaseFormData>;
  updateFormData: (data: Partial<LeaseFormData>) => void;
  errors: Record<string, string>;
}

export default function LeaseTermsStep({
  formData,
  updateFormData,
  errors
}: LeaseTermsStepProps) {
  const calculateDuration = () => {
    if (formData.startDate && formData.endDate) {
      const months = differenceInMonths(
        new Date(formData.endDate),
        new Date(formData.startDate)
      );
      return months;
    }
    return 0;
  };

  const duration = calculateDuration();

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="h-5 w-5 text-blue-600" />
            <h3 className="text-lg font-semibold">Lease Duration</h3>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date *</Label>
              <Input
                id="startDate"
                type="date"
                value={formData.startDate ? format(new Date(formData.startDate), 'yyyy-MM-dd') : ''}
                onChange={(e) => updateFormData({ startDate: new Date(e.target.value) })}
                className={errors.startDate ? 'border-red-500' : ''}
              />
              {errors.startDate && (
                <p className="text-sm text-red-500">{errors.startDate}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="endDate">End Date *</Label>
              <Input
                id="endDate"
                type="date"
                value={formData.endDate ? format(new Date(formData.endDate), 'yyyy-MM-dd') : ''}
                onChange={(e) => updateFormData({ endDate: new Date(e.target.value) })}
                className={errors.endDate ? 'border-red-500' : ''}
              />
              {errors.endDate && (
                <p className="text-sm text-red-500">{errors.endDate}</p>
              )}
            </div>
          </div>

          {duration > 0 && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Lease duration: <strong>{duration} months</strong>
                {duration < 12 && ' (Short-term lease)'}
                {duration >= 12 && ' (Long-term lease)'}
              </AlertDescription>
            </Alert>
          )}

          <div className="flex items-center space-x-2">
            <Checkbox
              id="autoRenewal"
              checked={formData.autoRenewal || false}
              onCheckedChange={(checked) =>
                updateFormData({ autoRenewal: checked as boolean })
              }
            />
            <Label htmlFor="autoRenewal" className="cursor-pointer">
              Enable automatic renewal
            </Label>
          </div>

          {formData.autoRenewal && (
            <div className="space-y-2 ml-6">
              <Label htmlFor="renewalNoticePeriod">Renewal Notice Period (days)</Label>
              <Input
                id="renewalNoticePeriod"
                type="number"
                min="30"
                placeholder="60"
                value={formData.renewalNoticePeriod || '60'}
                onChange={(e) =>
                  updateFormData({ renewalNoticePeriod: parseInt(e.target.value) })
                }
              />
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6 space-y-4">
          <h3 className="text-lg font-semibold mb-4">Termination Terms</h3>

          <div className="space-y-2">
            <Label htmlFor="noticePeriod">Notice Period for Termination (days)</Label>
            <Input
              id="noticePeriod"
              type="number"
              min="30"
              placeholder="30"
              value={formData.noticePeriod || '30'}
              onChange={(e) =>
                updateFormData({ noticePeriod: parseInt(e.target.value) })
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="earlyTerminationFee">Early Termination Fee</Label>
            <Input
              id="earlyTerminationFee"
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={formData.earlyTerminationFee || ''}
              onChange={(e) =>
                updateFormData({ earlyTerminationFee: parseFloat(e.target.value) || 0 })
              }
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}