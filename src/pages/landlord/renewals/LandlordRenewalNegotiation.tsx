import { RenewalOfferWithRelations } from '@/types/renewal';
import { RenewalOfferWithRelations } from '@/types/renewal';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import { renewalService } from '@/services/renewalService';
import RenewalNegotiationThread from '@/components/renewals/RenewalNegotiationThread';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

const counterOfferSchema = z.object({
  proposed_rent: z.coerce.number().min(0, 'Rent must be positive'),
  proposed_term_months: z.coerce.number().min(1, 'Term must be at least 1 month'),
  additional_terms: z.string().optional(),
});

type CounterOfferFormData = z.infer<typeof counterOfferSchema>;

export default function LandlordRenewalNegotiation() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [showCounterOfferDialog, setShowCounterOfferDialog] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const form = useForm<CounterOfferFormData>({
    resolver: zodResolver(counterOfferSchema),
    defaultValues: {
      proposed_rent: 0,
      proposed_term_months: 12,
      additional_terms: '',
    },
  });

  const handleAcceptCounterOffer = async (counterOfferId: string) => {
    try {
      setSubmitting(true);
      await renewalService.acceptCounterOffer(id!, counterOfferId);
      setError(null);
      setRefreshKey(prev => prev + 1);
      navigate(`/landlord/renewals/${id}`);
    } catch (err) {
      const error = err as Error; setError(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitCounterOffer = async (data: CounterOfferFormData) => {
    try {
      setSubmitting(true);
      await renewalService.createCounterOffer(id!, data);
      setShowCounterOfferDialog(false);
      setError(null);
      setRefreshKey(prev => prev + 1);
      form.reset();
    } catch (err) {
      const error = err as Error; setError(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(`/landlord/renewals/${id}`)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Renewal Negotiation</h1>
          <p className="text-muted-foreground">Review counter-offers and respond</p>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <RenewalNegotiationThread
        key={refreshKey}
        renewalId={id!}
        userType="landlord"
        onAcceptCounterOffer={handleAcceptCounterOffer}
        onMakeCounterOffer={() => setShowCounterOfferDialog(true)}
      />

      {/* Counter-Offer Dialog */}
      <Dialog open={showCounterOfferDialog} onOpenChange={setShowCounterOfferDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Make Counter-Offer</DialogTitle>
            <DialogDescription>
              Propose different terms to the tenant
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmitCounterOffer)} className="space-y-4">
              <FormField
                control={form.control}
                name="proposed_rent"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Proposed Rent</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="0.00" {...field} />
                    </FormControl>
                    <FormDescription>Monthly rent amount</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="proposed_term_months"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Proposed Term (months)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="12" {...field} />
                    </FormControl>
                    <FormDescription>Lease duration in months</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="additional_terms"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Additional Terms (Optional)</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Any additional conditions..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowCounterOfferDialog(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? 'Sending...' : 'Send Counter-Offer'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}