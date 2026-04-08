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
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  phone: string;
  role: string;
  status: string;
  bio: string;
  avatarUrl: string | null;
  activeLeaseCount: number;
  createdAt: Date;
}

// TODO: remove when GET /api/v1/users/me is ready
const MOCK_PROFILE: UserProfile = {
  id: 'mock-tenant-1',
  email: 'tenant@demo.com',
  fullName: 'Jane Doe',
  phone: '+1 (555) 234-5678',
  role: 'tenant',
  status: 'active',
  bio: 'Looking for a long-term rental in downtown area. Responsible tenant with good references.',
  avatarUrl: null,
  activeLeaseCount: 1,
  createdAt: new Date('2024-06-15'),
};

const formatDate = (date: Date): string =>
  new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(date));

export function TenantProfile() {
  const { profile: authProfile } = useAuth();

  // TODO: replace with GET /api/v1/users/me when backend is ready
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
    bio: profile.bio,
  });
  const { toast } = useToast();

  // TODO: replace with PATCH /api/v1/users/me when backend is ready
  const handleSave = async () => {
    setSaving(true);
    await new Promise(res => setTimeout(res, 600));
    toast({ title: 'Profile updated', description: 'Your profile has been saved (mock)' });
    setSaving(false);
  };

  const handleCancel = () => {
    setFormData({ fullName: profile.fullName, phone: profile.phone, bio: profile.bio });
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">My Profile</h1>
        <p className="text-muted-foreground">Manage your account information</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left column — overview */}
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardContent className="pt-6 space-y-4">
              {/* Avatar */}
              <div className="flex flex-col items-center">
                {profile.avatarUrl ? (
                  <img
                    src={profile.avatarUrl}
                    alt={profile.fullName}
                    className="h-24 w-24 rounded-full object-cover mb-4 ring-2 ring-border"
                  />
                ) : (
                  <div className="h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                    <User className="h-12 w-12 text-primary" />
                  </div>
                )}
                {/* TODO: wire to POST /api/v1/users/me/avatar */}
                <Button variant="outline" size="sm" disabled className="text-xs">
                  Change photo
                </Button>
              </div>

              <Separator />

              <div>
                <h3 className="text-lg font-semibold text-foreground">{profile.fullName}</h3>
                <p className="text-sm text-muted-foreground capitalize">{profile.role}</p>
              </div>

              {profile.bio && (
                <p className="text-sm text-muted-foreground leading-relaxed">{profile.bio}</p>
              )}

              <Separator />

              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">Email</p>
                    <p className="text-sm text-foreground truncate">{profile.email}</p>
                  </div>
                </div>

                {profile.phone && (
                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Phone</p>
                      <p className="text-sm text-foreground">{profile.phone}</p>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-3">
                  <Home className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Active Leases</p>
                    <p className="text-sm text-foreground">{profile.activeLeaseCount}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Member Since</p>
                    <p className="text-sm text-foreground">{formatDate(profile.createdAt)}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Account status */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Account Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <p className="text-sm text-muted-foreground">Status</p>
                <p className="text-sm font-medium text-foreground capitalize">{profile.status}</p>
              </div>
              <div className="flex justify-between">
                <p className="text-sm text-muted-foreground">Account Type</p>
                <p className="text-sm font-medium text-foreground capitalize">{profile.role}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right column — edit forms */}
        <div className="lg:col-span-2 space-y-6">

          {/* Personal information */}
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
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="+1 (555) 000-0000"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  value={formData.bio}
                  onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                  placeholder="Tell landlords a bit about yourself..."
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button variant="outline" onClick={handleCancel} disabled={saving}>
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</>
                  ) : (
                    <><Save className="mr-2 h-4 w-4" />Save Changes</>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Email — separate verification flow */}
          <Card>
            <CardHeader>
              <CardTitle>Email Address</CardTitle>
              <CardDescription>Changing email requires verification</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                  <p className="text-sm text-foreground truncate">{profile.email}</p>
                </div>
                {/* TODO: open email change flow → PATCH /api/v1/users/me/email */}
                <Button variant="outline" size="sm" disabled>
                  Change email
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                A confirmation link will be sent to your new email address.
              </p>
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
}
