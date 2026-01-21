/**
 * Tenant Profile Page
 * View and edit tenant profile information
 */

import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User,
  Mail,
  Phone,
  Home,
  Calendar,
  Loader2,
  AlertCircle,
  Save,
  LogOut
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/lib/supabase/client';
import { leaseManagementService } from '@/services/leaseManagementService';
import { useToast } from '@/hooks/use-toast';

interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  phone: string;
  role: string;
  status: string;
  createdAt: Date;
}

export function TenantProfile() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeLeaseCount, setActiveLeaseCount] = useState(0);
  const [formData, setFormData] = useState({
    fullName: '',
    phone: ''
  });
  const navigate = useNavigate();
  const { toast } = useToast();

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate('/auth/login');
        return;
      }

      // Get user profile from database
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      if (userError) {
        throw userError;
      }

      const userProfile: UserProfile = {
        id: userData.id,
        email: userData.email,
        fullName: userData.full_name,
        phone: userData.phone || '',
        role: userData.role,
        status: userData.status,
        createdAt: new Date(userData.created_at)
      };

      setProfile(userProfile);
      setFormData({
        fullName: userProfile.fullName,
        phone: userProfile.phone
      });

      // Get active lease count
      const leases = await leaseManagementService.getLeases({
        tenantId: user.id,
        status: ['active']
      });
      setActiveLeaseCount(leases.length);
    } catch (err) {
      console.error('Error loading profile:', err);
      setError(err instanceof Error ? err.message : 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const handleSave = async () => {
    if (!profile) return;

    setSaving(true);

    try {
      const { error: updateError } = await supabase
        .from('users')
        .update({
          full_name: formData.fullName,
          phone: formData.phone,
          updated_at: new Date().toISOString()
        })
        .eq('id', profile.id);

      if (updateError) {
        throw updateError;
      }

      toast({
        title: 'Profile updated',
        description: 'Your profile has been updated successfully'
      });

      // Reload profile
      await loadProfile();
    } catch (err) {
      console.error('Error updating profile:', err);
      toast({
        title: 'Update failed',
        description: err instanceof Error ? err.message : 'Failed to update profile',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      navigate('/auth/login');
    } catch (err) {
      console.error('Error logging out:', err);
      toast({
        title: 'Logout failed',
        description: 'An error occurred while logging out',
        variant: 'destructive'
      });
    }
  };

  const formatDate = (date: Date): string => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(new Date(date));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error || 'Profile not found'}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">My Profile</h1>
        <p className="text-gray-600">Manage your account information</p>
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
                <h3 className="text-xl font-semibold">{profile.fullName}</h3>
                <p className="text-sm text-gray-500 capitalize">{profile.role}</p>
              </div>

              <Separator />

              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500">Email</p>
                    <p className="text-sm">{profile.email}</p>
                  </div>
                </div>

                {profile.phone && (
                  <div className="flex items-center gap-3">
                    <Phone className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500">Phone</p>
                      <p className="text-sm">{profile.phone}</p>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-3">
                  <Home className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500">Active Leases</p>
                    <p className="text-sm">{activeLeaseCount}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500">Member Since</p>
                    <p className="text-sm">{formatDate(profile.createdAt)}</p>
                  </div>
                </div>
              </div>

              <Separator />

              <Button
                variant="outline"
                className="w-full"
                onClick={handleLogout}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </Button>
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
                  className="bg-gray-50"
                />
                <p className="text-xs text-gray-500">
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
                <Button
                  variant="outline"
                  onClick={loadProfile}
                  disabled={saving}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={saving}
                >
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
                  <p className="text-sm font-medium text-gray-500">Account Status</p>
                  <p className="text-lg font-semibold capitalize">{profile.status}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Account Type</p>
                  <p className="text-lg font-semibold capitalize">{profile.role}</p>
                </div>
              </div>

              <Separator />

              <div>
                <p className="text-sm text-gray-500">
                  Your account is in good standing. If you have any questions or need assistance, 
                  please contact support through the platform.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}