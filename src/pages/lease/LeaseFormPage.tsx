/**
 * Lease create / edit form — wired to `POST /api/v1/leases` (create) and
 * `PATCH /api/v1/leases/{id}` (draft edit). Replaces the legacy 9-step mock
 * wizard: the backend create contract is exactly these fields, so a single
 * focused form maps 1:1 to it.
 *
 * Mode is derived from the route: `/landlord/leases/create` (create) vs
 * `/landlord/leases/:leaseId/edit` (edit, draft-only — a non-draft lease is
 * blocked client-side and `409` server-side).
 */

import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
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
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { createLease, getLease, updateLease } from '@/services/leaseService';
import { ApiError } from '@/lib/api-client';
import { LEASE_TYPE_LABEL } from '@/lib/leaseDisplay';
import type {
  Clause,
  CreateLeaseBody,
  LeaseType,
  UpdateLeaseBody,
} from '@/types/leaseContract';

const LEASE_TYPES = Object.keys(LEASE_TYPE_LABEL) as LeaseType[];
const CURRENCIES = ['cUSD', 'CSPR'] as const;
const MS_PER_DAY = 86_400_000;

interface FormState {
  propertyId: string;
  tenantId: string;
  type: LeaseType;
  startDate: string;
  endDate: string;
  monthlyRent: string;
  securityDeposit: string;
  currency: string;
  propertyManagerId: string;
  propertyManagerBps: string;
  equityPropertyId: string;
  clauses: Clause[];
}

const EMPTY_FORM: FormState = {
  propertyId: '',
  tenantId: '',
  type: 'fixed-term',
  startDate: '',
  endDate: '',
  monthlyRent: '',
  securityDeposit: '',
  currency: 'cUSD',
  propertyManagerId: '',
  propertyManagerBps: '0',
  equityPropertyId: '',
  clauses: [],
};

/** Backend requires `(end - start)` to be a positive whole number of 30-day months. */
function validateDuration(start: string, end: string): string | null {
  if (!start || !end) return 'Start and end dates are required.';
  const days = Math.round(
    (new Date(end).getTime() - new Date(start).getTime()) / MS_PER_DAY
  );
  if (days <= 0) return 'End date must be after the start date.';
  if (days % 30 !== 0)
    return 'Lease duration must be a whole number of 30-day months.';
  return null;
}

function mapSubmitError(err: unknown, isEdit: boolean): string {
  if (err instanceof ApiError) {
    switch (err.statusCode) {
      case 400:
        return (
          err.message || 'Some lease terms are invalid. Please review them.'
        );
      case 403:
        return 'Only the property’s landlord can manage this lease.';
      case 404:
        return 'The property or tenant could not be found.';
      case 409:
        return isEdit
          ? 'This lease is no longer a draft, so it can’t be edited.'
          : 'This lease can’t be created in its current state.';
      default:
        return err.message || 'Something went wrong. Please try again.';
    }
  }
  return 'Something went wrong. Please try again.';
}

