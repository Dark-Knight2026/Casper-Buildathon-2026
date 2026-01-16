import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CheckCircle, XCircle, AlertTriangle, FileText, User, Calendar } from 'lucide-react';
import { LeaseAgreement } from '@/types/lease';
import { format } from 'date-fns';

interface ApprovalWorkflowProps {
  lease: LeaseAgreement;
  onApprove: (comments?: string) => Promise<void>;
  onReject: (reason: string) => Promise<void>;
  onRequestChanges: (feedback: string) => Promise<void>;
}

export const ApprovalWorkflow: React.FC<ApprovalWorkflowProps> = ({
  lease,
  onApprove,
  onReject,
  onRequestChanges
}) => {
  const [comments, setComments] = useState('');
  const [action, setAction] = useState<'approve' | 'reject' | 'changes' | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!action) return;
    
    setIsSubmitting(true);
    try {
      if (action === 'approve') {
        await onApprove(comments);
      } else if (action === 'reject') {
        await onReject(comments);
      } else if (action === 'changes') {
        await onRequestChanges(comments);
      }
    } catch (error) {
      console.error('Action failed:', error);
    } finally {
      setIsSubmitting(false);
      setAction(null);
      setComments('');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending_approval':
        return <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-200">Pending Approval</Badge>;
      case 'active':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-200">Active</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-200">Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>Lease Approval Request</CardTitle>
              <CardDescription>Review the lease details submitted by the agent</CardDescription>
            </div>
            {getStatusBadge(lease.status)}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Lease Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">Property Details</h3>
              <div className="flex items-start space-x-3">
                <FileText className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="font-medium">{lease.propertyId}</p>
                  <p className="text-sm text-gray-500">Unit 101</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">Lease Terms</h3>
              <div className="space-y-2">
                <div className="flex items-center space-x-3">
                  <Calendar className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm">
                      <span className="font-medium">Start:</span> {format(new Date(lease.startDate), 'MMM d, yyyy')}
                    </p>
                    <p className="text-sm">
                      <span className="font-medium">End:</span> {format(new Date(lease.endDate), 'MMM d, yyyy')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <User className="h-5 w-5 text-gray-400" />
                  <p className="text-sm">
                    <span className="font-medium">Tenant:</span> {lease.tenantId || 'Pending Assignment'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Financials */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-gray-900 mb-3">Financial Summary</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-gray-500">Monthly Rent</p>
                <p className="text-lg font-bold">${lease.rentAmount.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Security Deposit</p>
                <p className="text-lg font-bold">${lease.securityDeposit.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Payment Due</p>
                <p className="text-sm font-medium">Day {lease.rentDueDay} of month</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Late Fee</p>
                <p className="text-sm font-medium">${lease.lateFeeAmount}</p>
              </div>
            </div>
          </div>

          {/* Action Area */}
          {lease.status === 'pending_approval' && (
            <div className="border-t pt-6">
              {!action ? (
                <div className="flex flex-col sm:flex-row gap-4 justify-end">
                  <Button 
                    variant="outline" 
                    className="border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800"
                    onClick={() => setAction('reject')}
                  >
                    <XCircle className="mr-2 h-4 w-4" />
                    Reject
                  </Button>
                  <Button 
                    variant="outline"
                    className="border-yellow-200 text-yellow-700 hover:bg-yellow-50 hover:text-yellow-800"
                    onClick={() => setAction('changes')}
                  >
                    <AlertTriangle className="mr-2 h-4 w-4" />
                    Request Changes
                  </Button>
                  <Button 
                    className="bg-green-600 hover:bg-green-700 text-white"
                    onClick={() => setAction('approve')}
                  >
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Approve Lease
                  </Button>
                </div>
              ) : (
                <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                  <Alert>
                    <AlertTitle className="font-medium mb-2">
                      {action === 'approve' && 'Approve Lease Agreement'}
                      {action === 'reject' && 'Reject Lease Agreement'}
                      {action === 'changes' && 'Request Changes'}
                    </AlertTitle>
                    <AlertDescription>
                      {action === 'approve' && 'You are about to approve this lease. The tenant will be notified to sign.'}
                      {action === 'reject' && 'Please provide a reason for rejecting this lease. This will terminate the workflow.'}
                      {action === 'changes' && 'Please specify the changes required. The agent will be notified to update the lease.'}
                    </AlertDescription>
                  </Alert>
                  
                  <Textarea
                    placeholder={
                      action === 'approve' ? "Optional comments..." :
                      action === 'reject' ? "Reason for rejection (required)..." :
                      "Describe required changes (required)..."
                    }
                    value={comments}
                    onChange={(e) => setComments(e.target.value)}
                    className="min-h-[100px]"
                  />

                  <div className="flex justify-end gap-3">
                    <Button variant="ghost" onClick={() => { setAction(null); setComments(''); }}>
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleSubmit}
                      disabled={isSubmitting || ((action === 'reject' || action === 'changes') && !comments.trim())}
                      variant={action === 'reject' ? 'destructive' : 'default'}
                      className={action === 'approve' ? 'bg-green-600 hover:bg-green-700' : ''}
                    >
                      {isSubmitting ? 'Processing...' : 'Confirm'}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};