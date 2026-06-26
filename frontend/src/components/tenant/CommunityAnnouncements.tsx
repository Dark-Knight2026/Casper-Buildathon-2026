import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useTenantDashboard } from '@/contexts/TenantDashboardContext';
import {
  Megaphone,
  Pin,
  Calendar,
  User,
  AlertTriangle,
  Info,
  Wrench,
  PartyPopper,
  FileText
} from 'lucide-react';

export default function CommunityAnnouncements() {
  const { announcements } = useTenantDashboard();

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'maintenance':
        return <Wrench className="h-5 w-5" />;
      case 'event':
        return <PartyPopper className="h-5 w-5" />;
      case 'policy':
        return <FileText className="h-5 w-5" />;
      case 'emergency':
        return <AlertTriangle className="h-5 w-5" />;
      default:
        return <Info className="h-5 w-5" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'maintenance':
        return 'bg-orange-100 text-orange-600';
      case 'event':
        return 'bg-purple-100 text-purple-600';
      case 'policy':
        return 'bg-blue-100 text-blue-600';
      case 'emergency':
        return 'bg-red-100 text-red-600';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'border-red-500 bg-red-50';
      case 'medium':
        return 'border-yellow-500 bg-yellow-50';
      default:
        return '';
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const pinnedAnnouncements = announcements.filter(a => a.is_pinned);
  const regularAnnouncements = announcements.filter(a => !a.is_pinned);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="h-12 w-12 bg-purple-100 rounded-full flex items-center justify-center">
            <Megaphone className="h-6 w-6 text-purple-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Community Announcements</h2>
            <p className="text-gray-600">Stay updated with property news and events</p>
          </div>
        </div>
      </div>

      {/* Pinned Announcements */}
      {pinnedAnnouncements.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-600 flex items-center">
            <Pin className="h-4 w-4 mr-1" />
            Pinned Announcements
          </h3>
          {pinnedAnnouncements.map((announcement) => (
            <Card
              key={announcement.id}
              className={`border-l-4 ${getPriorityColor(announcement.priority)}`}
            >
              <CardContent className="p-6">
                <div className="flex items-start space-x-4">
                  <div className={`h-12 w-12 rounded-full flex items-center justify-center flex-shrink-0 ${getCategoryColor(announcement.category)}`}>
                    {getCategoryIcon(announcement.category)}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <h3 className="text-lg font-semibold">{announcement.title}</h3>
                        <Pin className="h-4 w-4 text-gray-400" />
                      </div>
                      <Badge className={getCategoryColor(announcement.category)}>
                        {announcement.category}
                      </Badge>
                    </div>

                    <p className="text-gray-700 mb-4 whitespace-pre-line">
                      {announcement.content}
                    </p>

                    {announcement.image_url && (
                      <div className="mb-4">
                        <img
                          src={announcement.image_url}
                          alt={announcement.title}
                          className="rounded-lg max-w-full h-auto"
                        />
                      </div>
                    )}

                    <div className="flex items-center space-x-4 text-sm text-gray-600">
                      <span className="flex items-center">
                        <User className="h-4 w-4 mr-1" />
                        {announcement.published_by_name}
                      </span>
                      <span className="flex items-center">
                        <Calendar className="h-4 w-4 mr-1" />
                        {formatDate(announcement.published_at)}
                      </span>
                      {announcement.expires_at && (
                        <span className="text-orange-600">
                          Expires {formatDate(announcement.expires_at)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Regular Announcements */}
      {regularAnnouncements.length > 0 ? (
        <div className="space-y-3">
          {pinnedAnnouncements.length > 0 && (
            <h3 className="text-sm font-semibold text-gray-600">Recent Announcements</h3>
          )}
          {regularAnnouncements.map((announcement) => (
            <Card
              key={announcement.id}
              className={`${getPriorityColor(announcement.priority)}`}
            >
              <CardContent className="p-6">
                <div className="flex items-start space-x-4">
                  <div className={`h-12 w-12 rounded-full flex items-center justify-center flex-shrink-0 ${getCategoryColor(announcement.category)}`}>
                    {getCategoryIcon(announcement.category)}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="text-lg font-semibold">{announcement.title}</h3>
                      <Badge className={getCategoryColor(announcement.category)}>
                        {announcement.category}
                      </Badge>
                    </div>

                    <p className="text-gray-700 mb-4 whitespace-pre-line">
                      {announcement.content}
                    </p>

                    {announcement.image_url && (
                      <div className="mb-4">
                        <img
                          src={announcement.image_url}
                          alt={announcement.title}
                          className="rounded-lg max-w-full h-auto"
                        />
                      </div>
                    )}

                    <div className="flex items-center space-x-4 text-sm text-gray-600">
                      <span className="flex items-center">
                        <User className="h-4 w-4 mr-1" />
                        {announcement.published_by_name}
                      </span>
                      <span className="flex items-center">
                        <Calendar className="h-4 w-4 mr-1" />
                        {formatDate(announcement.published_at)}
                      </span>
                      {announcement.expires_at && (
                        <span className="text-orange-600">
                          Expires {formatDate(announcement.expires_at)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : pinnedAnnouncements.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Megaphone className="h-16 w-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Announcements</h3>
            <p className="text-gray-600">
              There are no community announcements at this time
            </p>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}