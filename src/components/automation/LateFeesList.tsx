/**
 * Late Fees List Component
 * Display and manage applied late fees
 */

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { DollarSign, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import { automationService } from '@/services/automationService';
import type { LateFee } from '@/types/automation';

export function LateFeesList() {
  const [fees, setFees] = useState<LateFee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('applied');
  const [selectedFee, setSelectedFee] = useState<LateFee | null>(null);
  const [waiverReason, setWaiverReason] = useState('');
  const [isWaiving, setIsWaiving] = useState(false);

  const loadFees = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await automationService.getLateFees({ status: activeTab });
      setFees(data);
    } catch (error) {
      console.error('Error loading late fees:', error);
    } finally {
      setIsLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    loadFees();
  }, [loadFees]);

  const handleWaiveFee = async () => {
    if (!selectedFee || !waiverReason.trim()) {
      alert('Please provide a reason for waiving the fee');
      return;
    }

    setIsWaiving(true);
    try {
      await automationService.waiveLateFee(selectedFee.id, waiverReason);
      alert('Late fee waived successfully!');
      setSelectedFee(null);
      setWaiverReason('');
      loadFees();
    } catch (error) {
      console.error('Error waiving late fee:', error);
      alert('Failed to waive late fee');
    } finally {
      setIsWaiving(false);
    }
  };

  const getStatusIcon = (status: LateFee['status']) => {
    switch (status) {
      case 'pending':
        return <AlertCircle className="h-4 w-4" />;
      case 'applied':
        return <DollarSign className="h-4 w-4" />;
      case 'waived':
        return <XCircle className="h-4 w-4" />;
      case 'paid':
        return <CheckCircle className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: LateFee['status']) => {
    switch (status) {
      case 'pending':
        return 'secondary';
      case 'applied':
        return 'destructive';
      case 'waived':
        return 'outline';
      case 'paid':
        return 'default';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Late Fees</CardTitle>
        <CardDescription>Manage applied late fees</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="applied">Applied</TabsTrigger>
            <TabsTrigger value="waived">Waived</TabsTrigger>
            <TabsTrigger value="paid">Paid</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : fees.length === 0 ? (
              <div className="text-center py-12">
                <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No {activeTab} late fees</p>
              </div>
            ) : (
              <div className="space-y-4">
                {fees.map((fee) => (
                  <Card key={fee.id}>
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="font-semibold text-lg">Payment #{fee.paymentId}</h3>
                          <p className="text-sm text-gray-600">
                            Tenant #{fee.tenantId} • Property #{fee.propertyId}
                          </p>
                        </div>
                        <Badge variant={getStatusColor(fee.status)} className="flex items-center gap-1">
                          {getStatusIcon(fee.status)}
                          {fee.status}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <div>
                          <p className="text-xs text-gray-600">Original Amount</p>
                          <p className="font-semibold">${fee.originalAmount.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600">Late Fee</p>
                          <p className="font-semibold text-red-600">${fee.feeAmount.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600">Days Late</p>
                          <p className="font-semibold">{fee.daysLate} days</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600">Due Date</p>
                          <p className="font-semibold">{new Date(fee.dueDate).toLocaleDateString()}</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">
                          Applied: {new Date(fee.appliedAt).toLocaleDateString()}
                        </span>
                        <span className="text-gray-600">
                          Fee Type: {fee.feeType === 'flat' ? 'Flat Fee' : `${fee.feeRate}% of Rent`}
                        </span>
                      </div>

                      {fee.status === 'waived' && fee.waiverReason && (
                        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                          <p className="text-xs text-gray-600 mb-1">Waiver Reason:</p>
                          <p className="text-sm">{fee.waiverReason}</p>
                          <p className="text-xs text-gray-500 mt-2">
                            Waived on {new Date(fee.waivedAt!).toLocaleDateString()}
                          </p>
                        </div>
                      )}

                      {(fee.status === 'pending' || fee.status === 'applied') && (
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              className="mt-4"
                              onClick={() => setSelectedFee(fee)}
                            >
                              Waive Fee
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Waive Late Fee</DialogTitle>
                              <DialogDescription>
                                Provide a reason for waiving this late fee. This action cannot be undone.
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                              <div className="space-y-2">
                                <Label htmlFor="waiver-reason">Reason for Waiver</Label>
                                <Textarea
                                  id="waiver-reason"
                                  placeholder="e.g., First-time late payment, tenant experiencing hardship, etc."
                                  value={waiverReason}
                                  onChange={(e) => setWaiverReason(e.target.value)}
                                  rows={4}
                                />
                              </div>
                              <div className="bg-gray-50 p-3 rounded-lg">
                                <p className="text-sm font-medium mb-2">Fee Details:</p>
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                  <span className="text-gray-600">Original Amount:</span>
                                  <span className="font-medium">${fee.originalAmount.toLocaleString()}</span>
                                  <span className="text-gray-600">Late Fee:</span>
                                  <span className="font-medium text-red-600">${fee.feeAmount.toLocaleString()}</span>
                                  <span className="text-gray-600">Days Late:</span>
                                  <span className="font-medium">{fee.daysLate} days</span>
                                </div>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button onClick={handleWaiveFee} disabled={isWaiving || !waiverReason.trim()}>
                                {isWaiving ? 'Waiving...' : 'Confirm Waiver'}
                              </Button>
                              <Button
                                variant="outline"
                                onClick={() => {
                                  setSelectedFee(null);
                                  setWaiverReason('');
                                }}
                              >
                                Cancel
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}