import React from 'react';
import { useLeaseManagement } from '@/contexts/LeaseManagementContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export const ClausesSection: React.FC = () => {
  const { formData, updateFormData } = useLeaseManagement();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Clauses & Additional Terms</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="customTerms">Custom Terms</Label>
          <Textarea
            id="customTerms"
            placeholder="Enter any additional terms or clauses here..."
            className="min-h-[200px]"
            value={formData.customTerms}
            onChange={(e) => updateFormData({ customTerms: e.target.value })}
          />
          <p className="text-sm text-muted-foreground">
            These terms will be appended to the standard lease agreement.
          </p>
        </div>
        
        {/* Placeholder for Clause Library integration */}
        <div className="p-4 border border-dashed rounded-lg bg-muted/50 text-center text-muted-foreground">
          Clause Library Integration Coming Soon
        </div>
      </CardContent>
    </Card>
  );
};