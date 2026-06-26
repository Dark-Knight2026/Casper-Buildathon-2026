/**
 * Broker Settings Page
 * Brokerage settings and configuration
 */

import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Settings,
  Building,
  Users,
  DollarSign,
  Bell,
  Shield,
  Save,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase/client';
import { ErrorBoundary } from '@/components/ui/error-boundary';

interface BrokerageSettings {
  brokerageName: string;
  licenseNumber: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  defaultCommissionSplit: number;
  autoApproveCommissions: boolean;
  requireDocumentApproval: boolean;
  enableNotifications: boolean;
  notifyOnNewAgent: boolean;
  notifyOnTransaction: boolean;
  notifyOnCommission: boolean;
}

export default function BrokerSettings() {
  const [settings, setSettings] = useState<BrokerageSettings>({
    brokerageName: '',
    licenseNumber: '',
    address: '',
    phone: '',
    email: '',
    website: '',
    defaultCommissionSplit: 50,
    autoApproveCommissions: false,
    requireDocumentApproval: true,
    enableNotifications: true,
    notifyOnNewAgent: true,
    notifyOnTransaction: true,
    notifyOnCommission: true
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  const loadSettings = useCallback(async () => {
    if (!userId) return;

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('broker_settings')
        .select('*')
        .eq('broker_id', userId)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError;
      }

      if (data) {
        setSettings({
          brokerageName: data.brokerage_name || '',
          licenseNumber: data.license_number || '',
          address: data.address || '',
          phone: data.phone || '',
          email: data.email || '',
          website: data.website || '',
          defaultCommissionSplit: data.default_commission_split || 50,
          autoApproveCommissions: data.auto_approve_commissions || false,
          requireDocumentApproval: data.require_document_approval || true,
          enableNotifications: data.enable_notifications || true,
          notifyOnNewAgent: data.notify_on_new_agent || true,
          notifyOnTransaction: data.notify_on_transaction || true,
          notifyOnCommission: data.notify_on_commission || true
        });
      }
    } catch (err) {
      console.error('Error loading settings:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to load settings';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [userId]);

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
      loadSettings();
    }
  }, [userId, loadSettings]);

  const handleSave = async () => {
    if (!userId) return;

    setSaving(true);
    setError(null);

    try {
      const { error: saveError } = await supabase.from('broker_settings').upsert(
        {
          broker_id: userId,
          brokerage_name: settings.brokerageName,
          license_number: settings.licenseNumber,
          address: settings.address,
          phone: settings.phone,
          email: settings.email,
          website: settings.website,
          default_commission_split: settings.defaultCommissionSplit,
          auto_approve_commissions: settings.autoApproveCommissions,
          require_document_approval: settings.requireDocumentApproval,
          enable_notifications: settings.enableNotifications,
          notify_on_new_agent: settings.notifyOnNewAgent,
          notify_on_transaction: settings.notifyOnTransaction,
          notify_on_commission: settings.notifyOnCommission,
          updated_at: new Date().toISOString()
        },
        { onConflict: 'broker_id' }
      );

      if (saveError) {
        throw saveError;
      }

      toast({
        title: 'Success',
        description: 'Settings saved successfully'
      });
    } catch (err) {
      console.error('Error saving settings:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to save settings';
      setError(errorMessage);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: errorMessage
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Brokerage Settings</h1>
            <p className="text-gray-500 mt-1">
              Configure your brokerage preferences and policies
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={loadSettings} disabled={loading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              <Save className="mr-2 h-4 w-4" />
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="general" className="space-y-6">
          <TabsList>
            <TabsTrigger value="general">
              <Building className="mr-2 h-4 w-4" />
              General
            </TabsTrigger>
            <TabsTrigger value="commission">
              <DollarSign className="mr-2 h-4 w-4" />
              Commission
            </TabsTrigger>
            <TabsTrigger value="policies">
              <Shield className="mr-2 h-4 w-4" />
              Policies
            </TabsTrigger>
            <TabsTrigger value="notifications">
              <Bell className="mr-2 h-4 w-4" />
              Notifications
            </TabsTrigger>
          </TabsList>

          <TabsContent value="general">
            <Card>
              <CardHeader>
                <CardTitle>General Information</CardTitle>
                <CardDescription>Basic brokerage information and contact details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="brokerageName">Brokerage Name</Label>
                    <Input
                      id="brokerageName"
                      value={settings.brokerageName}
                      onChange={(e) =>
                        setSettings({ ...settings, brokerageName: e.target.value })
                      }
                      placeholder="Your Brokerage Name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="licenseNumber">License Number</Label>
                    <Input
                      id="licenseNumber"
                      value={settings.licenseNumber}
                      onChange={(e) =>
                        setSettings({ ...settings, licenseNumber: e.target.value })
                      }
                      placeholder="License #"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    value={settings.address}
                    onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                    placeholder="Street Address, City, State, ZIP"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={settings.phone}
                      onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                      placeholder="(555) 123-4567"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={settings.email}
                      onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                      placeholder="contact@brokerage.com"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="website">Website</Label>
                  <Input
                    id="website"
                    type="url"
                    value={settings.website}
                    onChange={(e) => setSettings({ ...settings, website: e.target.value })}
                    placeholder="https://www.yourbrokerage.com"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="commission">
            <Card>
              <CardHeader>
                <CardTitle>Commission Settings</CardTitle>
                <CardDescription>Configure default commission split percentages</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="defaultCommissionSplit">
                    Default Agent Commission Split (%)
                  </Label>
                  <Input
                    id="defaultCommissionSplit"
                    type="number"
                    min="0"
                    max="100"
                    value={settings.defaultCommissionSplit}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        defaultCommissionSplit: Number(e.target.value)
                      })
                    }
                  />
                  <p className="text-sm text-gray-500">
                    Broker receives: {100 - settings.defaultCommissionSplit}%
                  </p>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-0.5">
                    <Label>Auto-Approve Commissions</Label>
                    <p className="text-sm text-gray-500">
                      Automatically approve commission splits without manual review
                    </p>
                  </div>
                  <Switch
                    checked={settings.autoApproveCommissions}
                    onCheckedChange={(checked) =>
                      setSettings({ ...settings, autoApproveCommissions: checked })
                    }
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="policies">
            <Card>
              <CardHeader>
                <CardTitle>Brokerage Policies</CardTitle>
                <CardDescription>Configure approval workflows and requirements</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-0.5">
                    <Label>Require Document Approval</Label>
                    <p className="text-sm text-gray-500">
                      All documents must be approved before sharing with clients
                    </p>
                  </div>
                  <Switch
                    checked={settings.requireDocumentApproval}
                    onCheckedChange={(checked) =>
                      setSettings({ ...settings, requireDocumentApproval: checked })
                    }
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <CardTitle>Notification Preferences</CardTitle>
                <CardDescription>Choose what notifications you want to receive</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-0.5">
                    <Label>Enable Notifications</Label>
                    <p className="text-sm text-gray-500">
                      Master switch for all notifications
                    </p>
                  </div>
                  <Switch
                    checked={settings.enableNotifications}
                    onCheckedChange={(checked) =>
                      setSettings({ ...settings, enableNotifications: checked })
                    }
                  />
                </div>

                {settings.enableNotifications && (
                  <>
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="space-y-0.5">
                        <Label>New Agent Notifications</Label>
                        <p className="text-sm text-gray-500">
                          Get notified when a new agent joins your brokerage
                        </p>
                      </div>
                      <Switch
                        checked={settings.notifyOnNewAgent}
                        onCheckedChange={(checked) =>
                          setSettings({ ...settings, notifyOnNewAgent: checked })
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="space-y-0.5">
                        <Label>Transaction Notifications</Label>
                        <p className="text-sm text-gray-500">
                          Get notified about new transactions and status changes
                        </p>
                      </div>
                      <Switch
                        checked={settings.notifyOnTransaction}
                        onCheckedChange={(checked) =>
                          setSettings({ ...settings, notifyOnTransaction: checked })
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="space-y-0.5">
                        <Label>Commission Notifications</Label>
                        <p className="text-sm text-gray-500">
                          Get notified about commission payments and splits
                        </p>
                      </div>
                      <Switch
                        checked={settings.notifyOnCommission}
                        onCheckedChange={(checked) =>
                          setSettings({ ...settings, notifyOnCommission: checked })
                        }
                      />
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </ErrorBoundary>
  );
}