import { useState } from 'react';
import { CalendarClock, CheckCircle2, RefreshCw } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
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
import { daysUntil } from '@/lib/date-utils';
import {
  EXTENSION_TERM_MONTHS,
  getExtensionIntent,
  isInExtensionWindow,
  submitExtensionIntent,
  type ExtensionIntent,
} from '@/data/leaseExtensions';

// DEMO-ONLY — backend integration + open product questions documented at the
// top of src/data/leaseExtensions.ts. Banner visuals/flow are final, but the
// "intent submitted → landlord notified" side-effect is currently a toast.

interface LeaseExtensionBannerProps {
  leaseId: string;
  endDate: Date;
  propertyAddress?: string;
}

const formatDateLong = (d: Date) =>
  new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'short', day: 'numeric' }).format(d);

export function LeaseExtensionBanner({
  leaseId,
  endDate,
  propertyAddress,
}: LeaseExtensionBannerProps) {
  const { toast } = useToast();
  const [intent, setIntent] = useState<ExtensionIntent | null>(() => getExtensionIntent(leaseId));

  // Render nothing outside the 6-month → T-91 window unless an intent already exists
  // (after submission we want the success state to remain visible until lease end).
  if (!intent && !isInExtensionWindow(endDate)) {
    return null;
  }

  if (intent) {
    return (
      <Alert className="bg-background border-green-500/50 [&>svg]:text-green-600">
        <CheckCircle2 className="h-4 w-4" />
        <AlertTitle className="text-green-700">Extension requested</AlertTitle>
        <AlertDescription className="text-green-700/80">
          Your request for a {EXTENSION_TERM_MONTHS}-month extension was sent on{' '}
          {formatDateLong(intent.submittedAt)}. Awaiting landlord response.
        </AlertDescription>
      </Alert>
    );
  }

  const days = daysUntil(endDate);

  const handleConfirm = () => {
    const created = submitExtensionIntent(leaseId);
    setIntent(created);
    // TODO: backend should email/push the landlord; mocking the side-effect here.
    toast({
      title: 'Extension requested (demo)',
      description: 'Preview mode — landlord notification will go out once the backend integration ships.',
    });
  };

  return (
    <Alert className="border-yellow-300 bg-yellow-50">
      <CalendarClock className="h-4 w-4 text-yellow-700" />
      <AlertTitle className="text-yellow-900">
        Your lease ends in {days} days ({formatDateLong(endDate)})
      </AlertTitle>
      <AlertDescription className="text-yellow-800 space-y-3">
        <p>
          {propertyAddress ? `${propertyAddress} — ` : ''}
          You can request a {EXTENSION_TERM_MONTHS}-month extension now. Your landlord will
          be notified of your intent.
        </p>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button size="sm">
              <RefreshCw className="mr-2 h-4 w-4" />
              Extend Lease {EXTENSION_TERM_MONTHS} Months
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Request a {EXTENSION_TERM_MONTHS}-month extension?</AlertDialogTitle>
              <AlertDialogDescription>
                This sends your intent to renew to the landlord. They'll respond with terms.
                You can still negotiate or cancel before signing the new agreement.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Not now</AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirm}>Send request</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </AlertDescription>
    </Alert>
  );
}
