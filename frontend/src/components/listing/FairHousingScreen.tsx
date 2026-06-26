import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, AlertTriangle, ShieldCheck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { screenFairHousing } from '@/services/listingProvenanceService';
import { ApiClient } from '@/lib/api-client';
import type { Listing, FairHousingScreenResult } from '@/types/listingContract';

/**
 * Fair-housing screen (gate 3). Runs the advertising screen over the listing's
 * stored title/description and shows the flagged phrases so the landlord knows
 * what to edit. The screen restamps `fairHousingCleared` server-side, which
 * gates activation (a flagged listing can't be published).
 */
export function FairHousingScreen({ listing }: { listing: Listing }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [result, setResult] = useState<FairHousingScreenResult | null>(null);
  const [running, setRunning] = useState(false);

  const run = async () => {
    setRunning(true);
    try {
      const r = await screenFairHousing(listing.id);
      setResult(r);
      // The screen restamps the cleared flag, so refresh the listing/gate.
      await queryClient.invalidateQueries({
        queryKey: ['listing', listing.id],
      });
    } catch (error) {
      toast({
        title: 'Screen failed',
        description: ApiClient.handleError(error),
        variant: 'destructive',
      });
    } finally {
      setRunning(false);
    }
  };

  // Prefer the just-run result; otherwise reflect the listing's stored status.
  const cleared = result
    ? result.cleared
    : listing.provenance.fairHousingCleared;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2">
          Fair-housing screen
          <Badge
            variant="secondary"
            className="flex items-center gap-1 text-xs font-normal"
          >
            {cleared ? (
              <Check className="h-3 w-3 text-green-600" />
            ) : (
              <AlertTriangle className="h-3 w-3 text-amber-600" />
            )}
            {cleared ? 'Cleared' : 'Needs attention'}
          </Badge>
        </CardTitle>
        <CardDescription>
          Checks the listing's title and description for prohibited
          protected-class language.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {result && !result.cleared && result.flags.length > 0 && (
          <div className="rounded-md border border-amber-300 bg-amber-50 p-3 space-y-1">
            <p className="text-sm font-medium text-amber-900">
              Flagged language — edit the listing to remove:
            </p>
            <ul className="list-disc pl-5 text-sm text-amber-800">
              {result.flags.map((flag) => (
                <li key={flag}>{flag}</li>
              ))}
            </ul>
          </div>
        )}
        {result && !result.cleared && result.flags.length === 0 && (
          <p className="text-sm text-amber-800">
            The listing's text didn't clear the screen. Review the title and
            description before publishing.
          </p>
        )}
        {result?.cleared && (
          <p className="text-sm text-muted-foreground">
            No prohibited language found.
          </p>
        )}

        <Button
          type="button"
          variant="outline"
          onClick={run}
          disabled={running}
        >
          <ShieldCheck className="h-4 w-4 mr-1.5" />
          {running ? 'Checking…' : 'Run fair-housing check'}
        </Button>
      </CardContent>
    </Card>
  );
}
