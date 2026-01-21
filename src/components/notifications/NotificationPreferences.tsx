import React from 'react';
import { useNotifications } from '@/contexts/NotificationContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Bell, Mail, Volume2, Moon } from 'lucide-react';

export function NotificationPreferences() {
  const { preferences, updatePreferences } = useNotifications();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notification Preferences
          </CardTitle>
          <CardDescription>
            Manage how and when you receive notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Email Notifications */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Email Notifications
                </Label>
                <p className="text-sm text-muted-foreground">
                  Receive notifications via email
                </p>
              </div>
              <Switch
                checked={preferences.emailEnabled}
                onCheckedChange={(checked) =>
                  updatePreferences({ emailEnabled: checked })
                }
              />
            </div>

            {preferences.emailEnabled && (
              <div className="ml-6 space-y-2">
                <Label>Email Frequency</Label>
                <Select
                  value={preferences.emailFrequency}
                  onValueChange={(value: 'instant' | 'daily' | 'weekly' | 'never') =>
                    updatePreferences({ emailFrequency: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="instant">Instant</SelectItem>
                    <SelectItem value="daily">Daily Digest</SelectItem>
                    <SelectItem value="weekly">Weekly Summary</SelectItem>
                    <SelectItem value="never">Never</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <Separator />

          {/* Push Notifications */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Push Notifications</Label>
              <p className="text-sm text-muted-foreground">
                Receive push notifications on your device
              </p>
            </div>
            <Switch
              checked={preferences.pushEnabled}
              onCheckedChange={(checked) =>
                updatePreferences({ pushEnabled: checked })
              }
            />
          </div>

          <Separator />

          {/* In-App Notifications */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>In-App Notifications</Label>
              <p className="text-sm text-muted-foreground">
                Show notifications within the application
              </p>
            </div>
            <Switch
              checked={preferences.inAppEnabled}
              onCheckedChange={(checked) =>
                updatePreferences({ inAppEnabled: checked })
              }
            />
          </div>

          <Separator />

          {/* Sound */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="flex items-center gap-2">
                <Volume2 className="h-4 w-4" />
                Notification Sound
              </Label>
              <p className="text-sm text-muted-foreground">
                Play sound for new notifications
              </p>
            </div>
            <Switch
              checked={preferences.soundEnabled}
              onCheckedChange={(checked) =>
                updatePreferences({ soundEnabled: checked })
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Category Preferences */}
      <Card>
        <CardHeader>
          <CardTitle>Notification Categories</CardTitle>
          <CardDescription>
            Choose which types of notifications you want to receive
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {Object.entries(preferences.categories).map(([key, value]) => (
            <div key={key} className="flex items-center justify-between">
              <Label className="capitalize">
                {key.replace('_', ' ')}
              </Label>
              <Switch
                checked={value}
                onCheckedChange={(checked) =>
                  updatePreferences({
                    categories: {
                      ...preferences.categories,
                      [key]: checked,
                    },
                  })
                }
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Quiet Hours */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Moon className="h-5 w-5" />
            Quiet Hours
          </CardTitle>
          <CardDescription>
            Set a time range when you don't want to receive notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Enable Quiet Hours</Label>
            <Switch
              checked={preferences.quietHoursEnabled}
              onCheckedChange={(checked) =>
                updatePreferences({ quietHoursEnabled: checked })
              }
            />
          </div>

          {preferences.quietHoursEnabled && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Time</Label>
                <Input
                  type="time"
                  value={preferences.quietHoursStart}
                  onChange={(e) =>
                    updatePreferences({ quietHoursStart: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>End Time</Label>
                <Input
                  type="time"
                  value={preferences.quietHoursEnd}
                  onChange={(e) =>
                    updatePreferences({ quietHoursEnd: e.target.value })
                  }
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}