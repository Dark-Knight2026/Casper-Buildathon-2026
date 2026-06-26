import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Plus, X } from 'lucide-react';
import { format } from 'date-fns';
import type { LeaseFormData, LeaseType } from '@/types/lease';

interface BasicInformationStepProps {
  leaseData: Partial<LeaseFormData>;
  onUpdate: (data: Partial<LeaseFormData>) => void;
}

// Mock data - In production, fetch from database
const MOCK_PROPERTIES = [
  { id: 'prop-1', address: '123 Main St, Apt 4B, Los Angeles, CA 90001' },
  { id: 'prop-2', address: '456 Oak Ave, Unit 2, San Francisco, CA 94102' },
  { id: 'prop-3', address: '789 Pine Rd, Suite 5, San Diego, CA 92101' },
];

const MOCK_TENANTS = [
  { id: 'tenant-1', name: 'John Doe', email: 'john.doe@example.com' },
  { id: 'tenant-2', name: 'Jane Smith', email: 'jane.smith@example.com' },
  { id: 'tenant-3', name: 'Bob Johnson', email: 'bob.johnson@example.com' },
];

export default function BasicInformationStep({ leaseData, onUpdate }: BasicInformationStepProps) {
  const [startDate, setStartDate] = useState<Date | undefined>(
    leaseData.startDate ? new Date(leaseData.startDate) : undefined
  );
  const [endDate, setEndDate] = useState<Date | undefined>(
    leaseData.endDate ? new Date(leaseData.endDate) : undefined
  );
  const [selectedTenants, setSelectedTenants] = useState<string[]>(leaseData.tenantIds || []);

  const handlePropertyChange = (propertyId: string) => {
    onUpdate({ propertyId });
  };

  const handleLeaseTypeChange = (type: LeaseType) => {
    onUpdate({ type });
  };

  const handleStartDateChange = (date: Date | undefined) => {
    setStartDate(date);
    if (date) {
      onUpdate({ startDate: date });
      
      // Auto-calculate end date based on lease type
      if (leaseData.type === 'month-to-month') {
        const end = new Date(date);
        end.setMonth(end.getMonth() + 1);
        setEndDate(end);
        onUpdate({ endDate: end });
      } else if (leaseData.type === 'student-housing') {
        const end = new Date(date);
        end.setMonth(end.getMonth() + 9);
        setEndDate(end);
        onUpdate({ endDate: end });
      } else {
        const end = new Date(date);
        end.setFullYear(end.getFullYear() + 1);
        setEndDate(end);
        onUpdate({ endDate: end });
      }
    }
  };

  const handleEndDateChange = (date: Date | undefined) => {
    setEndDate(date);
    if (date) {
      onUpdate({ endDate: date });
    }
  };

  const handleAddTenant = (tenantId: string) => {
    if (!selectedTenants.includes(tenantId)) {
      const updated = [...selectedTenants, tenantId];
      setSelectedTenants(updated);
      onUpdate({ tenantIds: updated });
    }
  };

  const handleRemoveTenant = (tenantId: string) => {
    const updated = selectedTenants.filter((id) => id !== tenantId);
    setSelectedTenants(updated);
    onUpdate({ tenantIds: updated });
  };

  const handleRentChange = (value: string) => {
    const rent = parseFloat(value);
    if (!isNaN(rent)) {
      onUpdate({ monthlyRent: rent });
    }
  };

  const handleDepositChange = (value: string) => {
    const deposit = parseFloat(value);
    if (!isNaN(deposit)) {
      onUpdate({ securityDeposit: deposit });
    }
  };

  const calculateLeaseDuration = () => {
    if (startDate && endDate) {
      const months = Math.round(
        (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 30)
      );
      return months;
    }
    return 0;
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Basic Lease Information</h3>
        <p className="text-sm text-gray-600">
          Provide the essential details for your lease agreement
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Property Selection */}
        <div className="md:col-span-2">
          <Label htmlFor="property">Property *</Label>
          <Select value={leaseData.propertyId} onValueChange={handlePropertyChange}>
            <SelectTrigger id="property">
              <SelectValue placeholder="Select a property" />
            </SelectTrigger>
            <SelectContent>
              {MOCK_PROPERTIES.map((property) => (
                <SelectItem key={property.id} value={property.id}>
                  {property.address}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Lease Type */}
        <div>
          <Label htmlFor="leaseType">Lease Type *</Label>
          <Select value={leaseData.type} onValueChange={handleLeaseTypeChange}>
            <SelectTrigger id="leaseType">
              <SelectValue placeholder="Select lease type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="residential-long-term">Residential Long-Term</SelectItem>
              <SelectItem value="residential-short-term">Residential Short-Term</SelectItem>
              <SelectItem value="month-to-month">Month-to-Month</SelectItem>
              <SelectItem value="student-housing">Student Housing</SelectItem>
              <SelectItem value="commercial">Commercial</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Lease Duration Display */}
        <div>
          <Label>Lease Duration</Label>
          <div className="h-10 px-3 py-2 border rounded-md bg-gray-50 flex items-center">
            <span className="text-sm">
              {calculateLeaseDuration()} months
            </span>
          </div>
        </div>

        {/* Start Date */}
        <div>
          <Label>Start Date *</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-start text-left font-normal"
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {startDate ? format(startDate, 'PPP') : 'Pick a date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={startDate}
                onSelect={handleStartDateChange}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* End Date */}
        <div>
          <Label>End Date *</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-start text-left font-normal"
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {endDate ? format(endDate, 'PPP') : 'Pick a date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={endDate}
                onSelect={handleEndDateChange}
                initialFocus
                disabled={(date) => startDate ? date < startDate : false}
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Monthly Rent */}
        <div>
          <Label htmlFor="rent">Monthly Rent *</Label>
          <div className="relative">
            <span className="absolute left-3 top-3 text-gray-500">$</span>
            <Input
              id="rent"
              type="number"
              placeholder="0.00"
              value={leaseData.monthlyRent || ''}
              onChange={(e) => handleRentChange(e.target.value)}
              className="pl-7"
              step="0.01"
              min="0"
            />
          </div>
        </div>

        {/* Security Deposit */}
        <div>
          <Label htmlFor="deposit">Security Deposit *</Label>
          <div className="relative">
            <span className="absolute left-3 top-3 text-gray-500">$</span>
            <Input
              id="deposit"
              type="number"
              placeholder="0.00"
              value={leaseData.securityDeposit || ''}
              onChange={(e) => handleDepositChange(e.target.value)}
              className="pl-7"
              step="0.01"
              min="0"
            />
          </div>
        </div>
      </div>

      {/* Tenant Selection */}
      <div>
        <Label>Tenants *</Label>
        <div className="space-y-3">
          {/* Selected Tenants */}
          {selectedTenants.length > 0 && (
            <div className="space-y-2">
              {selectedTenants.map((tenantId) => {
                const tenant = MOCK_TENANTS.find((t) => t.id === tenantId);
                return (
                  <div
                    key={tenantId}
                    className="flex items-center justify-between p-3 border rounded-md bg-gray-50"
                  >
                    <div>
                      <div className="font-medium">{tenant?.name}</div>
                      <div className="text-sm text-gray-600">{tenant?.email}</div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveTenant(tenantId)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Add Tenant */}
          <Select onValueChange={handleAddTenant}>
            <SelectTrigger>
              <SelectValue placeholder="Add a tenant" />
            </SelectTrigger>
            <SelectContent>
              {MOCK_TENANTS.filter((t) => !selectedTenants.includes(t.id)).map((tenant) => (
                <SelectItem key={tenant.id} value={tenant.id}>
                  {tenant.name} ({tenant.email})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary */}
      {leaseData.propertyId && leaseData.monthlyRent && startDate && endDate && (
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
          <h4 className="font-semibold mb-2">Lease Summary</h4>
          <div className="text-sm space-y-1">
            <div>Duration: {calculateLeaseDuration()} months</div>
            <div>Monthly Rent: ${leaseData.monthlyRent.toFixed(2)}</div>
            <div>Security Deposit: ${(leaseData.securityDeposit || 0).toFixed(2)}</div>
            <div>Total Tenants: {selectedTenants.length}</div>
            <div className="pt-2 mt-2 border-t border-blue-300 font-semibold">
              Total First Payment: ${((leaseData.monthlyRent || 0) + (leaseData.securityDeposit || 0)).toFixed(2)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}