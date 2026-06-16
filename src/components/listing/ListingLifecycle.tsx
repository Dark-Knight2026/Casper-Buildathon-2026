import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  submitListing,
  transitionListingState,
} from '@/services/listingService';
import { LISTING_STATE_BADGE } from '@/lib/listingDisplay';
import { ApiClient } from '@/lib/api-client';
import type { Listing, ListingState } from '@/types/listingContract';

/**
 * Lifecycle controls for a single listing: shows the current state, days on
 * market and expiry, plus the forward actions available from that state.
 *
 * Activation is gate-guarded server-side (identity + authority + fair-housing),
 * so the "go live" action is always offered and a rejected transition surfaces
 * as an error toast rather than being hidden.
 */

type Action =
  | { kind: 'submit'; label: string }
  | {
      kind: 'transition';
      to: ListingState;
      label: string;
      variant?: 'default' | 'outline' | 'destructive';
    };

// One-line explanation of where the listing is and what the next step does.
const STATE_HINT: Partial<Record<ListingState, string>> = {
  draft:
    'This listing is a private draft. Submit it for review to begin publishing — it stays hidden from tenants until you publish.',
  pending:
    'In review. Clear the authority and fair-housing checks below, then publish to make it live.',
  active:
    'Live and visible to tenants. Mark it leased once a tenant signs, or withdraw it from search.',
  leased: 'Leased — no longer shown in search.',
  sold: 'Sold — no longer shown in search.',
  withdrawn: 'Withdrawn — no longer shown in search.',
  expired: 'Expired — no longer shown in search.',
};

// Forward actions per current state. The backend validates transitions, so
// this only needs to offer the sensible next steps.
const ACTIONS: Partial<Record<ListingState, Action[]>> = {
  draft: [{ kind: 'submit', label: 'Submit for review' }],
  pending: [
    { kind: 'transition', to: 'active', label: 'Publish (go live)' },
    {
      kind: 'transition',
      to: 'draft',
      label: 'Back to draft',
      variant: 'outline',
    },
  ],
  active: [
    { kind: 'transition', to: 'leased', label: 'Mark as leased' },
    {
      kind: 'transition',
      to: 'withdrawn',
      label: 'Withdraw',
      variant: 'destructive',
    },
  ],
};

export function ListingLifecycle({ listing }: { listing: Listing }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);

  const badge = LISTING_STATE_BADGE[listing.state];
  const actions = ACTIONS[listing.state] ?? [];

  const run = async (action: Action) => {
    setBusy(true);
    try {
      if (action.kind === 'submit') {
        await submitListing(listing.id);
      } else {
        await transitionListingState(listing.id, action.to);
      }
      await queryClient.invalidateQueries({
        queryKey: ['listing', listing.id],
      });
      toast({ title: 'Listing updated' });
    } catch (error) {
      toast({
        title: 'Could not update the listing',
        description: ApiClient.handleError(error),
        variant: 'destructive',
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Listing status
          <Badge className={badge.className}>{badge.label}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-8 text-sm">
          <div>
            <p className="text-muted-foreground">Days on market</p>
            <p className="font-semibold">{listing.daysOnMarket}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Expires</p>
            <p className="font-semibold">
              {listing.expiresAt
                ? new Date(listing.expiresAt).toLocaleDateString()
                : '—'}
            </p>
          </div>
        </div>

        {STATE_HINT[listing.state] && (
          <p className="text-sm text-muted-foreground">
            {STATE_HINT[listing.state]}
          </p>
        )}

        {actions.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {actions.map((action) => (
              <Button
                key={action.kind === 'submit' ? 'submit' : action.to}
                variant={
                  action.kind === 'transition' ? action.variant : undefined
                }
                disabled={busy}
                onClick={() => run(action)}
              >
                {action.label}
              </Button>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No further actions are available for this state.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
