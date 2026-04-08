import { useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, AlertCircle, CheckCircle2, XCircle, ThumbsUp, ThumbsDown, MessageSquare } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useToast } from '@/hooks/use-toast';
import type { RenewalOfferWithRelations } from '@/types/renewal';

const declineSchema = z.object({
  decline_reason:  z.string().min(1, 'Please select a reason'),
  decline_comment: z.string().optional(),
});

const negotiateSchema = z.object({
  proposed_rent:        z.coerce.number().min(0, 'Rent must be positive'),
  proposed_term_months: z.coerce.number().min(1, 'Term must be at least 1 month'),
  additional_terms:     z.string().optional(),
});

type DeclineFormData   = z.infer<typeof declineSchema>;
type NegotiateFormData = z.infer<typeof negotiateSchema>;

// Fallback mock — used when page is accessed directly (e.g. page refresh)
// TODO: remove when GET /api/v1/renewals/:id is ready
const MOCK_FALLBACK: RenewalOfferWithRelations = {
  id: 'ro-001',
  lease_id: 'mock-lease-1',
  landlord_id: 'mock-landlord-1',
  tenant_id: 'mock-tenant-1',
  status: 'pending',
  original_rent: 1500,
  proposed_rent: 1575,
  final_rent: null,
  original_term_months: 12,
  proposed_term_months: 12,
  final_term_months: null,
  special_terms: 'No smoking policy continues. Pet deposit remains at current level.',
  offer_expiration_date: '2026-04-30',
  response_date: null,
  new_lease_start_date: '2026-01-01',
  new_lease_end_date: '2027-01-01',
  negotiation_rounds: 0,
  created_at: '2026-04-01',
  updated_at: '2026-04-01',
  lease: {
    id: 'mock-lease-1',
    monthly_rent: 1500,
    lease_term_months: 12,
    start_date: '2025-01-01',
    end_date: '2026-01-01',
    landlord_id: 'mock-landlord-1',
    tenant_id: 'mock-tenant-1',
    property_id: 'mock-prop-1',
    property: { id: 'mock-prop-1', address: '123 Demo Street', city: 'New York', state: 'NY', zip_code: '10001', property_type: 'Apartment' },
    landlord: { id: 'mock-landlord-1', first_name: 'John', last_name: 'Smith', email: 'landlord@demo.com', phone: '+1 (555) 100-2000' },
  },
};

const formatDate = (date: string) =>
  new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(date));

