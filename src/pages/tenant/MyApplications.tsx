import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { ApiClient } from '@/lib/api-client';
import {
  getMyApplications,
  submitDraftApplication,
} from '@/services/applicationService';
import { formatFullAddress } from '@/lib/listingDisplay';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ApplicationStatusBadge } from '@/components/application/ApplicationStatusBadge';
import {
  Loader2,
  FileText,
  MapPin,
  Calendar,
  DollarSign,
  Briefcase,
} from 'lucide-react';
import { format } from 'date-fns';

export default function MyApplications() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [submittingId, setSubmittingId] = useState<string | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['my-applications'],
    queryFn: () => getMyApplications({ pageSize: 100 }),
  });
  const applications = data?.data ?? [];

  const submitDraft = async (id: string) => {
    setSubmittingId(id);
    try {
      await submitDraftApplication(id);
      await queryClient.invalidateQueries({ queryKey: ['my-applications'] });
      toast({ title: 'Application submitted' });
    } catch (error) {
      toast({
        title: 'Could not submit',
        description: ApiClient.handleError(error),
        variant: 'destructive',
      });
    } finally {
      setSubmittingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading applications...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                My Applications
              </h1>
              <p className="text-gray-600">
                {applications.length}{' '}
                {applications.length === 1 ? 'application' : 'applications'}
              </p>
            </div>
            <Button onClick={() => navigate('/tenant/property-search')}>
              Browse Properties
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isError ? (
          <p className="text-center text-muted-foreground py-12">
            Couldn't load your applications. Please try again.
          </p>
        ) : applications.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">
              No applications yet
            </h2>
            <p className="text-gray-600 mb-6">
              Start browsing properties and submit applications to view them
              here.
            </p>
            <Button onClick={() => navigate('/tenant/property-search')}>
              Browse Properties
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {applications.map((application) => {
              const listing = application.listing;
              const address = formatFullAddress(listing?.property);

              return (
                <Card key={application.id} className="overflow-hidden">
                  <CardHeader className="bg-gray-50 border-b">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-xl mb-2">
                          {listing?.title || 'Property Application'}
                        </CardTitle>
                        {address && (
                          <div className="flex items-center text-gray-600 text-sm">
                            <MapPin className="h-4 w-4 mr-1" />
                            <span>{address}</span>
                          </div>
                        )}
                      </div>
                      <div className="ml-4">
                        <ApplicationStatusBadge status={application.status} />
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                      <div>
                        <div className="flex items-center text-gray-500 text-sm mb-1">
                          <Calendar className="h-4 w-4 mr-1" />
                          <span>Applied On</span>
                        </div>
                        <p className="font-semibold text-gray-900">
                          {format(
                            new Date(application.createdAt),
                            'MMM dd, yyyy'
                          )}
                        </p>
                      </div>

                      <div>
                        <div className="flex items-center text-gray-500 text-sm mb-1">
                          <Calendar className="h-4 w-4 mr-1" />
                          <span>Move-in Date</span>
                        </div>
                        <p className="font-semibold text-gray-900">
                          {format(
                            new Date(application.moveInDate),
                            'MMM dd, yyyy'
                          )}
                        </p>
                      </div>

                      <div>
                        <div className="flex items-center text-gray-500 text-sm mb-1">
                          <DollarSign className="h-4 w-4 mr-1" />
                          <span>Monthly Income</span>
                        </div>
                        <p className="font-semibold text-gray-900">
                          ${application.monthlyIncome.toLocaleString()}
                        </p>
                      </div>

                      <div>
                        <div className="flex items-center text-gray-500 text-sm mb-1">
                          <Briefcase className="h-4 w-4 mr-1" />
                          <span>Employment</span>
                        </div>
                        <p
                          className="font-semibold text-gray-900 truncate"
                          title={application.employer}
                        >
                          {application.employer}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t gap-4">
                      <div className="text-sm text-gray-600">
                        <span className="font-medium">Status:</span>{' '}
                        {application.status === 'draft' &&
                          'Draft — not yet submitted to the landlord.'}
                        {application.status === 'pending' &&
                          'Awaiting landlord review'}
                        {application.status === 'under_review' &&
                          'The landlord is reviewing your application.'}
                        {application.status === 'conditional' &&
                          'Conditionally approved — pending stated conditions.'}
                        {application.status === 'approved' &&
                          'Congratulations! Your application was approved.'}
                        {application.status === 'rejected' &&
                          'Unfortunately, your application was not approved.'}
                      </div>
                      <div className="flex gap-2 shrink-0">
                        {application.status === 'draft' && (
                          <>
                            <Button
                              variant="outline"
                              onClick={() =>
                                navigate('/tenant/application', {
                                  state: { draftId: application.id },
                                })
                              }
                            >
                              Edit
                            </Button>
                            <Button
                              disabled={submittingId === application.id}
                              onClick={() => submitDraft(application.id)}
                            >
                              {submittingId === application.id
                                ? 'Submitting…'
                                : 'Submit'}
                            </Button>
                          </>
                        )}
                        {listing && (
                          <Button
                            variant="outline"
                            onClick={() =>
                              navigate(`/properties/${listing.id}`, {
                                state: { listing },
                              })
                            }
                          >
                            View Property
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
