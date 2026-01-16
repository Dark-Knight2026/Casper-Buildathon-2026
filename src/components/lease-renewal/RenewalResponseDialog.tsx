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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { leaseRenewalService, LeaseRenewal } from '@/services/leaseRenewalService';
import { Loader2 } from 'lucide-react';

interface RenewalResponseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  renewal: LeaseRenewal | null;
  onSuccess: () => void;
}

export default function RenewalResponseDialog({
  open,
  onOpenChange,
  renewal,
  onSuccess,
}: RenewalResponseDialogProps) {
  const [response, setResponse] = useState<'accept' | 'decline' | 'counter'>('accept');
  const [counterOfferRent, setCounterOfferRent] = useState('');
  const [counterOfferTerms, setCounterOfferTerms] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!renewal) return;

    setLoading(true);
    try {
      const counterOfferData =
        response === 'counter'
          ? {
              rent: counterOfferRent ? parseFloat(counterOfferRent) : undefined,
              terms: counterOfferTerms || undefined,
            }
          : undefined;

      await leaseRenewalService.respondToRenewal(renewal.id, response, counterOfferData);
      onSuccess();
      onOpenChange(false);
      
      // Reset form
      setResponse('accept');
      setCounterOfferRent('');
      setCounterOfferTerms('');
    } catch (error) {
      console.error('Error responding to renewal:', error);
      alert('Failed to submit response. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!renewal) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Respond to Lease Renewal Offer</DialogTitle>
          <DialogDescription>
            Review the offer details and choose your response
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Current Rent</p>
              <p className="text-lg font-bold">${renewal.original_rent.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Proposed Rent</p>
              <p className="text-lg font-bold">${renewal.proposed_rent.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Lease Term</p>
              <p className="text-sm">{renewal.proposed_term_months} months</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Start Date</p>
              <p className="text-sm">{new Date(renewal.proposed_start_date).toLocaleDateString()}</p>
            </div>
          </div>

          <div className="space-y-4">
            <Label>Your Response</Label>
            <RadioGroup value={response} onValueChange={(value) => setResponse(value as 'accept' | 'decline' | 'counter')}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="accept" id="accept" />
                <Label htmlFor="accept" className="font-normal cursor-pointer">
                  Accept the offer as presented
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="counter" id="counter" />
                <Label htmlFor="counter" className="font-normal cursor-pointer">
                  Submit a counter-offer
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="decline" id="decline" />
                <Label htmlFor="decline" className="font-normal cursor-pointer">
                  Decline the offer
                </Label>
              </div>
            </RadioGroup>
          </div>

          {response === 'counter' && (
            <div className="space-y-4 p-4 border rounded-lg">
              <div className="space-y-2">
                <Label htmlFor="counterRent">Counter-Offer Rent (Optional)</Label>
                <Input
                  id="counterRent"
                  type="number"
                  placeholder="Enter your proposed rent"
                  value={counterOfferRent}
                  onChange={(e) => setCounterOfferRent(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="counterTerms">Counter-Offer Terms (Optional)</Label>
                <Textarea
                  id="counterTerms"
                  placeholder="Explain your counter-offer or any additional terms you'd like to propose..."
                  value={counterOfferTerms}
                  onChange={(e) => setCounterOfferTerms(e.target.value)}
                  rows={4}
                />
              </div>
            </div>
          )}

          {response === 'accept' && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-800">
                By accepting this offer, you agree to the proposed terms. A new lease agreement will be generated for your signature.
              </p>
            </div>
          )}

          {response === 'decline' && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">
                By declining this offer, you indicate that you will not be renewing your lease. Your landlord will be notified.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              'Submit Response'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}