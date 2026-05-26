/**
 * Landlord Profile Page (spec §3.2; plan Part C)
 *
 * Mirrors TenantProfile for the shared basics (avatar, name/phone/bio, email
 * block, role switch). Adds a small portfolio overview stitched from the
 * shared landlord mock fixtures — `// TODO(BE)` until the Rust backend ships
 * `GET /api/v1/landlord/*` per spec §3.7.
 */

import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { Link } from 'react-router-dom';
import {
  User,
  Mail,
  Phone,
  Calendar,
  Save,
  Loader2,
  Building2,
  DollarSign,
  FileText,
  Users,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { RoleSwitchDialog } from '@/components/profile/RoleSwitchDialog';
import { uploadAvatar } from '@/services/userProfileService';
import { ApiError } from '@/lib/api-client';
import { AvatarStatus } from '@/lib/api-errors';
import { MOCK_LANDLORD_DASHBOARD_STATS } from '@/data/landlordMockData';

// Mirrors TenantProfile constants — server is authoritative on the same
// thresholds; the client values exist only to short-circuit obviously-bad
// selections before a wasted multipart round-trip.
const MAX_AVATAR_BYTES = 5 * 1024 * 1024;
const ACCEPTED_AVATAR_MIME = new Set(['image/png', 'image/jpeg', 'image/webp']);
const AVATAR_ACCEPT_ATTR = Array.from(ACCEPTED_AVATAR_MIME).join(',');

const formatDate = (date: Date): string =>
  new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'long', day: 'numeric' }).format(
    new Date(date),
  );

