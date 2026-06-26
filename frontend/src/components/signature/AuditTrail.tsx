import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Send,
  Eye,
  CheckCircle,
  XCircle,
  CheckCheck,
  Clock,
  Bell,
} from 'lucide-react';
import type { AuditEvent } from '@/types/signature';

interface AuditTrailProps {
  events: AuditEvent[];
  onExport?: () => void;
}

export default function AuditTrail({ events, onExport }: AuditTrailProps) {
  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'sent':
        return <Send className="h-5 w-5 text-blue-600" />;
      case 'viewed':
        return <Eye className="h-5 w-5 text-purple-600" />;
      case 'signed':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'declined':
        return <XCircle className="h-5 w-5 text-red-600" />;
      case 'completed':
        return <CheckCheck className="h-5 w-5 text-green-600" />;
      case 'expired':
        return <Clock className="h-5 w-5 text-orange-600" />;
      case 'reminded':
        return <Bell className="h-5 w-5 text-yellow-600" />;
      default:
        return <Clock className="h-5 w-5 text-gray-600" />;
    }
  };

  const getEventLabel = (eventType: string) => {
    switch (eventType) {
      case 'sent':
        return 'Document Sent';
      case 'viewed':
        return 'Document Viewed';
      case 'signed':
        return 'Document Signed';
      case 'declined':
        return 'Signature Declined';
      case 'completed':
        return 'Workflow Completed';
      case 'expired':
        return 'Workflow Expired';
      case 'reminded':
        return 'Reminder Sent';
      default:
        return eventType;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Audit Trail</CardTitle>
          {onExport && (
            <Button variant="outline" size="sm" onClick={onExport}>
              Export
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <p className="text-center text-gray-500 py-8">No audit events yet</p>
        ) : (
          <div className="space-y-4">
            {events.map((event) => (
              <div key={event.id} className="flex gap-4">
                <div className="flex-shrink-0 mt-1">
                  {getEventIcon(event.event_type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-sm">
                        {getEventLabel(event.event_type)}
                      </p>
                      <p className="text-sm text-gray-600">
                        {format(new Date(event.timestamp), 'MMM dd, yyyy HH:mm:ss')}
                      </p>
                    </div>
                  </div>
                  {event.user_agent && (
                    <p className="text-xs text-gray-500 mt-1 truncate">
                      {event.user_agent}
                    </p>
                  )}
                  {event.ip_address && (
                    <p className="text-xs text-gray-500">
                      IP: {event.ip_address}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}