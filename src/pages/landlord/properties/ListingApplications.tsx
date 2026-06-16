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
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import {
  ArrowLeft,
  Mail,
  Phone,
  DollarSign,
  Briefcase,
  Calendar,
  FileText,
} from 'lucide-react';
import { format } from 'date-fns';
import { getListing } from '@/services/listingService';
import {
  getListingApplications,
  reviewApplication,
  type ApplicationStatus,
} from '@/services/applicationService';
import { ApiClient } from '@/lib/api-client';

function statusBadge(status: ApplicationStatus) {
  switch (status) {
    case 'approved':
      return <Badge className="bg-green-600">Approved</Badge>;
    case 'rejected':
      return <Badge variant="destructive">Rejected</Badge>;
    default:
      return (
        <Badge variant="outline" className="text-yellow-600 border-yellow-600">
          Pending
        </Badge>
      );
  }
}

/**
 * Per-listing applications for the landlord: list + approve/reject. The
 * all-listings inbox and rich review (scoring, notes, background checks) are a
 * post-hackathon extension — see docs/BACKEND_FILTER_GAPS.md.
 */
export default function ListingApplications() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [reviewingId, setReviewingId] = useState<string | null>(null);

  const { data: listing } = useQuery({
    queryKey: ['listing', id],
    queryFn: () => getListing(id as string),
    enabled: !!id,
  });

  const { data, isLoading, isError } = useQuery({
    queryKey: ['listing-applications', id],
    queryFn: () => getListingApplications(id as string, { pageSize: 100 }),
    enabled: !!id,
  });
  const applications = data?.data ?? [];

  const review = async (applicationId: string, status: ApplicationStatus) => {
    setReviewingId(applicationId);
    try {
      await reviewApplication(applicationId, status);
      await queryClient.invalidateQueries({
        queryKey: ['listing-applications', id],
      });
      toast({
        title:
          status === 'approved'
            ? 'Application approved'
            : 'Application rejected',
      });
    } catch (error) {
      toast({
        title: 'Could not update the application',
        description: ApiClient.handleError(error),
        variant: 'destructive',
      });
    } finally {
      setReviewingId(null);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <Button
        variant="ghost"
        onClick={() => navigate(`/landlord/properties/${id}`)}
        className="mb-4"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Property
      </Button>
      <h1 className="text-3xl font-bold mb-1">Applications</h1>
      <p className="text-muted-foreground mb-6">
        {listing?.title ?? 'Listing'}
      </p>

      {isLoading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-40 w-full" />
          ))}
        </div>
      ) : isError ? (
        <Card className="p-12 text-center">
          <p className="text-muted-foreground">
            Couldn't load applications. Please try again.
          </p>
        </Card>
      ) : applications.length === 0 ? (
        <Card className="p-12 text-center">
          <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No applications yet</h3>
          <p className="text-muted-foreground">
            Applications from tenants will appear here.
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {applications.map((app) => (
            <Card key={app.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-xl">{app.fullName}</CardTitle>
                    <CardDescription className="flex flex-wrap items-center gap-3 mt-1">
                      <span className="flex items-center gap-1">
                        <Mail className="h-3.5 w-3.5" />
                        {app.email}
                      </span>
                      <span className="flex items-center gap-1">
                        <Phone className="h-3.5 w-3.5" />
                        {app.phone}
                      </span>
                    </CardDescription>
                  </div>
                  {statusBadge(app.status)}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground flex items-center gap-1">
                      <DollarSign className="h-3.5 w-3.5" />
                      Monthly income
                    </p>
                    <p className="font-semibold">
                      ${app.monthlyIncome.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground flex items-center gap-1">
                      <Briefcase className="h-3.5 w-3.5" />
                      Employer
                    </p>
                    <p className="font-semibold truncate" title={app.employer}>
                      {app.employer}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      Move-in
                    </p>
                    <p className="font-semibold">
                      {format(new Date(app.moveInDate), 'MMM d, yyyy')}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Pets</p>
                    <p className="font-semibold">
                      {app.pets ? app.petDescription || 'Yes' : 'No'}
                    </p>
                  </div>
                </div>

                {app.additionalInfo && (
                  <div className="text-sm">
                    <p className="text-muted-foreground">
                      Notes from applicant
                    </p>
                    <p>{app.additionalInfo}</p>
                  </div>
                )}

                {app.status === 'pending' && (
                  <div className="flex gap-2 pt-2 border-t">
                    <Button
                      onClick={() => review(app.id, 'approved')}
                      disabled={reviewingId === app.id}
                    >
                      {reviewingId === app.id ? 'Saving…' : 'Approve'}
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => review(app.id, 'rejected')}
                      disabled={reviewingId === app.id}
                    >
                      Reject
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
