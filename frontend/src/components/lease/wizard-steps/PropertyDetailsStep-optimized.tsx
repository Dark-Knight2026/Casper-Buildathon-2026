/**
 * Optimized Property Details Step
 * Memoized version to prevent unnecessary re-renders
 */

import React, { memo } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { LeaseFormData } from '@/types/lease';

interface PropertyDetailsStepProps {
  formData: Partial<LeaseFormData>;
  updateFormData: (data: Partial<LeaseFormData>) => void;
  errors: Record<string, string>;
}

const PropertyDetailsStep = memo(({ formData, updateFormData, errors }: PropertyDetailsStepProps) => {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="propertyId">Property *</Label>
        <Select
          value={formData.propertyId}
          onValueChange={(value) => updateFormData({ propertyId: value })}
        >
          <SelectTrigger id="propertyId">
            <SelectValue placeholder="Select a property" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="prop-1">123 Main St, Apt 4B</SelectItem>
            <SelectItem value="prop-2">456 Oak Ave, Unit 2</SelectItem>
            <SelectItem value="prop-3">789 Pine Rd, Suite 100</SelectItem>
          </SelectContent>
        </Select>
        {errors.propertyId && <p className="text-sm text-red-600">{errors.propertyId}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="leaseType">Lease Type *</Label>
        <Select
          value={formData.type}
          onValueChange={(value) => updateFormData({ type: value })}
        >
          <SelectTrigger id="leaseType">
            <SelectValue placeholder="Select lease type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="residential-long-term">Residential Long-term</SelectItem>
            <SelectItem value="residential-short-term">Residential Short-term</SelectItem>
            <SelectItem value="commercial">Commercial</SelectItem>
            <SelectItem value="student-housing">Student Housing</SelectItem>
          </SelectContent>
        </Select>
        {errors.type && <p className="text-sm text-red-600">{errors.type}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="propertyAddress">Property Address</Label>
        <Input
          id="propertyAddress"
          value={formData.propertyAddress || ''}
          onChange={(e) => updateFormData({ propertyAddress: e.target.value })}
          placeholder="Enter property address"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="city">City</Label>
          <Input
            id="city"
            value={formData.city || ''}
            onChange={(e) => updateFormData({ city: e.target.value })}
            placeholder="City"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="state">State</Label>
          <Input
            id="state"
            value={formData.state || ''}
            onChange={(e) => updateFormData({ state: e.target.value })}
            placeholder="State"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Property Description</Label>
        <Textarea
          id="description"
          value={formData.description || ''}
          onChange={(e) => updateFormData({ description: e.target.value })}
          placeholder="Describe the property..."
          rows={4}
        />
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function
  return (
    prevProps.formData.propertyId === nextProps.formData.propertyId &&
    prevProps.formData.type === nextProps.formData.type &&
    prevProps.formData.propertyAddress === nextProps.formData.propertyAddress &&
    prevProps.formData.city === nextProps.formData.city &&
    prevProps.formData.state === nextProps.formData.state &&
    prevProps.formData.description === nextProps.formData.description &&
    JSON.stringify(prevProps.errors) === JSON.stringify(nextProps.errors)
  );
});

PropertyDetailsStep.displayName = 'PropertyDetailsStep';

export default PropertyDetailsStep;