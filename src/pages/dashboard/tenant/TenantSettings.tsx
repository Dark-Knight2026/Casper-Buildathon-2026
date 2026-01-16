import React from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { 
  User, 
  Bell, 
  Shield, 
  Home,
  Upload,
  LogOut
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

export default function TenantSettings() {
  const { toast } = useToast();
  const { user } = useAuth();

  const handleSave = () => {
    toast({
      title: "Settings Saved",
      description: "Your changes have been successfully saved.",
    });
  };

  return (
    <div className="space-y-6 p-6 md:p-8 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account settings and preferences.
        </p>
      </div>

      <Tabs defaultValue="profile" className="space-y-4">
        <TabsList>
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="rental" className="flex items-center gap-2">
            <Home className="h-4 w-4" />
            Rental Info
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Security
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>
                Update your personal information and contact details.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-6">
                <Avatar className="h-24 w-24">
                  <AvatarImage src="/images/Avatar.jpg" />
                  <AvatarFallback className="text-lg">
                    {user?.name?.split(' ').map(n => n[0]).join('') || 'T'}
                  </AvatarFallback>
                </Avatar>
                <div className="space-y-2">
                  <Button variant="outline" size="sm" className="flex items-center gap-2">
                    <Upload className="h-4 w-4" />
                    Change Avatar
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    JPG, GIF or PNG. Max size of 800K.
                  </p>
                </div>
              </div>
              
              <Separator />

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First name</Label>
                  <Input id="firstName" defaultValue={user?.name?.split(' ')[0] || ''} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last name</Label>
                  <Input id="lastName" defaultValue={user?.name?.split(' ')[1] || ''} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" defaultValue={user?.email || ''} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone number</Label>
                  <Input id="phone" type="tel" placeholder="+1 (555) 123-4567" />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="emergencyContact">Emergency Contact</Label>
                <Input id="emergencyContact" placeholder="Name and phone number" />
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleSave}>Save Changes</Button>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>
                Choose what you want to be notified about.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-sm font-medium">Email Notifications</h3>
                <div className="flex items-center justify-between space-x-2">
                  <Label htmlFor="rent-due" className="flex flex-col space-y-1">
                    <span>Rent Due Reminders</span>
                    <span className="font-normal text-xs text-muted-foreground">Receive emails before rent is due.</span>
                  </Label>
                  <Switch id="rent-due" defaultChecked />
                </div>
                <div className="flex items-center justify-between space-x-2">
                  <Label htmlFor="maintenance-updates" className="flex flex-col space-y-1">
                    <span>Maintenance Updates</span>
                    <span className="font-normal text-xs text-muted-foreground">Get updates on your maintenance requests.</span>
                  </Label>
                  <Switch id="maintenance-updates" defaultChecked />
                </div>
                <div className="flex items-center justify-between space-x-2">
                  <Label htmlFor="lease-renewal" className="flex flex-col space-y-1">
                    <span>Lease Renewal</span>
                    <span className="font-normal text-xs text-muted-foreground">Receive notifications about lease renewal.</span>
                  </Label>
                  <Switch id="lease-renewal" defaultChecked />
                </div>
                <div className="flex items-center justify-between space-x-2">
                  <Label htmlFor="announcements" className="flex flex-col space-y-1">
                    <span>Property Announcements</span>
                    <span className="font-normal text-xs text-muted-foreground">Get notified about property updates and announcements.</span>
                  </Label>
                  <Switch id="announcements" />
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-4">
                <h3 className="text-sm font-medium">Push Notifications</h3>
                <div className="flex items-center justify-between space-x-2">
                  <Label htmlFor="push-messages" className="flex flex-col space-y-1">
                    <span>Messages from Landlord</span>
                    <span className="font-normal text-xs text-muted-foreground">Receive push notifications for new messages.</span>
                  </Label>
                  <Switch id="push-messages" defaultChecked />
                </div>
                <div className="flex items-center justify-between space-x-2">
                  <Label htmlFor="push-reminders" className="flex flex-col space-y-1">
                    <span>Payment Reminders</span>
                    <span className="font-normal text-xs text-muted-foreground">Get reminded about upcoming payments.</span>
                  </Label>
                  <Switch id="push-reminders" defaultChecked />
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleSave}>Save Preferences</Button>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* Rental Info Tab */}
        <TabsContent value="rental">
          <Card>
            <CardHeader>
              <CardTitle>Rental Information</CardTitle>
              <CardDescription>
                View and update your rental details.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-sm font-medium">Current Lease</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Property Address</Label>
                    <p className="text-sm text-muted-foreground">123 Main St, Apt 4B, Los Angeles, CA 90001</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Unit Number</Label>
                    <p className="text-sm text-muted-foreground">4B</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Lease Start Date</Label>
                    <p className="text-sm text-muted-foreground">January 1, 2025</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Lease End Date</Label>
                    <p className="text-sm text-muted-foreground">December 31, 2025</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Monthly Rent</Label>
                    <p className="text-sm font-semibold">$2,500</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Security Deposit</Label>
                    <p className="text-sm text-muted-foreground">$2,500</p>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-sm font-medium">Payment Method</h3>
                <div className="space-y-2">
                  <Label htmlFor="payment-method">Preferred Payment Method</Label>
                  <Input id="payment-method" defaultValue="ACH Bank Transfer" disabled />
                  <p className="text-xs text-muted-foreground">Contact your landlord to change payment method.</p>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-sm font-medium">Roommates</h3>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">No roommates listed</p>
                  <Button variant="outline" size="sm">Add Roommate</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>Security Settings</CardTitle>
              <CardDescription>
                Manage your password and security preferences.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-sm font-medium">Change Password</h3>
                <div className="space-y-2">
                  <Label htmlFor="current-password">Current Password</Label>
                  <Input id="current-password" type="password" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-password">New Password</Label>
                  <Input id="new-password" type="password" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm New Password</Label>
                  <Input id="confirm-password" type="password" />
                </div>
                <Button variant="outline" className="w-full sm:w-auto">Update Password</Button>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-sm font-medium">Two-Factor Authentication</h3>
                <div className="flex items-center justify-between space-x-2">
                  <Label htmlFor="2fa" className="flex flex-col space-y-1">
                    <span>Enable 2FA</span>
                    <span className="font-normal text-xs text-muted-foreground">Add an extra layer of security to your account.</span>
                  </Label>
                  <Switch id="2fa" />
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-sm font-medium">Privacy</h3>
                <div className="flex items-center justify-between space-x-2">
                  <Label htmlFor="data-sharing" className="flex flex-col space-y-1">
                    <span>Share Data with Landlord</span>
                    <span className="font-normal text-xs text-muted-foreground">Allow landlord to view your payment history and maintenance requests.</span>
                  </Label>
                  <Switch id="data-sharing" defaultChecked />
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-sm font-medium text-red-600">Danger Zone</h3>
                <Button variant="destructive" className="flex items-center gap-2">
                  <LogOut className="h-4 w-4" />
                  Sign out of all devices
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}