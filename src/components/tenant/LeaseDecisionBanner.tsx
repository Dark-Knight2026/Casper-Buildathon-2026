import { useState } from 'react';
import { AlertTriangle, CheckCircle2, DoorOpen, RefreshCw } from 'lucide-react';
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
  getTenantDecision,
  isInDecisionWindow,
  submitTenantDecision,
  type TenantDecision,
  type TenantDecisionType,
} from '@/data/leaseExtensions';

// DEMO-ONLY — full Task 5 spec + open product questions are documented at the
// top of src/data/leaseExtensions.ts.

interface LeaseDecisionBannerProps {
  leaseId: string;
  endDate: Date;
  propertyAddress?: string;
}

const formatDateLong = (d: Date) =>
  new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'short', day: 'numeric' }).format(d);

const DECISION_LABEL: Record<TenantDecisionType, string> = {
  renew: 'Renew lease',
  move_out: 'Move out',
};

export function LeaseDecisionBanner({
  leaseId,
  endDate,
  propertyAddress,
}: LeaseDecisionBannerProps) {
  const { toast } = useToast();
  const [decision, setDecision] = useState<TenantDecision | null>(() => getTenantDecision(leaseId));

  if (!decision && !isInDecisionWindow(endDate, leaseId)) {
    return null;
  }

  if (decision) {
    const isRenew = decision.decision === 'renew';
    return (
      <Alert
        className={`bg-background ${
          isRenew
            ? 'border-green-500/50 [&>svg]:text-green-600'
            : 'border-blue-500/50 [&>svg]:text-blue-600'
        }`}
      >
        <CheckCircle2 className="h-4 w-4" />
        <AlertTitle className={isRenew ? 'text-green-700' : 'text-blue-700'}>
          Decision recorded: {DECISION_LABEL[decision.decision]}
        </AlertTitle>
        <AlertDescription className={isRenew ? 'text-green-700/80' : 'text-blue-700/80'}>
          Submitted {formatDateLong(decision.submittedAt)}.{' '}
          {isRenew
            ? 'Your landlord will reach out with renewal terms.'
            : `Move-out scheduled for lease end on ${formatDateLong(endDate)}.`}
        </AlertDescription>
      </Alert>
    );
  }

  const days = daysUntil(endDate);

  const handleConfirm = (kind: TenantDecisionType) => {
    const record = submitTenantDecision(leaseId, kind);
    setDecision(record);
    // TODO: backend should email/push the landlord; mocking the side-effect here.
    toast({
      title:
        kind === 'renew'
          ? 'Renewal request sent (demo)'
          : 'Move-out confirmed (demo)',
      description: 'Preview mode — landlord notification will go out once the backend integration ships.',
    });
  };

  return (
    <Alert className="bg-background border-red-500/50 [&>svg]:text-red-600">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle className="text-red-700">
        Decision required — lease ends in {days} days ({formatDateLong(endDate)})
      </AlertTitle>
      <AlertDescription className="text-red-700/80 space-y-3">
        <p>
          {propertyAddress ? `${propertyAddress} — ` : ''}
          The 6-month extension window has passed. Choose to renew or move out so
          your landlord can plan accordingly.
        </p>
        <div className="flex flex-wrap gap-2">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="sm">
                <RefreshCw className="mr-2 h-4 w-4" />
                Renew Lease
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Renew this lease?</AlertDialogTitle>
                <AlertDialogDescription>
                  Notifies your landlord of your intent to renew. They'll respond
                  with terms (rent, length). You can negotiate before signing.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => handleConfirm('renew')}>
                  Confirm renewal
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="sm" variant="outline">
                <DoorOpen className="mr-2 h-4 w-4" />
                Move Out
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Confirm move-out?</AlertDialogTitle>
                <AlertDialogDescription>
                  Your landlord will be notified and may list the property for
                  rent or sale starting day 90 before the lease ends.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => handleConfirm('move_out')}>
                  Confirm move-out
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </AlertDescription>
    </Alert>
  );
}
