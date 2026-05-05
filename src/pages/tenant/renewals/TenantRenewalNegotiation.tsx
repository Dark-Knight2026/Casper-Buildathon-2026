import { useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, MessageSquare, TrendingUp, CheckCircle2, Clock } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useToast } from '@/hooks/use-toast';
import type { RenewalOfferWithRelations, CounterOfferType } from '@/types/renewal';

const counterOfferSchema = z.object({
  proposed_rent:        z.coerce.number().min(0, 'Rent must be positive'),
  proposed_term_months: z.coerce.number().min(1, 'Term must be at least 1 month'),
  additional_terms:     z.string().optional(),
});

type CounterOfferFormData = z.infer<typeof counterOfferSchema>;

// Fallback mock with negotiation history
// TODO: remove when GET /api/v1/renewals/:id is ready
const MOCK_COUNTER_OFFERS: CounterOfferType[] = [
  {
    id: 'co-001',
    renewal_id: 'ro-002',
    offered_by: 'landlord',
    proposed_rent: 1600,
    proposed_term_months: 12,
    additional_terms: 'Includes parking spot.',
    status: 'pending',
    created_at: '2026-03-20',
  },
  {
    id: 'co-002',
    renewal_id: 'ro-002',
    offered_by: 'tenant',
    proposed_rent: 1540,
    proposed_term_months: 12,
    additional_terms: 'Would prefer 12-month term at $1,540.',
    status: 'pending',
    created_at: '2026-03-22',
  },
];

const formatDate = (date: string) =>
  new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'short', day: 'numeric' }).format(new Date(date));

