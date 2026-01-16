/**
 * Tenant Lease Detail Page
 * Detailed view of a specific lease with document management
 */

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  FileText,
  Calendar,
  DollarSign,
  Home,
  Loader2,
  AlertCircle,
  Upload
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/lib/supabase/client';
import { leaseManagementService } from '@/services/leaseManagementService';
import { DocumentList } from '@/components/documents/DocumentList';
import { DocumentUpload } from '@/components/documents/DocumentUpload';
import type { LeaseAgreement } from '@/types/lease';

export function TenantLeaseDetail() {
  const { leaseId } = useParams<{ leaseId: string }>();
  const [lease, setLease] = useState<LeaseAgreement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const navigate = useNavigate();

  const loadLeaseDetails = useCallback(async () => {
    if (!leaseId) return;

    setLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate('/auth/login');
        return;
      }

      setUserId(user.id);

      const leaseData = await leaseManagementService.getLeaseById(leaseId);
      
      if (!leaseData) {
        setError('Lease not found');
        return;
      }

      // Verify user has access to this lease
      if (leaseData.tenantId !== user.id) {
        setError('You do not have access to this lease');
        return;
      }

      setLease(leaseData);
    } catch (err) {
      console.error('Error loading lease details:', err);
      setError(err instanceof Error ? err.message : 'Failed to load lease details');
    } finally {
      setLoading(false);
    }
  }, [leaseId, navigate]);

  useEffect(() => {
    loadLeaseDetails();
  }, [loadLeaseDetails]);

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (date: Date): string => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(new Date(date));
  };

  const getStatusBadge = (status: string) => {
    const statusColors: Record<string, string> = {
      active: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      expired: 'bg-red-100 text-red-800',
      terminated: 'bg-gray-100 text-gray-800',
      draft: 'bg-blue-100 text-blue-800'
    };

    return (
      <Badge className={statusColors[status] || statusColors.pending}>
        {status.toUpperCase()}
      </Badge>
    );
  };

  const handleUploadComplete = () => {
    setShowUpload(false);
    // Refresh documents list
    loadLeaseDetails();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error || !lease) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error || 'Lease not found'}</AlertDescription>
        </Alert>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => navigate('/tenant/leases')}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Leases
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Button
        variant="ghost"
        className="mb-6"
        onClick={() => navigate('/tenant/leases')}
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Leases
      </Button>

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">{lease.propertyAddress}</h1>
            <p className="text-gray-600">Lease Agreement Details</p>
          </div>
          {getStatusBadge(lease.status)}
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="terms">Terms & Conditions</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Financial Information */}
          <Card>
            <CardHeader>
              <CardTitle>Financial Information</CardTitle>
              <CardDescription>Rent and deposit details</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex items-start gap-3">
                <DollarSign className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-500">Monthly Rent</p>
                  <p className="text-2xl font-bold">{formatCurrency(lease.monthlyRent)}</p>
                  <p className="text-xs text-gray-500 mt-1">Due on day {lease.paymentDueDay}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Home className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-500">Security Deposit</p>
                  <p className="text-2xl font-bold">{formatCurrency(lease.securityDeposit)}</p>
                  <p className="text-xs text-gray-500 mt-1">Refundable</p>
                </div>
              </div>

              {lease.petDeposit && lease.petDeposit > 0 && (
                <div className="flex items-start gap-3">
                  <Home className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-500">Pet Deposit</p>
                    <p className="text-2xl font-bold">{formatCurrency(lease.petDeposit)}</p>
                    <p className="text-xs text-gray-500 mt-1">Additional deposit</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Lease Period */}
          <Card>
            <CardHeader>
              <CardTitle>Lease Period</CardTitle>
              <CardDescription>Start and end dates</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-500">Start Date</p>
                  <p className="text-lg font-semibold">{formatDate(lease.startDate)}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-500">End Date</p>
                  <p className="text-lg font-semibold">{formatDate(lease.endDate)}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {lease.type === 'fixed-term' ? 'Fixed Term Lease' : 'Month-to-Month'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Property Details */}
          <Card>
            <CardHeader>
              <CardTitle>Property Details</CardTitle>
              <CardDescription>Property information and amenities</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-500 mb-1">Address</p>
                <p className="text-base">{lease.propertyAddress}</p>
              </div>

              {lease.utilities && lease.utilities.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-2">Utilities Included</p>
                  <div className="flex flex-wrap gap-2">
                    {lease.utilities.map((utility, index) => (
                      <Badge key={index} variant="secondary">
                        {utility}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {lease.restrictions && lease.restrictions.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-2">Restrictions</p>
                  <ul className="list-disc list-inside space-y-1">
                    {lease.restrictions.map((restriction, index) => (
                      <li key={index} className="text-sm text-gray-600">
                        {restriction}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Landlord Information */}
          <Card>
            <CardHeader>
              <CardTitle>Landlord Information</CardTitle>
              <CardDescription>Contact details for your landlord</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3">
                <div>
                  <p className="text-sm font-medium text-gray-500">Landlord ID</p>
                  <p className="text-sm">{lease.landlordId}</p>
                </div>
              </div>
              <p className="text-xs text-gray-500">
                For maintenance requests or inquiries, please use the maintenance request system or contact through the platform.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Lease Documents</CardTitle>
                  <CardDescription>View and download lease-related documents</CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowUpload(!showUpload)}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Upload Document
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {showUpload && userId && (
                <div className="border rounded-lg p-4 bg-gray-50">
                  <DocumentUpload
                    leaseId={lease.id}
                    bucketName="lease-agreements"
                    category="general"
                    uploadedBy={userId}
                    onUploadComplete={handleUploadComplete}
                    maxFiles={5}
                  />
                </div>
              )}

              <DocumentList
                leaseId={lease.id}
                bucketName="lease-agreements"
                showActions={true}
                allowDelete={false}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="terms" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Terms & Conditions</CardTitle>
              <CardDescription>Important lease terms and conditions</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="font-semibold mb-2">Payment Terms</h3>
                <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                  <li>Monthly rent of {formatCurrency(lease.monthlyRent)} due on day {lease.paymentDueDay} of each month</li>
                  <li>Late fee may apply after 5 days past due date</li>
                  <li>Security deposit of {formatCurrency(lease.securityDeposit)} held for damages</li>
                  {lease.petDeposit && lease.petDeposit > 0 && (
                    <li>Pet deposit of {formatCurrency(lease.petDeposit)} for pet-related damages</li>
                  )}
                </ul>
              </div>

              <Separator />

              <div>
                <h3 className="font-semibold mb-2">Lease Duration</h3>
                <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                  <li>Lease type: {lease.type === 'fixed-term' ? 'Fixed Term' : 'Month-to-Month'}</li>
                  <li>Start date: {formatDate(lease.startDate)}</li>
                  <li>End date: {formatDate(lease.endDate)}</li>
                  {lease.type === 'month-to-month' && (
                    <li>30 days notice required for termination</li>
                  )}
                </ul>
              </div>

              {lease.restrictions && lease.restrictions.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <h3 className="font-semibold mb-2">Property Restrictions</h3>
                    <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                      {lease.restrictions.map((restriction, index) => (
                        <li key={index}>{restriction}</li>
                      ))}
                    </ul>
                  </div>
                </>
              )}

              <Separator />

              <div>
                <h3 className="font-semibold mb-2">Maintenance & Repairs</h3>
                <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                  <li>Tenant responsible for minor repairs and maintenance</li>
                  <li>Landlord responsible for major repairs and structural issues</li>
                  <li>Submit maintenance requests through the platform</li>
                  <li>Emergency repairs should be reported immediately</li>
                </ul>
              </div>

              <Separator />

              <div>
                <h3 className="font-semibold mb-2">Termination</h3>
                <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                  <li>Written notice required for early termination</li>
                  <li>Security deposit returned within 30 days after move-out</li>
                  <li>Property must be returned in original condition (normal wear excepted)</li>
                  <li>Final walk-through inspection will be scheduled</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}