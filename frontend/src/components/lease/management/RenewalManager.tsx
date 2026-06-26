/**
 * Renewal Manager Component
 * Manage lease renewals with automated reminders
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  RefreshCw,
  Calendar,
  DollarSign,
  TrendingUp,
  Send,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Mail,
  MessageSquare
} from 'lucide-react';
import { RenewalReminder } from '@/services/leaseManagementService';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface RenewalManagerProps {
  reminders: RenewalReminder[];
  onSendReminder: (reminderId: string) => Promise<void>;
  onCreateRenewalOffer: (reminderId: string, newRent: number, message: string) => Promise<void>;
  onViewLease: (leaseId: string) => void;
}

export default function RenewalManager({
  reminders,
  onSendReminder,
  onCreateRenewalOffer,
  onViewLease
}: RenewalManagerProps) {
  const [selectedReminder, setSelectedReminder] = useState<RenewalReminder | null>(null);
  const [showOfferDialog, setShowOfferDialog] = useState(false);
  const [newRent, setNewRent] = useState<number>(0);
  const [offerMessage, setOfferMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  const getReminderColor = (type: RenewalReminder['reminderType']) => {
    switch (type) {
      case 'expired':
        return 'bg-red-100 text-red-800 border-red-200';
      case '30-day':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case '60-day':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case '90-day':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getReminderIcon = (type: RenewalReminder['reminderType']) => {
    switch (type) {
      case 'expired':
        return <AlertCircle className="h-5 w-5 text-red-600" />;
      case '30-day':
        return <Clock className="h-5 w-5 text-orange-600" />;
      case '60-day':
        return <Calendar className="h-5 w-5 text-yellow-600" />;
      case '90-day':
        return <Calendar className="h-5 w-5 text-blue-600" />;
      default:
        return <Calendar className="h-5 w-5 text-gray-600" />;
    }
  };

  const getStatusBadge = (status: RenewalReminder['status']) => {
    switch (status) {
      case 'sent':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700">Sent</Badge>;
      case 'responded':
        return <Badge variant="outline" className="bg-green-50 text-green-700">Responded</Badge>;
      case 'ignored':
        return <Badge variant="outline" className="bg-gray-50 text-gray-700">No Response</Badge>;
      default:
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700">Pending</Badge>;
    }
  };

  const handleSendReminder = async (reminderId: string) => {
    setIsSending(true);
    try {
      await onSendReminder(reminderId);
    } finally {
      setIsSending(false);
    }
  };

  const handleCreateOffer = (reminder: RenewalReminder) => {
    setSelectedReminder(reminder);
    setNewRent(0);
    setOfferMessage(`Dear Tenant,\n\nWe would like to offer you a lease renewal for ${reminder.propertyId}.\n\nPlease review the terms below and let us know if you're interested in renewing.\n\nBest regards,\nProperty Management`);
    setShowOfferDialog(true);
  };

  const handleSubmitOffer = async () => {
    if (!selectedReminder || !newRent) return;

    setIsSending(true);
    try {
      await onCreateRenewalOffer(selectedReminder.id, newRent, offerMessage);
      setShowOfferDialog(false);
      setSelectedReminder(null);
    } finally {
      setIsSending(false);
    }
  };

  // Group reminders by type
  const groupedReminders = {
    expired: reminders.filter(r => r.reminderType === 'expired'),
    urgent: reminders.filter(r => r.reminderType === '30-day'),
    soon: reminders.filter(r => r.reminderType === '60-day'),
    upcoming: reminders.filter(r => r.reminderType === '90-day')
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-red-800 font-medium">Expired</p>
                <p className="text-3xl font-bold text-red-900">{groupedReminders.expired.length}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-orange-800 font-medium">30 Days</p>
                <p className="text-3xl font-bold text-orange-900">{groupedReminders.urgent.length}</p>
              </div>
              <Clock className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-yellow-800 font-medium">60 Days</p>
                <p className="text-3xl font-bold text-yellow-900">{groupedReminders.soon.length}</p>
              </div>
              <Calendar className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-800 font-medium">90 Days</p>
                <p className="text-3xl font-bold text-blue-900">{groupedReminders.upcoming.length}</p>
              </div>
              <Calendar className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Reminders List */}
      <Card>
        <CardHeader>
          <CardTitle>Renewal Reminders</CardTitle>
          <CardDescription>
            Leases requiring renewal action
          </CardDescription>
        </CardHeader>
        <CardContent>
          {reminders.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <RefreshCw className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No renewal reminders at this time</p>
            </div>
          ) : (
            <ScrollArea className="h-[600px] pr-4">
              <div className="space-y-4">
                {reminders.map(reminder => (
                  <Card key={reminder.id} className={cn("border-2", getReminderColor(reminder.reminderType))}>
                    <CardContent className="pt-6">
                      <div className="space-y-4">
                        {/* Header */}
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            {getReminderIcon(reminder.reminderType)}
                            <div>
                              <h3 className="font-semibold text-lg">{reminder.propertyId}</h3>
                              <p className="text-sm text-gray-600">
                                {reminder.tenantIds.length} tenant(s)
                              </p>
                            </div>
                          </div>
                          {getStatusBadge(reminder.status)}
                        </div>

                        {/* Expiration Info */}
                        <div className="bg-white p-3 rounded-lg border">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm text-gray-600">Days Until Expiration</p>
                              <p className="text-2xl font-bold">
                                {reminder.daysUntilExpiration < 0 
                                  ? `${Math.abs(reminder.daysUntilExpiration)} days ago`
                                  : `${reminder.daysUntilExpiration} days`
                                }
                              </p>
                            </div>
                            <Badge className={getReminderColor(reminder.reminderType)}>
                              {reminder.reminderType.replace('-', ' ').toUpperCase()}
                            </Badge>
                          </div>
                        </div>

                        {/* Response Info */}
                        {reminder.response && (
                          <div className="bg-white p-3 rounded-lg border">
                            <div className="flex items-center gap-2 mb-2">
                              {reminder.response === 'accepted' && (
                                <CheckCircle className="h-4 w-4 text-green-600" />
                              )}
                              {reminder.response === 'declined' && (
                                <XCircle className="h-4 w-4 text-red-600" />
                              )}
                              {reminder.response === 'negotiating' && (
                                <MessageSquare className="h-4 w-4 text-blue-600" />
                              )}
                              <p className="text-sm font-medium capitalize">
                                {reminder.response}
                              </p>
                            </div>
                            {reminder.respondedAt && (
                              <p className="text-xs text-gray-600">
                                Responded on {format(new Date(reminder.respondedAt), 'MMM d, yyyy')}
                              </p>
                            )}
                          </div>
                        )}

                        {/* Actions */}
                        <div className="flex flex-wrap gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onViewLease(reminder.leaseId)}
                          >
                            View Lease
                          </Button>

                          {reminder.status === 'pending' && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleSendReminder(reminder.id)}
                                disabled={isSending}
                              >
                                <Mail className="h-4 w-4 mr-2" />
                                Send Reminder
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => handleCreateOffer(reminder)}
                                className="bg-blue-600 hover:bg-blue-700"
                              >
                                <RefreshCw className="h-4 w-4 mr-2" />
                                Create Renewal Offer
                              </Button>
                            </>
                          )}

                          {reminder.status === 'sent' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleSendReminder(reminder.id)}
                              disabled={isSending}
                            >
                              <Send className="h-4 w-4 mr-2" />
                              Send Follow-up
                            </Button>
                          )}
                        </div>

                        {/* Sent Info */}
                        {reminder.sentAt && (
                          <p className="text-xs text-gray-500">
                            Last reminder sent: {format(new Date(reminder.sentAt), 'MMM d, yyyy HH:mm')}
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Renewal Offer Dialog */}
      <Dialog open={showOfferDialog} onOpenChange={setShowOfferDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Renewal Offer</DialogTitle>
            <DialogDescription>
              Send a renewal offer to the tenant with updated terms
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {selectedReminder && (
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="pt-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Property</p>
                      <p className="font-medium">{selectedReminder.propertyId}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Tenants</p>
                      <p className="font-medium">{selectedReminder.tenantIds.length}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Days Until Expiration</p>
                      <p className="font-medium">{selectedReminder.daysUntilExpiration}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="space-y-2">
              <Label htmlFor="newRent">New Monthly Rent</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                <Input
                  id="newRent"
                  type="number"
                  value={newRent || ''}
                  onChange={(e) => setNewRent(parseFloat(e.target.value))}
                  placeholder="Enter new rent amount"
                  className="pl-9"
                />
              </div>
              <p className="text-xs text-gray-500">
                Consider market rates and tenant history when setting the new rent
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">Message to Tenant</Label>
              <Textarea
                id="message"
                value={offerMessage}
                onChange={(e) => setOfferMessage(e.target.value)}
                rows={8}
                placeholder="Enter your renewal offer message"
              />
            </div>

            {newRent > 0 && (
              <Card className="bg-green-50 border-green-200">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="h-5 w-5 text-green-600" />
                    <p className="font-semibold text-green-900">Renewal Summary</p>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">New Monthly Rent</span>
                      <span className="font-medium">${newRent.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Annual Revenue</span>
                      <span className="font-medium">${(newRent * 12).toLocaleString()}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => setShowOfferDialog(false)}
              disabled={isSending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmitOffer}
              disabled={isSending || !newRent || !offerMessage}
            >
              <Send className="h-4 w-4 mr-2" />
              {isSending ? 'Sending...' : 'Send Renewal Offer'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}