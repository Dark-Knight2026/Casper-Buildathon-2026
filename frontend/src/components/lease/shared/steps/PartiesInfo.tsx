import React from 'react';
import { useLeaseManagement } from '@/contexts/LeaseManagementContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus, Trash2 } from 'lucide-react';

// Mock data - replace with API call or search
const landlords = [
  { id: 'user_1', name: 'John Doe' },
  { id: 'user_2', name: 'Jane Smith' },
];

export const PartiesInfo: React.FC = () => {
  const { formData, updateFormData, errors } = useLeaseManagement();

  // For simplicity in this demo, we're managing tenant IDs as strings
  // In a real app, this would likely involve a user search/select component
  const addTenant = () => {
    // Placeholder logic for adding a tenant
    const newTenantId = `tenant_${Date.now()}`;
    updateFormData({ tenantIds: [...formData.tenantIds, newTenantId] });
  };

  const removeTenant = (index: number) => {
    const newTenantIds = [...formData.tenantIds];
    newTenantIds.splice(index, 1);
    updateFormData({ tenantIds: newTenantIds });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Parties Information</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Landlord Section */}
        <div className="space-y-2">
          <Label>Landlord</Label>
          {/* Simplified Select for demo */}
          <select 
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            value={formData.landlordId}
            onChange={(e) => updateFormData({ landlordId: e.target.value })}
          >
            <option value="">Select Landlord</option>
            {landlords.map(l => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </select>
          {errors.landlordId && <p className="text-sm text-red-500">{errors.landlordId}</p>}
        </div>

        {/* Tenants Section */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <Label>Tenants</Label>
            <Button type="button" variant="outline" size="sm" onClick={addTenant}>
              <Plus className="h-4 w-4 mr-2" />
              Add Tenant
            </Button>
          </div>
          
          {formData.tenantIds.length === 0 && (
            <div className="text-sm text-muted-foreground italic">No tenants added yet.</div>
          )}

          <div className="space-y-2">
            {formData.tenantIds.map((tenantId, index) => (
              <div key={tenantId} className="flex items-center gap-2">
                <Input 
                  value={tenantId} 
                  readOnly 
                  placeholder="Tenant ID (Mock)" 
                />
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="icon"
                  onClick={() => removeTenant(index)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
          {errors.tenantIds && <p className="text-sm text-red-500">{errors.tenantIds}</p>}
        </div>
      </CardContent>
    </Card>
  );
};