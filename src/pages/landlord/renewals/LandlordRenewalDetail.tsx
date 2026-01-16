import { RenewalOfferWithRelations, CounterOffer } from '@/types/renewal';
import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, AlertCircle, CheckCircle2, XCircle, Clock, TrendingUp, MessageSquare, FileText } from 'lucide-react';
import { renewalService } from '@/services/renewalService';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

const counterOfferSchema = z.object({
  proposed_rent: z.coerce.number().min(0, 'Rent must be positive'),
  proposed_term_months: z.coerce.number().min(1, 'Term must be at least 1 month'),
  additional_terms: z.string().optional(),
});

type CounterOfferFormData = z.infer<typeof counterOfferSchema>;

export default function LandlordRenewalDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [offer, setOffer] = useState<RenewalOfferWithRelations | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCounterOfferDialog, setShowCounterOfferDialog] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<CounterOfferFormData>({
    resolver: zodResolver(counterOfferSchema),
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
      
      // Set form defaults based on current offer
      form.setValue('proposed_rent', data.proposed_rent);
      form.setValue('proposed_term_months', data.proposed_term_months);
    } catch (err) {
      const error = err as Error; setError(error.message);
    } finally {
      setLoading(false);
    }
  }, [id, form]);

  useEffect(() => {
    if (id) {
      loadOffer();
    }
  }, [id, loadOffer]);

  const handleAcceptCounterOffer = async (counterOfferId: string) => {
    try {
      setSubmitting(true);
      await renewalService.acceptCounterOffer(id!, counterOfferId);
      await loadOffer();
      setError(null);
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
      await loadOffer();
      setError(null);
    } catch (err) {
      const error = err as Error; setError(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ComponentType<{ className?: string }>; label: string }> = {
      pending: { variant: 'secondary', icon: Clock, label: 'Pending Response' },
      accepted: { variant: 'default', icon: CheckCircle2, label: 'Accepted' },
      declined: { variant: 'destructive', icon: XCircle, label: 'Declined' },
      negotiating: { variant: 'outline', icon: TrendingUp, label: 'Negotiating' },
      expired: { variant: 'secondary', icon: AlertCircle, label: 'Expired' },
    };

    const config = variants[status] || variants.pending;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading renewal details...</p>
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

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/landlord/renewals')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">Renewal Offer Details</h1>
          <p className="text-muted-foreground">{offer.lease?.property?.address}</p>
        </div>
        {getStatusBadge(offer.status)}
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Offer Details */}
          <Card>
            <CardHeader>
              <CardTitle>Offer Details</CardTitle>
              <CardDescription>Your renewal offer to the tenant</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Current Rent</p>
                  <p className="text-2xl font-bold">${offer.original_rent.toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground">per month</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Proposed Rent</p>
                  <p className="text-2xl font-bold">${offer.proposed_rent.toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground">per month</p>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Rent Change</p>
                  <p className="font-medium">
                    {offer.proposed_rent > offer.original_rent ? (
                      <span className="text-red-600">
                        +${(offer.proposed_rent - offer.original_rent).toFixed(2)} ({((offer.proposed_rent - offer.original_rent) / offer.original_rent * 100).toFixed(1)}%)
                      </span>
                    ) : offer.proposed_rent < offer.original_rent ? (
                      <span className="text-green-600">
                        -${(offer.original_rent - offer.proposed_rent).toFixed(2)} ({((offer.original_rent - offer.proposed_rent) / offer.original_rent * 100).toFixed(1)}%)
                      </span>
                    ) : (
                      <span>No change</span>
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Lease Term</p>
                  <p className="font-medium">{offer.proposed_term_months} months</p>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">New Lease Start</p>
                  <p className="font-medium">{new Date(offer.new_lease_start_date).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">New Lease End</p>
                  <p className="font-medium">{new Date(offer.new_lease_end_date).toLocaleDateString()}</p>
                </div>
              </div>

              {offer.special_terms && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Special Terms</p>
                    <p className="text-sm">{offer.special_terms}</p>
                  </div>
                </>
              )}

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Offer Sent</p>
                  <p className="font-medium">{new Date(offer.created_at).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Offer Expires</p>
                  <p className="font-medium">{new Date(offer.offer_expiration_date).toLocaleDateString()}</p>
                </div>
              </div>

              {offer.response_date && (
                <div>
                  <p className="text-sm text-muted-foreground">Response Date</p>
                  <p className="font-medium">{new Date(offer.response_date).toLocaleDateString()}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Negotiation History */}
          {offer.counter_offers && offer.counter_offers.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Negotiation History</CardTitle>
                <CardDescription>Counter-offers and responses</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {offer.counter_offers.map((counterOffer: CounterOffer, index: number) => (
                    <div key={counterOffer.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <MessageSquare className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">
                            {counterOffer.offered_by === 'tenant' ? 'Tenant' : 'Landlord'} Counter-Offer #{index + 1}
                          </span>
                        </div>
                        <Badge variant={counterOffer.status === 'accepted' ? 'default' : counterOffer.status === 'rejected' ? 'destructive' : 'secondary'}>
                          {counterOffer.status}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-4 mt-2">
                        <div>
                          <p className="text-sm text-muted-foreground">Proposed Rent</p>
                          <p className="font-medium">${counterOffer.proposed_rent.toFixed(2)}/month</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Proposed Term</p>
                          <p className="font-medium">{counterOffer.proposed_term_months} months</p>
                        </div>
                      </div>
                      {counterOffer.additional_terms && (
                        <div className="mt-2">
                          <p className="text-sm text-muted-foreground">Additional Terms</p>
                          <p className="text-sm">{counterOffer.additional_terms}</p>
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground mt-2">
                        {new Date(counterOffer.created_at).toLocaleString()}
                      </p>
                      {counterOffer.offered_by === 'tenant' && counterOffer.status === 'pending' && (
                        <div className="flex gap-2 mt-4">
                          <Button
                            size="sm"
                            onClick={() => handleAcceptCounterOffer(counterOffer.id)}
                            disabled={submitting}
                          >
                            Accept Counter-Offer
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setShowCounterOfferDialog(true)}
                            disabled={submitting}
                          >
                            Make New Counter-Offer
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          {offer.status === 'negotiating' && (
            <Card>
              <CardHeader>
                <CardTitle>Actions</CardTitle>
                <CardDescription>Respond to tenant's counter-offer</CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={() => setShowCounterOfferDialog(true)}>
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Make Counter-Offer
                </Button>
              </CardContent>
            </Card>
          )}

          {offer.status === 'accepted' && (
            <Card>
              <CardHeader>
                <CardTitle>Next Steps</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Alert>
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertDescription>
                    The renewal offer has been accepted! The new lease document is being generated and will be sent for e-signature.
                  </AlertDescription>
                </Alert>
                <Button onClick={() => navigate('/landlord/leases')}>
                  <FileText className="h-4 w-4 mr-2" />
                  View Leases
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Property</CardTitle>
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
              <CardTitle>Tenant</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div>
                <p className="text-sm text-muted-foreground">Name</p>
                <p className="font-medium">{offer.lease?.tenant?.first_name} {offer.lease?.tenant?.last_name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium text-sm">{offer.lease?.tenant?.email}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Phone</p>
                <p className="font-medium">{offer.lease?.tenant?.phone}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Current Lease</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div>
                <p className="text-sm text-muted-foreground">Start Date</p>
                <p className="font-medium">{new Date(offer.lease?.start_date).toLocaleDateString()}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">End Date</p>
                <p className="font-medium">{new Date(offer.lease?.end_date).toLocaleDateString()}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Days Until Expiration</p>
                <p className="font-medium">
                  {Math.ceil((new Date(offer.lease?.end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} days
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

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