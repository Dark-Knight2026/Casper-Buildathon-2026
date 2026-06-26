import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MaintenanceRequest } from '@/services/maintenanceService';
import { Clock, Wrench, CheckCircle, XCircle, AlertCircle, MessageSquare } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface MaintenanceRequestCardProps {
  request: MaintenanceRequest & {
    properties?: {
      address: string;
      city: string;
      state: string;
    };
    vendors?: {
      name: string;
      company: string;
      phone: string;
    };
  };
  userType: 'tenant' | 'landlord';
}

export default function MaintenanceRequestCard({ request, userType }: MaintenanceRequestCardProps) {
  const navigate = useNavigate();

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'emergency':
        return 'destructive';
      case 'high':
        return 'default';
      case 'medium':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'submitted':
        return <Clock className="h-4 w-4" />;
      case 'assigned':
      case 'in-progress':
        return <Wrench className="h-4 w-4" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'default';
      case 'in-progress':
      case 'assigned':
        return 'secondary';
      case 'cancelled':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              {getStatusIcon(request.status)}
              {request.category.charAt(0).toUpperCase() + request.category.slice(1)}
            </CardTitle>
            {request.properties && (
              <CardDescription>
                {request.properties.address}, {request.properties.city}, {request.properties.state}
              </CardDescription>
            )}
          </div>
          <div className="flex gap-2">
            <Badge variant={getPriorityColor(request.priority)}>
              {request.priority}
            </Badge>
            <Badge variant={getStatusColor(request.status)}>
              {request.status}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-sm font-medium mb-1">Description:</p>
          <p className="text-sm text-muted-foreground">{request.description}</p>
        </div>

        {request.photos && request.photos.length > 0 && (
          <div>
            <p className="text-sm font-medium mb-2">Photos:</p>
            <div className="flex gap-2 flex-wrap">
              {request.photos.slice(0, 3).map((photo, index) => (
                <img
                  key={index}
                  src={photo}
                  alt={`Issue ${index + 1}`}
                  className="w-20 h-20 object-cover rounded-lg cursor-pointer hover:opacity-80"
                  onClick={() => window.open(photo, '_blank')}
                />
              ))}
              {request.photos.length > 3 && (
                <div className="w-20 h-20 bg-muted rounded-lg flex items-center justify-center">
                  <p className="text-sm font-medium">+{request.photos.length - 3}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {request.vendors && (
          <div>
            <p className="text-sm font-medium mb-1">Assigned Vendor:</p>
            <p className="text-sm text-muted-foreground">
              {request.vendors.name} - {request.vendors.company}
            </p>
            <p className="text-sm text-muted-foreground">{request.vendors.phone}</p>
          </div>
        )}

        {request.estimated_completion_date && (
          <div>
            <p className="text-sm font-medium mb-1">Expected Completion:</p>
            <p className="text-sm text-muted-foreground">
              {new Date(request.estimated_completion_date).toLocaleDateString()}
            </p>
          </div>
        )}

        {request.estimated_cost && (
          <div>
            <p className="text-sm font-medium mb-1">Estimated Cost:</p>
            <p className="text-sm text-muted-foreground">${request.estimated_cost.toLocaleString()}</p>
          </div>
        )}

        {request.actual_cost && (
          <div>
            <p className="text-sm font-medium mb-1">Actual Cost:</p>
            <p className="text-sm text-muted-foreground">${request.actual_cost.toLocaleString()}</p>
          </div>
        )}

        {request.status === 'completed' && !request.rating && userType === 'tenant' && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-900 mb-2">Please rate this service</p>
            <Button
              size="sm"
              onClick={() => navigate(`/tenant/maintenance/${request.id}`)}
            >
              Provide Feedback
            </Button>
          </div>
        )}

        {request.rating && (
          <div>
            <p className="text-sm font-medium mb-1">Rating:</p>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <span
                  key={star}
                  className={star <= request.rating! ? 'text-yellow-500' : 'text-gray-300'}
                >
                  ★
                </span>
              ))}
            </div>
            {request.feedback && (
              <p className="text-sm text-muted-foreground mt-1">{request.feedback}</p>
            )}
          </div>
        )}

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/${userType}/maintenance/${request.id}`)}
          >
            <MessageSquare className="h-4 w-4 mr-2" />
            View Details
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          Submitted: {new Date(request.created_at).toLocaleString()}
        </p>
      </CardContent>
    </Card>
  );
}