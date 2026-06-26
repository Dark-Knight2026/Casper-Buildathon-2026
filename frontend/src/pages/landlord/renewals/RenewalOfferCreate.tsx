/**
 * Create a renewal offer — landlord, wired to `POST /api/v1/renewals`. Only
 * leases that are `active` or `expiring-soon` are eligible (the backend `409`s
 * otherwise). No mock, no Supabase.
 */

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
import { useToast } from '@/hooks/use-toast';
import { listLeases } from '@/services/leaseService';
import { createRenewal } from '@/services/renewalService';
import { ApiError } from '@/lib/api-client';
import {
  LEASE_TYPE_LABEL,
  formatLeaseDate,
  formatLeaseMoney,
} from '@/lib/leaseDisplay';

interface FormState {
  leaseId: string;
  proposedRent: string;
  proposedTermMonths: string;
  proposedStartDate: string;
  rentIncreaseReason: string;
  responseDeadline: string;
}

const EMPTY_FORM: FormState = {
  leaseId: '',
  proposedRent: '',
  proposedTermMonths: '12',
  proposedStartDate: '',
  rentIncreaseReason: '',
  responseDeadline: '',
};

function mapCreateError(err: unknown): string {
  if (err instanceof ApiError) {
    switch (err.statusCode) {
      case 400:
        return (
          err.message || 'Some offer terms are invalid. Please review them.'
        );
      case 403:
        return 'Only the lease’s landlord can offer a renewal.';
      case 404:
        return 'That lease could not be found.';
      case 409:
        return 'This lease isn’t eligible for renewal (it must be active or expiring soon).';
      default:
        return err.message || 'Something went wrong. Please try again.';
    }
  }
  return 'Something went wrong. Please try again.';
}

export default function RenewalOfferCreate() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const preselectedLeaseId = searchParams.get('leaseId') ?? '';

  const [form, setForm] = useState<FormState>(() => ({
    ...EMPTY_FORM,
    leaseId: preselectedLeaseId,
  }));

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  // The landlord's renewal-eligible leases (active / expiring-soon).
  const { data: leasesPage } = useQuery({
    queryKey: ['landlord-leases', 'renewal-eligible'],
    queryFn: () => listLeases({ landlordId: 'me', pageSize: 100 }),
  });
  const eligibleLeases = useMemo(
    () =>
      (leasesPage?.data ?? []).filter(
        (l) => l.status === 'active' || l.status === 'expiring-soon'
      ),
    [leasesPage]
  );

  // Picking a lease seeds the rent (its current rent) + start (its end date).
  const selectLease = (leaseId: string) => {
    const lease = eligibleLeases.find((l) => l.id === leaseId);
    setForm((prev) => ({
      ...prev,
      leaseId,
      proposedRent: lease ? String(lease.monthlyRent) : prev.proposedRent,
      proposedStartDate: lease
        ? lease.endDate.slice(0, 10)
        : prev.proposedStartDate,
    }));
  };

  // Seed from a preselected lease once the eligible list has loaded.
  useEffect(() => {
    if (!preselectedLeaseId || form.proposedRent) return;
    const lease = eligibleLeases.find((l) => l.id === preselectedLeaseId);
    if (lease) {
      setForm((prev) => ({
        ...prev,
        proposedRent: String(lease.monthlyRent),
        proposedStartDate: lease.endDate.slice(0, 10),
      }));
    }
  }, [eligibleLeases, preselectedLeaseId, form.proposedRent]);

  const mutation = useMutation({
    mutationFn: () =>
      createRenewal({
        leaseId: form.leaseId,
        proposedRent: Number(form.proposedRent),
        proposedTermMonths: Number(form.proposedTermMonths),
        proposedStartDate: form.proposedStartDate,
        rentIncreaseReason: form.rentIncreaseReason || null,
        responseDeadline: form.responseDeadline || null,
      }),
    onSuccess: (renewal) => {
      toast({
        title: 'Renewal offer sent',
        description: 'The tenant can now review and respond.',
      });
      navigate(`/landlord/renewals/${renewal.id}`);
    },
    onError: (err) =>
      toast({
        title: 'Couldn’t create the offer',
        description: mapCreateError(err),
        variant: 'destructive',
      }),
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!form.leaseId) {
      toast({
        title: 'Select a lease',
        description: 'Choose which lease to renew.',
        variant: 'destructive',
      });
      return;
    }
    const months = Number(form.proposedTermMonths);
    if (!Number.isInteger(months) || months <= 0) {
      toast({
        title: 'Invalid term',
        description: 'Enter a whole number of months.',
        variant: 'destructive',
      });
      return;
    }
    if (Number(form.proposedRent) <= 0) {
      toast({
        title: 'Invalid rent',
        description: 'Proposed rent must be greater than zero.',
        variant: 'destructive',
      });
      return;
    }
    if (!form.proposedStartDate) {
      toast({
        title: 'Start date required',
        description: 'Set when the renewed term starts.',
        variant: 'destructive',
      });
      return;
    }
    mutation.mutate();
  };

  return (
    <div className="container mx-auto py-8 max-w-3xl">
      <Button
        variant="ghost"
        className="mb-6"
        onClick={() => navigate('/landlord/renewals')}
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Renewals
      </Button>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Create Renewal Offer</CardTitle>
            <CardDescription>
              Send a renewal offer for an active or expiring lease.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="leaseId">Lease</Label>
              {eligibleLeases.length > 0 ? (
                <Select value={form.leaseId} onValueChange={selectLease}>
                  <SelectTrigger id="leaseId">
                    <SelectValue placeholder="Choose a lease to renew" />
                  </SelectTrigger>
                  <SelectContent>
                    {eligibleLeases.map((lease) => (
                      <SelectItem key={lease.id} value={lease.id}>
                        {LEASE_TYPE_LABEL[lease.type]} ·{' '}
                        {formatLeaseMoney(lease.monthlyRent, lease.currency)} ·
                        ends {formatLeaseDate(lease.endDate)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-sm text-muted-foreground">
                  You have no active or expiring-soon leases to renew.
                </p>
              )}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="proposedRent">Proposed Monthly Rent</Label>
                <Input
                  id="proposedRent"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.proposedRent}
                  onChange={(e) => set('proposedRent', e.target.value)}
                  required
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="proposedTermMonths">Term (months)</Label>
                <Input
                  id="proposedTermMonths"
                  type="number"
                  min="1"
                  step="1"
                  value={form.proposedTermMonths}
                  onChange={(e) => set('proposedTermMonths', e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="proposedStartDate">New Term Starts</Label>
                <Input
                  id="proposedStartDate"
                  type="date"
                  value={form.proposedStartDate}
                  onChange={(e) => set('proposedStartDate', e.target.value)}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Usually the day the current lease ends.
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="responseDeadline">Respond By (optional)</Label>
                <Input
                  id="responseDeadline"
                  type="date"
                  value={form.responseDeadline}
                  onChange={(e) => set('responseDeadline', e.target.value)}
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="rentIncreaseReason">
                Reason / Notes (optional)
              </Label>
              <Textarea
                id="rentIncreaseReason"
                value={form.rentIncreaseReason}
                onChange={(e) => set('rentIncreaseReason', e.target.value)}
                placeholder="e.g. market adjustment, included utilities…"
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/landlord/renewals')}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={mutation.isPending || eligibleLeases.length === 0}
              >
                {mutation.isPending ? 'Sending…' : 'Send Offer'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
