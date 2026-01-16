import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Calendar, DollarSign } from 'lucide-react';
import type { PipelineStage } from '@/types/transaction';

interface StageChangeConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentStage: PipelineStage;
  newStage: PipelineStage;
  propertyAddress: string;
  onConfirm: (data: {
    estimated_close_date?: string;
    stalled_reason?: string;
    notes?: string;
  }) => void;
}

const STAGE_LABELS: Record<PipelineStage, string> = {
  lead: 'Lead',
  showing: 'Showing',
  offer: 'Offer',
  under_contract: 'Under Contract',
  closing: 'Closing',
  closed: 'Closed',
  lost: 'Lost'
};

const STAGE_COLORS: Record<PipelineStage, string> = {
  lead: 'bg-gray-100 text-gray-800',
  showing: 'bg-blue-100 text-blue-800',
  offer: 'bg-yellow-100 text-yellow-800',
  under_contract: 'bg-orange-100 text-orange-800',
  closing: 'bg-purple-100 text-purple-800',
  closed: 'bg-green-100 text-green-800',
  lost: 'bg-red-100 text-red-800'
};

export default function StageChangeConfirmDialog({
  open,
  onOpenChange,
  currentStage,
  newStage,
  propertyAddress,
  onConfirm
}: StageChangeConfirmDialogProps) {
  const [estimatedCloseDate, setEstimatedCloseDate] = useState('');
  const [stalledReason, setStalledReason] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const requiresCloseDate = ['under_contract', 'closing'].includes(newStage);
  const requiresStalledReason = newStage === 'lost';
  const isProgression = getStageOrder(newStage) > getStageOrder(currentStage);

  function getStageOrder(stage: PipelineStage): number {
    const order: Record<PipelineStage, number> = {
      lead: 1,
      showing: 2,
      offer: 3,
      under_contract: 4,
      closing: 5,
      closed: 6,
      lost: 0
    };
    return order[stage] || 0;
  }

  const handleConfirm = async () => {
    if (requiresCloseDate && !estimatedCloseDate) {
      alert('Please provide an estimated close date');
      return;
    }

    if (requiresStalledReason && !stalledReason.trim()) {
      alert('Please provide a reason for marking this deal as lost');
      return;
    }

    setLoading(true);
    try {
      await onConfirm({
        estimated_close_date: estimatedCloseDate || undefined,
        stalled_reason: stalledReason || undefined,
        notes: notes || undefined
      });
      
      // Reset form
      setEstimatedCloseDate('');
      setStalledReason('');
      setNotes('');
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to update stage:', error);
      alert('Failed to update transaction stage. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Confirm Stage Change</DialogTitle>
          <DialogDescription>
            Update the pipeline stage for this transaction
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Property Info */}
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-sm font-medium text-gray-900">{propertyAddress}</p>
          </div>

          {/* Stage Change Visualization */}
          <div className="flex items-center justify-center space-x-3">
            <Badge className={STAGE_COLORS[currentStage]}>
              {STAGE_LABELS[currentStage]}
            </Badge>
            <span className="text-gray-400">→</span>
            <Badge className={STAGE_COLORS[newStage]}>
              {STAGE_LABELS[newStage]}
            </Badge>
          </div>

          {/* Warning for regression */}
          {!isProgression && newStage !== 'lost' && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-start space-x-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-yellow-900">
                  Moving Backwards
                </p>
                <p className="text-xs text-yellow-700 mt-1">
                  This transaction is moving to an earlier stage. Please provide notes explaining why.
                </p>
              </div>
            </div>
          )}

          {/* Estimated Close Date (required for under_contract and closing) */}
          {requiresCloseDate && (
            <div className="space-y-2">
              <Label htmlFor="close-date" className="flex items-center">
                <Calendar className="h-4 w-4 mr-2" />
                Estimated Close Date *
              </Label>
              <Input
                id="close-date"
                type="date"
                value={estimatedCloseDate}
                onChange={(e) => setEstimatedCloseDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                required
              />
            </div>
          )}

          {/* Stalled Reason (required for lost) */}
          {requiresStalledReason && (
            <div className="space-y-2">
              <Label htmlFor="stalled-reason" className="flex items-center">
                <AlertTriangle className="h-4 w-4 mr-2" />
                Reason for Lost Deal *
              </Label>
              <Textarea
                id="stalled-reason"
                value={stalledReason}
                onChange={(e) => setStalledReason(e.target.value)}
                placeholder="e.g., Client chose another property, Financing fell through, Price too high..."
                rows={3}
                required
              />
            </div>
          )}

          {/* Optional Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Additional Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any additional context about this stage change..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={loading}
          >
            {loading ? 'Updating...' : 'Confirm Change'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}