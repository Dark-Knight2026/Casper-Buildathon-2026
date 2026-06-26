/**
 * Renewal Schedule Settings Component
 * Configure automated lease renewal settings
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Save, Calendar, Clock, TrendingUp } from 'lucide-react';
import { automationService } from '@/services/automationService';
import type { RenewalSchedule } from '@/types/automation';

export function RenewalScheduleSettings() {
  const [schedule, setSchedule] = useState<RenewalSchedule | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadSchedule();
  }, []);

  const loadSchedule = async () => {
    setIsLoading(true);
    try {
      const data = await automationService.getRenewalSchedule();
      setSchedule(data);
    } catch (error) {
      console.error('Error loading renewal schedule:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!schedule) return;

    setIsSaving(true);
    try {
      const updated = await automationService.updateRenewalSchedule(schedule);
      setSchedule(updated);
      alert('Renewal schedule updated successfully!');
    } catch (error) {
      console.error('Error updating renewal schedule:', error);
      alert('Failed to update renewal schedule');
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

  if (!schedule) return null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Renewal Schedule Settings</CardTitle>
            <CardDescription>Configure automated lease renewal generation</CardDescription>
          </div>
          <Badge variant={schedule.enabled ? 'default' : 'secondary'}>
            {schedule.enabled ? 'Enabled' : 'Disabled'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="enabled">Enable Automated Renewals</Label>
            <p className="text-sm text-gray-600">Automatically generate renewal offers for expiring leases</p>
          </div>
          <Switch
            id="enabled"
            checked={schedule.enabled}
            onCheckedChange={(checked) => setSchedule({ ...schedule, enabled: checked })}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="days-before">Days Before Expiration</Label>
            <Input
              id="days-before"
              type="number"
              min="30"
              max="120"
              value={schedule.daysBeforeExpiration}
              onChange={(e) => setSchedule({ ...schedule, daysBeforeExpiration: parseInt(e.target.value) })}
            />
            <p className="text-xs text-gray-600 mt-1">Generate offers 30-120 days before lease expires</p>
          </div>

          <div>
            <Label htmlFor="term-months">Default Term (Months)</Label>
            <Input
              id="term-months"
              type="number"
              min="6"
              max="24"
              value={schedule.defaultTermMonths}
              onChange={(e) => setSchedule({ ...schedule, defaultTermMonths: parseInt(e.target.value) })}
            />
            <p className="text-xs text-gray-600 mt-1">Default lease term for renewals</p>
          </div>
        </div>

        <div className="space-y-4">
          <Label>Rent Adjustment (Optional)</Label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="rent-increase-percentage">Percentage Increase</Label>
              <Input
                id="rent-increase-percentage"
                type="number"
                min="0"
                max="20"
                step="0.1"
                placeholder="e.g., 3.0"
                value={schedule.rentIncreasePercentage || ''}
                onChange={(e) =>
                  setSchedule({
                    ...schedule,
                    rentIncreasePercentage: e.target.value ? parseFloat(e.target.value) : undefined,
                  })
                }
              />
            </div>

            <div>
              <Label htmlFor="rent-increase-amount">Fixed Amount Increase</Label>
              <Input
                id="rent-increase-amount"
                type="number"
                min="0"
                placeholder="e.g., 50"
                value={schedule.rentIncreaseAmount || ''}
                onChange={(e) =>
                  setSchedule({
                    ...schedule,
                    rentIncreaseAmount: e.target.value ? parseFloat(e.target.value) : undefined,
                  })
                }
              />
            </div>
          </div>
          <p className="text-xs text-gray-600">Leave both empty to keep current rent</p>
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="auto-send">Auto-Send Offers</Label>
            <p className="text-sm text-gray-600">Automatically send renewal offers to tenants</p>
          </div>
          <Switch
            id="auto-send"
            checked={schedule.autoSendEnabled}
            onCheckedChange={(checked) => setSchedule({ ...schedule, autoSendEnabled: checked })}
          />
        </div>

        {schedule.lastRunAt && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-gray-600" />
              <span className="text-gray-600">Last Run:</span>
              <span className="font-medium">{new Date(schedule.lastRunAt).toLocaleString()}</span>
            </div>
            {schedule.nextRunAt && (
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-gray-600" />
                <span className="text-gray-600">Next Run:</span>
                <span className="font-medium">{new Date(schedule.nextRunAt).toLocaleString()}</span>
              </div>
            )}
          </div>
        )}

        <Button onClick={handleSave} disabled={isSaving} className="w-full">
          <Save className="mr-2 h-4 w-4" />
          {isSaving ? 'Saving...' : 'Save Settings'}
        </Button>
      </CardContent>
    </Card>
  );
}