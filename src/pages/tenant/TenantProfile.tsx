/**
 * Tenant Profile Page
 * View and edit tenant profile information
 */

import { useState } from 'react';
import { User, Mail, Phone, Home, Calendar, Save, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  phone: string;
  role: string;
  status: string;
  createdAt: Date;
}

// TODO: remove when backend /api/v1/profile is ready
const MOCK_PROFILE: UserProfile = {
  id: 'mock-tenant-1',
  email: 'tenant@demo.com',
  fullName: 'Jane Doe',
  phone: '+1 (555) 234-5678',
  role: 'tenant',
  status: 'active',
  createdAt: new Date('2024-06-15'),
};
const MOCK_ACTIVE_LEASE_COUNT = 1;

const formatDate = (date: Date): string =>
  new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(date));

export function TenantProfile() {
  const { profile: authProfile } = useAuth();

  // TODO: replace with API call when backend is ready
  const profile: UserProfile = {
    ...MOCK_PROFILE,
    id: authProfile?.id ?? MOCK_PROFILE.id,
    email: authProfile?.email ?? MOCK_PROFILE.email,
    fullName: authProfile?.firstName
      ? `${authProfile.firstName} ${authProfile.lastName ?? ''}`.trim()
      : MOCK_PROFILE.fullName,
  };

  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    fullName: profile.fullName,
    phone: profile.phone,
  });
  const { toast } = useToast();

  // TODO: replace with real PATCH /api/v1/profile when backend is ready
  const handleSave = async () => {
    setSaving(true);
    await new Promise(res => setTimeout(res, 600));
    toast({ title: 'Profile updated', description: 'Your profile has been saved (mock)' });
    setSaving(false);
  };

  const handleCancel = () => {
    setFormData({ fullName: profile.fullName, phone: profile.phone });
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">My Profile</h1>
        <p className="text-muted-foreground">Manage your account information</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Overview */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Account Overview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col items-center">
                <div className="h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <User className="h-12 w-12 text-primary" />
                </div>
                <h3 className="text-xl font-semibold text-foreground">{profile.fullName}</h3>
                <p className="text-sm text-muted-foreground capitalize">{profile.role}</p>
              </div>

              <Separator />

              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Email</p>
                    <p className="text-sm text-foreground">{profile.email}</p>
                  </div>
                </div>

                {profile.phone && (
                  <div className="flex items-center gap-3">
                    <Phone className="h-5 w-5 text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Phone</p>
                      <p className="text-sm text-foreground">{profile.phone}</p>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-3">
                  <Home className="h-5 w-5 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Active Leases</p>
                    <p className="text-sm text-foreground">{MOCK_ACTIVE_LEASE_COUNT}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Member Since</p>
                    <p className="text-sm text-foreground">{formatDate(profile.createdAt)}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Edit Profile */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>Update your personal details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  value={formData.fullName}
                  onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
                  placeholder="Enter your full name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  value={profile.email}
                  disabled
                  className="bg-muted text-muted-foreground"
                />
                <p className="text-xs text-muted-foreground">
                  Email cannot be changed. Contact support if you need to update your email.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="+1 (555) 000-0000"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button variant="outline" onClick={handleCancel} disabled={saving}>
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save Changes
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Account Status</CardTitle>
              <CardDescription>Your account information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Account Status</p>
                  <p className="text-lg font-semibold text-foreground capitalize">{profile.status}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Account Type</p>
                  <p className="text-lg font-semibold text-foreground capitalize">{profile.role}</p>
                </div>
              </div>

              <Separator />

              <p className="text-sm text-muted-foreground">
                Your account is in good standing. If you have any questions or need assistance,
                please contact support through the platform.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
