import React from 'react';
import { useLeaseManagement } from '@/contexts/LeaseManagementContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LeaseType } from '@/types/lease';

// Mock data - replace with API call
const properties = [
  { id: 'prop_1', address: '123 Main St, Apt 4B', type: 'residential' },
  { id: 'prop_2', address: '456 Oak Ave, Suite 200', type: 'commercial' },
  { id: 'prop_3', address: '789 Pine Ln', type: 'residential' },
];

const leaseTypes: { value: LeaseType; label: string }[] = [
  { value: 'residential-long-term', label: 'Residential Long Term' },
  { value: 'residential-short-term', label: 'Residential Short Term' },
  { value: 'commercial', label: 'Commercial' },
  { value: 'student-housing', label: 'Student Housing' },
  { value: 'month-to-month', label: 'Month-to-Month' },
];

export const PropertySelection: React.FC = () => {
  const { formData, updateFormData, errors } = useLeaseManagement();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Property & Lease Type</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="property">Select Property</Label>
          <Select
            value={formData.propertyId}
            onValueChange={(value) => updateFormData({ propertyId: value })}
          >
            <SelectTrigger id="property" className={errors.propertyId ? 'border-red-500' : ''}>
              <SelectValue placeholder="Select a property" />
            </SelectTrigger>
            <SelectContent>
              {properties.map((prop) => (
                <SelectItem key={prop.id} value={prop.id}>
                  {prop.address}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.propertyId && <p className="text-sm text-red-500">{errors.propertyId}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="leaseType">Lease Type</Label>
          <Select
            value={formData.type}
            onValueChange={(value) => updateFormData({ type: value as LeaseType })}
          >
            <SelectTrigger id="leaseType" className={errors.type ? 'border-red-500' : ''}>
              <SelectValue placeholder="Select lease type" />
            </SelectTrigger>
            <SelectContent>
              {leaseTypes.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.type && <p className="text-sm text-red-500">{errors.type}</p>}
        </div>
      </CardContent>
    </Card>
  );
};