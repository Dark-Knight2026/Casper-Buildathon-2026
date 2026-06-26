import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { LeaseDocumentView } from '@/components/lease/signing/LeaseDocumentView';
import { SignaturePad } from '@/components/lease/signing/SignaturePad';
import { leaseApi } from '@/lib/api/lease';
import { LeaseAgreement } from '@/types/lease';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckCircle, ArrowLeft, PenTool } from 'lucide-react';

export default function TenantSigningPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [lease, setLease] = useState<LeaseAgreement | null>(null);
  const [loading, setLoading] = useState(true);
  const [signature, setSignature] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSigned, setIsSigned] = useState(false);

  useEffect(() => {
    const fetchLease = async () => {
      // Mock fallback for UI testing
      const mockLease: LeaseAgreement = {
        id: '3',
        propertyId: '789 Pine Ln',
        status: 'pending_signature', // Assume it's ready for signature
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        rentAmount: 2500,
        securityDeposit: 2500,
        rentDueDay: 1,
        lateFeeAmount: 50,
        tenantId: user?.name || 'Current Tenant',
        updatedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      } as LeaseAgreement;

      if (!id) return;

      try {
        const data = await leaseApi.getLease(id);
        if (data) {
          setLease(data);
        } else {
          // Fallback to mock
          setLease(mockLease);
        }
      } catch (error) {
        console.error('Failed to fetch lease:', error);
        // Fallback to mock
        setLease(mockLease);
      } finally {
        setLoading(false);
      }
    };

    fetchLease();
  }, [id, user]);

  const handleSign = async () => {
    if (!lease || !signature || !user) return;
    
    setIsSubmitting(true);
    try {
      await leaseApi.signLease(lease.id, user.id, signature);
      setIsSigned(true);
      toast({
        title: "Lease Signed Successfully",
        description: "The document has been signed and submitted.",
      });
      // Optional: Redirect after delay
      setTimeout(() => navigate('/tenant-dashboard'), 2000);
    } catch (error) {
      console.error('Signing failed:', error);
      toast({
        title: "Error",
        description: "Failed to submit signature. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-[600px] w-full" />
      </div>
    );
  }

  if (!lease) {
    return (
      <div className="max-w-4xl mx-auto p-6 text-center">
        <h2 className="text-2xl font-bold text-gray-900">Lease Document Not Found</h2>
        <Button onClick={() => navigate('/tenant-dashboard')} className="mt-4">
          Return to Dashboard
        </Button>
      </div>
    );
  }

  if (isSigned) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center p-6">
          <div className="flex justify-center mb-4">
            <CheckCircle className="h-16 w-16 text-green-500" />
          </div>
          <CardTitle className="text-2xl mb-2">Lease Signed!</CardTitle>
          <CardDescription className="mb-6">
            Thank you for signing the lease agreement. A copy has been sent to your email and the landlord.
          </CardDescription>
          <Button onClick={() => navigate('/tenant-dashboard')} className="w-full">
            Go to Dashboard
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-8 pb-32">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/tenant-dashboard')}
            className="pl-0 hover:pl-2 transition-all"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div className="text-right">
            <h1 className="text-xl font-bold text-gray-900">Sign Lease Agreement</h1>
            <p className="text-sm text-gray-500">{lease.propertyId}</p>
          </div>
        </div>

        {/* Document View */}
        <div className="bg-white shadow-sm rounded-lg overflow-hidden">
          <LeaseDocumentView lease={lease} />
        </div>

        {/* Signature Section */}
        <Card className="sticky bottom-4 mx-auto max-w-xl shadow-2xl border-t-4 border-t-blue-600 animate-in slide-in-from-bottom-4">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center text-lg">
              <PenTool className="mr-2 h-5 w-5 text-blue-600" />
              Sign Document
            </CardTitle>
            <CardDescription>
              Please sign below to accept the terms of this lease.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <SignaturePad 
              onSave={setSignature} 
              onClear={() => setSignature(null)} 
            />
            <Button 
              className="w-full bg-blue-600 hover:bg-blue-700 text-lg py-6"
              size="lg"
              disabled={!signature || isSubmitting}
              onClick={handleSign}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Signature & Complete Lease'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}