/**
 * Lease Compliance Page
 * Check lease compliance and legal requirements
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Shield, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import LeaseComplianceChecker from '@/components/lease/LeaseComplianceChecker';
import { LeaseAgreement } from '@/types/lease';
import { leaseManagementService } from '@/services/leaseManagementService';
import { useToast } from '@/hooks/use-toast';

export default function LeaseCompliancePage() {
  const { leaseId } = useParams<{ leaseId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [lease, setLease] = useState<LeaseAgreement | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadLease = useCallback(async () => {
    if (!leaseId) return;
    
    try {
      const leaseData = await leaseManagementService.getLeaseById(leaseId);
      setLease(leaseData);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load lease',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  }, [leaseId, toast]);

  useEffect(() => {
    loadLease();
  }, [loadLease]);

  const handleFixIssue = (issueId: string) => {
    toast({
      title: 'Fixing Issue',
      description: 'Opening issue resolution wizard...'
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!lease) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-600">Lease not found</p>
            <Button className="mt-4" onClick={() => navigate('/leases')}>
              Back to Leases
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate(`/leases/${leaseId}`)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Shield className="h-8 w-8" />
            Compliance Check
          </h1>
          <p className="text-gray-600 mt-2">
            Validate lease agreement for {lease.propertyId}
          </p>
        </div>
      </div>

      {/* Compliance Checker */}
      <LeaseComplianceChecker lease={lease} onFixIssue={handleFixIssue} />
    </div>
  );
}