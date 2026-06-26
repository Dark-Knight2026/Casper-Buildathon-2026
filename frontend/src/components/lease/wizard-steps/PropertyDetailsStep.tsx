/**
 * Property Details Step
 * First step in lease generation wizard
 */

import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LeaseFormData, LeaseType } from '@/types/lease';
import { Building, MapPin } from 'lucide-react';

interface PropertyDetailsStepProps {
  formData: Partial<LeaseFormData>;
  updateFormData: (data: Partial<LeaseFormData>) => void;
  errors: Record<string, string>;
}

const leaseTypes: { value: LeaseType; label: string; description: string }[] = [
  { value: 'residential-long-term', label: 'Residential Long-Term', description: '12+ months fixed term' },
  { value: 'residential-short-term', label: 'Residential Short-Term', description: '1-11 months' },
  { value: 'commercial', label: 'Commercial', description: 'Business/retail space' },
  { value: 'student-housing', label: 'Student Housing', description: 'Academic year lease' },
  { value: 'vacation-rental', label: 'Vacation Rental', description: 'Short-term vacation' },
  { value: 'month-to-month', label: 'Month-to-Month', description: 'No fixed end date' }
];

const states = [
  { code: 'CA', name: 'California' },
  { code: 'NY', name: 'New York' },
  { code: 'TX', name: 'Texas' },
  { code: 'FL', name: 'Florida' },
  { code: 'IL', name: 'Illinois' },
  { code: 'PA', name: 'Pennsylvania' },
  { code: 'OH', name: 'Ohio' },
  { code: 'GA', name: 'Georgia' },
  { code: 'NC', name: 'North Carolina' },
  { code: 'MI', name: 'Michigan' }
];

export default function PropertyDetailsStep({
  formData,
  updateFormData,
  errors
}: PropertyDetailsStepProps) {
  return (
    <div className="space-y-6">
      {/* Property Selection */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <Building className="h-5 w-5 text-blue-600" />
            <h3 className="text-lg font-semibold">Property Information</h3>
          </div>

          <div className="space-y-2">
            <Label htmlFor="propertyId">Property ID *</Label>
            <Input
              id="propertyId"
              placeholder="Enter property ID or select from list"
              value={formData.propertyId || ''}
              onChange={(e) => updateFormData({ propertyId: e.target.value })}
              className={errors.propertyId ? 'border-red-500' : ''}
            />
            {errors.propertyId && (
              <p className="text-sm text-red-500">{errors.propertyId}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="propertyAddress">Property Address</Label>
            <div className="relative">
              <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                id="propertyAddress"
                placeholder="123 Main St, City, State ZIP"
                className="pl-10"
                value={formData.propertyAddress || ''}
                onChange={(e) => updateFormData({ propertyAddress: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="state">State *</Label>
              <Select
                value={formData.state || 'CA'}
                onValueChange={(value) => updateFormData({ state: value })}
              >
                <SelectTrigger id="state">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {states.map((state) => (
                    <SelectItem key={state.code} value={state.code}>
                      {state.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="units">Number of Units</Label>
              <Input
                id="units"
                type="number"
                min="1"
                placeholder="1"
                value={formData.units || '1'}
                onChange={(e) => updateFormData({ units: e.target.value })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lease Type Selection */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="leaseType">Lease Type *</Label>
            <Select
              value={formData.type || 'residential-long-term'}
              onValueChange={(value) => updateFormData({ type: value as LeaseType })}
            >
              <SelectTrigger id="leaseType" className={errors.type ? 'border-red-500' : ''}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {leaseTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    <div>
                      <div className="font-medium">{type.label}</div>
                      <div className="text-xs text-gray-500">{type.description}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.type && (
              <p className="text-sm text-red-500">{errors.type}</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}