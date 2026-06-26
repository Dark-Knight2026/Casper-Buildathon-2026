import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle,
  DialogFooter 
} from '@/components/ui/dialog';
import { 
  BarChart3, 
  Settings, 
  Bell, 
  Calendar, 
  Clock, 
  TrendingUp, 
  Users, 
  MapPin,
  Mail,
  Smartphone,
  X
} from 'lucide-react';

interface Appointment {
  id: string;
  title: string;
  date: Date;
  time: string;
  duration: number;
  type: 'showing' | 'inspection' | 'meeting' | 'consultation' | 'closing';
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled';
  client: {
    name: string;
    email: string;
    phone: string;
  };
  property?: {
    address: string;
    type: string;
  };
  notes?: string;
  reminders: boolean;
}

interface EnhancedCalendarFeaturesProps {
  appointments: Appointment[];
  onClose: () => void;
}

export function EnhancedCalendarFeatures({ appointments, onClose }: EnhancedCalendarFeaturesProps) {
  const [settings, setSettings] = useState({
    emailReminders: true,
    smsReminders: false,
    reminderTiming: '24',
    autoConfirmation: false,
    bufferTime: '15',
    workingHours: {
      start: '09:00',
      end: '17:00'
    },
    workingDays: {
      monday: true,
      tuesday: true,
      wednesday: true,
      thursday: true,
      friday: true,
      saturday: false,
      sunday: false
    }
  });

  const totalAppointments = appointments.length;
  const completedAppointments = appointments.filter(apt => apt.status === 'completed').length;
  const completionRate = totalAppointments > 0 ? Math.round((completedAppointments / totalAppointments) * 100) : 0;
  
  const appointmentsByType = appointments.reduce((acc, apt) => {
    acc[apt.type] = (acc[apt.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const appointmentsByStatus = appointments.reduce((acc, apt) => {
    acc[apt.status] = (acc[apt.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const averageDuration = appointments.length > 0 
    ? Math.round(appointments.reduce((sum, apt) => sum + apt.duration, 0) / appointments.length)
    : 0;

  const upcomingThisWeek = appointments.filter(apt => {
    const now = new Date();
    const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    return apt.date >= now && apt.date <= weekFromNow;
  }).length;

  const handleSettingChange = (key: string, value: string | boolean) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleWorkingDayChange = (day: string, enabled: boolean) => {
    setSettings(prev => ({
      ...prev,
      workingDays: {
        ...prev.workingDays,
        [day]: enabled
      }
    }));
  };

  const handleWorkingHourChange = (type: 'start' | 'end', value: string) => {
    setSettings(prev => ({
      ...prev,
      workingHours: {
        ...prev.workingHours,
        [type]: value
      }
    }));
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Settings className="h-5 w-5 mr-2" />
            Enhanced Calendar Features
          </DialogTitle>
          <DialogDescription>
            Advanced analytics, settings, and automation features for your calendar
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="analytics" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
            <TabsTrigger value="automation">Automation</TabsTrigger>
          </TabsList>

          <TabsContent value="analytics" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Appointments</p>
                      <p className="text-xl font-bold">{totalAppointments}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <TrendingUp className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="text-sm font-medium text-gray-600">Completion Rate</p>
                      <p className="text-xl font-bold">{completionRate}%</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <Clock className="h-5 w-5 text-purple-600" />
                    <div>
                      <p className="text-sm font-medium text-gray-600">Avg Duration</p>
                      <p className="text-xl font-bold">{averageDuration}min</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <Users className="h-5 w-5 text-orange-600" />
                    <div>
                      <p className="text-sm font-medium text-gray-600">This Week</p>
                      <p className="text-xl font-bold">{upcomingThisWeek}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Appointments by Type</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Object.entries(appointmentsByType).map(([type, count]) => (
                      <div key={type} className="flex justify-between items-center">
                        <span className="capitalize">{type}</span>
                        <span className="font-semibold">{count}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Appointments by Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Object.entries(appointmentsByStatus).map(([status, count]) => (
                      <div key={status} className="flex justify-between items-center">
                        <span className="capitalize">{status}</span>
                        <span className="font-semibold">{count}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Working Hours</CardTitle>
                <CardDescription>Set your available working hours</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="start-time">Start Time</Label>
                    <Input
                      id="start-time"
                      type="time"
                      value={settings.workingHours.start}
                      onChange={(e) => handleWorkingHourChange('start', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="end-time">End Time</Label>
                    <Input
                      id="end-time"
                      type="time"
                      value={settings.workingHours.end}
                      onChange={(e) => handleWorkingHourChange('end', e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Working Days</CardTitle>
                <CardDescription>Select your available working days</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  {Object.entries(settings.workingDays).map(([day, enabled]) => (
                    <div key={day} className="flex items-center justify-between">
                      <Label htmlFor={day} className="capitalize">{day}</Label>
                      <Switch
                        id={day}
                        checked={enabled}
                        onCheckedChange={(checked) => handleWorkingDayChange(day, checked)}
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Buffer Time</CardTitle>
                <CardDescription>Time between appointments</CardDescription>
              </CardHeader>
              <CardContent>
                <Select value={settings.bufferTime} onValueChange={(value: string) => handleSettingChange('bufferTime', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">No buffer</SelectItem>
                    <SelectItem value="15">15 minutes</SelectItem>
                    <SelectItem value="30">30 minutes</SelectItem>
                    <SelectItem value="45">45 minutes</SelectItem>
                    <SelectItem value="60">1 hour</SelectItem>
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="automation" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Reminder Settings</CardTitle>
                <CardDescription>Configure automatic reminders</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Mail className="h-4 w-4" />
                    <Label htmlFor="email-reminders">Email Reminders</Label>
                  </div>
                  <Switch
                    id="email-reminders"
                    checked={settings.emailReminders}
                    onCheckedChange={(checked) => handleSettingChange('emailReminders', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Smartphone className="h-4 w-4" />
                    <Label htmlFor="sms-reminders">SMS Reminders</Label>
                  </div>
                  <Switch
                    id="sms-reminders"
                    checked={settings.smsReminders}
                    onCheckedChange={(checked) => handleSettingChange('smsReminders', checked)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reminder-timing">Reminder Timing</Label>
                  <Select value={settings.reminderTiming} onValueChange={(value: string) => handleSettingChange('reminderTiming', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 hour before</SelectItem>
                      <SelectItem value="2">2 hours before</SelectItem>
                      <SelectItem value="24">24 hours before</SelectItem>
                      <SelectItem value="48">48 hours before</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Auto-Confirmation</CardTitle>
                <CardDescription>Automatically confirm appointments</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <Label htmlFor="auto-confirmation">Enable Auto-Confirmation</Label>
                  <Switch
                    id="auto-confirmation"
                    checked={settings.autoConfirmation}
                    onCheckedChange={(checked) => handleSettingChange('autoConfirmation', checked)}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button onClick={onClose}>
            Save Settings
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}