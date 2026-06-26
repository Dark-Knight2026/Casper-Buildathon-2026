import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Home,
  User,
  DollarSign,
  Calendar,
  Clock,
  TrendingUp,
  FileText,
  MessageSquare,
  Edit,
  Trash2
} from 'lucide-react';
import type { Transaction } from '@/types/transaction';
import { format } from 'date-fns';

interface TransactionDetailModalProps {
  transaction: Transaction | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: (transaction: Transaction) => void;
  onDelete?: (transactionId: string) => void;
}

export default function TransactionDetailModal({
  transaction,
  open,
  onOpenChange,
  onEdit,
  onDelete
}: TransactionDetailModalProps) {
  const [activeTab, setActiveTab] = useState('details');

  if (!transaction) return null;

  const daysInStage = Math.floor(
    (new Date().getTime() - new Date(transaction.stage_entered_at).getTime()) / 
    (1000 * 60 * 60 * 24)
  );

  const getStageColor = (stage: string) => {
    const colors: Record<string, string> = {
      lead: 'bg-gray-100 text-gray-800',
      showing: 'bg-blue-100 text-blue-800',
      offer: 'bg-yellow-100 text-yellow-800',
      under_contract: 'bg-orange-100 text-orange-800',
      closing: 'bg-purple-100 text-purple-800',
      closed: 'bg-green-100 text-green-800',
      lost: 'bg-red-100 text-red-800'
    };
    return colors[stage] || colors.lead;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Transaction Details</DialogTitle>
          <DialogDescription>
            Complete information about this transaction
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Header Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-start space-x-3">
                  <Home className="h-5 w-5 text-blue-600 mt-1" />
                  <div>
                    <p className="text-sm text-gray-600">Property</p>
                    <p className="font-semibold text-lg">{transaction.property_address}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-start space-x-3">
                  <User className="h-5 w-5 text-green-600 mt-1" />
                  <div>
                    <p className="text-sm text-gray-600">Client</p>
                    <p className="font-semibold text-lg">{transaction.client_name}</p>
                    {transaction.client_email && (
                      <p className="text-xs text-gray-500">{transaction.client_email}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <DollarSign className="h-6 w-6 text-green-600 mx-auto mb-2" />
                <p className="text-sm text-gray-600">Amount</p>
                <p className="text-xl font-bold">${transaction.amount.toLocaleString()}</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 text-center">
                <TrendingUp className="h-6 w-6 text-purple-600 mx-auto mb-2" />
                <p className="text-sm text-gray-600">Commission</p>
                <p className="text-xl font-bold">
                  ${(transaction.commission_amount || 0).toLocaleString()}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 text-center">
                <Badge className={`${getStageColor(transaction.pipeline_stage)} text-xs`}>
                  {transaction.pipeline_stage.replace('_', ' ')}
                </Badge>
                <p className="text-sm text-gray-600 mt-2">Current Stage</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 text-center">
                <Clock className="h-6 w-6 text-orange-600 mx-auto mb-2" />
                <p className="text-sm text-gray-600">Days in Stage</p>
                <p className="text-xl font-bold">{daysInStage}</p>
              </CardContent>
            </Card>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="history">Stage History</TabsTrigger>
              <TabsTrigger value="notes">Notes</TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Transaction Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Probability</p>
                      <p className="font-semibold">{transaction.probability_percent}%</p>
                    </div>
                    {transaction.estimated_close_date && (
                      <div>
                        <p className="text-sm text-gray-600">Est. Close Date</p>
                        <p className="font-semibold">
                          {format(new Date(transaction.estimated_close_date), 'MMM d, yyyy')}
                        </p>
                      </div>
                    )}
                    <div>
                      <p className="text-sm text-gray-600">Created</p>
                      <p className="font-semibold">
                        {format(new Date(transaction.created_at), 'MMM d, yyyy')}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Last Updated</p>
                      <p className="font-semibold">
                        {format(new Date(transaction.updated_at), 'MMM d, yyyy')}
                      </p>
                    </div>
                  </div>

                  {transaction.stalled_reason && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 mt-4">
                      <p className="text-sm font-semibold text-red-900 mb-1">
                        Stalled Reason
                      </p>
                      <p className="text-sm text-red-700">{transaction.stalled_reason}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="history" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Stage History</CardTitle>
                </CardHeader>
                <CardContent>
                  {transaction.stage_history && transaction.stage_history.length > 0 ? (
                    <div className="space-y-3">
                      {transaction.stage_history.map((entry, index) => (
                        <div
                          key={index}
                          className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg"
                        >
                          <div className="flex-shrink-0 w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <Badge className={getStageColor(entry.stage)}>
                                {entry.stage.replace('_', ' ')}
                              </Badge>
                              <span className="text-xs text-gray-500">
                                {entry.duration_days} days
                              </span>
                            </div>
                            <p className="text-xs text-gray-600">
                              {format(new Date(entry.entered_at), 'MMM d, yyyy')} -{' '}
                              {format(new Date(entry.exited_at), 'MMM d, yyyy')}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 text-center py-8">
                      No stage history available yet
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="notes" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Transaction Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <textarea
                      className="w-full min-h-[200px] p-3 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Add notes about this transaction..."
                    />
                    <Button className="w-full">
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Save Note
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Actions */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => onEdit?.(transaction)}
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (confirm('Are you sure you want to delete this transaction?')) {
                  onDelete?.(transaction.id);
                  onOpenChange(false);
                }
              }}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
            <Button onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}