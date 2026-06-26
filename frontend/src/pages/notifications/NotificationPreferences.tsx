import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { notificationPreferencesService } from '@/services/notificationPreferencesService';
import { notificationConfig } from '@/config/notificationConfig';
import type { NotificationType, ChannelPreferences } from '@/types/notification';

export default function NotificationPreferences() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: preferences, isLoading } = useQuery({
    queryKey: ['notification-preferences'],
    queryFn: () => notificationPreferencesService.getPreferences(),
  });

  const updateMutation = useMutation({
    mutationFn: notificationPreferencesService.updatePreferences.bind(notificationPreferencesService),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-preferences'] });
      toast({
        title: 'Preferences saved',
        description: 'Your notification preferences have been updated.',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to update notification preferences.',
        variant: 'destructive',
      });
    },
  });

  if (isLoading || !preferences) {
    return (
      <div className="container mx-auto py-8 max-w-4xl">
        <div className="flex items-center justify-center py-12">
          <div className="text-gray-500">Loading preferences...</div>
        </div>
      </div>
    );
  }

  const handleGlobalToggle = (channel: 'inApp' | 'email' | 'sms', enabled: boolean) => {
    const update = {
      inAppEnabled: channel === 'inApp' ? enabled : preferences.inAppEnabled,
      emailEnabled: channel === 'email' ? enabled : preferences.emailEnabled,
      smsEnabled: channel === 'sms' ? enabled : preferences.smsEnabled,
    };
    updateMutation.mutate(update);
  };

  const handleTypeToggle = (type: NotificationType, channel: keyof ChannelPreferences, enabled: boolean) => {
    const typePrefs = preferences.preferences[type];
    updateMutation.mutate({
      preferences: {
        [type]: {
          ...typePrefs,
          [channel]: enabled,
        },
      },
    });
  };

  const handleQuietHoursToggle = (enabled: boolean) => {
    updateMutation.mutate({ quietHoursEnabled: enabled });
  };

  const handleQuietHoursChange = (start: string, end: string) => {
    updateMutation.mutate({
      quietHoursStart: start,
      quietHoursEnd: end,
    });
  };

  const handleDigestToggle = (enabled: boolean) => {
    updateMutation.mutate({ emailDigestEnabled: enabled });
  };

  const handleDigestFrequency = (frequency: 'daily' | 'weekly') => {
    updateMutation.mutate({ emailDigestFrequency: frequency });
  };

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Notification Preferences</h1>
          <p className="text-gray-600 mt-2">
            Manage how you receive notifications across different channels
          </p>
        </div>

        {/* Global Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Global Settings</CardTitle>
            <CardDescription>
              Control notification channels at a global level
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="in-app-global">In-App Notifications</Label>
                <p className="text-sm text-gray-600">
                  Show notifications in the application
                </p>
              </div>
              <Switch
                id="in-app-global"
                checked={preferences.inAppEnabled}
                onCheckedChange={(checked) => handleGlobalToggle('inApp', checked)}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="email-global">Email Notifications</Label>
                <p className="text-sm text-gray-600">
                  Receive notifications via email
                </p>
              </div>
              <Switch
                id="email-global"
                checked={preferences.emailEnabled}
                onCheckedChange={(checked) => handleGlobalToggle('email', checked)}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="sms-global">SMS Notifications</Label>
                <p className="text-sm text-gray-600">
                  Receive notifications via text message
                </p>
              </div>
              <Switch
                id="sms-global"
                checked={preferences.smsEnabled}
                onCheckedChange={(checked) => handleGlobalToggle('sms', checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Notification Type Preferences */}
        <Card>
          <CardHeader>
            <CardTitle>Notification Types</CardTitle>
            <CardDescription>
              Customize notifications for each event type
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-4 gap-4 pb-2 border-b font-semibold text-sm">
                <div>Notification Type</div>
                <div className="text-center">In-App</div>
                <div className="text-center">Email</div>
                <div className="text-center">SMS</div>
              </div>

              {(Object.keys(preferences.preferences) as NotificationType[]).map((type) => {
                const config = notificationConfig[type];
                const typePrefs = preferences.preferences[type];

                return (
                  <div key={type} className="grid grid-cols-4 gap-4 items-center py-2">
                    <div className="flex items-center gap-2">
                      <div className={`p-1.5 rounded ${config.bgColor}`}>
                        <config.icon className={`h-3 w-3 ${config.color}`} />
                      </div>
                      <span className="text-sm">{config.label}</span>
                    </div>
                    <div className="flex justify-center">
                      <Switch
                        checked={typePrefs.inApp}
                        onCheckedChange={(checked) => handleTypeToggle(type, 'inApp', checked)}
                        disabled={!preferences.inAppEnabled}
                      />
                    </div>
                    <div className="flex justify-center">
                      <Switch
                        checked={typePrefs.email}
                        onCheckedChange={(checked) => handleTypeToggle(type, 'email', checked)}
                        disabled={!preferences.emailEnabled}
                      />
                    </div>
                    <div className="flex justify-center">
                      <Switch
                        checked={typePrefs.sms}
                        onCheckedChange={(checked) => handleTypeToggle(type, 'sms', checked)}
                        disabled={!preferences.smsEnabled}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Quiet Hours */}
        <Card>
          <CardHeader>
            <CardTitle>Quiet Hours</CardTitle>
            <CardDescription>
              Pause notifications during specific hours
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="quiet-hours">Enable Quiet Hours</Label>
                <p className="text-sm text-gray-600">
                  Don't send notifications during these hours
                </p>
              </div>
              <Switch
                id="quiet-hours"
                checked={preferences.quietHoursEnabled}
                onCheckedChange={handleQuietHoursToggle}
              />
            </div>

            {preferences.quietHoursEnabled && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="quiet-start">Start Time</Label>
                  <Input
                    id="quiet-start"
                    type="time"
                    value={preferences.quietHoursStart || '22:00'}
                    onChange={(e) =>
                      handleQuietHoursChange(
                        e.target.value,
                        preferences.quietHoursEnd || '08:00'
                      )
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="quiet-end">End Time</Label>
                  <Input
                    id="quiet-end"
                    type="time"
                    value={preferences.quietHoursEnd || '08:00'}
                    onChange={(e) =>
                      handleQuietHoursChange(
                        preferences.quietHoursStart || '22:00',
                        e.target.value
                      )
                    }
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Email Digest */}
        <Card>
          <CardHeader>
            <CardTitle>Email Digest</CardTitle>
            <CardDescription>
              Receive a summary of notifications via email
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="email-digest">Enable Email Digest</Label>
                <p className="text-sm text-gray-600">
                  Get a periodic summary instead of individual emails
                </p>
              </div>
              <Switch
                id="email-digest"
                checked={preferences.emailDigestEnabled}
                onCheckedChange={handleDigestToggle}
                disabled={!preferences.emailEnabled}
              />
            </div>

            {preferences.emailDigestEnabled && (
              <div>
                <Label htmlFor="digest-frequency">Frequency</Label>
                <Select
                  value={preferences.emailDigestFrequency}
                  onValueChange={(value) => handleDigestFrequency(value as 'daily' | 'weekly')}
                >
                  <SelectTrigger id="digest-frequency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}