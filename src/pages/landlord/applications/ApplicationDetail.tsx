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
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { ApplicationStatusBadge } from '@/components/application/ApplicationStatusBadge';
import { ApplicationScore } from '@/pages/landlord/applications/ApplicationScore';
import { useToast } from '@/hooks/use-toast';
import {
  ArrowLeft,
  Mail,
  Phone,
  CheckCircle,
  XCircle,
  Eye,
  ClipboardCheck,
  MessageSquare,
  ShieldCheck,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import {
  getApplication,
  getApplicationNotes,
  addApplicationNote,
  getBackgroundChecks,
  requestBackgroundCheck,
  reviewApplication,
  type ReviewableStatus,
  type BackendApplicationNote,
  type BackgroundCheck,
  type BackgroundCheckType,
  type BackgroundCheckStatus,
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

const CHECK_TYPES: { type: BackgroundCheckType; label: string }[] = [
  { type: 'credit', label: 'Credit' },
  { type: 'criminal', label: 'Criminal' },
  { type: 'eviction', label: 'Eviction' },
];

const BG_STATUS_STYLE: Record<BackgroundCheckStatus, string> = {
  pending: 'bg-yellow-500',
  completed: 'bg-green-600',
  failed: 'bg-red-500',
};

/**
 * Landlord application detail + richer review (PL-44) with internal notes
 * (PL-45) and background checks (PL-46). Reads one application via
 * `GET /applications/{id}` and drives the lifecycle through
 * `PUT /applications/{id}/status`. The background-check provider is stubbed on
 * the backend (hackathon) — results are fake. The score breakdown is PL-47.
 * There is no `request_info` action — the backend has no endpoint.
 */
export default function ApplicationDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [reviewing, setReviewing] = useState(false);
  const [noteDraft, setNoteDraft] = useState('');
  const [addingNote, setAddingNote] = useState(false);
  const [requestingCheck, setRequestingCheck] =
    useState<BackgroundCheckType | null>(null);

  const {
    data: application,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['application', id],
    queryFn: () => getApplication(id as string),
    enabled: !!id,
  });

  const { data: notes = [] } = useQuery({
    queryKey: ['application-notes', id],
    queryFn: () => getApplicationNotes(id as string),
    enabled: !!id,
  });

  const { data: backgroundChecks = [] } = useQuery({
    queryKey: ['application-background-checks', id],
    queryFn: () => getBackgroundChecks(id as string),
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

  const addNote = async () => {
    const body = noteDraft.trim();
    if (!id || !body) return;
    setAddingNote(true);
    try {
      await addApplicationNote(id, body);
      setNoteDraft('');
      await queryClient.invalidateQueries({
        queryKey: ['application-notes', id],
      });
    } catch (error) {
      toast({
        title: 'Could not add the note',
        description: ApiClient.handleError(error),
        variant: 'destructive',
      });
    } finally {
      setAddingNote(false);
    }
  };

  const requestCheck = async (type: BackgroundCheckType) => {
    if (!id) return;
    setRequestingCheck(type);
    try {
      await requestBackgroundCheck(id, type);
      await queryClient.invalidateQueries({
        queryKey: ['application-background-checks', id],
      });
    } catch (error) {
      toast({
        title: 'Could not request the check',
        description: ApiClient.handleError(error),
        variant: 'destructive',
      });
    } finally {
      setRequestingCheck(null);
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

          {/* Applicant score (PL-47) */}
          <ApplicationScore applicationId={application.id} />

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
            <Card className="mb-6">
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

          {/* Background checks (provider stubbed — results are illustrative) */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <ShieldCheck className="h-5 w-5" />
                Background checks
              </CardTitle>
              <CardDescription>
                {application.backgroundCheckConsent
                  ? 'Order a check for this applicant.'
                  : 'The applicant has not consented to a background check.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {CHECK_TYPES.map(({ type, label }) => {
                const existing = backgroundChecks.find(
                  (check) => check.checkType === type
                );
                return (
                  <BackgroundCheckCard
                    key={type}
                    label={label}
                    check={existing}
                    disabled={
                      !application.backgroundCheckConsent ||
                      requestingCheck !== null
                    }
                    requesting={requestingCheck === type}
                    onRequest={() => requestCheck(type)}
                  />
                );
              })}
            </CardContent>
          </Card>

          {/* Internal landlord notes (private to landlords) */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Internal notes
              </CardTitle>
              <CardDescription>
                Private to landlords — the applicant never sees these.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Textarea
                  placeholder="Add a note about this application…"
                  value={noteDraft}
                  onChange={(event) => setNoteDraft(event.target.value)}
                  rows={3}
                />
                <Button
                  onClick={addNote}
                  disabled={addingNote || !noteDraft.trim()}
                >
                  {addingNote ? 'Adding…' : 'Add note'}
                </Button>
              </div>

              {notes.length > 0 && (
                <ul className="space-y-3 pt-2 border-t">
                  {notes.map((note) => (
                    <NoteRow key={note.id} note={note} />
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

/** Formats a `YYYY-MM-DD` date-only string without a UTC shift. */
function formatDate(value: string): string {
  return format(parseISO(value), 'MMM d, yyyy');
}

function BackgroundCheckCard({
  label,
  check,
  disabled,
  requesting,
  onRequest,
}: {
  label: string;
  check?: BackgroundCheck;
  disabled: boolean;
  requesting: boolean;
  onRequest: () => void;
}) {
  return (
    <div className="border rounded-lg p-4 flex flex-col gap-2">
      <p className="font-medium">{label}</p>
      {check ? (
        <>
          <Badge className={BG_STATUS_STYLE[check.status]}>
            {check.status}
          </Badge>
          {check.completedAt && (
            <p className="text-xs text-muted-foreground">
              {format(new Date(check.completedAt), 'MMM d, yyyy')}
            </p>
          )}
        </>
      ) : (
        <Button
          size="sm"
          variant="outline"
          disabled={disabled}
          onClick={onRequest}
        >
          {requesting ? 'Requesting…' : 'Request'}
        </Button>
      )}
    </div>
  );
}

function NoteRow({ note }: { note: BackendApplicationNote }) {
  return (
    <li className="text-sm">
      <p className="whitespace-pre-wrap">{note.body}</p>
      <p className="text-xs text-muted-foreground mt-1">
        {format(new Date(note.createdAt), 'MMM d, yyyy h:mm a')}
      </p>
    </li>
  );
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
