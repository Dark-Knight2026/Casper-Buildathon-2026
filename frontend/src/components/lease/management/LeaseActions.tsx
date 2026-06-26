/**
 * Lease Actions Component
 * Quick action menu for lease operations
 */

import { useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  MoreVertical,
  Eye,
  Edit,
  RefreshCw,
  XCircle,
  Download,
  Send,
  FileText,
  Copy,
  Archive,
  CalendarIcon
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface LeaseActionsProps {
  leaseId: string;
  leaseStatus: string;
  onView: () => void;
  onEdit: () => void;
  onRenew: () => void;
  onTerminate: (date: Date, reason: string) => Promise<void>;
  onDownload: () => void;
  onSendForSignature: () => void;
  onDuplicate: () => void;
  onArchive: () => void;
}

export default function LeaseActions({
  leaseId,
  leaseStatus,
  onView,
  onEdit,
  onRenew,
  onTerminate,
  onDownload,
  onSendForSignature,
  onDuplicate,
  onArchive
}: LeaseActionsProps) {
  const [showTerminateDialog, setShowTerminateDialog] = useState(false);
  const [terminationDate, setTerminationDate] = useState<Date>(new Date());
  const [terminationReason, setTerminationReason] = useState('');
  const [isTerminating, setIsTerminating] = useState(false);

  const handleTerminate = async () => {
    if (!terminationReason.trim()) return;

    setIsTerminating(true);
    try {
      await onTerminate(terminationDate, terminationReason);
      setShowTerminateDialog(false);
      setTerminationReason('');
    } finally {
      setIsTerminating(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem onClick={onView}>
            <Eye className="h-4 w-4 mr-2" />
            View Details
          </DropdownMenuItem>
          
          <DropdownMenuItem onClick={onEdit}>
            <Edit className="h-4 w-4 mr-2" />
            Edit Lease
          </DropdownMenuItem>

          <DropdownMenuItem onClick={onRenew}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Renew Lease
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem onClick={onDownload}>
            <Download className="h-4 w-4 mr-2" />
            Download PDF
          </DropdownMenuItem>

          {leaseStatus === 'draft' && (
            <DropdownMenuItem onClick={onSendForSignature}>
              <Send className="h-4 w-4 mr-2" />
              Send for Signature
            </DropdownMenuItem>
          )}

          <DropdownMenuItem onClick={onDuplicate}>
            <Copy className="h-4 w-4 mr-2" />
            Duplicate Lease
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem onClick={onArchive}>
            <Archive className="h-4 w-4 mr-2" />
            Archive
          </DropdownMenuItem>

          <DropdownMenuItem 
            onClick={() => setShowTerminateDialog(true)}
            className="text-red-600 focus:text-red-600"
          >
            <XCircle className="h-4 w-4 mr-2" />
            Terminate Lease
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Terminate Dialog */}
      <Dialog open={showTerminateDialog} onOpenChange={setShowTerminateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Terminate Lease</DialogTitle>
            <DialogDescription>
              This action will terminate the lease agreement. Please provide termination details.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Termination Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !terminationDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {terminationDate ? format(terminationDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={terminationDate}
                    onSelect={(date) => setTerminationDate(date || new Date())}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reason">Reason for Termination</Label>
              <Textarea
                id="reason"
                value={terminationReason}
                onChange={(e) => setTerminationReason(e.target.value)}
                placeholder="Enter the reason for terminating this lease..."
                rows={4}
              />
            </div>

            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex gap-2">
                <XCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-red-900">
                  <p className="font-medium mb-1">Warning</p>
                  <p>
                    Terminating this lease will end the agreement on the specified date. 
                    This action cannot be undone. Make sure all parties are notified.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => setShowTerminateDialog(false)}
              disabled={isTerminating}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleTerminate}
              disabled={isTerminating || !terminationReason.trim()}
            >
              <XCircle className="h-4 w-4 mr-2" />
              {isTerminating ? 'Terminating...' : 'Terminate Lease'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}