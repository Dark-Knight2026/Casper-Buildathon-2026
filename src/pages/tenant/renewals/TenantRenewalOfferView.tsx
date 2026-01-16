import { RenewalOfferWithRelations } from '@/types/renewal';
import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, AlertCircle, CheckCircle2, XCircle, ThumbsUp, ThumbsDown, MessageSquare } from 'lucide-react';
import { renewalService } from '@/services/renewalService';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

const declineSchema = z.object({
  decline_reason: z.string().min(1, 'Please select a reason'),
  decline_comment: z.string().optional(),
});

const negotiateSchema = z.object({
  proposed_rent: z.coerce.number().min(0, 'Rent must be positive'),
  proposed_term_months: z.coerce.number().min(1, 'Term must be at least 1 month'),
  additional_terms: z.string().optional(),
});

type DeclineFormData = z.infer<typeof declineSchema>;
type NegotiateFormData = z.infer<typeof negotiateSchema>;

export default function TenantRenewalOfferView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [offer, setOffer] = useState<RenewalOfferWithRelations | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAcceptDialog, setShowAcceptDialog] = useState(false);
  const [showDeclineDialog, setShowDeclineDialog] = useState(false);
  const [showNegotiateDialog, setShowNegotiateDialog] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const declineForm = useForm<DeclineFormData>({
    resolver: zodResolver(declineSchema),
    defaultValues: {
      decline_reason: '',
      decline_comment: '',
    },
  });

  const negotiateForm = useForm<NegotiateFormData>({
    resolver: zodResolver(negotiateSchema),
    defaultValues: {
      proposed_rent: 0,
      proposed_term_months: 12,
      additional_terms: '',
    },
  });

  const loadOffer = useCallback(async () => {
    try {
      setLoading(true);
      const data = await renewalService.getRenewalOfferById(id!);
      setOffer(data);
      
      // Set negotiate form defaults
      negotiateForm.setValue('proposed_rent', data.proposed_rent);
      negotiateForm.setValue('proposed_term_months', data.proposed_term_months);
    } catch (err) {
      const error = err as Error; setError(error.message);
    } finally {
      setLoading(false);
    }
  }, [id, negotiateForm]);

  useEffect(() => {
    if (id) {
      loadOffer();
    }
  }, [id, loadOffer]);

  const handleAccept = async () => {
    try {
      setSubmitting(true);
      await renewalService.respondToOffer(id!, { response: 'accept' });
      setShowAcceptDialog(false);
      await loadOffer();
      setError(null);
    } catch (err) {
      const error = err as Error; setError(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDecline = async (data: DeclineFormData) => {
    try {
      setSubmitting(true);
      await renewalService.respondToOffer(id!, {
        response: 'decline',
        decline_reason: data.decline_reason,
        decline_comment: data.decline_comment,
      });
      setShowDeclineDialog(false);
      await loadOffer();
      setError(null);
    } catch (err) {
      const error = err as Error; setError(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleNegotiate = async (data: NegotiateFormData) => {
    try {
      setSubmitting(true);
      await renewalService.respondToOffer(id!, {
        response: 'negotiate',
        counter_offer: {
          proposed_rent: data.proposed_rent,
          proposed_term_months: data.proposed_term_months,
          additional_terms: data.additional_terms,
        },
      });
      setShowNegotiateDialog(false);
      navigate(`/tenant/renewals/${id}/negotiate`);
    } catch (err) {
      const error = err as Error; setError(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading renewal offer...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!offer) {
    return (
      <div className="container mx-auto py-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Renewal offer not found</AlertDescription>
        </Alert>
      </div>
    );
  }

  const canRespond = offer.status === 'pending' && new Date(offer.offer_expiration_date) > new Date();
  const isExpired = new Date(offer.offer_expiration_date) < new Date();

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/tenant/renewals')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">Lease Renewal Offer</h1>
          <p className="text-muted-foreground">{offer.lease?.property?.address}</p>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

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
            You have accepted this renewal offer. The new lease document will be sent to you for signature soon.
          </AlertDescription>
        </Alert>
      )}

      {offer.status === 'declined' && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertDescription>You have declined this renewal offer</AlertDescription>
        </Alert>
      )}

      {offer.status === 'negotiating' && (
        <Alert>
          <MessageSquare className="h-4 w-4" />
          <AlertDescription>
            Negotiation in progress. <Button variant="link" className="p-0 h-auto" onClick={() => navigate(`/tenant/renewals/${id}/negotiate`)}>View negotiation thread</Button>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Comparison Card */}
          <Card>
            <CardHeader>
              <CardTitle>Lease Comparison</CardTitle>
              <CardDescription>Current lease vs. renewal offer</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-6">
                {/* Current Lease */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">Current Lease</h3>
                  <div>
                    <p className="text-sm text-muted-foreground">Monthly Rent</p>
                    <p className="text-2xl font-bold">${offer.original_rent.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Lease Term</p>
                    <p className="font-medium">{offer.original_term_months} months</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Rent</p>
                    <p className="font-medium">${(offer.original_rent * offer.original_term_months).toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">End Date</p>
                    <p className="font-medium">{new Date(offer.lease?.end_date).toLocaleDateString()}</p>
                  </div>
                </div>

                {/* New Offer */}
                <div className="space-y-4 border-l pl-6">
                  <h3 className="font-semibold text-lg">Renewal Offer</h3>
                  <div>
                    <p className="text-sm text-muted-foreground">Monthly Rent</p>
                    <p className="text-2xl font-bold">${offer.proposed_rent.toFixed(2)}</p>
                    {offer.proposed_rent !== offer.original_rent && (
                      <p className="text-sm">
                        {offer.proposed_rent > offer.original_rent ? (
                          <span className="text-red-600">
                            +${(offer.proposed_rent - offer.original_rent).toFixed(2)} increase
                          </span>
                        ) : (
                          <span className="text-green-600">
                            -${(offer.original_rent - offer.proposed_rent).toFixed(2)} decrease
                          </span>
                        )}
                      </p>
                    )}
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Lease Term</p>
                    <p className="font-medium">{offer.proposed_term_months} months</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Rent</p>
                    <p className="font-medium">${(offer.proposed_rent * offer.proposed_term_months).toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">New End Date</p>
                    <p className="font-medium">{new Date(offer.new_lease_end_date).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>

              {offer.special_terms && (
                <>
                  <Separator className="my-6" />
                  <div>
                    <h3 className="font-semibold mb-2">Special Terms</h3>
                    <p className="text-sm">{offer.special_terms}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Action Buttons */}
          {canRespond && (
            <Card>
              <CardHeader>
                <CardTitle>Respond to Offer</CardTitle>
                <CardDescription>
                  Please respond by {new Date(offer.offer_expiration_date).toLocaleDateString()}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4">
                  <Button onClick={() => setShowAcceptDialog(true)} className="flex-1">
                    <ThumbsUp className="h-4 w-4 mr-2" />
                    Accept Offer
                  </Button>
                  <Button variant="outline" onClick={() => setShowNegotiateDialog(true)} className="flex-1">
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Negotiate
                  </Button>
                  <Button variant="destructive" onClick={() => setShowDeclineDialog(true)} className="flex-1">
                    <ThumbsDown className="h-4 w-4 mr-2" />
                    Decline
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Property Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div>
                <p className="text-sm text-muted-foreground">Address</p>
                <p className="font-medium">{offer.lease?.property?.address}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">City</p>
                <p className="font-medium">{offer.lease?.property?.city}, {offer.lease?.property?.state}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Type</p>
                <p className="font-medium">{offer.lease?.property?.property_type}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Landlord</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div>
                <p className="text-sm text-muted-foreground">Name</p>
                <p className="font-medium">{offer.lease?.landlord?.first_name} {offer.lease?.landlord?.last_name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium text-sm">{offer.lease?.landlord?.email}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Phone</p>
                <p className="font-medium">{offer.lease?.landlord?.phone}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Important Dates</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div>
                <p className="text-sm text-muted-foreground">Offer Sent</p>
                <p className="font-medium">{new Date(offer.created_at).toLocaleDateString()}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Response Deadline</p>
                <p className="font-medium">{new Date(offer.offer_expiration_date).toLocaleDateString()}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">New Lease Starts</p>
                <p className="font-medium">{new Date(offer.new_lease_start_date).toLocaleDateString()}</p>
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
            <DialogDescription>
              Are you sure you want to accept this renewal offer? A new lease agreement will be generated for your signature.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <p className="text-sm"><strong>New Rent:</strong> ${offer.proposed_rent.toFixed(2)}/month</p>
            <p className="text-sm"><strong>Term:</strong> {offer.proposed_term_months} months</p>
            <p className="text-sm"><strong>Start Date:</strong> {new Date(offer.new_lease_start_date).toLocaleDateString()}</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAcceptDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAccept} disabled={submitting}>
              {submitting ? 'Processing...' : 'Confirm Accept'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Decline Dialog */}
      <Dialog open={showDeclineDialog} onOpenChange={setShowDeclineDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Decline Renewal Offer</DialogTitle>
            <DialogDescription>
              Please let us know why you're declining this offer
            </DialogDescription>
          </DialogHeader>
          <Form {...declineForm}>
            <form onSubmit={declineForm.handleSubmit(handleDecline)} className="space-y-4">
              <FormField
                control={declineForm.control}
                name="decline_reason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reason</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a reason" />
                        </SelectTrigger>
                      </FormControl>
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
                )}
              />
              <FormField
                control={declineForm.control}
                name="decline_comment"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Additional Comments (Optional)</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Any additional feedback..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowDeclineDialog(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="destructive" disabled={submitting}>
                  {submitting ? 'Processing...' : 'Confirm Decline'}
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
            <DialogDescription>
              Propose different terms to your landlord
            </DialogDescription>
          </DialogHeader>
          <Form {...negotiateForm}>
            <form onSubmit={negotiateForm.handleSubmit(handleNegotiate)} className="space-y-4">
              <FormField
                control={negotiateForm.control}
                name="proposed_rent"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Your Proposed Rent</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="0.00" {...field} />
                    </FormControl>
                    <FormDescription>
                      Current offer: ${offer.proposed_rent.toFixed(2)}/month
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={negotiateForm.control}
                name="proposed_term_months"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Your Proposed Term (months)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="12" {...field} />
                    </FormControl>
                    <FormDescription>
                      Current offer: {offer.proposed_term_months} months
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={negotiateForm.control}
                name="additional_terms"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Additional Terms (Optional)</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Any requests or conditions..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowNegotiateDialog(false)}>
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