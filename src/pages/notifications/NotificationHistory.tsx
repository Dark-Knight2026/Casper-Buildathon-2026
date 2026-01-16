import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, CheckCheck, Trash2 } from 'lucide-react';
import { NotificationList } from '@/components/notifications/NotificationList';
import { notificationService } from '@/services/notificationService';
import type { NotificationType, NotificationPriority } from '@/types/notification';

export default function NotificationHistory() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<NotificationType | 'all'>('all');
  const [filterPriority, setFilterPriority] = useState<NotificationPriority | 'all'>('all');
  const [filterRead, setFilterRead] = useState<'all' | 'read' | 'unread'>('all');
  const [page, setPage] = useState(0);
  const pageSize = 20;

  const { data: notificationsData, isLoading } = useQuery({
    queryKey: ['notifications', 'history', filterType, filterPriority, filterRead, searchQuery, page],
    queryFn: () =>
      notificationService.getNotifications(
        {
          type: filterType !== 'all' ? filterType : undefined,
          priority: filterPriority !== 'all' ? filterPriority : undefined,
          isRead: filterRead === 'all' ? undefined : filterRead === 'read',
          search: searchQuery || undefined,
        },
        { limit: pageSize, offset: page * pageSize }
      ),
  });

  const notifications = notificationsData?.notifications || [];
  const hasMore = notificationsData?.hasMore || false;
  const unreadCount = notificationsData?.unreadCount || 0;

  const handleMarkAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      window.location.reload();
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  return (
    <div className="container mx-auto py-8 max-w-6xl">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Notifications</CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}` : 'All caught up!'}
              </p>
            </div>
            {unreadCount > 0 && (
              <Button onClick={handleMarkAllAsRead} variant="outline">
                <CheckCheck className="mr-2 h-4 w-4" />
                Mark all as read
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent>
          {/* Filters */}
          <div className="space-y-4 mb-6">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search notifications..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(0);
                }}
                className="pl-10"
              />
            </div>

            {/* Filter Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Select
                value={filterType}
                onValueChange={(value) => {
                  setFilterType(value as NotificationType | 'all');
                  setPage(0);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  <SelectItem value="payment_due">Payment Due</SelectItem>
                  <SelectItem value="payment_received">Payment Received</SelectItem>
                  <SelectItem value="payment_overdue">Payment Overdue</SelectItem>
                  <SelectItem value="maintenance_request_created">Maintenance Request</SelectItem>
                  <SelectItem value="maintenance_request_updated">Maintenance Update</SelectItem>
                  <SelectItem value="lease_expiring">Lease Expiring</SelectItem>
                  <SelectItem value="message_received">New Message</SelectItem>
                  <SelectItem value="application_submitted">Application Submitted</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={filterPriority}
                onValueChange={(value) => {
                  setFilterPriority(value as NotificationPriority | 'all');
                  setPage(0);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All priorities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All priorities</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>

              <Tabs value={filterRead} onValueChange={(v) => {
                setFilterRead(v as 'all' | 'read' | 'unread');
                setPage(0);
              }}>
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="unread">Unread</TabsTrigger>
                  <TabsTrigger value="read">Read</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>

          {/* Notification List */}
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-gray-500">Loading notifications...</div>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="text-gray-400 mb-2">
                <Search className="h-12 w-12 mx-auto mb-3" />
              </div>
              <h3 className="font-semibold mb-1">No notifications found</h3>
              <p className="text-sm text-gray-600">
                {searchQuery
                  ? 'Try adjusting your search or filters'
                  : 'You don\'t have any notifications yet'}
              </p>
            </div>
          ) : (
            <>
              <div className="border rounded-lg overflow-hidden">
                <NotificationList 
                  notifications={notifications}
                  showHeader={false}
                  showFooter={false}
                  maxHeight="auto"
                />
              </div>

              {/* Pagination */}
              {(page > 0 || hasMore) && (
                <div className="flex items-center justify-between mt-6">
                  <Button
                    variant="outline"
                    onClick={() => setPage(page - 1)}
                    disabled={page === 0}
                  >
                    Previous
                  </Button>
                  <span className="text-sm text-gray-600">
                    Page {page + 1}
                  </span>
                  <Button
                    variant="outline"
                    onClick={() => setPage(page + 1)}
                    disabled={!hasMore}
                  >
                    Next
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}