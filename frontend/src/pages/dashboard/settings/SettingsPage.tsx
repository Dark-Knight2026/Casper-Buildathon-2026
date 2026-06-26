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
  CreditCard, 
  Check,
  Upload,
  LogOut
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export const SettingsPage: React.FC = () => {
  const { toast } = useToast();

  const handleSave = () => {
    toast({
      title: "Settings Saved",
      description: "Your changes have been successfully saved.",
    });
  };

  return (
    <div className="space-y-6">
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
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Security
          </TabsTrigger>
          <TabsTrigger value="billing" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Billing
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>
                Update your personal information and public profile.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-6">
                <Avatar className="h-24 w-24">
                  <AvatarImage src="/images/Avatar.jpg" />
                  <AvatarFallback className="text-lg">JD</AvatarFallback>
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
                  <Input id="firstName" defaultValue="John" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last name</Label>
                  <Input id="lastName" defaultValue="Doe" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" defaultValue="john.doe@example.com" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone number</Label>
                  <Input id="phone" type="tel" defaultValue="+1 (555) 123-4567" />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Input id="bio" defaultValue="Property Manager at KeyChain Real Estate" />
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
                  <Label htmlFor="new-lease" className="flex flex-col space-y-1">
                    <span>New Lease Applications</span>
                    <span className="font-normal text-xs text-muted-foreground">Receive emails when new applications are submitted.</span>
                  </Label>
                  <Switch id="new-lease" defaultChecked />
                </div>
                <div className="flex items-center justify-between space-x-2">
                  <Label htmlFor="rent-payment" className="flex flex-col space-y-1">
                    <span>Rent Payments</span>
                    <span className="font-normal text-xs text-muted-foreground">Receive emails when rent is paid successfully.</span>
                  </Label>
                  <Switch id="rent-payment" defaultChecked />
                </div>
                <div className="flex items-center justify-between space-x-2">
                  <Label htmlFor="maintenance" className="flex flex-col space-y-1">
                    <span>Maintenance Requests</span>
                    <span className="font-normal text-xs text-muted-foreground">Receive emails for new maintenance tickets.</span>
                  </Label>
                  <Switch id="maintenance" defaultChecked />
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-4">
                <h3 className="text-sm font-medium">Push Notifications</h3>
                <div className="flex items-center justify-between space-x-2">
                  <Label htmlFor="push-messages" className="flex flex-col space-y-1">
                    <span>Direct Messages</span>
                    <span className="font-normal text-xs text-muted-foreground">Receive push notifications for new messages.</span>
                  </Label>
                  <Switch id="push-messages" defaultChecked />
                </div>
                <div className="flex items-center justify-between space-x-2">
                  <Label htmlFor="push-reminders" className="flex flex-col space-y-1">
                    <span>Reminders</span>
                    <span className="font-normal text-xs text-muted-foreground">Get reminded about upcoming lease expirations.</span>
                  </Label>
                  <Switch id="push-reminders" />
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleSave}>Save Preferences</Button>
            </CardFooter>
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
                <h3 className="text-sm font-medium text-red-600">Danger Zone</h3>
                <Button variant="destructive" className="flex items-center gap-2">
                  <LogOut className="h-4 w-4" />
                  Sign out of all devices
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Billing Tab */}
        <TabsContent value="billing">
          <Card>
            <CardHeader>
              <CardTitle>Billing & Plans</CardTitle>
              <CardDescription>
                Manage your subscription and payment methods.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="rounded-lg border p-4 bg-muted/10">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-lg">Professional Plan</h3>
                    <p className="text-sm text-muted-foreground">Billed monthly</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-xl">$29.00</p>
                    <p className="text-xs text-muted-foreground">/ month</p>
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-2 text-sm text-green-600">
                  <Check className="h-4 w-4" />
                  <span>Active subscription</span>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-medium">Payment Method</h3>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="h-8 w-12 bg-gray-200 rounded flex items-center justify-center">
                      <CreditCard className="h-5 w-5 text-gray-500" />
                    </div>
                    <div>
                      <p className="font-medium">Visa ending in 4242</p>
                      <p className="text-xs text-muted-foreground">Expires 12/2025</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm">Edit</Button>
                </div>
                <Button variant="outline" className="w-full">Add New Payment Method</Button>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-sm font-medium">Billing History</h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm py-2 border-b">
                    <span>Dec 01, 2025</span>
                    <span className="font-medium">$29.00</span>
                    <span className="text-green-600 text-xs bg-green-100 px-2 py-0.5 rounded-full">Paid</span>
                  </div>
                  <div className="flex justify-between text-sm py-2 border-b">
                    <span>Nov 01, 2025</span>
                    <span className="font-medium">$29.00</span>
                    <span className="text-green-600 text-xs bg-green-100 px-2 py-0.5 rounded-full">Paid</span>
                  </div>
                  <div className="flex justify-between text-sm py-2 border-b">
                    <span>Oct 01, 2025</span>
                    <span className="font-medium">$29.00</span>
                    <span className="text-green-600 text-xs bg-green-100 px-2 py-0.5 rounded-full">Paid</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};