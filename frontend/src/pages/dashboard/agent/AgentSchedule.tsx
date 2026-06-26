/**
 * Agent Schedule Page
 * Calendar view with appointments, tours, and scheduling
 */

import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  User,
  Plus,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase/client';
import { agentService, type AgentAppointment } from '@/services/agentService';
import { ErrorBoundary } from '@/components/ui/error-boundary';

export default function AgentSchedule() {
  const [appointments, setAppointments] = useState<AgentAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const { toast } = useToast();
  const navigate = useNavigate();

  const loadAppointments = useCallback(async () => {
    if (!userId) return;

    setLoading(true);
    setError(null);

    try {
      const startOfWeek = new Date(selectedDate);
      startOfWeek.setDate(selectedDate.getDate() - selectedDate.getDay());
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 7);

      const result = await agentService.getAppointments(userId, startOfWeek, endOfWeek);
      setAppointments(result);
    } catch (err) {
      console.error('Error loading appointments:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to load appointments';
      setError(errorMessage);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: errorMessage
      });
    } finally {
      setLoading(false);
    }
  }, [userId, selectedDate, toast]);

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
      loadAppointments();
    }
  }, [userId, loadAppointments]);

  // Real-time subscription
  useEffect(() => {
    if (!userId) return;

    const subscription = agentService.subscribeToAppointments(userId, (payload) => {
      console.log('Appointment change detected:', payload);
      loadAppointments();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [userId, loadAppointments]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-800';
      case 'scheduled':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-gray-100 text-gray-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'no_show':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'showing':
        return '🏠';
      case 'meeting':
        return '👥';
      case 'call':
        return '📞';
      case 'inspection':
        return '🔍';
      case 'closing':
        return '📝';
      default:
        return '📅';
    }
  };

  const getTodayAppointments = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return appointments.filter((apt) => {
      const aptDate = new Date(apt.startTime);
      return aptDate >= today && aptDate < tomorrow;
    });
  };

  const getUpcomingAppointments = () => {
    const now = new Date();
    return appointments
      .filter((apt) => new Date(apt.startTime) > now && apt.status !== 'cancelled')
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
      .slice(0, 5);
  };

  if (loading && appointments.length === 0) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-96" />
          <Skeleton className="h-96 md:col-span-2" />
        </div>
      </div>
    );
  }

  if (error && appointments.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Schedule & Calendar</h1>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button onClick={loadAppointments}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Try Again
        </Button>
      </div>
    );
  }

  const todayAppointments = getTodayAppointments();
  const upcomingAppointments = getUpcomingAppointments();

  return (
    <ErrorBoundary>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Schedule & Calendar</h1>
            <p className="text-gray-500 mt-1">
              Manage your appointments, showings, and meetings
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={loadAppointments} disabled={loading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Appointment
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Today</CardTitle>
              <CalendarIcon className="h-4 w-4 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{todayAppointments.length}</div>
              <p className="text-xs text-gray-500 mt-1">Appointments</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">This Week</CardTitle>
              <CalendarIcon className="h-4 w-4 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{appointments.length}</div>
              <p className="text-xs text-gray-500 mt-1">Scheduled</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Confirmed</CardTitle>
              <Badge className="bg-green-100 text-green-800">Confirmed</Badge>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {appointments.filter((a) => a.status === 'confirmed').length}
              </div>
              <p className="text-xs text-gray-500 mt-1">Ready to go</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
              <Badge className="bg-blue-100 text-blue-800">Pending</Badge>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {appointments.filter((a) => a.status === 'scheduled').length}
              </div>
              <p className="text-xs text-gray-500 mt-1">Need confirmation</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Today's Schedule */}
          <Card>
            <CardHeader>
              <CardTitle>Today's Schedule</CardTitle>
              <CardDescription>
                {new Date().toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric'
                })}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {todayAppointments.length === 0 ? (
                  <div className="text-center py-8">
                    <CalendarIcon className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">No appointments today</p>
                  </div>
                ) : (
                  todayAppointments.map((apt) => (
                    <div key={apt.id} className="p-3 border rounded-lg space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{getTypeIcon(apt.type)}</span>
                          <span className="font-medium">{apt.title}</span>
                        </div>
                        <Badge className={getStatusColor(apt.status)}>{apt.status}</Badge>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Clock className="h-4 w-4" />
                        {new Date(apt.startTime).toLocaleTimeString('en-US', {
                          hour: 'numeric',
                          minute: '2-digit'
                        })}
                      </div>
                      {apt.location && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <MapPin className="h-4 w-4" />
                          {apt.location}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Upcoming Appointments */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Upcoming Appointments</CardTitle>
              <CardDescription>Next 5 scheduled appointments</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {upcomingAppointments.length === 0 ? (
                  <div className="text-center py-12">
                    <CalendarIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      No upcoming appointments
                    </h3>
                    <p className="text-gray-500 mb-4">
                      Schedule your next appointment to keep your calendar organized
                    </p>
                    <Button>
                      <Plus className="mr-2 h-4 w-4" />
                      Schedule Appointment
                    </Button>
                  </div>
                ) : (
                  upcomingAppointments.map((apt) => (
                    <div
                      key={apt.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="text-center">
                          <div className="text-2xl font-bold">
                            {new Date(apt.startTime).getDate()}
                          </div>
                          <div className="text-xs text-gray-500">
                            {new Date(apt.startTime).toLocaleDateString('en-US', {
                              month: 'short'
                            })}
                          </div>
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-lg">{getTypeIcon(apt.type)}</span>
                            <h4 className="font-medium">{apt.title}</h4>
                            <Badge className={getStatusColor(apt.status)}>{apt.status}</Badge>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            <span className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              {new Date(apt.startTime).toLocaleTimeString('en-US', {
                                hour: 'numeric',
                                minute: '2-digit'
                              })}
                            </span>
                            {apt.location && (
                              <span className="flex items-center gap-1">
                                <MapPin className="h-4 w-4" />
                                {apt.location}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <Button variant="outline" size="sm">
                        View Details
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </ErrorBoundary>
  );
}