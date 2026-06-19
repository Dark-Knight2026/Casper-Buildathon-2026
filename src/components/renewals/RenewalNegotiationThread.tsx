/**
 * Renewal negotiation thread — `GET/POST /api/v1/renewals/{id}/negotiations`.
 * Append-only, oldest-first; both parties post a `message` (body) or a
 * `counter-offer` (proposedTerms). This thread is SEPARATE from the renewal's
 * own `counterOffer` (the tenant's formal counter via `/respond`).
 */

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MessageSquare, TrendingUp, Send, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { getNegotiations, postNegotiation } from '@/services/renewalService';
import { ApiError } from '@/lib/api-client';
import { formatLeaseDateTime, formatLeaseMoney } from '@/lib/leaseDisplay';
import type {
  NegotiationKind,
  PostNegotiationBody,
} from '@/types/renewalContract';

function mapPostError(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.statusCode === 403) return 'You’re not a party to this renewal.';
    if (err.statusCode === 400)
      return err.message || 'Complete the message or counter-offer.';
  }
  return 'Couldn’t post. Please try again.';
}

export default function RenewalNegotiationThread({
  renewalId,
}: {
  renewalId: string;
}) {
  const { profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [kind, setKind] = useState<NegotiationKind>('message');
  const [body, setBody] = useState('');
  const [terms, setTerms] = useState({
    proposedRent: '',
    proposedTermMonths: '',
    notes: '',
  });

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['negotiations', renewalId],
    queryFn: () => getNegotiations(renewalId),
  });

  const post = useMutation({
    mutationFn: (b: PostNegotiationBody) => postNegotiation(renewalId, b),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['negotiations', renewalId] });
      setBody('');
      setTerms({ proposedRent: '', proposedTermMonths: '', notes: '' });
    },
    onError: (err) =>
      toast({
        title: 'Couldn’t post',
        description: mapPostError(err),
        variant: 'destructive',
      }),
  });

  const counterValid =
    Number(terms.proposedRent) > 0 && Number(terms.proposedTermMonths) > 0;

  const submit = () => {
    if (kind === 'message') {
      if (!body.trim()) return;
      post.mutate({ kind: 'message', body: body.trim() });
    } else {
      if (!counterValid) return;
      post.mutate({
        kind: 'counter-offer',
        proposedTerms: {
          proposedRent: Number(terms.proposedRent),
          proposedTermMonths: Number(terms.proposedTermMonths),
          notes: terms.notes || null,
        },
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" /> Negotiation
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No messages yet. Start the conversation below.
          </p>
        ) : (
          <div className="space-y-3">
            {entries.map((entry) => {
              const mine = entry.authorId === profile?.id;
              return (
                <div
                  key={entry.id}
                  className={`rounded-lg border p-3 ${mine ? 'bg-primary/5 ml-8' : 'mr-8'}`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-xs font-medium">
                      {mine ? 'You' : 'Counterparty'}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatLeaseDateTime(entry.createdAt)}
                    </span>
                  </div>
                  {entry.kind === 'counter-offer' && entry.proposedTerms ? (
                    <div className="text-sm">
                      <Badge variant="secondary" className="mb-1">
                        <TrendingUp className="h-3 w-3 mr-1" /> Counter-offer
                      </Badge>
                      <p>
                        {formatLeaseMoney(
                          entry.proposedTerms.proposedRent,
                          null
                        )}{' '}
                        · {entry.proposedTerms.proposedTermMonths} months
                      </p>
                      {entry.proposedTerms.notes && (
                        <p className="text-muted-foreground">
                          {entry.proposedTerms.notes}
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm whitespace-pre-wrap">{entry.body}</p>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Composer */}
        <div className="border-t pt-4 space-y-3">
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant={kind === 'message' ? 'default' : 'outline'}
              onClick={() => setKind('message')}
            >
              Message
            </Button>
            <Button
              type="button"
              size="sm"
              variant={kind === 'counter-offer' ? 'default' : 'outline'}
              onClick={() => setKind('counter-offer')}
            >
              Counter-offer
            </Button>
          </div>

          {kind === 'message' ? (
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write a message…"
              rows={3}
            />
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="ntRent">Proposed Rent</Label>
                <Input
                  id="ntRent"
                  type="number"
                  min="0"
                  step="0.01"
                  value={terms.proposedRent}
                  onChange={(e) =>
                    setTerms((t) => ({ ...t, proposedRent: e.target.value }))
                  }
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="ntTerm">Term (months)</Label>
                <Input
                  id="ntTerm"
                  type="number"
                  min="1"
                  step="1"
                  value={terms.proposedTermMonths}
                  onChange={(e) =>
                    setTerms((t) => ({
                      ...t,
                      proposedTermMonths: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="flex flex-col gap-2 md:col-span-2">
                <Label htmlFor="ntNotes">Notes (optional)</Label>
                <Textarea
                  id="ntNotes"
                  value={terms.notes}
                  onChange={(e) =>
                    setTerms((t) => ({ ...t, notes: e.target.value }))
                  }
                  rows={2}
                />
              </div>
            </div>
          )}

          <div className="flex justify-end">
            <Button
              onClick={submit}
              disabled={
                post.isPending ||
                (kind === 'message' ? !body.trim() : !counterValid)
              }
            >
              {post.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Posting…
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Post
                </>
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
