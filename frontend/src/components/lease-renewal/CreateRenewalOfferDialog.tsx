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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { leaseRenewalService } from '@/services/leaseRenewalService';
import { Loader2 } from 'lucide-react';

interface Lease {
  id: string;
  monthly_rent: number;
  end_date: string;
}

interface CreateRenewalOfferDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lease: Lease | null;
  onSuccess: () => void;
}

export default function CreateRenewalOfferDialog({
  open,
  onOpenChange,
  lease,
  onSuccess,
}: CreateRenewalOfferDialogProps) {
  const [proposedRent, setProposedRent] = useState('');
  const [termMonths, setTermMonths] = useState('12');
  const [marketRateAdjustment, setMarketRateAdjustment] = useState('0');
  const [specialTerms, setSpecialTerms] = useState('');
  const [loading, setLoading] = useState(false);

  const calculateStartDate = () => {
    if (!lease) return '';
    const endDate = new Date(lease.end_date);
    endDate.setDate(endDate.getDate() + 1);
    return endDate.toISOString().split('T')[0];
  };

  const handleSubmit = async () => {
    if (!lease || !proposedRent) return;

    setLoading(true);
    try {
      await leaseRenewalService.createRenewalOffer({
        lease_id: lease.id,
        proposed_rent: parseFloat(proposedRent),
        proposed_term_months: parseInt(termMonths),
        proposed_start_date: calculateStartDate(),
        market_rate_adjustment: parseFloat(marketRateAdjustment),
        special_terms: specialTerms || undefined,
      });

      onSuccess();
      onOpenChange(false);
      
      // Reset form
      setProposedRent('');
      setTermMonths('12');
      setMarketRateAdjustment('0');
      setSpecialTerms('');
    } catch (error) {
      console.error('Error creating renewal offer:', error);
      alert('Failed to create renewal offer. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!lease) return null;

  const suggestedRent = lease.monthly_rent * (1 + parseFloat(marketRateAdjustment) / 100);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create Lease Renewal Offer</DialogTitle>
          <DialogDescription>
            Set the terms for the lease renewal offer
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Current Rent</p>
              <p className="text-lg font-bold">${lease.monthly_rent.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Current End Date</p>
              <p className="text-sm">{new Date(lease.end_date).toLocaleDateString()}</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="marketRate">Market Rate Adjustment (%)</Label>
              <Input
                id="marketRate"
                type="number"
                step="0.1"
                value={marketRateAdjustment}
                onChange={(e) => setMarketRateAdjustment(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Suggested rent based on adjustment: ${suggestedRent.toFixed(2)}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="proposedRent">Proposed Monthly Rent *</Label>
              <Input
                id="proposedRent"
                type="number"
                step="0.01"
                placeholder="Enter proposed rent"
                value={proposedRent}
                onChange={(e) => setProposedRent(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="termMonths">Lease Term *</Label>
              <Select value={termMonths} onValueChange={setTermMonths}>
                <SelectTrigger id="termMonths">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="6">6 months</SelectItem>
                  <SelectItem value="12">12 months</SelectItem>
                  <SelectItem value="18">18 months</SelectItem>
                  <SelectItem value="24">24 months</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="startDate">Proposed Start Date</Label>
              <Input
                id="startDate"
                type="text"
                value={calculateStartDate()}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">
                Automatically set to one day after current lease end date
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="specialTerms">Special Terms (Optional)</Label>
              <Textarea
                id="specialTerms"
                placeholder="Enter any special terms or conditions for this renewal..."
                value={specialTerms}
                onChange={(e) => setSpecialTerms(e.target.value)}
                rows={4}
              />
            </div>
          </div>

          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              The tenant will have 14 days to respond to this offer. They can accept, decline, or submit a counter-offer.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading || !proposedRent}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              'Create Offer'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}