/**
 * Tenant Profile Page
 * View and edit tenant profile information
 */

import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { User, Mail, Phone, Home, Calendar, Save, Loader2, Sliders, Lock } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useRefetchOnFocus } from '@/hooks/useRefetchOnFocus';
import { useTenantPreferences } from '@/hooks/useTenantPreferences';
import { TenantPreferencesDialog } from '@/components/tenant/TenantPreferencesDialog';
import { RoleSwitchDialog } from '@/components/profile/RoleSwitchDialog';
import { EmailVerificationCard } from '@/components/profile/EmailVerificationCard';
import { WalletSection } from '@/components/profile/WalletSection';
import { ChangeEmailDialog } from '@/components/profile/ChangeEmailDialog';
import { ChangePasswordDialog } from '@/components/profile/ChangePasswordDialog';
import { countActivePreferences, ALL_MATCH_CATEGORIES } from '@/types/tenantPreferences';
import { uploadAvatar } from '@/services/userProfileService';
import { ApiError } from '@/lib/api-client';
import { AvatarStatus } from '@/lib/api-errors';

/**
 * Client-side avatar constraints. Mirrored on the server (`upload_avatar` in
 * `crates/api/src/services/users/handlers.rs`) — the server is authoritative;
 * the values here exist only to short-circuit obviously-bad selections so the
 * user gets feedback before a wasted multipart round-trip.
 */
const MAX_AVATAR_BYTES = 5 * 1024 * 1024;
const ACCEPTED_AVATAR_MIME = new Set(['image/png', 'image/jpeg', 'image/webp']);
const AVATAR_ACCEPT_ATTR = Array.from(ACCEPTED_AVATAR_MIME).join(',');

const formatDate = (date: Date): string =>
  new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(date));

