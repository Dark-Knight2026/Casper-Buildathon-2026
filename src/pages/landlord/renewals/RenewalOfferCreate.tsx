import { LeaseWithDetails } from '@/types/renewal';
import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, AlertCircle, CheckCircle2 } from 'lucide-react';
import { renewalService } from '@/services/renewalService';
import { supabase } from '@/lib/supabase/client';

const formSchema = z.object({
  lease_id: z.string().min(1, 'Please select a lease'),
  proposed_term_months: z.coerce.number().min(1, 'Lease term must be at least 1 month'),
  rent_adjustment_type: z.enum(['amount', 'percentage']),
  rent_adjustment_value: z.coerce.number(),
  proposed_rent: z.coerce.number().min(0, 'Rent must be positive'),
  special_terms: z.string().optional(),
  offer_expiration_days: z.coerce.number().min(1, 'Expiration must be at least 1 day'),
  new_lease_start_date: z.string().min(1, 'Start date is required'),
});

type FormData = z.infer<typeof formSchema>;

export default function RenewalOfferCreate() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedLeaseId = searchParams.get('lease_id');

  const [leases, setLeases] = useState<LeaseWithDetails[]>([]);
  const [selectedLease, setSelectedLease] = useState<LeaseWithDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      lease_id: preselectedLeaseId || '',
      proposed_term_months: 12,
      rent_adjustment_type: 'percentage',
      rent_adjustment_value: 0,
      proposed_rent: 0,
      special_terms: '',
      offer_expiration_days: 14,
      new_lease_start_date: '',
    },
  });

  const watchLeaseId = form.watch('lease_id');
  const watchAdjustmentType = form.watch('rent_adjustment_type');
  const watchAdjustmentValue = form.watch('rent_adjustment_value');

  const loadExpiringLeases = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get landlord ID
      const { data: landlord } = await supabase
        .from('landlords')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!landlord) throw new Error('Landlord profile not found');

      // Get leases expiring in next 90 days
      const today = new Date();
      const in90Days = new Date(today);
      in90Days.setDate(in90Days.getDate() + 90);

      const { data, error } = await supabase
        .from('leases')
        .select(`
          *,
          property:properties(*),
          tenant:tenants(*)
        `)
        .eq('landlord_id', landlord.id)
        .eq('status', 'active')
        .lte('end_date', in90Days.toISOString())
        .gte('end_date', today.toISOString())
        .order('end_date', { ascending: true });

      if (error) throw error;
      setLeases(data || []);
    } catch (err) {
      const error = err as Error; setError(error.message);
    }
  }, []);

  const loadLeaseDetails = useCallback(async (leaseId: string) => {
    try {
      const { data, error } = await supabase
        .from('leases')
        .select(`
          *,
          property:properties(*),
          tenant:tenants(*)
        `)
        .eq('id', leaseId)
        .single();

      if (error) throw error;
      setSelectedLease(data);

      // Set default start date to current lease end date
      form.setValue('new_lease_start_date', data.end_date.split('T')[0]);
      form.setValue('proposed_rent', data.monthly_rent);
    } catch (err) {
      const error = err as Error; setError(error.message);
    }
  }, [form]);

  // Load expiring leases
  useEffect(() => {
    loadExpiringLeases();
  }, [loadExpiringLeases]);

  // Load selected lease details
  useEffect(() => {
    if (watchLeaseId) {
      loadLeaseDetails(watchLeaseId);
    }
  }, [watchLeaseId, loadLeaseDetails]);

  // Calculate proposed rent when adjustment changes
  useEffect(() => {
    if (selectedLease) {
      const currentRent = selectedLease.monthly_rent;
      let newRent = currentRent;

      if (watchAdjustmentType === 'amount') {
        newRent = currentRent + watchAdjustmentValue;
      } else if (watchAdjustmentType === 'percentage') {
        newRent = currentRent * (1 + watchAdjustmentValue / 100);
      }

      form.setValue('proposed_rent', Math.round(newRent * 100) / 100);
    }
  }, [selectedLease, watchAdjustmentType, watchAdjustmentValue, form]);

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    setError(null);

    try {
      // Calculate offer expiration date
      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() + data.offer_expiration_days);

      await renewalService.createRenewalOffer({
        lease_id: data.lease_id,
        proposed_rent: data.proposed_rent,
        proposed_term_months: data.proposed_term_months,
        special_terms: data.special_terms,
        offer_expiration_date: expirationDate.toISOString(),
        new_lease_start_date: new Date(data.new_lease_start_date).toISOString(),
      });

      setSuccess(true);
      setTimeout(() => {
        navigate('/landlord/renewals');
      }, 2000);
    } catch (err) {
      const error = err as Error; setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const calculateTotalRent = () => {
    const rent = form.watch('proposed_rent');
    const term = form.watch('proposed_term_months');
    return rent * term;
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/landlord/renewals')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Create Renewal Offer</h1>
          <p className="text-muted-foreground">Send a lease renewal offer to your tenant</p>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert>
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription>Renewal offer sent successfully! Redirecting...</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Offer Details</CardTitle>
              <CardDescription>Configure the renewal offer terms</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="lease_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Select Lease</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Choose a lease to renew" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {leases.map((lease) => (
                              <SelectItem key={lease.id} value={lease.id}>
                                {lease.property.address} - {lease.tenant.first_name} {lease.tenant.last_name} (Expires: {new Date(lease.end_date).toLocaleDateString()})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Select the lease you want to renew
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="proposed_term_months"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>New Lease Term (months)</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value.toString()}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="6">6 months</SelectItem>
                            <SelectItem value="12">12 months (1 year)</SelectItem>
                            <SelectItem value="24">24 months (2 years)</SelectItem>
                            <SelectItem value="36">36 months (3 years)</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="rent_adjustment_type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Rent Adjustment Type</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="amount">Fixed Amount ($)</SelectItem>
                              <SelectItem value="percentage">Percentage (%)</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="rent_adjustment_value"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Adjustment Value</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              placeholder={watchAdjustmentType === 'amount' ? '0.00' : '0.0'}
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            {watchAdjustmentType === 'amount' ? 'Dollar amount' : 'Percentage'}
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="proposed_rent"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>New Monthly Rent</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            {...field}
                            readOnly
                          />
                        </FormControl>
                        <FormDescription>
                          Calculated automatically based on adjustment
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="new_lease_start_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>New Lease Start Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormDescription>
                          Usually the day after current lease ends
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="offer_expiration_days"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Offer Valid For (days)</FormLabel>
                        <FormControl>
                          <Input type="number" min="1" {...field} />
                        </FormControl>
                        <FormDescription>
                          Number of days tenant has to respond
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="special_terms"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Special Terms (Optional)</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Any additional terms or conditions..."
                            className="min-h-[100px]"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Include any move-in incentives, special conditions, etc.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex gap-4">
                    <Button type="submit" disabled={loading || !selectedLease}>
                      {loading ? 'Sending...' : 'Send Offer'}
                    </Button>
                    <Button type="button" variant="outline" onClick={() => navigate('/landlord/renewals')}>
                      Cancel
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {selectedLease && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Current Lease</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div>
                    <p className="text-sm text-muted-foreground">Property</p>
                    <p className="font-medium">{selectedLease.property.address}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Tenant</p>
                    <p className="font-medium">{selectedLease.tenant.first_name} {selectedLease.tenant.last_name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Current Rent</p>
                    <p className="font-medium">${selectedLease.monthly_rent.toFixed(2)}/month</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Current Term</p>
                    <p className="font-medium">{selectedLease.lease_term_months} months</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Expires</p>
                    <p className="font-medium">{new Date(selectedLease.end_date).toLocaleDateString()}</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Offer Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div>
                    <p className="text-sm text-muted-foreground">New Monthly Rent</p>
                    <p className="text-2xl font-bold">${form.watch('proposed_rent').toFixed(2)}</p>
                    {selectedLease && (
                      <p className="text-sm text-muted-foreground">
                        {form.watch('proposed_rent') > selectedLease.monthly_rent ? (
                          <span className="text-red-600">
                            +${(form.watch('proposed_rent') - selectedLease.monthly_rent).toFixed(2)} increase
                          </span>
                        ) : form.watch('proposed_rent') < selectedLease.monthly_rent ? (
                          <span className="text-green-600">
                            -${(selectedLease.monthly_rent - form.watch('proposed_rent')).toFixed(2)} decrease
                          </span>
                        ) : (
                          <span>No change</span>
                        )}
                      </p>
                    )}
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">New Term</p>
                    <p className="font-medium">{form.watch('proposed_term_months')} months</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Rent Over Term</p>
                    <p className="font-medium">${calculateTotalRent().toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Offer Expires</p>
                    <p className="font-medium">
                      {new Date(Date.now() + form.watch('offer_expiration_days') * 24 * 60 * 60 * 1000).toLocaleDateString()}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}