import { useMessaging } from '@/hooks/useMessaging';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, MapPin, DollarSign, CheckCircle, XCircle } from 'lucide-react';
import { format } from 'date-fns';

export default function ConsultationsList() {
  const { consultationRequests, updateConsultationStatus } = useMessaging();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'confirmed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ');
  };

  if (consultationRequests.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
        <p className="text-lg font-medium mb-2">No consultation requests</p>
        <p className="text-sm">Schedule consultations with agents from their profiles</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {consultationRequests.map((request) => (
        <Card key={request.id}>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-lg">{request.agentName}</CardTitle>
                <p className="text-sm text-gray-600 mt-1">Consultation Request</p>
              </div>
              <Badge className={getStatusColor(request.status)}>
                {getStatusText(request.status)}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-gray-500" />
                <span>{format(request.preferredDate, 'MMM dd, yyyy')}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-gray-500" />
                <span>{request.preferredTime}</span>
              </div>
              {request.propertyType && (
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-gray-500" />
                  <span>{request.propertyType}</span>
                </div>
              )}
              {request.budget && (
                <div className="flex items-center gap-2 text-sm">
                  <DollarSign className="h-4 w-4 text-gray-500" />
                  <span>{request.budget}</span>
                </div>
              )}
            </div>

            {request.message && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-700">{request.message}</p>
              </div>
            )}

            <div className="text-xs text-gray-500">
              Requested {format(request.createdAt, 'MMM dd, yyyy')}
            </div>

            {request.status === 'pending' && (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => updateConsultationStatus(request.id, 'cancelled')}
                  className="flex-1"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}