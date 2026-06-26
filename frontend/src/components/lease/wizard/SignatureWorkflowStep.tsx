import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, X } from 'lucide-react';
import type { LeaseFormData, SigningWorkflow } from '@/types/lease';

interface SignatureWorkflowStepProps {
  leaseData: Partial<LeaseFormData>;
  signingWorkflow: Partial<SigningWorkflow> | null;
  onUpdate: (workflow: Partial<SigningWorkflow>) => void;
}

export default function SignatureWorkflowStep({
  leaseData,
  signingWorkflow,
  onUpdate,
}: SignatureWorkflowStepProps) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">E-Signature Setup</h3>
        <p className="text-sm text-gray-600">
          Configure who needs to sign and in what order
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Signing Workflow</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="workflowType">Workflow Type</Label>
            <Select defaultValue="sequential">
              <SelectTrigger id="workflowType">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sequential">Sequential (one at a time)</SelectItem>
                <SelectItem value="parallel">Parallel (all at once)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Signers</Label>
            <div className="space-y-3 mt-2">
              <Card>
                <CardContent className="pt-4">
                  <div className="text-sm">
                    <div className="font-semibold">Landlord (You)</div>
                    <div className="text-gray-600">{leaseData.landlordEmail || 'Not specified'}</div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-4">
                  <div className="text-sm">
                    <div className="font-semibold">Tenant(s)</div>
                    <div className="text-gray-600">
                      {leaseData.tenantIds?.length || 0} tenant(s) selected
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