export default function TenantRenewalOfferView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  // Use offer passed via navigation state, fallback to mock if accessed directly
  // TODO: replace fallback with GET /api/v1/renewals/:id when backend is ready
  const [offer, setOffer] = useState<RenewalOfferWithRelations>(
    (location.state?.offer as RenewalOfferWithRelations) ?? MOCK_FALLBACK
  );

  const [showAcceptDialog,    setShowAcceptDialog]    = useState(false);
  const [showDeclineDialog,   setShowDeclineDialog]   = useState(false);
  const [showNegotiateDialog, setShowNegotiateDialog] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const declineForm = useForm<DeclineFormData>({
    resolver: zodResolver(declineSchema),
    defaultValues: { decline_reason: '', decline_comment: '' },
  });

  const negotiateForm = useForm<NegotiateFormData>({
    resolver: zodResolver(negotiateSchema),
    defaultValues: {
      proposed_rent:        offer.proposed_rent,
      proposed_term_months: offer.proposed_term_months,
      additional_terms:     '',
    },
  });

  // TODO: wire to POST /api/v1/renewals/:id/accept when backend is ready
  const handleAccept = async () => {
    setSubmitting(true);
    await new Promise(res => setTimeout(res, 500));
    setOffer(prev => ({ ...prev, status: 'accepted' }));
    setShowAcceptDialog(false);
    toast({ title: 'Offer accepted (mock)', description: 'A new lease will be sent for your signature.' });
    setSubmitting(false);
  };

  // TODO: wire to POST /api/v1/renewals/:id/decline when backend is ready
  const handleDecline = async (_data: DeclineFormData) => {
    setSubmitting(true);
    await new Promise(res => setTimeout(res, 500));
    setOffer(prev => ({ ...prev, status: 'declined' }));
    setShowDeclineDialog(false);
    toast({ title: 'Offer declined (mock)' });
    setSubmitting(false);
  };

  // TODO: wire to POST /api/v1/renewals/:id/negotiate when backend is ready
  const handleNegotiate = async (data: NegotiateFormData) => {
    setSubmitting(true);
    await new Promise(res => setTimeout(res, 500));
    setOffer(prev => ({ ...prev, status: 'negotiating', negotiation_rounds: prev.negotiation_rounds + 1 }));
    setShowNegotiateDialog(false);
    toast({ title: 'Counter-offer sent (mock)' });
    setSubmitting(false);
    navigate(`/tenant/renewals/${id}/negotiate`, { state: { offer } });
  };

  const canRespond = offer.status === 'pending' && new Date(offer.offer_expiration_date) > new Date();
  const isExpired  = new Date(offer.offer_expiration_date) < new Date();

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/tenant/renewals')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-foreground">Lease Renewal Offer</h1>
          <p className="text-muted-foreground">{offer.lease?.property?.address}</p>
        </div>
      </div>

      {isExpired && offer.status === 'pending' && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>This offer has expired</AlertDescription>
        </Alert>
      )}

      {offer.status === 'accepted' && (
        <Alert>
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription>
            You have accepted this renewal offer. The new lease document will be sent for your signature soon.
          </AlertDescription>
        </Alert>
      )}

      {offer.status === 'declined' && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertDescription>You have declined this renewal offer.</AlertDescription>
        </Alert>
      )}

      {offer.status === 'negotiating' && (
        <Alert>
          <MessageSquare className="h-4 w-4" />
          <AlertDescription>
            Negotiation in progress.{' '}
            <Button variant="link" className="p-0 h-auto" onClick={() => navigate(`/tenant/renewals/${id}/negotiate`, { state: { offer } })}>
              View negotiation thread
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">

          {/* Comparison */}
          <Card>
            <CardHeader>
              <CardTitle>Lease Comparison</CardTitle>
              <CardDescription>Current lease vs. renewal offer</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg text-foreground">Current Lease</h3>
                  <div>
                    <p className="text-sm text-muted-foreground">Monthly Rent</p>
                    <p className="text-2xl font-bold text-foreground">${offer.original_rent.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Lease Term</p>
                    <p className="font-medium text-foreground">{offer.original_term_months} months</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Rent</p>
                    <p className="font-medium text-foreground">${(offer.original_rent * offer.original_term_months).toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">End Date</p>
                    <p className="font-medium text-foreground">{formatDate(offer.lease?.end_date ?? '')}</p>
                  </div>
                </div>

                <div className="space-y-4 border-l pl-6">
                  <h3 className="font-semibold text-lg text-foreground">Renewal Offer</h3>
                  <div>
                    <p className="text-sm text-muted-foreground">Monthly Rent</p>
                    <p className="text-2xl font-bold text-foreground">${offer.proposed_rent.toFixed(2)}</p>
                    {offer.proposed_rent !== offer.original_rent && (
                      <p className={`text-sm ${offer.proposed_rent > offer.original_rent ? 'text-red-600' : 'text-green-600'}`}>
                        {offer.proposed_rent > offer.original_rent ? '+' : '-'}
                        ${Math.abs(offer.proposed_rent - offer.original_rent).toFixed(2)}{' '}
                        {offer.proposed_rent > offer.original_rent ? 'increase' : 'decrease'}
                      </p>
                    )}
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Lease Term</p>
                    <p className="font-medium text-foreground">{offer.proposed_term_months} months</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Rent</p>
                    <p className="font-medium text-foreground">${(offer.proposed_rent * offer.proposed_term_months).toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">New End Date</p>
                    <p className="font-medium text-foreground">{formatDate(offer.new_lease_end_date)}</p>
                  </div>
                </div>
              </div>

              {offer.special_terms && (
                <>
                  <Separator className="my-6" />
                  <div>
                    <h3 className="font-semibold text-foreground mb-2">Special Terms</h3>
                    <p className="text-sm text-muted-foreground">{offer.special_terms}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Actions */}
          {canRespond && (
            <Card>
              <CardHeader>
                <CardTitle>Respond to Offer</CardTitle>
                <CardDescription>Please respond by {formatDate(offer.offer_expiration_date)}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4 flex-wrap">
                  <Button onClick={() => setShowAcceptDialog(true)} className="flex-1">
                    <ThumbsUp className="h-4 w-4 mr-2" />Accept Offer
                  </Button>
                  <Button variant="outline" onClick={() => setShowNegotiateDialog(true)} className="flex-1">
                    <MessageSquare className="h-4 w-4 mr-2" />Negotiate
                  </Button>
                  <Button variant="destructive" onClick={() => setShowDeclineDialog(true)} className="flex-1">
                    <ThumbsDown className="h-4 w-4 mr-2" />Decline
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Property Details</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div>
                <p className="text-muted-foreground">Address</p>
                <p className="font-medium text-foreground">{offer.lease?.property?.address}</p>
              </div>
              <div>
                <p className="text-muted-foreground">City</p>
                <p className="font-medium text-foreground">{offer.lease?.property?.city}, {offer.lease?.property?.state}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Type</p>
                <p className="font-medium text-foreground">{offer.lease?.property?.property_type}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Landlord</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p className="font-medium text-foreground">{offer.lease?.landlord?.first_name} {offer.lease?.landlord?.last_name}</p>
              <p className="text-muted-foreground">{offer.lease?.landlord?.email}</p>
              <p className="text-muted-foreground">{offer.lease?.landlord?.phone}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Important Dates</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div>
                <p className="text-muted-foreground">Offer Sent</p>
                <p className="font-medium text-foreground">{formatDate(offer.created_at)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Response Deadline</p>
                <p className="font-medium text-foreground">{formatDate(offer.offer_expiration_date)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">New Lease Starts</p>
                <p className="font-medium text-foreground">{formatDate(offer.new_lease_start_date)}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Accept Dialog */}
      <Dialog open={showAcceptDialog} onOpenChange={setShowAcceptDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Accept Renewal Offer</DialogTitle>
            <DialogDescription>A new lease agreement will be generated for your signature.</DialogDescription>
          </DialogHeader>
          <div className="space-y-1 text-sm">
            <p><strong>New Rent:</strong> ${offer.proposed_rent.toFixed(2)}/month</p>
            <p><strong>Term:</strong> {offer.proposed_term_months} months</p>
            <p><strong>Start Date:</strong> {formatDate(offer.new_lease_start_date)}</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAcceptDialog(false)}>Cancel</Button>
            <Button onClick={handleAccept} disabled={submitting}>
              {submitting ? 'Processing…' : 'Confirm Accept'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Decline Dialog */}
      <Dialog open={showDeclineDialog} onOpenChange={setShowDeclineDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Decline Renewal Offer</DialogTitle>
            <DialogDescription>Please let us know why you're declining</DialogDescription>
          </DialogHeader>
          <Form {...declineForm}>
            <form onSubmit={declineForm.handleSubmit(handleDecline)} className="space-y-4">
              <FormField control={declineForm.control} name="decline_reason" render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select a reason" /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="moving_out">Moving out</SelectItem>
                      <SelectItem value="too_expensive">Rent is too expensive</SelectItem>
                      <SelectItem value="found_better">Found a better place</SelectItem>
                      <SelectItem value="buying_home">Buying a home</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={declineForm.control} name="decline_comment" render={({ field }) => (
                <FormItem>
                  <FormLabel>Additional Comments (Optional)</FormLabel>
                  <FormControl><Textarea placeholder="Any additional feedback..." {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowDeclineDialog(false)}>Cancel</Button>
                <Button type="submit" variant="destructive" disabled={submitting}>
                  {submitting ? 'Processing…' : 'Confirm Decline'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Negotiate Dialog */}
      <Dialog open={showNegotiateDialog} onOpenChange={setShowNegotiateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Make Counter-Offer</DialogTitle>
            <DialogDescription>Propose different terms to your landlord</DialogDescription>
          </DialogHeader>
          <Form {...negotiateForm}>
            <form onSubmit={negotiateForm.handleSubmit(handleNegotiate)} className="space-y-4">
              <FormField control={negotiateForm.control} name="proposed_rent" render={({ field }) => (
                <FormItem>
                  <FormLabel>Your Proposed Rent</FormLabel>
                  <FormControl><Input type="number" step="0.01" placeholder="0.00" {...field} /></FormControl>
                  <FormDescription>Current offer: ${offer.proposed_rent.toFixed(2)}/month</FormDescription>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={negotiateForm.control} name="proposed_term_months" render={({ field }) => (
                <FormItem>
                  <FormLabel>Your Proposed Term (months)</FormLabel>
                  <FormControl><Input type="number" placeholder="12" {...field} /></FormControl>
                  <FormDescription>Current offer: {offer.proposed_term_months} months</FormDescription>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={negotiateForm.control} name="additional_terms" render={({ field }) => (
                <FormItem>
                  <FormLabel>Additional Terms (Optional)</FormLabel>
                  <FormControl><Textarea placeholder="Any requests or conditions..." {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowNegotiateDialog(false)}>Cancel</Button>
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
