/**
 * Parties Information Step
 * Landlord and tenant details
 */

import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { LeaseFormData } from '@/types/lease';
import { User, Mail, Phone, Plus, X } from 'lucide-react';

interface PartiesInformationStepProps {
  formData: Partial<LeaseFormData>;
  updateFormData: (data: Partial<LeaseFormData>) => void;
  errors: Record<string, string>;
}

export default function PartiesInformationStep({
  formData,
  updateFormData,
  errors
}: PartiesInformationStepProps) {
  const addTenant = () => {
    const currentTenants = formData.tenantIds || [];
    updateFormData({ tenantIds: [...currentTenants, `tenant_${Date.now()}`] });
  };

  const removeTenant = (index: number) => {
    const currentTenants = formData.tenantIds || [];
    updateFormData({ tenantIds: currentTenants.filter((_, i) => i !== index) });
  };

  return (
    <div className="space-y-6">
      {/* Landlord Information */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <User className="h-5 w-5 text-blue-600" />
            <h3 className="text-lg font-semibold">Landlord Information</h3>
          </div>

          <div className="space-y-2">
            <Label htmlFor="landlordId">Landlord ID *</Label>
            <Input
              id="landlordId"
              placeholder="Enter landlord ID"
              value={formData.landlordId || ''}
              onChange={(e) => updateFormData({ landlordId: e.target.value })}
              className={errors.landlordId ? 'border-red-500' : ''}
            />
            {errors.landlordId && (
              <p className="text-sm text-red-500">{errors.landlordId}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="landlordName">Full Name</Label>
              <Input
                id="landlordName"
                placeholder="John Doe"
                value={formData.landlordName || ''}
                onChange={(e) => updateFormData({ landlordName: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="landlordEmail">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="landlordEmail"
                  type="email"
                  placeholder="landlord@example.com"
                  className="pl-10"
                  value={formData.landlordEmail || ''}
                  onChange={(e) => updateFormData({ landlordEmail: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="landlordPhone">Phone Number</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                id="landlordPhone"
                type="tel"
                placeholder="(555) 123-4567"
                className="pl-10"
                value={formData.landlordPhone || ''}
                onChange={(e) => updateFormData({ landlordPhone: e.target.value })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Tenant Information */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-green-600" />
              <h3 className="text-lg font-semibold">Tenant Information</h3>
            </div>
            <Button variant="outline" size="sm" onClick={addTenant}>
              <Plus className="h-4 w-4 mr-2" />
              Add Tenant
            </Button>
          </div>

          {errors.tenantIds && (
            <p className="text-sm text-red-500">{errors.tenantIds}</p>
          )}

          {(formData.tenantIds || []).map((tenantId, index) => (
            <Card key={tenantId} className="border-2">
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Tenant {index + 1}</h4>
                  {index > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeTenant(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`tenantId_${index}`}>Tenant ID *</Label>
                  <Input
                    id={`tenantId_${index}`}
                    placeholder="Enter tenant ID"
                    value={tenantId}
                    onChange={(e) => {
                      const newTenants = [...(formData.tenantIds || [])];
                      newTenants[index] = e.target.value;
                      updateFormData({ tenantIds: newTenants });
                    }}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor={`tenantName_${index}`}>Full Name</Label>
                    <Input
                      id={`tenantName_${index}`}
                      placeholder="Jane Smith"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`tenantEmail_${index}`}>Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id={`tenantEmail_${index}`}
                        type="email"
                        placeholder="tenant@example.com"
                        className="pl-10"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </CardContent>
      </Card>

      {/* Agent Information (Optional) */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <User className="h-5 w-5 text-purple-600" />
            <h3 className="text-lg font-semibold">Agent Information (Optional)</h3>
          </div>

          <div className="space-y-2">
            <Label htmlFor="agentId">Agent ID</Label>
            <Input
              id="agentId"
              placeholder="Enter agent ID if applicable"
              value={formData.agentId || ''}
              onChange={(e) => updateFormData({ agentId: e.target.value })}
            />
          </div>

          {formData.agentId && (
            <div className="space-y-2">
              <Label htmlFor="agentCommission">Agent Commission</Label>
              <Input
                id="agentCommission"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={formData.agentCommission || ''}
                onChange={(e) => updateFormData({ agentCommission: parseFloat(e.target.value) || 0 })}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}