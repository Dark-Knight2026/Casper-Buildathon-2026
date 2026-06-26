import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Mail, MessageSquare, Phone, Send, Eye, MousePointer, Reply, Clock, CheckCircle2 } from 'lucide-react';
import type { CommunicationRecord } from '@/types/communication';
import { format } from 'date-fns';

interface CommunicationHistoryProps {
  communications: CommunicationRecord[];
}

export default function CommunicationHistory({ communications }: CommunicationHistoryProps) {
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'email':
        return <Mail className="h-5 w-5 text-blue-600" />;
      case 'sms':
        return <MessageSquare className="h-5 w-5 text-green-600" />;
      case 'call':
        return <Phone className="h-5 w-5 text-purple-600" />;
      default:
        return <Mail className="h-5 w-5 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sent':
      case 'delivered':
        return 'bg-blue-100 text-blue-800';
      case 'opened':
        return 'bg-green-100 text-green-800';
      case 'clicked':
        return 'bg-purple-100 text-purple-800';
      case 'replied':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'scheduled':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Communication History</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {communications.map((comm) => (
            <div key={comm.id} className="p-4 border rounded-lg hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-start space-x-3">
                  {getTypeIcon(comm.type)}
                  <div className="flex-1">
                    <h4 className="font-semibold text-lg">{comm.client_name}</h4>
                    {comm.subject && (
                      <p className="text-sm text-gray-600 font-medium">{comm.subject}</p>
                    )}
                  </div>
                </div>
                <Badge className={getStatusColor(comm.status)}>
                  {comm.status}
                </Badge>
              </div>

              <p className="text-sm text-gray-700 mb-3 pl-8">{comm.body}</p>

              {/* Timeline */}
              <div className="pl-8 space-y-2">
                {comm.sent_at && (
                  <div className="flex items-center text-xs text-gray-600">
                    <Send className="h-3 w-3 mr-2" />
                    <span>Sent: {format(new Date(comm.sent_at), 'MMM d, yyyy h:mm a')}</span>
                  </div>
                )}
                {comm.delivered_at && (
                  <div className="flex items-center text-xs text-gray-600">
                    <CheckCircle2 className="h-3 w-3 mr-2" />
                    <span>Delivered: {format(new Date(comm.delivered_at), 'MMM d, yyyy h:mm a')}</span>
                  </div>
                )}
                {comm.opened_at && (
                  <div className="flex items-center text-xs text-green-600">
                    <Eye className="h-3 w-3 mr-2" />
                    <span>Opened: {format(new Date(comm.opened_at), 'MMM d, yyyy h:mm a')}</span>
                  </div>
                )}
                {comm.clicked_at && (
                  <div className="flex items-center text-xs text-purple-600">
                    <MousePointer className="h-3 w-3 mr-2" />
                    <span>Clicked: {format(new Date(comm.clicked_at), 'MMM d, yyyy h:mm a')}</span>
                  </div>
                )}
                {comm.replied_at && (
                  <div className="flex items-center text-xs text-green-600">
                    <Reply className="h-3 w-3 mr-2" />
                    <span>Replied: {format(new Date(comm.replied_at), 'MMM d, yyyy h:mm a')}</span>
                  </div>
                )}
              </div>

              {comm.reply_content && (
                <div className="mt-3 pl-8">
                  <div className="p-3 bg-green-50 border border-green-200 rounded">
                    <p className="text-xs text-gray-500 mb-1">Client Reply:</p>
                    <p className="text-sm text-gray-700">"{comm.reply_content}"</p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}