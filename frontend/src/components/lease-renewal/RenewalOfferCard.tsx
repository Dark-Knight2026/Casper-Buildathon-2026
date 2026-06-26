import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LeaseRenewal } from '@/services/leaseRenewalService';
import { Calendar, DollarSign, Clock, FileText } from 'lucide-react';

interface RenewalOfferCardProps {
  renewal: LeaseRenewal;
  onViewDetails: (renewalId: string) => void;
  onRespond?: (renewalId: string) => void;
}

export default function RenewalOfferCard({ renewal, onViewDetails, onRespond }: RenewalOfferCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'accepted':
      case 'completed':
        return 'default';
      case 'declined':
        return 'destructive';
      case 'negotiating':
        return 'secondary';
      case 'offer-sent':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const isExpiringSoon = () => {
    if (!renewal.response_deadline) return false;
    const deadline = new Date(renewal.response_deadline);
    const today = new Date();
    const daysUntilDeadline = Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilDeadline <= 3 && daysUntilDeadline > 0;
  };

  const rentChange = renewal.proposed_rent - renewal.original_rent;
  const rentChangePercent = ((rentChange / renewal.original_rent) * 100).toFixed(1);

  return (
    <Card className={isExpiringSoon() ? 'border-orange-500' : ''}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">Lease Renewal Offer</CardTitle>
            <CardDescription>ID: {renewal.id.slice(0, 8)}</CardDescription>
          </div>
          <Badge variant={getStatusColor(renewal.status)}>
            {renewal.status.replace('-', ' ').toUpperCase()}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-start gap-2">
            <DollarSign className="h-4 w-4 mt-1 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Current Rent</p>
              <p className="text-lg font-bold">${renewal.original_rent.toLocaleString()}</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <DollarSign className="h-4 w-4 mt-1 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Proposed Rent</p>
              <p className="text-lg font-bold">${renewal.proposed_rent.toLocaleString()}</p>
              {rentChange !== 0 && (
                <p className={`text-xs ${rentChange > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {rentChange > 0 ? '+' : ''}{rentChangePercent}%
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-start gap-2">
            <Calendar className="h-4 w-4 mt-1 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium text-muted-foreground">Lease Term</p>
              <p className="text-sm">{renewal.proposed_term_months} months</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Calendar className="h-4 w-4 mt-1 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium text-muted-foreground">Start Date</p>
              <p className="text-sm">{new Date(renewal.proposed_start_date).toLocaleDateString()}</p>
            </div>
          </div>
        </div>

        {renewal.response_deadline && !renewal.tenant_response && (
          <div className={`flex items-start gap-2 p-3 rounded-lg ${isExpiringSoon() ? 'bg-orange-50 border border-orange-200' : 'bg-muted'}`}>
            <Clock className={`h-4 w-4 mt-1 ${isExpiringSoon() ? 'text-orange-600' : 'text-muted-foreground'}`} />
            <div>
              <p className="text-sm font-medium">Response Deadline</p>
              <p className="text-sm">{new Date(renewal.response_deadline).toLocaleDateString()}</p>
              {isExpiringSoon() && (
                <p className="text-xs text-orange-600 font-medium mt-1">Deadline approaching!</p>
              )}
            </div>
          </div>
        )}

        {renewal.offer_document_url && (
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <a
              href={renewal.offer_document_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:underline"
            >
              View Offer Document
            </a>
          </div>
        )}

        {renewal.tenant_response && (
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-sm font-medium">Your Response</p>
            <p className="text-sm capitalize">{renewal.tenant_response}</p>
            {renewal.tenant_response_date && (
              <p className="text-xs text-muted-foreground mt-1">
                {new Date(renewal.tenant_response_date).toLocaleDateString()}
              </p>
            )}
          </div>
        )}

        {renewal.counter_offer_rent && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm font-medium text-blue-900">Counter Offer</p>
            <p className="text-sm text-blue-800">Proposed Rent: ${renewal.counter_offer_rent.toLocaleString()}</p>
            {renewal.counter_offer_terms && (
              <p className="text-xs text-blue-700 mt-1">{renewal.counter_offer_terms}</p>
            )}
          </div>
        )}

        <div className="flex gap-2">
          <Button variant="outline" onClick={() => onViewDetails(renewal.id)} className="flex-1">
            View Details
          </Button>
          {onRespond && !renewal.tenant_response && renewal.status === 'offer-sent' && (
            <Button onClick={() => onRespond(renewal.id)} className="flex-1">
              Respond to Offer
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}