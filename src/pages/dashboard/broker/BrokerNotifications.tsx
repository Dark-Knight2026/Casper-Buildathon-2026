/**
 * Broker Notifications Page
 * Team notifications and alerts
 */

import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  CheckCircle,
  AlertCircle,
  Info,
  TrendingUp,
  Users,
  DollarSign,
  RefreshCw,
  Check,
  Trash2
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase/client';
import { ErrorBoundary } from '@/components/ui/error-boundary';

interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  category: 'agent' | 'transaction' | 'commission' | 'document' | 'system';
  title: string;
  message: string;
  read: boolean;
  createdAt: Date;
  actionUrl?: string;
}

export default function BrokerNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const { toast } = useToast();
  const navigate = useNavigate();

  const loadNotifications = useCallback(async () => {
    if (!userId) return;

    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('broker_notifications')
        .select('*')
        .eq('broker_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (filter === 'unread') {
        query = query.eq('read', false);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) {
        throw fetchError;
      }

      const mappedNotifications: Notification[] = (data || []).map((notif) => ({
        id: notif.id,
        type: notif.type,
        category: notif.category,
        title: notif.title,
        message: notif.message,
        read: notif.read,
        createdAt: new Date(notif.created_at),
        actionUrl: notif.action_url
      }));

      setNotifications(mappedNotifications);
    } catch (err) {
      console.error('Error loading notifications:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to load notifications';
      setError(errorMessage);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: errorMessage
      });
    } finally {
      setLoading(false);
    }
  }, [userId, filter, toast]);

  useEffect(() => {
    const initializeUser = async () => {
      const {
        data: { user }
      } = await supabase.auth.getUser();

      if (!user) {
        navigate('/auth/login');
        return;
      }

      setUserId(user.id);
    };

    initializeUser();
  }, [navigate]);

  useEffect(() => {
    if (userId) {
      loadNotifications();
    }
  }, [userId, loadNotifications]);

  const markAsRead = async (notificationId: string) => {
    try {
      const { error: updateError } = await supabase
        .from('broker_notifications')
        .update({ read: true })
        .eq('id', notificationId);

      if (updateError) {
        throw updateError;
      }

      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
      );

      toast({
        title: 'Success',
        description: 'Notification marked as read'
      });
    } catch (err) {
      console.error('Error marking notification as read:', err);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to mark notification as read'
      });
    }
  };

  const markAllAsRead = async () => {
    if (!userId) return;

    try {
      const { error: updateError } = await supabase
        .from('broker_notifications')
        .update({ read: true })
        .eq('broker_id', userId)
        .eq('read', false);

      if (updateError) {
        throw updateError;
      }

      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));

      toast({
        title: 'Success',
        description: 'All notifications marked as read'
      });
    } catch (err) {
      console.error('Error marking all as read:', err);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to mark all as read'
      });
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      const { error: deleteError } = await supabase
        .from('broker_notifications')
        .delete()
        .eq('id', notificationId);

      if (deleteError) {
        throw deleteError;
      }

      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));

      toast({
        title: 'Success',
        description: 'Notification deleted'
      });
    } catch (err) {
      console.error('Error deleting notification:', err);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to delete notification'
      });
    }
  };

  const getNotificationIcon = (type: string, category: string) => {
    if (category === 'agent') return <Users className="h-5 w-5" />;
    if (category === 'transaction') return <TrendingUp className="h-5 w-5" />;
    if (category === 'commission') return <DollarSign className="h-5 w-5" />;

    switch (type) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'warning':
        return <AlertCircle className="h-5 w-5 text-yellow-600" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-600" />;
      default:
        return <Info className="h-5 w-5 text-blue-600" />;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'success':
        return 'border-l-4 border-l-green-500';
      case 'warning':
        return 'border-l-4 border-l-yellow-500';
      case 'error':
        return 'border-l-4 border-l-red-500';
      default:
        return 'border-l-4 border-l-blue-500';
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  if (loading && notifications.length === 0) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (error && notifications.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Notifications</h1>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button onClick={loadNotifications}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Notifications</h1>
            <p className="text-gray-500 mt-1">
              Stay updated with team activities and important alerts
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={loadNotifications} disabled={loading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            {unreadCount > 0 && (
              <Button variant="outline" onClick={markAllAsRead}>
                <Check className="mr-2 h-4 w-4" />
                Mark All Read
              </Button>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Notifications</CardTitle>
              <Bell className="h-4 w-4 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{notifications.length}</div>
              <p className="text-xs text-gray-500 mt-1">Last 50 notifications</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Unread</CardTitle>
              <AlertCircle className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{unreadCount}</div>
              <p className="text-xs text-gray-500 mt-1">Require attention</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Read</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {notifications.length - unreadCount}
              </div>
              <p className="text-xs text-gray-500 mt-1">Already reviewed</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Button
                variant={filter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('all')}
              >
                All
              </Button>
              <Button
                variant={filter === 'unread' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('unread')}
              >
                Unread ({unreadCount})
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Notifications List */}
        <Card>
          <CardHeader>
            <CardTitle>Notifications</CardTitle>
            <CardDescription>Recent team activities and alerts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {notifications.length === 0 ? (
                <div className="text-center py-12">
                  <Bell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No notifications</h3>
                  <p className="text-gray-500">
                    {filter === 'unread'
                      ? "You're all caught up!"
                      : 'Notifications will appear here'}
                  </p>
                </div>
              ) : (
                notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`flex items-start gap-4 p-4 rounded-lg ${
                      getNotificationColor(notification.type)
                    } ${notification.read ? 'bg-gray-50' : 'bg-white border'}`}
                  >
                    <div className="mt-1">
                      {getNotificationIcon(notification.type, notification.category)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="font-medium">{notification.title}</h4>
                          <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                          <p className="text-xs text-gray-500 mt-2">
                            {notification.createdAt.toLocaleString()}
                          </p>
                        </div>
                        {!notification.read && (
                          <Badge variant="default" className="shrink-0">
                            New
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-3">
                        {!notification.read && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => markAsRead(notification.id)}
                          >
                            <Check className="mr-1 h-3 w-3" />
                            Mark Read
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteNotification(notification.id)}
                        >
                          <Trash2 className="mr-1 h-3 w-3" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </ErrorBoundary>
  );
}