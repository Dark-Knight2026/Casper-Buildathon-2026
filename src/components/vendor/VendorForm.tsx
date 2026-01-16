import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { VENDOR_CATEGORIES, VENDOR_STATUSES } from '@/types/vendor';
import type { CreateVendorParams, UpdateVendorParams, Vendor } from '@/types/vendor';

interface VendorFormProps {
  vendor?: Vendor;
  onSubmit: (data: CreateVendorParams | UpdateVendorParams) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export default function VendorForm({
  vendor,
  onSubmit,
  onCancel,
  isLoading = false,
}: VendorFormProps) {
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm({
    defaultValues: vendor ? {
      company_name: vendor.company_name,
      contact_name: vendor.contact_name,
      email: vendor.email,
      phone: vendor.phone,
      category: vendor.category,
      address: vendor.address || '',
      city: vendor.city || '',
      state: vendor.state || '',
      zip_code: vendor.zip_code || '',
      license_number: vendor.license_number || '',
      insurance_expiry: vendor.insurance_expiry ? new Date(vendor.insurance_expiry).toISOString().split('T')[0] : '',
      hourly_rate: vendor.hourly_rate || '',
      emergency_available: vendor.emergency_available,
      preferred: vendor.preferred,
      status: vendor.status,
      notes: vendor.notes || '',
      website: vendor.website || '',
    } : {
      emergency_available: false,
      preferred: false,
    },
  });

  const emergencyAvailable = watch('emergency_available');
  const preferred = watch('preferred');

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Company Information */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Company Information</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="company_name">Company Name *</Label>
            <Input
              id="company_name"
              {...register('company_name', { required: 'Company name is required' })}
              placeholder="ABC Plumbing Services"
            />
            {errors.company_name && (
              <p className="text-sm text-red-600 mt-1">{errors.company_name.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="contact_name">Contact Name *</Label>
            <Input
              id="contact_name"
              {...register('contact_name', { required: 'Contact name is required' })}
              placeholder="John Doe"
            />
            {errors.contact_name && (
              <p className="text-sm text-red-600 mt-1">{errors.contact_name.message}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              {...register('email', { 
                required: 'Email is required',
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: 'Invalid email address'
                }
              })}
              placeholder="contact@abcplumbing.com"
            />
            {errors.email && (
              <p className="text-sm text-red-600 mt-1">{errors.email.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="phone">Phone *</Label>
            <Input
              id="phone"
              {...register('phone', { required: 'Phone is required' })}
              placeholder="(555) 123-4567"
            />
            {errors.phone && (
              <p className="text-sm text-red-600 mt-1">{errors.phone.message}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="category">Category *</Label>
            <Select
              onValueChange={(value) => setValue('category', value)}
              defaultValue={vendor?.category}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {VENDOR_CATEGORIES.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.category && (
              <p className="text-sm text-red-600 mt-1">{errors.category.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="website">Website</Label>
            <Input
              id="website"
              {...register('website')}
              placeholder="https://www.abcplumbing.com"
            />
          </div>
        </div>
      </div>

      {/* Address Information */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Address</h3>
        
        <div>
          <Label htmlFor="address">Street Address</Label>
          <Input
            id="address"
            {...register('address')}
            placeholder="123 Main St"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="city">City</Label>
            <Input
              id="city"
              {...register('city')}
              placeholder="Los Angeles"
            />
          </div>

          <div>
            <Label htmlFor="state">State</Label>
            <Input
              id="state"
              {...register('state')}
              placeholder="CA"
              maxLength={2}
            />
          </div>

          <div>
            <Label htmlFor="zip_code">ZIP Code</Label>
            <Input
              id="zip_code"
              {...register('zip_code')}
              placeholder="90001"
            />
          </div>
        </div>
      </div>

      {/* License and Insurance */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">License & Insurance</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="license_number">License Number</Label>
            <Input
              id="license_number"
              {...register('license_number')}
              placeholder="LIC-12345"
            />
          </div>

          <div>
            <Label htmlFor="insurance_expiry">Insurance Expiry Date</Label>
            <Input
              id="insurance_expiry"
              type="date"
              {...register('insurance_expiry')}
            />
          </div>
        </div>
      </div>

      {/* Pricing and Availability */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Pricing & Availability</h3>
        
        <div>
          <Label htmlFor="hourly_rate">Hourly Rate ($)</Label>
          <Input
            id="hourly_rate"
            type="number"
            step="0.01"
            {...register('hourly_rate')}
            placeholder="75.00"
          />
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="emergency_available"
            checked={emergencyAvailable}
            onCheckedChange={(checked) => setValue('emergency_available', checked as boolean)}
          />
          <Label htmlFor="emergency_available" className="cursor-pointer">
            Available for emergency calls
          </Label>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="preferred"
            checked={preferred}
            onCheckedChange={(checked) => setValue('preferred', checked as boolean)}
          />
          <Label htmlFor="preferred" className="cursor-pointer">
            Mark as preferred vendor
          </Label>
        </div>
      </div>

      {/* Status (only for edit) */}
      {vendor && (
        <div>
          <Label htmlFor="status">Status</Label>
          <Select
            onValueChange={(value) => setValue('status', value)}
            defaultValue={vendor.status}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {VENDOR_STATUSES.map((status) => (
                <SelectItem key={status.value} value={status.value}>
                  {status.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Notes */}
      <div>
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          {...register('notes')}
          placeholder="Additional notes about this vendor..."
          rows={4}
        />
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Saving...' : vendor ? 'Update Vendor' : 'Create Vendor'}
        </Button>
      </div>
    </form>
  );
}