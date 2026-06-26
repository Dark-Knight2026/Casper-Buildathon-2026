/**
 * Lease Notification Center Component
 * Manage and view lease-related notifications
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Bell,
  CheckCircle,
  AlertCircle,
  Info,
  Calendar,
  DollarSign,
  FileText,
  Users,
  Trash2
} from 'lucide-react';
import { format } from 'date-fns';

interface Notification {
  id: string;
  type: 'info' | 'warning' | 'success' | 'error';
  category: 'payment' | 'document' | 'renewal' | 'maintenance' | 'general';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  actionUrl?: string;
}

export default function LeaseNotificationCenter() {
  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: '1',
      type: 'warning',
      category: 'renewal',
      title: 'Lease Expiring Soon',
      message: 'Lease for Property #123 expires in 30 days',
      timestamp: new Date(Date.now() - 3600000),
      read: false,
      actionUrl: '/leases/123'
    },
    {
      id: '2',
      type: 'success',
      category: 'payment',
      title: 'Payment Received',
      message: 'Rent payment of $2,500 received for Property #456',
      timestamp: new Date(Date.now() - 7200000),
      read: false
    },
    {
      id: '3',
      type: 'info',
      category: 'document',
      title: 'Document Signed',
      message: 'Lease amendment has been signed by all parties',
      timestamp: new Date(Date.now() - 86400000),
      read: true
    }
  ]);

  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const getIcon = (category: Notification['category']) => {
    switch (category) {
      case 'payment':
        return <DollarSign className="h-5 w-5" />;
      case 'document':
        return <FileText className="h-5 w-5" />;
      case 'renewal':
        return <Calendar className="h-5 w-5" />;
      case 'maintenance':
        return <AlertCircle className="h-5 w-5" />;
      case 'general':
        return <Info className="h-5 w-5" />;
    }
  };

  const getTypeColor = (type: Notification['type']) => {
    switch (type) {
      case 'success':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'error':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'info':
        return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  const markAsRead = (id: string) => {
    setNotifications(notifications.map(n => 
      n.id === id ? { ...n, read: true } : n
    ));
  };

  const markAllAsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })));
  };

  const deleteNotification = (id: string) => {
    setNotifications(notifications.filter(n => n.id !== id));
  };

  const filteredNotifications = notifications.filter(n => 
    filter === 'all' || !n.read
  );

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notifications
              </CardTitle>
              <CardDescription>
                Stay updated on lease activities
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <Badge variant="destructive">{unreadCount} unread</Badge>
              )}
              <Button variant="outline" size="sm" onClick={markAllAsRead}>
                Mark All Read
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Filters */}
      <Tabs value={filter} onValueChange={(v) => setFilter(v as 'all' | 'unread')}>
        <TabsList>
          <TabsTrigger value="all">All ({notifications.length})</TabsTrigger>
          <TabsTrigger value="unread">Unread ({unreadCount})</TabsTrigger>
        </TabsList>

        <TabsContent value={filter} className="mt-4">
          <Card>
            <CardContent className="p-0">
              <ScrollArea className="h-[600px]">
                {filteredNotifications.length === 0 ? (
                  <div className="text-center py-12">
                    <Bell className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <p className="text-gray-600">No notifications</p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {filteredNotifications.map(notification => (
                      <div
                        key={notification.id}
                        className={`p-4 hover:bg-gray-50 transition-colors ${
                          !notification.read ? 'bg-blue-50' : ''
                        }`}
                      >
                        <div className="flex items-start gap-4">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${getTypeColor(notification.type)}`}>
                            {getIcon(notification.category)}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-4 mb-2">
                              <div className="flex-1">
                                <h4 className="font-semibold text-sm">{notification.title}</h4>
                                <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                              </div>
                              {!notification.read && (
                                <Badge variant="outline" className="bg-blue-100 text-blue-800 flex-shrink-0">
                                  New
                                </Badge>
                              )}
                            </div>

                            <div className="flex items-center justify-between mt-3">
                              <span className="text-xs text-gray-500">
                                {format(notification.timestamp, 'MMM d, yyyy HH:mm')}
                              </span>

                              <div className="flex gap-2">
                                {!notification.read && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => markAsRead(notification.id)}
                                  >
                                    <CheckCircle className="h-4 w-4 mr-1" />
                                    Mark Read
                                  </Button>
                                )}
                                {notification.actionUrl && (
                                  <Button size="sm" variant="outline">
                                    View Details
                                  </Button>
                                )}
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => deleteNotification(notification.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}