export function LandlordProfile() {
  const { profile: authProfile, refreshProfile, updateProfile } = useAuth();
  const { toast } = useToast();

  // Single getMe() round-trip on mount so the page reflects whatever the
  // backend currently has (the AuthContext marker may be older than the
  // server-side state — e.g. avatar updated from another device). Errors are
  // swallowed: AuthContext drives logout on 401, anything else is benign.
  useEffect(() => {
    void refreshProfile().catch(() => {
      /* non-fatal: caller falls back to whatever AuthContext already had. */
    });
  }, [refreshProfile]);

  const fullName = useMemo(() => {
    if (!authProfile) return '';
    const first = authProfile.firstName ?? '';
    const last = authProfile.lastName ?? '';
    return `${first} ${last}`.trim();
  }, [authProfile]);

  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [optimisticAvatar, setOptimisticAvatar] = useState<string | null>(null);
  const [avatarLoadFailed, setAvatarLoadFailed] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [roleSwitchOpen, setRoleSwitchOpen] = useState(false);
  const [formData, setFormData] = useState({
    firstName: authProfile?.firstName ?? '',
    lastName: authProfile?.lastName ?? '',
    phone: authProfile?.phone ?? '',
    bio: authProfile?.bio ?? '',
  });

  useEffect(() => {
    return () => {
      if (optimisticAvatar) URL.revokeObjectURL(optimisticAvatar);
    };
  }, [optimisticAvatar]);

  useEffect(() => {
    setFormData({
      firstName: authProfile?.firstName ?? '',
      lastName: authProfile?.lastName ?? '',
      phone: authProfile?.phone ?? '',
      bio: authProfile?.bio ?? '',
    });
  }, [authProfile?.firstName, authProfile?.lastName, authProfile?.phone, authProfile?.bio]);

  useEffect(() => {
    setAvatarLoadFailed(false);
  }, [authProfile?.avatar]);

  // Server validators on `PATCH /users/me` reject empty/whitespace values for
  // first_name and last_name with a 400. Mirror the rule client-side so Save
  // is disabled before the round-trip.
  const canSave =
    formData.firstName.trim().length > 0 && formData.lastName.trim().length > 0;

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      const trimmedPhone = formData.phone.trim();
      await updateProfile({
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        // Omit phone when blank — the server treats `''` as wipe-attempt (400),
        // not "leave unchanged".
        ...(trimmedPhone ? { phone: trimmedPhone } : {}),
        bio: formData.bio,
      });
      toast({ title: 'Profile updated', description: 'Your changes have been saved.' });
    } catch (err) {
      toast({
        title: 'Could not save profile',
        description: err instanceof Error ? err.message : 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      firstName: authProfile?.firstName ?? '',
      lastName: authProfile?.lastName ?? '',
      phone: authProfile?.phone ?? '',
      bio: authProfile?.bio ?? '',
    });
  };

  const describeAvatarError = (err: unknown): string => {
    if (err instanceof ApiError) {
      if (err.statusCode === AvatarStatus.PayloadTooLarge) return 'Image is too large (max 5 MB).';
      if (err.statusCode === AvatarStatus.UnsupportedMediaType)
        return 'Only PNG, JPEG, or WebP images are supported.';
      if (err.statusCode === AvatarStatus.TooManyRequests)
        return 'Too many uploads — please try again in an hour.';
      return err.message;
    }
    return err instanceof Error ? err.message : 'Please try again.';
  };

  const handleAvatarChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (!ACCEPTED_AVATAR_MIME.has(file.type)) {
      toast({
        title: 'Unsupported image format',
        description: 'Choose a PNG, JPEG, or WebP file.',
        variant: 'destructive',
      });
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      toast({
        title: 'Image too large',
        description: 'Choose a file under 5 MB.',
        variant: 'destructive',
      });
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    setOptimisticAvatar(prev => {
      if (prev) URL.revokeObjectURL(prev);
      return previewUrl;
    });
    setUploadingAvatar(true);

    try {
      await uploadAvatar(file);
      await refreshProfile();
      setOptimisticAvatar(null);
      URL.revokeObjectURL(previewUrl);
      toast({ title: 'Photo updated', description: 'Your new avatar is saved.' });
    } catch (err) {
      setOptimisticAvatar(null);
      URL.revokeObjectURL(previewUrl);
      toast({
        title: 'Could not upload photo',
        description: describeAvatarError(err),
        variant: 'destructive',
      });
    } finally {
      setUploadingAvatar(false);
    }
  };

  // TODO(BE): replace MOCK_LANDLORD_DASHBOARD_STATS with
  // GET /api/v1/landlord/stats once the contract exists — BE-blocked
  // (LeaseFi MVP spec §3.7).
  const stats = MOCK_LANDLORD_DASHBOARD_STATS;

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
              <div className="flex flex-col items-center">
                {(() => {
                  const src = optimisticAvatar ?? (avatarLoadFailed ? null : authProfile?.avatar);
                  if (src) {
                    return (
                      <img
                        src={src}
                        alt={fullName || 'Profile avatar'}
                        onError={() => setAvatarLoadFailed(true)}
                        className="h-24 w-24 rounded-full object-cover mb-4 ring-2 ring-border"
                      />
                    );
                  }
                  const initials = [authProfile?.firstName?.[0], authProfile?.lastName?.[0]]
                    .filter(Boolean)
                    .join('')
                    .toUpperCase();
                  return (
                    <div className="h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                      {initials ? (
                        <span className="text-3xl font-semibold text-primary">{initials}</span>
                      ) : (
                        <User className="h-12 w-12 text-primary" />
                      )}
                    </div>
                  );
                })()}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={AVATAR_ACCEPT_ATTR}
                  className="hidden"
                  onChange={handleAvatarChange}
                  aria-hidden="true"
                  tabIndex={-1}
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  disabled={uploadingAvatar}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {uploadingAvatar ? (
                    <>
                      <Loader2 className="mr-2 h-3 w-3 animate-spin" />Uploading…
                    </>
                  ) : (
                    'Change photo'
                  )}
                </Button>
              </div>

              <Separator />

              <div>
                <h3 className="text-lg font-semibold text-foreground">{fullName || '—'}</h3>
                <p className="text-sm text-muted-foreground capitalize">{authProfile?.role ?? ''}</p>
              </div>

              {authProfile?.bio && (
                <p className="text-sm text-muted-foreground leading-relaxed">{authProfile.bio}</p>
              )}

              <Separator />

              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">Email</p>
                    <p className="text-sm text-foreground truncate">{authProfile?.email ?? ''}</p>
                  </div>
                </div>

                {authProfile?.phone && (
                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Phone</p>
                      <p className="text-sm text-foreground">{authProfile.phone}</p>
                    </div>
                  </div>
                )}

                {authProfile?.createdAt && (
                  <div className="flex items-center gap-3">
                    <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Member Since</p>
                      <p className="text-sm text-foreground">{formatDate(authProfile.createdAt)}</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Account Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <p className="text-sm text-muted-foreground">Status</p>
                <p className="text-sm font-medium text-foreground capitalize">
                  {authProfile?.status ?? '—'}
                </p>
              </div>
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm text-muted-foreground">Account Type</p>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-foreground capitalize">
                    {authProfile?.role ?? ''}
                  </p>
                  <Button variant="outline" size="sm" onClick={() => setRoleSwitchOpen(true)}>
                    Switch
                  </Button>
                </div>
              </div>
              {authProfile?.walletAddress && (
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Wallet</p>
                  <p className="text-xs font-mono text-foreground break-all leading-relaxed select-all">
                    {authProfile.walletAddress}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right column — edit + portfolio */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>Update your personal details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) =>
                      setFormData(prev => ({ ...prev, firstName: e.target.value }))
                    }
                    placeholder="Jane"
                    aria-required="true"
                    aria-invalid={formData.firstName.trim().length === 0}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name *</Label>
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) =>
                      setFormData(prev => ({ ...prev, lastName: e.target.value }))
                    }
                    placeholder="Doe"
                    aria-required="true"
                    aria-invalid={formData.lastName.trim().length === 0}
                  />
                </div>
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
                  placeholder="A short bio shown to tenants browsing your listings…"
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button variant="outline" onClick={handleCancel} disabled={saving}>
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={saving || !canSave}>
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />Save Changes
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Portfolio overview — spec §3.2: owned properties, active leases,
              received rent. Demo content while BE wiring is pending. */}
          <Card>
            <CardHeader>
              <CardTitle>Portfolio Overview</CardTitle>
              <CardDescription>
                A quick read of your current rental footprint.{' '}
                <Link to="/landlord/dashboard" className="text-primary hover:underline">
                  View full dashboard →
                </Link>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div className="rounded-md border bg-card p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">Properties</p>
                    <Building2 className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  </div>
                  <p className="mt-1 text-2xl font-bold text-foreground">{stats.totalProperties}</p>
                  <p className="text-xs text-muted-foreground">{stats.occupiedProperties} occupied</p>
                </div>

                <div className="rounded-md border bg-card p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">Active Leases</p>
                    <FileText className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  </div>
                  <p className="mt-1 text-2xl font-bold text-foreground">{stats.activeLeases}</p>
                  <p className="text-xs text-muted-foreground">
                    {stats.expiringLeases} expiring soon
                  </p>
                </div>

                <div className="rounded-md border bg-card p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">Tenants</p>
                    <Users className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  </div>
                  <p className="mt-1 text-2xl font-bold text-foreground">{stats.totalTenants}</p>
                  <p className="text-xs text-muted-foreground">Across all properties</p>
                </div>

                <div className="rounded-md border bg-card p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">Monthly Revenue</p>
                    <DollarSign className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  </div>
                  <p className="mt-1 text-2xl font-bold text-foreground">
                    ${stats.monthlyRevenue.toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">Current month</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <RoleSwitchDialog
            open={roleSwitchOpen}
            onOpenChange={setRoleSwitchOpen}
            currentRole={authProfile?.role}
          />

          <Card>
            <CardHeader>
              <CardTitle>Email Address</CardTitle>
              <CardDescription>Changing email requires verification</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Mobile: stacked column, right-aligned, email wraps. ≥sm:
                  row (email left, button right, single line). Mirrors
                  TenantProfile so layouts stay parallel. */}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                <div className="flex items-start gap-3 min-w-0 justify-end sm:items-center sm:justify-start">
                  <Mail className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5 sm:mt-0" />
                  <p className="text-sm text-foreground min-w-0 wrap-break-word text-right sm:text-left">
                    {authProfile?.email ?? ''}
                  </p>
                </div>
                {/* Disabled until the change-email dialog ships — service
                    layer exists (requestEmailChange / confirmEmailChange in
                    userProfileService.ts); only the dialog is missing. */}
                <Button variant="outline" size="sm" disabled title="Coming soon">
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
