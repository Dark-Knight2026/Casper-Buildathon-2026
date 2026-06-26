import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useTenantDashboard } from '@/contexts/TenantDashboardContext';
import {
  Bell,
  Mail,
  Smartphone,
  Moon,
  CheckCircle,
  X,
  DollarSign,
  Wrench,
  FileText,
  MessageSquare,
  Calendar
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface NotificationPreferencesPanelProps {
  onClose: () => void;
}

export default function NotificationPreferencesPanel({ onClose }: NotificationPreferencesPanelProps) {
  const { notificationPreferences, updateNotificationPreferences } = useTenantDashboard();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);

  const [preferences, setPreferences] = useState(notificationPreferences);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateNotificationPreferences(preferences);
      toast({
        title: 'Preferences Saved',
        description: 'Your notification preferences have been updated successfully'
      });
      onClose();
    } catch (error) {
      toast({
        title: 'Save Failed',
        description: 'Failed to save notification preferences',
        variant: 'destructive'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const toggleReminderDay = (day: number) => {
    const days = preferences.payment_reminder_days;
    if (days.includes(day)) {
      setPreferences({
        ...preferences,
        payment_reminder_days: days.filter(d => d !== day)
      });
    } else {
      setPreferences({
        ...preferences,
        payment_reminder_days: [...days, day].sort((a, b) => b - a)
      });
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Notification Preferences</CardTitle>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="h-5 w-5" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Notification Channels */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Notification Channels</h3>
          <p className="text-sm text-gray-600">
            Choose how you want to receive notifications
          </p>

          <div className="space-y-4">
            {/* Email Notifications */}
            <Card className={preferences.email_enabled ? 'border-blue-200 bg-blue-50/50' : ''}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <Mail className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium">Email Notifications</p>
                      <p className="text-sm text-gray-600">Receive updates via email</p>
                    </div>
                  </div>
                  <Switch
                    checked={preferences.email_enabled}
                    onCheckedChange={(checked) =>
                      setPreferences({ ...preferences, email_enabled: checked })
                    }
                  />
                </div>
                {preferences.email_enabled && (
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      value={preferences.email_address || ''}
                      onChange={(e) =>
                        setPreferences({ ...preferences, email_address: e.target.value })
                      }
                      placeholder="your.email@example.com"
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* SMS Notifications */}
            <Card className={preferences.sms_enabled ? 'border-green-200 bg-green-50/50' : ''}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className="h-10 w-10 bg-green-100 rounded-full flex items-center justify-center">
                      <Smartphone className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium">SMS Notifications</p>
                      <p className="text-sm text-gray-600">Receive text messages</p>
                    </div>
                  </div>
                  <Switch
                    checked={preferences.sms_enabled}
                    onCheckedChange={(checked) =>
                      setPreferences({ ...preferences, sms_enabled: checked })
                    }
                  />
                </div>
                {preferences.sms_enabled && (
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={preferences.phone_number || ''}
                      onChange={(e) =>
                        setPreferences({ ...preferences, phone_number: e.target.value })
                      }
                      placeholder="+1 (555) 123-4567"
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Push Notifications */}
            <Card className={preferences.push_enabled ? 'border-purple-200 bg-purple-50/50' : ''}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="h-10 w-10 bg-purple-100 rounded-full flex items-center justify-center">
                      <Bell className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="font-medium">Push Notifications</p>
                      <p className="text-sm text-gray-600">Browser and mobile app alerts</p>
                    </div>
                  </div>
                  <Switch
                    checked={preferences.push_enabled}
                    onCheckedChange={(checked) =>
                      setPreferences({ ...preferences, push_enabled: checked })
                    }
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <Separator />

        {/* Notification Types */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Notification Types</h3>
          <p className="text-sm text-gray-600">
            Choose which types of notifications you want to receive
          </p>

          <div className="space-y-3">
            {/* Payment Reminders */}
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <DollarSign className="h-5 w-5 text-green-600" />
                <div>
                  <p className="font-medium">Payment Reminders</p>
                  <p className="text-sm text-gray-600">Rent due date notifications</p>
                </div>
              </div>
              <Switch
                checked={preferences.payment_reminders}
                onCheckedChange={(checked) =>
                  setPreferences({ ...preferences, payment_reminders: checked })
                }
              />
            </div>

            {/* Payment Reminder Days */}
            {preferences.payment_reminders && (
              <Card className="ml-8 bg-green-50 border-green-200">
                <CardContent className="p-4">
                  <Label className="mb-3 block">Remind me before payment due date:</Label>
                  <div className="flex flex-wrap gap-2">
                    {[14, 7, 3, 1].map((day) => (
                      <Button
                        key={day}
                        type="button"
                        variant={preferences.payment_reminder_days.includes(day) ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => toggleReminderDay(day)}
                      >
                        {day} day{day > 1 ? 's' : ''}
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Maintenance Updates */}
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <Wrench className="h-5 w-5 text-orange-600" />
                <div>
                  <p className="font-medium">Maintenance Updates</p>
                  <p className="text-sm text-gray-600">Status changes on your requests</p>
                </div>
              </div>
              <Switch
                checked={preferences.maintenance_updates}
                onCheckedChange={(checked) =>
                  setPreferences({ ...preferences, maintenance_updates: checked })
                }
              />
            </div>

            {/* Lease Updates */}
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <FileText className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="font-medium">Lease Updates</p>
                  <p className="text-sm text-gray-600">Lease renewals and changes</p>
                </div>
              </div>
              <Switch
                checked={preferences.lease_updates}
                onCheckedChange={(checked) =>
                  setPreferences({ ...preferences, lease_updates: checked })
                }
              />
            </div>

            {/* Community Announcements */}
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <MessageSquare className="h-5 w-5 text-purple-600" />
                <div>
                  <p className="font-medium">Community Announcements</p>
                  <p className="text-sm text-gray-600">Property news and events</p>
                </div>
              </div>
              <Switch
                checked={preferences.community_announcements}
                onCheckedChange={(checked) =>
                  setPreferences({ ...preferences, community_announcements: checked })
                }
              />
            </div>

            {/* Marketing Communications */}
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <Mail className="h-5 w-5 text-pink-600" />
                <div>
                  <p className="font-medium">Marketing Communications</p>
                  <p className="text-sm text-gray-600">Promotions and offers</p>
                </div>
              </div>
              <Switch
                checked={preferences.marketing_communications}
                onCheckedChange={(checked) =>
                  setPreferences({ ...preferences, marketing_communications: checked })
                }
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* Quiet Hours */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Moon className="h-5 w-5 text-indigo-600" />
              <div>
                <h3 className="text-lg font-semibold">Quiet Hours</h3>
                <p className="text-sm text-gray-600">
                  Don't send notifications during these hours
                </p>
              </div>
            </div>
            <Switch
              checked={preferences.quiet_hours_enabled}
              onCheckedChange={(checked) =>
                setPreferences({ ...preferences, quiet_hours_enabled: checked })
              }
            />
          </div>

          {preferences.quiet_hours_enabled && (
            <Card className="bg-indigo-50 border-indigo-200">
              <CardContent className="p-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="quiet-start">Start Time</Label>
                    <Input
                      id="quiet-start"
                      type="time"
                      value={preferences.quiet_hours_start || ''}
                      onChange={(e) =>
                        setPreferences({ ...preferences, quiet_hours_start: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="quiet-end">End Time</Label>
                    <Input
                      id="quiet-end"
                      type="time"
                      value={preferences.quiet_hours_end || ''}
                      onChange={(e) =>
                        setPreferences({ ...preferences, quiet_hours_end: e.target.value })
                      }
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-3 pt-4">
          <Button onClick={handleSave} disabled={isSaving} className="flex-1">
            {isSaving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Saving...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Save Preferences
              </>
            )}
          </Button>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}