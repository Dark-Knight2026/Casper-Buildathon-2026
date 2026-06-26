/**
 * Late Fee Settings Component
 * Configure automated late fee policies
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Save, DollarSign, Percent, Clock } from 'lucide-react';
import { automationService } from '@/services/automationService';
import type { LateFeePolicy, LateFeeSchedule } from '@/types/automation';

export function LateFeeSettings() {
  const [policy, setPolicy] = useState<LateFeePolicy | null>(null);
  const [schedule, setSchedule] = useState<LateFeeSchedule | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      const [policyData, scheduleData] = await Promise.all([
        automationService.getLateFeePolicy(),
        automationService.getLateFeeSchedule(),
      ]);
      setPolicy(policyData);
      setSchedule(scheduleData);
    } catch (error) {
      console.error('Error loading late fee settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!policy) return;

    setIsSaving(true);
    try {
      const updated = await automationService.updateLateFeePolicy(policy);
      setPolicy(updated);
      alert('Late fee policy updated successfully!');
    } catch (error) {
      console.error('Error updating late fee policy:', error);
      alert('Failed to update late fee policy');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </CardContent>
      </Card>
    );
  }

  if (!policy) return null;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Late Fee Policy</CardTitle>
              <CardDescription>Configure automated late fee calculation and application</CardDescription>
            </div>
            <Badge variant={policy.enabled ? 'default' : 'secondary'}>
              {policy.enabled ? 'Enabled' : 'Disabled'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="enabled">Enable Automated Late Fees</Label>
              <p className="text-sm text-gray-600">Automatically calculate and apply late fees</p>
            </div>
            <Switch
              id="enabled"
              checked={policy.enabled}
              onCheckedChange={(checked) => setPolicy({ ...policy, enabled: checked })}
            />
          </div>

          <div>
            <Label htmlFor="grace-period">Grace Period (Days)</Label>
            <Input
              id="grace-period"
              type="number"
              min="0"
              max="15"
              value={policy.gracePeriodDays}
              onChange={(e) => setPolicy({ ...policy, gracePeriodDays: parseInt(e.target.value) })}
            />
            <p className="text-xs text-gray-600 mt-1">Number of days after due date before late fee applies</p>
          </div>

          <div className="space-y-4">
            <Label>Fee Type</Label>
            <RadioGroup
              value={policy.feeType}
              onValueChange={(value) => setPolicy({ ...policy, feeType: value as 'flat' | 'percentage' })}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="flat" id="flat" />
                <Label htmlFor="flat" className="font-normal cursor-pointer">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    <span>Flat Fee</span>
                  </div>
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="percentage" id="percentage" />
                <Label htmlFor="percentage" className="font-normal cursor-pointer">
                  <div className="flex items-center gap-2">
                    <Percent className="h-4 w-4" />
                    <span>Percentage of Rent</span>
                  </div>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {policy.feeType === 'flat' ? (
            <div>
              <Label htmlFor="flat-fee">Flat Fee Amount</Label>
              <Input
                id="flat-fee"
                type="number"
                min="0"
                step="0.01"
                placeholder="e.g., 50.00"
                value={policy.flatFeeAmount || ''}
                onChange={(e) =>
                  setPolicy({
                    ...policy,
                    flatFeeAmount: e.target.value ? parseFloat(e.target.value) : undefined,
                  })
                }
              />
            </div>
          ) : (
            <div>
              <Label htmlFor="percentage-rate">Percentage Rate</Label>
              <Input
                id="percentage-rate"
                type="number"
                min="0"
                max="100"
                step="0.1"
                placeholder="e.g., 5.0"
                value={policy.percentageRate || ''}
                onChange={(e) =>
                  setPolicy({
                    ...policy,
                    percentageRate: e.target.value ? parseFloat(e.target.value) : undefined,
                  })
                }
              />
              <p className="text-xs text-gray-600 mt-1">Percentage of monthly rent to charge as late fee</p>
            </div>
          )}

          <div>
            <Label htmlFor="max-fee">Maximum Fee Amount (Optional)</Label>
            <Input
              id="max-fee"
              type="number"
              min="0"
              step="0.01"
              placeholder="e.g., 100.00"
              value={policy.maxFeeAmount || ''}
              onChange={(e) =>
                setPolicy({
                  ...policy,
                  maxFeeAmount: e.target.value ? parseFloat(e.target.value) : undefined,
                })
              }
            />
            <p className="text-xs text-gray-600 mt-1">Cap the maximum late fee amount</p>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="recurring">Recurring Daily Fee</Label>
              <p className="text-sm text-gray-600">Apply fee daily after grace period expires</p>
            </div>
            <Switch
              id="recurring"
              checked={policy.recurringDaily}
              onCheckedChange={(checked) => setPolicy({ ...policy, recurringDaily: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="notify">Notify Tenant</Label>
              <p className="text-sm text-gray-600">Send notification when late fee is applied</p>
            </div>
            <Switch
              id="notify"
              checked={policy.notifyTenant}
              onCheckedChange={(checked) => setPolicy({ ...policy, notifyTenant: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="auto-apply">Auto-Apply Fees</Label>
              <p className="text-sm text-gray-600">Automatically apply fees without manual approval</p>
            </div>
            <Switch
              id="auto-apply"
              checked={policy.autoApply}
              onCheckedChange={(checked) => setPolicy({ ...policy, autoApply: checked })}
            />
          </div>

          <Button onClick={handleSave} disabled={isSaving} className="w-full">
            <Save className="mr-2 h-4 w-4" />
            {isSaving ? 'Saving...' : 'Save Policy'}
          </Button>
        </CardContent>
      </Card>

      {schedule && (
        <Card>
          <CardHeader>
            <CardTitle>Automation Schedule</CardTitle>
            <CardDescription>Late fee check schedule</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-gray-600" />
                  <div>
                    <p className="font-medium">Daily Check Time</p>
                    <p className="text-sm text-gray-600">{schedule.runTime}</p>
                  </div>
                </div>
                <Badge variant={schedule.enabled ? 'default' : 'secondary'}>
                  {schedule.enabled ? 'Active' : 'Inactive'}
                </Badge>
              </div>

              {schedule.lastRunAt && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
                  <div>
                    <p className="text-xs text-gray-600">Last Run</p>
                    <p className="font-medium">{new Date(schedule.lastRunAt).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Fees Applied</p>
                    <p className="font-medium">{schedule.feesApplied}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Notifications Sent</p>
                    <p className="font-medium">{schedule.notificationsSent}</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}