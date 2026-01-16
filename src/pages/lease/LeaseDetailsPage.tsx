import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useLeaseContext } from '@/contexts/LeaseContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, FileText, DollarSign, Clock, PenTool, CheckCircle } from 'lucide-react';
import DocumentList from '@/components/lease/storage/DocumentList';
import LeaseTimeline from '@/components/lease/LeaseTimeline';

export const LeaseDetailsPage: React.FC = () => {
  const { lease } = useLeaseContext();
  const navigate = useNavigate();

  if (!lease) return null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'pending_signature': return 'bg-blue-100 text-blue-800';
      case 'expired': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold tracking-tight">Lease Details</h1>
            <Badge className={getStatusColor(lease.status)} variant="outline">
              {lease.status.replace('_', ' ').toUpperCase()}
            </Badge>
          </div>
          <p className="text-muted-foreground flex items-center gap-2">
            <FileText className="h-4 w-4" />
            {lease.propertyAddress}
          </p>
        </div>
        
        <div className="flex gap-2">
          {lease.status === 'draft' && (
             <Button onClick={() => navigate(`/leases/${lease.id}/edit`)}>
               <PenTool className="h-4 w-4 mr-2" />
               Edit Draft
             </Button>
          )}
          {lease.status === 'pending_signature' && (
             <Button onClick={() => navigate(`/leases/${lease.id}/signing`)}>
               <CheckCircle className="h-4 w-4 mr-2" />
               View Signatures
             </Button>
          )}
          {lease.status === 'active' && (
             <Button variant="outline" onClick={() => navigate(`/leases/${lease.id}/renewal`)}>
               <Clock className="h-4 w-4 mr-2" />
               Renew Lease
             </Button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="financials">Financials</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Lease Terms</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Start Date</p>
                    <p>{new Date(lease.startDate).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">End Date</p>
                    <p>{new Date(lease.endDate).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Rent Amount</p>
                    <p>${lease.rentAmount}/month</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Security Deposit</p>
                    <p>${lease.securityDeposit}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Tenants</CardTitle>
              </CardHeader>
              <CardContent>
                {lease.tenants.map((tenant, idx) => (
                  <div key={idx} className="flex items-center gap-3 mb-3 last:mb-0">
                    <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                      {tenant.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-medium">{tenant.name}</p>
                      <p className="text-sm text-gray-500">{tenant.email}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
          
          <LeaseTimeline leases={[lease]} />
        </TabsContent>

        <TabsContent value="documents">
          <Card>
            <CardHeader>
              <CardTitle>Lease Documents</CardTitle>
              <CardDescription>Manage all files related to this lease.</CardDescription>
            </CardHeader>
            <CardContent>
              {/* Pass the lease ID to the document list */}
              <DocumentList leaseId={lease.id} />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="financials">
           <Card>
             <CardHeader>
               <CardTitle>Financial Overview</CardTitle>
             </CardHeader>
             <CardContent>
               <div className="flex items-center justify-center h-40 text-gray-500">
                 <DollarSign className="h-8 w-8 mr-2" />
                 Financial integration coming soon
               </div>
             </CardContent>
           </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};