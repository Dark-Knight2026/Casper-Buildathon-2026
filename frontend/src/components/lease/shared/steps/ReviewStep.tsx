import React from 'react';
import { useLeaseManagement } from '@/contexts/LeaseManagementContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';

export const ReviewStep: React.FC = () => {
  const { formData } = useLeaseManagement();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Review Lease Agreement</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h3 className="font-semibold mb-2">Property Details</h3>
            <p className="text-sm text-muted-foreground">Property ID: {formData.propertyId}</p>
            <p className="text-sm text-muted-foreground">Type: {formData.type}</p>
          </div>
          
          <div>
            <h3 className="font-semibold mb-2">Parties</h3>
            <p className="text-sm text-muted-foreground">Landlord ID: {formData.landlordId}</p>
            <p className="text-sm text-muted-foreground">Tenants: {formData.tenantIds.join(', ') || 'None'}</p>
          </div>
        </div>

        <div className="border-t pt-4">
          <h3 className="font-semibold mb-2">Financial Terms</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium">Monthly Rent</p>
              <p className="text-2xl font-bold">${formData.monthlyRent.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm font-medium">Security Deposit</p>
              <p className="text-2xl font-bold">${formData.securityDeposit.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="border-t pt-4">
          <h3 className="font-semibold mb-2">Duration</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium">Start Date</p>
              <p className="text-sm text-muted-foreground">
                {formData.startDate ? format(formData.startDate, 'PPP') : 'Not set'}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium">End Date</p>
              <p className="text-sm text-muted-foreground">
                {formData.endDate ? format(formData.endDate, 'PPP') : 'Not set'}
              </p>
            </div>
          </div>
        </div>

        {formData.customTerms && (
          <div className="border-t pt-4">
            <h3 className="font-semibold mb-2">Custom Terms</h3>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{formData.customTerms}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};