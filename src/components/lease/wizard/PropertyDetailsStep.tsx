import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import type { LeaseFormData } from '@/types/lease';

interface PropertyDetailsStepProps {
  leaseData: Partial<LeaseFormData>;
  onUpdate: (data: Partial<LeaseFormData>) => void;
}

export default function PropertyDetailsStep({ leaseData, onUpdate }: PropertyDetailsStepProps) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Property & Parties Details</h3>
        <p className="text-sm text-gray-600">
          Verify property information and party details
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="md:col-span-2">
          <Label htmlFor="propertyAddress">Property Address</Label>
          <Input
            id="propertyAddress"
            value={leaseData.propertyAddress || ''}
            onChange={(e) => onUpdate({ propertyAddress: e.target.value })}
            placeholder="Full property address"
          />
        </div>

        <div>
          <Label htmlFor="units">Unit/Apartment Number</Label>
          <Input
            id="units"
            value={leaseData.units || ''}
            onChange={(e) => onUpdate({ units: e.target.value })}
            placeholder="e.g., Apt 4B"
          />
        </div>

        <div>
          <Label htmlFor="state">State</Label>
          <Input
            id="state"
            value={leaseData.state || ''}
            onChange={(e) => onUpdate({ state: e.target.value })}
            placeholder="e.g., CA"
            maxLength={2}
          />
        </div>

        <div className="md:col-span-2">
          <Label htmlFor="landlordName">Landlord Name</Label>
          <Input
            id="landlordName"
            value={leaseData.landlordName || ''}
            onChange={(e) => onUpdate({ landlordName: e.target.value })}
            placeholder="Full legal name"
          />
        </div>

        <div>
          <Label htmlFor="landlordEmail">Landlord Email</Label>
          <Input
            id="landlordEmail"
            type="email"
            value={leaseData.landlordEmail || ''}
            onChange={(e) => onUpdate({ landlordEmail: e.target.value })}
            placeholder="email@example.com"
          />
        </div>

        <div>
          <Label htmlFor="landlordPhone">Landlord Phone</Label>
          <Input
            id="landlordPhone"
            type="tel"
            value={leaseData.landlordPhone || ''}
            onChange={(e) => onUpdate({ landlordPhone: e.target.value })}
            placeholder="(555) 123-4567"
          />
        </div>
      </div>

      <div className="p-4 bg-gray-50 border rounded-md">
        <h4 className="font-semibold mb-3">Property Features</h4>
        <div className="text-sm text-gray-600">
          Property features will be automatically loaded from the property record.
        </div>
      </div>
    </div>
  );
}