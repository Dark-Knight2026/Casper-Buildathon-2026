import React from 'react';
import { useLeaseManagement } from '@/contexts/LeaseManagementContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';

export const LeaseTerms: React.FC = () => {
  const { formData, updateFormData, errors, mode } = useLeaseManagement();

  const handleDateChange = (field: 'startDate' | 'endDate', value: string) => {
    if (value) {
      updateFormData({ [field]: new Date(value) });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Lease Terms & Financials</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="startDate">Start Date</Label>
            <Input
              id="startDate"
              type="date"
              value={formData.startDate ? format(formData.startDate, 'yyyy-MM-dd') : ''}
              onChange={(e) => handleDateChange('startDate', e.target.value)}
              className={errors.startDate ? 'border-red-500' : ''}
            />
            {errors.startDate && <p className="text-sm text-red-500">{errors.startDate}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="endDate">End Date</Label>
            <Input
              id="endDate"
              type="date"
              value={formData.endDate ? format(formData.endDate, 'yyyy-MM-dd') : ''}
              onChange={(e) => handleDateChange('endDate', e.target.value)}
              className={errors.endDate ? 'border-red-500' : ''}
            />
            {errors.endDate && <p className="text-sm text-red-500">{errors.endDate}</p>}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="monthlyRent">Monthly Rent ($)</Label>
            <Input
              id="monthlyRent"
              type="number"
              min="0"
              value={formData.monthlyRent}
              onChange={(e) => updateFormData({ monthlyRent: parseFloat(e.target.value) || 0 })}
              className={errors.monthlyRent ? 'border-red-500' : ''}
            />
            {errors.monthlyRent && <p className="text-sm text-red-500">{errors.monthlyRent}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="securityDeposit">Security Deposit ($)</Label>
            <Input
              id="securityDeposit"
              type="number"
              min="0"
              value={formData.securityDeposit}
              onChange={(e) => updateFormData({ securityDeposit: parseFloat(e.target.value) || 0 })}
            />
          </div>
        </div>

        {/* Agent Commission Section - Only visible in Agent Mode */}
        {mode === 'agent' && (
          <div className="mt-6 pt-6 border-t">
            <h3 className="text-lg font-medium mb-4">Agent Commission</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="agentCommission">Commission Amount ($)</Label>
                <Input
                  id="agentCommission"
                  type="number"
                  min="0"
                  value={formData.agentCommission || 0}
                  onChange={(e) => updateFormData({ agentCommission: parseFloat(e.target.value) || 0 })}
                  placeholder="Enter commission amount"
                />
                <p className="text-xs text-muted-foreground">
                  Enter the total commission amount for this lease.
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};