export default function TenantRenewalNegotiation() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  const offer = location.state?.offer as RenewalOfferWithRelations | undefined;
  const [counterOffers, setCounterOffers] = useState<CounterOfferType[]>(
    offer?.counter_offers ?? MOCK_COUNTER_OFFERS
  );
  const [showCounterOfferDialog, setShowCounterOfferDialog] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<CounterOfferFormData>({
    resolver: zodResolver(counterOfferSchema),
    defaultValues: {
      proposed_rent:        offer?.proposed_rent ?? 1500,
      proposed_term_months: offer?.proposed_term_months ?? 12,
      additional_terms:     '',
    },
  });

  // TODO: wire to POST /api/v1/renewals/:id/counter-offer when backend is ready
  const handleSubmitCounterOffer = async (data: CounterOfferFormData) => {
    setSubmitting(true);
    await new Promise(res => setTimeout(res, 500));

    const newOffer: CounterOfferType = {
      id: `co-${Date.now()}`,
      renewal_id: id!,
      offered_by: 'tenant',
      proposed_rent: data.proposed_rent,
      proposed_term_months: data.proposed_term_months,
      additional_terms: data.additional_terms ?? null,
      status: 'pending',
      created_at: new Date().toISOString(),
    };

    setCounterOffers(prev => [...prev, newOffer]);
    setShowCounterOfferDialog(false);
    form.reset();
    toast({ title: 'Counter-offer sent (mock)' });
    setSubmitting(false);
  };

  // TODO: wire to POST /api/v1/renewals/counter-offers/:id/accept when backend is ready
  const handleAcceptCounterOffer = async (counterOfferId: string) => {
    setSubmitting(true);
    await new Promise(res => setTimeout(res, 500));
    setCounterOffers(prev =>
      prev.map(co => co.id === counterOfferId ? { ...co, status: 'accepted' } : co)
    );
    toast({ title: 'Counter-offer accepted (mock)' });
    setSubmitting(false);
    navigate(`/tenant/renewals/${id}`, { state: { offer } });
  };

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(`/tenant/renewals/${id}`, { state: { offer } })}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-foreground">Renewal Negotiation</h1>
          <p className="text-muted-foreground">Review offers and make counter-offers</p>
        </div>
      </div>

      {/* Offer Summary */}
      {offer && (
        <Card>
          <CardHeader>
            <CardTitle>Offer Summary</CardTitle>
            <CardDescription>{offer.lease?.property?.address}</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Original Rent</p>
              <p className="font-semibold text-foreground">${offer.original_rent.toFixed(2)}/mo</p>
            </div>
            <div>
              <p className="text-muted-foreground">Proposed Rent</p>
              <p className="font-semibold text-foreground">${offer.proposed_rent.toFixed(2)}/mo</p>
            </div>
            <div>
              <p className="text-muted-foreground">Term</p>
              <p className="font-semibold text-foreground">{offer.proposed_term_months} months</p>
            </div>
            <div>
              <p className="text-muted-foreground">Rounds</p>
              <p className="font-semibold text-foreground">{offer.negotiation_rounds}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Negotiation Thread */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            Negotiation Thread
          </CardTitle>
          <CardDescription>{counterOffers.length} offer{counterOffers.length !== 1 ? 's' : ''} exchanged</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {counterOffers.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No counter-offers yet</p>
          ) : (
            counterOffers.map(co => {
              const isTenant = co.offered_by === 'tenant';
              return (
                <div key={co.id} className={`flex ${isTenant ? 'justify-end' : 'justify-start'}`}>
                  <div className={`w-full rounded-lg border p-4 space-y-2 ${isTenant ? 'bg-primary/5 border-primary/20' : 'bg-muted/40'}`}>
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="text-sm font-medium text-foreground capitalize">{co.offered_by}</span>
                      </div>
                      <Badge className={
                        co.status === 'accepted' ? 'bg-green-100 text-green-800' :
                        co.status === 'rejected' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }>
                        {co.status === 'accepted'
                          ? <><CheckCircle2 className="h-3 w-3 mr-1 inline" />Accepted</>
                          : co.status === 'rejected' ? 'Rejected' : <><Clock className="h-3 w-3 mr-1 inline" />Pending</>
                        }
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <p className="text-muted-foreground text-xs">Proposed Rent</p>
                        <p className="font-semibold text-foreground">${co.proposed_rent.toFixed(2)}/mo</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Term</p>
                        <p className="font-semibold text-foreground">{co.proposed_term_months} months</p>
                      </div>
                    </div>
                    {co.additional_terms && (
                      <p className="text-xs text-muted-foreground">{co.additional_terms}</p>
                    )}
                    <p className="text-xs text-muted-foreground">{formatDate(co.created_at)}</p>

                    {/* Accept button for landlord's pending offers */}
                    {co.offered_by === 'landlord' && co.status === 'pending' && (
                      <Button size="sm" className="w-full mt-2" onClick={() => handleAcceptCounterOffer(co.id)} disabled={submitting}>
                        <CheckCircle2 className="h-4 w-4 mr-2" />Accept This Offer
                      </Button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      {/* Make Counter-Offer */}
      <div className="flex justify-end">
        <Button onClick={() => setShowCounterOfferDialog(true)}>
          <TrendingUp className="h-4 w-4 mr-2" />
          Make Counter-Offer
        </Button>
      </div>

      {/* Counter-Offer Dialog */}
      <Dialog open={showCounterOfferDialog} onOpenChange={setShowCounterOfferDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Make Counter-Offer</DialogTitle>
            <DialogDescription>Propose different terms to your landlord</DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmitCounterOffer)} className="space-y-4">
              <FormField control={form.control} name="proposed_rent" render={({ field }) => (
                <FormItem>
                  <FormLabel>Your Proposed Rent</FormLabel>
                  <FormControl><Input type="number" step="0.01" placeholder="0.00" {...field} /></FormControl>
                  <FormDescription>Monthly rent amount</FormDescription>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="proposed_term_months" render={({ field }) => (
                <FormItem>
                  <FormLabel>Your Proposed Term (months)</FormLabel>
                  <FormControl><Input type="number" placeholder="12" {...field} /></FormControl>
                  <FormDescription>Lease duration in months</FormDescription>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="additional_terms" render={({ field }) => (
                <FormItem>
                  <FormLabel>Additional Terms (Optional)</FormLabel>
                  <FormControl><Textarea placeholder="Any requests or conditions..." {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowCounterOfferDialog(false)}>Cancel</Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? 'Sending…' : 'Send Counter-Offer'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