export function TenantProfile() {
  const { profile: authProfile, refreshProfile, updateProfile } = useAuth();
  const { toast } = useToast();

  // Run a single getMe() round-trip on mount so the page shows whatever the
  // backend currently has (the AuthContext marker may be older than the
  // server-side state — e.g. avatar updated from another device). Errors are
  // swallowed: AuthContext already drives a logout on 401, anything else is
  // benign for a read.
  useEffect(() => {
    void refreshProfile().catch(() => {
      // Non-fatal: caller falls back to whatever AuthContext already had.
    });
  }, [refreshProfile]);

  // Re-fetch when the user returns to this tab — covers email verify/change
  // links that the mail client opened (and confirmed) in a separate tab.
  useRefetchOnFocus(() => {
    void refreshProfile().catch(() => {
      // Non-fatal: keep showing the last good profile.
    });
  });

  const fullName = useMemo(() => {
    if (!authProfile) return '';
    const first = authProfile.firstName ?? '';
    const last = authProfile.lastName ?? '';
    return `${first} ${last}`.trim();
  }, [authProfile]);

  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  // Object URL displayed instantly after the user picks a file, before the
  // server round-trip resolves. Cleared (and revoked) once the refreshed
  // profile carries the canonical `avatar_url`.
  const [optimisticAvatar, setOptimisticAvatar] = useState<string | null>(null);
  // If the canonical avatar URL fails to load (CDN miss, expired presigned link,
  // backend returning a path the browser can't resolve), fall back to initials
  // instead of letting the browser render the broken-image alt text.
  const [avatarLoadFailed, setAvatarLoadFailed] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    firstName: authProfile?.firstName ?? '',
    lastName: authProfile?.lastName ?? '',
    phone: authProfile?.phone ?? '',
    bio: authProfile?.bio ?? '',
  });

  // Revoke the in-flight blob URL on unmount; otherwise the browser keeps the
  // file in memory for the lifetime of the document.
  useEffect(() => {
    return () => {
      if (optimisticAvatar) URL.revokeObjectURL(optimisticAvatar);
    };
  }, [optimisticAvatar]);

  // Re-sync the form when the underlying profile shifts (initial fetch,
  // external refresh after an avatar upload, etc.).
  useEffect(() => {
    setFormData({
      firstName: authProfile?.firstName ?? '',
      lastName: authProfile?.lastName ?? '',
      phone: authProfile?.phone ?? '',
      bio: authProfile?.bio ?? '',
    });
  }, [authProfile?.firstName, authProfile?.lastName, authProfile?.phone, authProfile?.bio]);

  // Reset the load-failed flag when the URL changes — a fresh upload should
  // get a fresh chance to render before falling back to initials.
  useEffect(() => {
    setAvatarLoadFailed(false);
  }, [authProfile?.avatar]);

  const {
    preferences,
    hasExplicitPreferences,
    updatePreferences,
  } = useTenantPreferences(authProfile?.id ?? '');
  const [preferencesOpen, setPreferencesOpen] = useState(false);
  const [roleSwitchOpen, setRoleSwitchOpen] = useState(false);
  const [changeEmailOpen, setChangeEmailOpen] = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const activeCount = countActivePreferences(preferences);

  // Server-side validators on `PATCH /users/me` reject empty/whitespace values
  // for first_name, last_name and phone with a 400. Mirror the rule client-side
  // so the Save button is disabled before the user wastes a round-trip.
  const canSave =
    formData.firstName.trim().length > 0 &&
    formData.lastName.trim().length > 0;

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      const trimmedPhone = formData.phone.trim();
      await updateProfile({
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        // Omit phone when blank — the server treats `''` as an attempt to wipe
        // the column (rejected) rather than "leave unchanged".
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

  /**
   * Translate the upload failure into a user-facing toast. 413/415/429 have
   * specific copy; everything else falls back to the server message because
   * the avatar handler emits prose strings (no machine-readable token), so
   * surfacing them as-is gives the user the most accurate hint.
   */
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
    // Reset the input so re-selecting the same file fires `change` again.
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
    // Replace any prior in-flight blob URL — only one preview at a time.
    setOptimisticAvatar(prev => {
      if (prev) URL.revokeObjectURL(prev);
      return previewUrl;
    });
    setUploadingAvatar(true);

    try {
      await uploadAvatar(file);
      // Refresh AuthContext so the new `avatar_url` propagates to the Navbar
      // and any other consumer; the optimistic blob URL is dropped after the
      // server-side URL is in place.
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

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">My Profile</h1>
        <p className="text-muted-foreground">Manage your account information</p>
      </div>

      <div className="mb-6">
        <EmailVerificationCard />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left column — overview */}
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardContent className="pt-6 space-y-4">
              {/* Avatar */}
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
                    <><Loader2 className="mr-2 h-3 w-3 animate-spin" />Uploading…</>
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

                <div className="flex items-center gap-3">
                  <Home className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Active Leases</p>
                    <p className="text-sm text-foreground">{authProfile?.activeLeasesCount ?? 0}</p>
                  </div>
                </div>

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

          {/* Account status */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Account Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <p className="text-sm text-muted-foreground">Status</p>
                <p className="text-sm font-medium text-foreground capitalize">{authProfile?.status ?? '—'}</p>
              </div>
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm text-muted-foreground">Account Type</p>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-foreground capitalize">{authProfile?.role ?? ''}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setRoleSwitchOpen(true)}
                  >
                    Switch
                  </Button>
                </div>
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
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
                    onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
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
                  placeholder="Tell landlords a bit about yourself..."
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button variant="outline" onClick={handleCancel} disabled={saving}>
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={saving || !canSave}>
                  {saving ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</>
                  ) : (
                    <><Save className="mr-2 h-4 w-4" />Save Changes</>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Rental Preferences — drives Task 6 recommendations */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sliders className="h-4 w-4" />
                Rental Preferences
              </CardTitle>
              <CardDescription>
                Used to recommend properties as your lease nears its end.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {hasExplicitPreferences ? (
                <p className="text-sm text-muted-foreground">
                  <Badge variant="secondary" className="mr-2">
                    {activeCount}/{ALL_MATCH_CATEGORIES.length}
                  </Badge>
                  preference categories set. Edit to refine your matches.
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No preferences yet — we'll use your current home as a starting point.
                </p>
              )}
              <div className="flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPreferencesOpen(true)}
                  aria-label={hasExplicitPreferences ? 'Edit preferences' : 'Set preferences'}
                >
                  <Sliders className="h-4 w-4 sm:mr-1.5" aria-hidden="true" />
                  <span className="hidden sm:inline">
                    {hasExplicitPreferences ? 'Edit preferences' : 'Set preferences'}
                  </span>
                </Button>
              </div>
            </CardContent>
          </Card>

          <TenantPreferencesDialog
            open={preferencesOpen}
            onOpenChange={setPreferencesOpen}
            initialPreferences={preferences}
            onSave={updatePreferences}
          />

          <RoleSwitchDialog
            open={roleSwitchOpen}
            onOpenChange={setRoleSwitchOpen}
            currentRole={authProfile?.role}
          />

        </div>
      </div>

      {/* Wallet linking — full-width card under the grid (last card). */}
      <div className="mt-6 space-y-6">
                  {/* Email — separate verification flow */}
          <Card>
            <CardHeader>
              <CardTitle>Email Address</CardTitle>
              <CardDescription>Changing email requires verification</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Mobile: stacked column, right-aligned, email wraps. ≥sm:
                  original row (email left, button right, single line). */}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                <div className="flex items-start gap-3 min-w-0 justify-end sm:items-center sm:justify-start">
                  <Mail className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5 sm:mt-0" />
                  <p className="text-sm text-foreground min-w-0 wrap-break-word text-right sm:text-left">
                    {authProfile?.email ?? ''}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setChangeEmailOpen(true)}
                >
                  Change email
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                A confirmation link will be sent to your new email address.
              </p>
            </CardContent>
          </Card>

        <Card>
          <CardHeader>
            <CardTitle>Password</CardTitle>
            <CardDescription>Change the password you use to sign in</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <Lock className="h-4 w-4 text-muted-foreground shrink-0" />
                <p className="text-sm tracking-widest text-muted-foreground">••••••••</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => setChangePasswordOpen(true)}>
                Change password
              </Button>
            </div>
          </CardContent>
        </Card>

        <WalletSection />
      </div>

      <ChangeEmailDialog
        open={changeEmailOpen}
        onOpenChange={setChangeEmailOpen}
        currentEmail={authProfile?.email}
      />
      <ChangePasswordDialog open={changePasswordOpen} onOpenChange={setChangePasswordOpen} />
    </div>
  );
}
