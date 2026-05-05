import { Home, Tag, Lock } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import {
  LANDLORD_LISTING_DAYS,
  canLandlordList,
  daysUntil,
  getExtensionIntent,
  getTenantDecision,
} from '@/data/leaseExtensions';

// DEMO-ONLY — full Task 5 spec + open product questions are documented at the
// top of src/data/leaseExtensions.ts.

interface LandlordListingActionsProps {
  leaseId: string;
  endDate: Date;
}

const formatDateLong = (d: Date) =>
  new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'short', day: 'numeric' }).format(d);

export function LandlordListingActions({ leaseId, endDate }: LandlordListingActionsProps) {
  const { toast } = useToast();
  const days = daysUntil(endDate);
  const enabled = canLandlordList(endDate, leaseId);
  const tenantDecision = getTenantDecision(leaseId);
  const tenantExtended = getExtensionIntent(leaseId) !== null;

  const handleListForRent = () => {
    // TODO: backend POST /api/v1/properties/:id/list-for-rent (gated server-side)
    toast({
      title: 'Listed for rent (mock)',
      description: 'Property is now visible in tenant search results.',
    });
  };

  const handleListForSale = () => {
    // TODO: backend POST /api/v1/properties/:id/list-for-sale (gated server-side)
    toast({
      title: 'Listed for sale (mock)',
      description: 'Property is now visible in sale listings.',
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <CardTitle className="flex items-center gap-2">
              Lease lifecycle actions
              {!enabled && <Lock className="h-4 w-4 text-muted-foreground" aria-hidden="true" />}
            </CardTitle>
            <CardDescription>
              Lease ends {formatDateLong(endDate)} ({days} days remaining)
            </CardDescription>
          </div>
          {tenantExtended && (
            <Badge className="bg-green-100 text-green-800">Extension requested</Badge>
          )}
          {tenantDecision && (
            <Badge className={tenantDecision.decision === 'renew' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}>
              Tenant: {tenantDecision.decision === 'renew' ? 'Renew' : 'Move out'}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {!enabled && !tenantExtended && (
          <p className="text-sm text-muted-foreground">
            Listing actions unlock {LANDLORD_LISTING_DAYS} days before lease expiration.
          </p>
        )}
        {tenantExtended && (
          <p className="text-sm text-muted-foreground">
            Tenant requested an extension — listing actions are blocked until the
            renewal track resolves.
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button disabled={!enabled}>
                <Home className="mr-2 h-4 w-4" />
                List for Rent
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>List property for rent?</AlertDialogTitle>
                <AlertDialogDescription>
                  The property will appear in tenant search results once the
                  current lease ends. You can edit price and terms before
                  publishing.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleListForRent}>Confirm</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" disabled={!enabled}>
                <Tag className="mr-2 h-4 w-4" />
                List for Sale
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>List property for sale?</AlertDialogTitle>
                <AlertDialogDescription>
                  The property will appear in sale listings. Buyers will see the
                  property once the current lease ends.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleListForSale}>Confirm</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
}
