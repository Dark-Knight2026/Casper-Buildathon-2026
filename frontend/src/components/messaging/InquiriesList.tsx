import { useMessaging } from '@/hooks/useMessaging';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Home, DollarSign, Calendar, CreditCard, Mail, Phone } from 'lucide-react';
import { format } from 'date-fns';

export default function InquiriesList() {
  const { propertyInquiries } = useMessaging();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new':
        return 'bg-blue-100 text-blue-800';
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-800';
      case 'closed':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ');
  };

  if (propertyInquiries.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <Home className="h-12 w-12 mx-auto mb-4 text-gray-300" />
        <p className="text-lg font-medium mb-2">No property inquiries</p>
        <p className="text-sm">Submit inquiries to agents about properties you're interested in</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {propertyInquiries.map((inquiry) => (
        <Card key={inquiry.id}>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-lg">{inquiry.agentName}</CardTitle>
                <p className="text-sm text-gray-600 mt-1">Property Inquiry</p>
              </div>
              <Badge className={getStatusColor(inquiry.status)}>
                {getStatusText(inquiry.status)}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2 text-sm">
                <Home className="h-4 w-4 text-gray-500" />
                <span>{inquiry.propertyType}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <DollarSign className="h-4 w-4 text-gray-500" />
                <span>{inquiry.budget}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-gray-500" />
                <span>{inquiry.timeline}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CreditCard className="h-4 w-4 text-gray-500" />
                <span>{inquiry.financing}</span>
              </div>
            </div>

            {inquiry.propertyAddress && (
              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="text-sm font-medium text-blue-900">Property Address:</p>
                <p className="text-sm text-blue-700">{inquiry.propertyAddress}</p>
              </div>
            )}

            {inquiry.message && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-700">{inquiry.message}</p>
              </div>
            )}

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Mail className="h-4 w-4" />
                <span>{inquiry.userEmail}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Phone className="h-4 w-4" />
                <span>{inquiry.userPhone}</span>
              </div>
            </div>

            <div className="text-xs text-gray-500">
              Submitted {format(inquiry.createdAt, 'MMM dd, yyyy')}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}