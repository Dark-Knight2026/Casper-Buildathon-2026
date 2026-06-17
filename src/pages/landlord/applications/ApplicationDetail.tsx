import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ApplicationStatusBadge } from '@/components/application/ApplicationStatusBadge';
import { useToast } from '@/hooks/use-toast';
import {
  ArrowLeft,
  Mail,
  Phone,
  CheckCircle,
  XCircle,
  Eye,
  ClipboardCheck,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import {
  getApplication,
  reviewApplication,
  type ReviewableStatus,
} from '@/services/applicationService';
import { ApiClient } from '@/lib/api-client';

/** Statuses a landlord can still act on (the backend's `can_review_to` sources). */
const OPEN_STATUSES = ['pending', 'under_review', 'conditional'];

/** Review actions, in escalating order. The backend `409`s an unreachable one. */
const REVIEW_ACTIONS: {
  status: ReviewableStatus;
  label: string;
  icon: typeof CheckCircle;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary';
}[] = [
  {
    status: 'under_review',
    label: 'Mark under review',
    icon: Eye,
    variant: 'outline',
  },
  {
    status: 'conditional',
    label: 'Conditional',
    icon: ClipboardCheck,
    variant: 'secondary',
  },
  { status: 'approved', label: 'Approve', icon: CheckCircle },
  {
    status: 'rejected',
    label: 'Reject',
    icon: XCircle,
    variant: 'destructive',
  },
];

const PAST_TENSE: Record<ReviewableStatus, string> = {
  under_review: 'moved to under review',
  conditional: 'conditionally approved',
  approved: 'approved',
  rejected: 'rejected',
};

/**
 * Landlord application detail + richer review (PL-44). Reads one application via
 * `GET /applications/{id}` and drives the lifecycle through
 * `PUT /applications/{id}/status` (`under_review`/`conditional`/`approved`/
 * `rejected`). Notes, background checks and the score breakdown are added by
 * PL-45/46/47. There is no `request_info` action — the backend has no endpoint.
 */
export default function ApplicationDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [reviewing, setReviewing] = useState(false);

  const {
    data: application,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['application', id],
    queryFn: () => getApplication(id as string),
    enabled: !!id,
  });

  const review = async (status: ReviewableStatus) => {
    if (!id) return;
    setReviewing(true);
    try {
      const updated = await reviewApplication(id, status);
      queryClient.setQueryData(['application', id], updated);
      await queryClient.invalidateQueries({
        queryKey: ['landlord-applications'],
      });
      toast({ title: `Application ${PAST_TENSE[status]}` });
    } catch (error) {
      toast({
        title: 'Could not update the application',
        description: ApiClient.handleError(error),
        variant: 'destructive',
      });
    } finally {
      setReviewing(false);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-3xl">
      <Button
        variant="ghost"
        onClick={() => navigate('/landlord/applications')}
        className="mb-4"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Applications
      </Button>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : isError || !application ? (
        <Card className="p-12 text-center">
          <p className="text-muted-foreground">
            Couldn't load this application. It may have been withdrawn.
          </p>
        </Card>
      ) : (
        <>
          {/* Header */}
          <div className="flex flex-wrap items-start justify-between gap-3 mb-2">
            <div>
              <h1 className="text-3xl font-bold">{application.fullName}</h1>
              <div className="flex flex-wrap items-center gap-4 mt-1 text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Mail className="h-4 w-4" />
                  {application.email}
                </span>
                <span className="flex items-center gap-1">
                  <Phone className="h-4 w-4" />
                  {application.phone}
                </span>
              </div>
            </div>
            <div className="text-right">
              <ApplicationStatusBadge status={application.status} />
              <p className="text-sm text-muted-foreground mt-2">
                Submitted{' '}
                {format(new Date(application.createdAt), 'MMM d, yyyy')}
              </p>
            </div>
          </div>

          {application.listing && (
            <button
              type="button"
              onClick={() =>
                navigate(`/landlord/properties/${application.listing?.id}`)
              }
              className="text-sm text-primary hover:underline mb-6"
            >
              For listing: {application.listing.title}
            </button>
          )}

          {/* Review actions */}
          {OPEN_STATUSES.includes(application.status) && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="text-lg">Review</CardTitle>
                <CardDescription>
                  Move this application through its lifecycle. Unreachable
                  transitions are rejected by the server.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-3">
                {REVIEW_ACTIONS.filter(
                  (action) => action.status !== application.status
                ).map((action) => (
                  <Button
                    key={action.status}
                    variant={action.variant}
                    disabled={reviewing}
                    onClick={() => review(action.status)}
                  >
                    <action.icon className="mr-2 h-4 w-4" />
                    {action.label}
                  </Button>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Applicant details */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">Personal</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InfoItem
                label="Date of birth"
                value={formatDate(application.dateOfBirth)}
              />
              <InfoItem
                label="Desired move-in"
                value={formatDate(application.moveInDate)}
              />
              <InfoItem
                label="Current address"
                value={`${application.currentAddress}, ${application.currentCity}, ${application.currentState} ${application.currentZip}`}
                full
              />
              <InfoItem
                label="Pets"
                value={
                  application.pets ? application.petDescription || 'Yes' : 'No'
                }
              />
              <InfoItem
                label="Background-check consent"
                value={
                  application.backgroundCheckConsent ? 'Given' : 'Not given'
                }
              />
            </CardContent>
          </Card>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">Employment & income</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InfoItem label="Employer" value={application.employer} />
              <InfoItem label="Job title" value={application.jobTitle} />
              <InfoItem
                label="Employment length"
                value={application.employmentLength}
              />
              <InfoItem
                label="Monthly income"
                value={`$${application.monthlyIncome.toLocaleString()}`}
              />
            </CardContent>
          </Card>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">References</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InfoItem
                label="Reference 1"
                value={`${application.reference1Name} · ${application.reference1Phone}`}
                full
              />
              {application.reference2Name && (
                <InfoItem
                  label="Reference 2"
                  value={`${application.reference2Name} · ${
                    application.reference2Phone ?? ''
                  }`}
                  full
                />
              )}
            </CardContent>
          </Card>

          {application.additionalInfo && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Additional info</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">
                  {application.additionalInfo}
                </p>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

/** Formats a `YYYY-MM-DD` date-only string without a UTC shift. */
function formatDate(value: string): string {
  return format(parseISO(value), 'MMM d, yyyy');
}

function InfoItem({
  label,
  value,
  full,
}: {
  label: string;
  value: string;
  full?: boolean;
}) {
  return (
    <div className={full ? 'sm:col-span-2' : undefined}>
      <p className="text-sm text-muted-foreground mb-1">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}