export default function LeaseFormPage() {
  const { leaseId } = useParams<{ leaseId: string }>();
  const isEdit = Boolean(leaseId);
  const navigate = useNavigate();
  const { toast } = useToast();

  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  // Edit mode — load the draft to prefill (and guard against non-drafts).
  const { data: existing, isLoading: loadingExisting } = useQuery({
    queryKey: ['lease', leaseId],
    queryFn: () => getLease(leaseId as string),
    enabled: isEdit,
  });

  useEffect(() => {
    if (!existing) return;
    setForm({
      propertyId: existing.propertyId,
      tenantId: existing.tenantIds[0] ?? '',
      type: existing.type,
      startDate: existing.startDate.slice(0, 10),
      endDate: existing.endDate.slice(0, 10),
      monthlyRent: String(existing.monthlyRent),
      securityDeposit: String(existing.securityDeposit),
      currency: existing.currency ?? 'cUSD',
      propertyManagerId: existing.propertyManagerId ?? '',
      propertyManagerBps: String(existing.propertyManagerBps ?? 0),
      equityPropertyId: existing.equityPropertyId ?? '',
      clauses: existing.clauses,
    });
  }, [existing]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const updateClause = (index: number, patch: Partial<Clause>) =>
    setForm((prev) => ({
      ...prev,
      clauses: prev.clauses.map((c, i) =>
        i === index ? { ...c, ...patch } : c
      ),
    }));

  const addClause = () =>
    setForm((prev) => ({
      ...prev,
      clauses: [...prev.clauses, { title: '', content: '', category: '' }],
    }));

  const removeClause = (index: number) =>
    setForm((prev) => ({
      ...prev,
      clauses: prev.clauses.filter((_, i) => i !== index),
    }));

  const mutation = useMutation({
    mutationFn: () => {
      if (isEdit) {
        const body: UpdateLeaseBody = {
          propertyId: form.propertyId,
          type: form.type,
          startDate: form.startDate,
          endDate: form.endDate,
          monthlyRent: Number(form.monthlyRent),
          securityDeposit: Number(form.securityDeposit),
          currency: form.currency,
          propertyManagerId: form.propertyManagerId || null,
          propertyManagerBps: Number(form.propertyManagerBps) || 0,
          equityPropertyId: form.equityPropertyId || null,
          clauses: form.clauses,
        };
        return updateLease(leaseId as string, body);
      }
      const body: CreateLeaseBody = {
        propertyId: form.propertyId,
        tenantId: form.tenantId,
        type: form.type,
        startDate: form.startDate,
        endDate: form.endDate,
        monthlyRent: Number(form.monthlyRent),
        securityDeposit: Number(form.securityDeposit),
        currency: form.currency,
        propertyManagerId: form.propertyManagerId || null,
        propertyManagerBps: Number(form.propertyManagerBps) || 0,
        equityPropertyId: form.equityPropertyId || null,
        clauses: form.clauses,
      };
      return createLease(body);
    },
    onSuccess: (lease) => {
      toast({
        title: isEdit ? 'Lease updated' : 'Lease draft created',
        description: isEdit
          ? 'Your changes have been saved.'
          : 'The draft is ready to submit for signing.',
      });
      navigate(`/landlord/leases/${lease.id}`);
    },
    onError: (err) => {
      toast({
        title: isEdit ? 'Couldn’t update lease' : 'Couldn’t create lease',
        description: mapSubmitError(err, isEdit),
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    if (!form.propertyId || (!isEdit && !form.tenantId)) {
      toast({
        title: 'Missing information',
        description: 'Property and tenant are required.',
        variant: 'destructive',
      });
      return;
    }
    const durationError = validateDuration(form.startDate, form.endDate);
    if (durationError) {
      toast({
        title: 'Invalid dates',
        description: durationError,
        variant: 'destructive',
      });
      return;
    }
    if (Number(form.monthlyRent) <= 0) {
      toast({
        title: 'Invalid rent',
        description: 'Monthly rent must be greater than zero.',
        variant: 'destructive',
      });
      return;
    }
    mutation.mutate();
  };

  const backTo = isEdit ? `/landlord/leases/${leaseId}` : '/landlord/leases';

  // Edit mode: block non-drafts up front (the PATCH would 409 anyway).
  if (isEdit && existing && existing.status !== 'draft') {
    return (
      <div className="container mx-auto py-8 max-w-3xl">
        <Button
          variant="ghost"
          className="mb-6"
          onClick={() => navigate(backTo)}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Lease
        </Button>
        <Card>
          <CardContent className="py-12 text-center">
            <h3 className="text-lg font-semibold mb-2">
              This lease isn’t editable
            </h3>
            <p className="text-muted-foreground">
              Only draft leases can be edited. This lease is{' '}
              <span className="font-medium">{existing.status}</span>.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isEdit && loadingExisting) {
    return (
      <div className="container mx-auto py-8 max-w-3xl space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-96 w-full rounded-lg" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 max-w-3xl">
      <Button variant="ghost" className="mb-6" onClick={() => navigate(backTo)}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        {isEdit ? 'Back to Lease' : 'Back to Leases'}
      </Button>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>
              {isEdit ? 'Edit Lease Draft' : 'Create New Lease'}
            </CardTitle>
            <CardDescription>
              Enter the lease terms. The lease starts as a draft you can submit
              for signing.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="propertyId">Property ID</Label>
                <Input
                  id="propertyId"
                  value={form.propertyId}
                  onChange={(e) => set('propertyId', e.target.value)}
                  placeholder="Property UUID"
                  required
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="tenantId">Tenant ID</Label>
                <Input
                  id="tenantId"
                  value={form.tenantId}
                  onChange={(e) => set('tenantId', e.target.value)}
                  placeholder="Tenant user UUID"
                  required={!isEdit}
                  disabled={isEdit}
                />
                {isEdit && (
                  <p className="text-xs text-muted-foreground">
                    The tenant can’t be changed after the draft is created.
                  </p>
                )}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label>Lease Type</Label>
                <Select
                  value={form.type}
                  onValueChange={(value) => set('type', value as LeaseType)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LEASE_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {LEASE_TYPE_LABEL[type]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <Label>Currency</Label>
                <Select
                  value={form.currency}
                  onValueChange={(value) => set('currency', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={form.startDate}
                  onChange={(e) => set('startDate', e.target.value)}
                  required
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={form.endDate}
                  onChange={(e) => set('endDate', e.target.value)}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Duration must be a whole number of 30-day months.
                </p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="monthlyRent">Monthly Rent</Label>
                <Input
                  id="monthlyRent"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.monthlyRent}
                  onChange={(e) => set('monthlyRent', e.target.value)}
                  required
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="securityDeposit">Security Deposit</Label>
                <Input
                  id="securityDeposit"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.securityDeposit}
                  onChange={(e) => set('securityDeposit', e.target.value)}
                  required
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Optional: property-manager split */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Property Manager Split (optional)
            </CardTitle>
            <CardDescription>
              Route part of the rent to a property manager. Leave blank if none.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="propertyManagerId">Manager ID</Label>
              <Input
                id="propertyManagerId"
                value={form.propertyManagerId}
                onChange={(e) => set('propertyManagerId', e.target.value)}
                placeholder="Manager user UUID"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="propertyManagerBps">Manager Share (bps)</Label>
              <Input
                id="propertyManagerBps"
                type="number"
                min="0"
                max="10000"
                value={form.propertyManagerBps}
                onChange={(e) => set('propertyManagerBps', e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                10000 = 100%. Must be 0 when there’s no manager.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Clauses */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Clauses (optional)</CardTitle>
                <CardDescription>
                  Custom terms attached to the lease.
                </CardDescription>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addClause}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Clause
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {form.clauses.length === 0 ? (
              <p className="text-sm text-muted-foreground">No clauses added.</p>
            ) : (
              form.clauses.map((clause, i) => (
                <div key={i} className="rounded-lg border p-4 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium">Clause {i + 1}</p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeClause(i)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <Input
                      value={clause.title}
                      onChange={(e) =>
                        updateClause(i, { title: e.target.value })
                      }
                      placeholder="Title"
                    />
                    <Input
                      value={clause.category}
                      onChange={(e) =>
                        updateClause(i, { category: e.target.value })
                      }
                      placeholder="Category (e.g. rent-payment)"
                    />
                  </div>
                  <Textarea
                    value={clause.content}
                    onChange={(e) =>
                      updateClause(i, { content: e.target.value })
                    }
                    placeholder="Clause text"
                    rows={3}
                  />
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate(backTo)}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending
              ? 'Saving…'
              : isEdit
                ? 'Save Changes'
                : 'Create Lease'}
          </Button>
        </div>
      </form>
    </div>
  );
}
