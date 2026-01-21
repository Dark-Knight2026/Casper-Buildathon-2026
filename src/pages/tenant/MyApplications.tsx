import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { propertyActionsService, type RentalApplication } from '@/services/propertyActionsService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Loader2, FileText, MapPin, Calendar, DollarSign, Briefcase } from 'lucide-react';
import { format } from 'date-fns';

interface ApplicationWithProperty extends RentalApplication {
  property?: {
    id: string;
    title: string;
    address: string;
    city: string;
    state: string;
  };
}

export default function MyApplications() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [applications, setApplications] = useState<ApplicationWithProperty[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchApplications = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      const data = await propertyActionsService.getUserApplications(user.id);
      setApplications(data as ApplicationWithProperty[]);
    } catch (error) {
      console.error('Error loading applications:', error);
      toast({
        title: 'Error',
        description: 'Failed to load applications. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    if (!user) {
      navigate('/auth/login');
      return;
    }
    fetchApplications();
  }, [user, navigate, fetchApplications]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-600">Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      case 'pending':
      default:
        return <Badge variant="outline" className="text-yellow-600 border-yellow-600">Pending</Badge>;
    }
  };

  const handleViewProperty = (propertyId: string) => {
    navigate(`/properties/${propertyId}`);
  };

  if (loading) {
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
              <h1 className="text-3xl font-bold text-gray-900 mb-2">My Applications</h1>
              <p className="text-gray-600">
                {applications.length} {applications.length === 1 ? 'application' : 'applications'} submitted
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
        {applications.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">No applications yet</h2>
            <p className="text-gray-600 mb-6">
              Start browsing properties and submit applications to view them here.
            </p>
            <Button onClick={() => navigate('/tenant/property-search')}>
              Browse Properties
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {applications.map((application) => {
              const property = application.property;
              
              return (
                <Card key={application.id} className="overflow-hidden">
                  <CardHeader className="bg-gray-50 border-b">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-xl mb-2">
                          {property?.title || 'Property Application'}
                        </CardTitle>
                        {property && (
                          <div className="flex items-center text-gray-600 text-sm">
                            <MapPin className="h-4 w-4 mr-1" />
                            <span>{property.address}, {property.city}, {property.state}</span>
                          </div>
                        )}
                      </div>
                      <div className="ml-4">
                        {getStatusBadge(application.status)}
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
                          {format(new Date(application.created_at), 'MMM dd, yyyy')}
                        </p>
                      </div>

                      <div>
                        <div className="flex items-center text-gray-500 text-sm mb-1">
                          <Calendar className="h-4 w-4 mr-1" />
                          <span>Move-in Date</span>
                        </div>
                        <p className="font-semibold text-gray-900">
                          {format(new Date(application.move_in_date), 'MMM dd, yyyy')}
                        </p>
                      </div>

                      <div>
                        <div className="flex items-center text-gray-500 text-sm mb-1">
                          <DollarSign className="h-4 w-4 mr-1" />
                          <span>Monthly Income</span>
                        </div>
                        <p className="font-semibold text-gray-900">
                          ${application.monthly_income.toLocaleString()}
                        </p>
                      </div>

                      <div>
                        <div className="flex items-center text-gray-500 text-sm mb-1">
                          <Briefcase className="h-4 w-4 mr-1" />
                          <span>Employment</span>
                        </div>
                        <p className="font-semibold text-gray-900 truncate" title={application.employer}>
                          {application.employer}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t">
                      <div className="text-sm text-gray-600">
                        <span className="font-medium">Status:</span>{' '}
                        {application.status === 'pending' && 'Awaiting landlord review'}
                        {application.status === 'approved' && 'Congratulations! Your application was approved.'}
                        {application.status === 'rejected' && 'Unfortunately, your application was not approved.'}
                      </div>
                      {property && (
                        <Button
                          variant="outline"
                          onClick={() => handleViewProperty(property.id)}
                        >
                          View Property
                        </Button>
                      )}
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