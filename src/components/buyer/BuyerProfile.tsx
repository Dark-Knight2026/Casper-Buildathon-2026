import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { useToast } from '@/hooks/use-toast';
import {
  User,
  Mail,
  Phone,
  MapPin,
  DollarSign,
  Home,
  Bell,
  FileText,
  CreditCard,
  Save,
  Upload,
  CheckCircle2,
  Loader2,
} from 'lucide-react';

interface BuyerProfileProps {
  onClose: () => void;
}

export function BuyerProfile({ onClose }: BuyerProfileProps) {
  const [activeTab, setActiveTab] = useState('personal');
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  
  const [profile, setProfile] = useState({
    name: 'John Smith',
    email: 'john.smith@email.com',
    phone: '(555) 123-4567',
    address: '123 Main St, Los Angeles, CA 90001',
  });

  const [preferences, setPreferences] = useState({
    budgetMin: 300000,
    budgetMax: 600000,
    preferredLocations: ['Downtown', 'Westside', 'Midtown'],
    propertyTypes: ['house', 'condo'],
    minBedrooms: 3,
    minBathrooms: 2,
    mustHaves: ['parking', 'ac', 'updated kitchen'],
    niceToHaves: ['pool', 'garden', 'gym'],
  });

  const [notifications, setNotifications] = useState({
    emailNewListings: true,
    emailPriceDrops: true,
    emailTourReminders: true,
    emailOfferUpdates: true,
    smsUrgentUpdates: true,
    smsTourReminders: false,
  });

  const [documents] = useState([
    { id: '1', name: 'Pre-approval Letter.pdf', uploadDate: '2024-01-15', size: '245 KB' },
    { id: '2', name: 'Bank Statement.pdf', uploadDate: '2024-01-10', size: '1.2 MB' },
    { id: '3', name: 'ID Copy.pdf', uploadDate: '2024-01-05', size: '180 KB' },
  ]);

  const handleSaveProfile = async () => {
    setIsSaving(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsSaving(false);
    toast({
      title: "Profile updated!",
      description: "Your profile information has been saved successfully.",
    });
  };

  const handleSavePreferences = async () => {
    setIsSaving(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsSaving(false);
    toast({
      title: "Preferences saved!",
      description: "Your search preferences have been updated.",
    });
  };

  const handleSaveNotifications = async () => {
    setIsSaving(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsSaving(false);
    toast({
      title: "Settings updated!",
      description: "Your notification preferences have been saved.",
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 overflow-auto animate-in fade-in-0 duration-300">
      <div className="min-h-screen flex items-start justify-center p-4 py-8">
        <Card className="w-full max-w-4xl animate-in slide-in-from-bottom-4 duration-300">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Buyer Profile & Preferences
                </CardTitle>
                <CardDescription>Manage your account and search preferences</CardDescription>
              </div>
              <Button variant="ghost" onClick={onClose}>
                Close
              </Button>
            </div>
          </CardHeader>

          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="personal">Personal Info</TabsTrigger>
                <TabsTrigger value="preferences">Preferences</TabsTrigger>
                <TabsTrigger value="notifications">Notifications</TabsTrigger>
                <TabsTrigger value="documents">Documents</TabsTrigger>
              </TabsList>

              {/* Personal Information */}
              <TabsContent value="personal" className="space-y-6">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-24 h-24 rounded-full bg-blue-100 flex items-center justify-center">
                    <User className="w-12 h-12 text-blue-600" />
                  </div>
                  <div>
                    <Button variant="outline" size="sm">
                      <Upload className="w-4 h-4 mr-2" />
                      Upload Photo
                    </Button>
                    <p className="text-xs text-gray-600 mt-2">JPG, PNG or GIF (max. 2MB)</p>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      value={profile.name}
                      onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email Address</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                      <Input
                        id="email"
                        type="email"
                        className="pl-10"
                        value={profile.email}
                        onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="phone">Phone Number</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                      <Input
                        id="phone"
                        type="tel"
                        className="pl-10"
                        value={profile.phone}
                        onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="address">Current Address</Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                      <Input
                        id="address"
                        className="pl-10"
                        value={profile.address}
                        onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button onClick={handleSaveProfile} disabled={isSaving}>
                    {isSaving ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Save Changes
                      </>
                    )}
                  </Button>
                </div>
              </TabsContent>

              {/* Preferences */}
              <TabsContent value="preferences" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <DollarSign className="w-5 h-5" />
                      Budget Range
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="budget-min">Minimum</Label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                            $
                          </span>
                          <Input
                            id="budget-min"
                            type="number"
                            className="pl-7"
                            value={preferences.budgetMin}
                            onChange={(e) =>
                              setPreferences({
                                ...preferences,
                                budgetMin: parseInt(e.target.value) || 0,
                              })
                            }
                          />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="budget-max">Maximum</Label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                            $
                          </span>
                          <Input
                            id="budget-max"
                            type="number"
                            className="pl-7"
                            value={preferences.budgetMax}
                            onChange={(e) =>
                              setPreferences({
                                ...preferences,
                                budgetMax: parseInt(e.target.value) || 0,
                              })
                            }
                          />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <MapPin className="w-5 h-5" />
                      Preferred Locations
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {preferences.preferredLocations.map((location) => (
                        <Badge key={location} variant="default">
                          {location}
                        </Badge>
                      ))}
                      <Button variant="outline" size="sm">
                        + Add Location
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Home className="w-5 h-5" />
                      Property Requirements
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <Label>Minimum Bedrooms</Label>
                        <Input
                          type="number"
                          value={preferences.minBedrooms}
                          onChange={(e) =>
                            setPreferences({
                              ...preferences,
                              minBedrooms: parseInt(e.target.value) || 0,
                            })
                          }
                        />
                      </div>
                      <div>
                        <Label>Minimum Bathrooms</Label>
                        <Input
                          type="number"
                          value={preferences.minBathrooms}
                          onChange={(e) =>
                            setPreferences({
                              ...preferences,
                              minBathrooms: parseInt(e.target.value) || 0,
                            })
                          }
                        />
                      </div>
                    </div>

                    <div>
                      <Label className="mb-2 block">Must-Have Features</Label>
                      <div className="flex flex-wrap gap-2">
                        {preferences.mustHaves.map((feature) => (
                          <Badge key={feature} variant="default">
                            {feature}
                          </Badge>
                        ))}
                        <Button variant="outline" size="sm">
                          + Add Feature
                        </Button>
                      </div>
                    </div>

                    <div>
                      <Label className="mb-2 block">Nice-to-Have Features</Label>
                      <div className="flex flex-wrap gap-2">
                        {preferences.niceToHaves.map((feature) => (
                          <Badge key={feature} variant="outline">
                            {feature}
                          </Badge>
                        ))}
                        <Button variant="outline" size="sm">
                          + Add Feature
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="flex justify-end">
                  <Button onClick={handleSavePreferences} disabled={isSaving}>
                    {isSaving ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Save Preferences
                      </>
                    )}
                  </Button>
                </div>
              </TabsContent>

              {/* Notifications */}
              <TabsContent value="notifications" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Mail className="w-5 h-5" />
                      Email Notifications
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {[
                      {
                        key: 'emailNewListings',
                        label: 'New Listings',
                        description: 'Get notified when new properties match your criteria',
                      },
                      {
                        key: 'emailPriceDrops',
                        label: 'Price Drops',
                        description: 'Alerts when saved properties reduce their price',
                      },
                      {
                        key: 'emailTourReminders',
                        label: 'Tour Reminders',
                        description: 'Reminders for upcoming property tours',
                      },
                      {
                        key: 'emailOfferUpdates',
                        label: 'Offer Updates',
                        description: 'Status changes on your submitted offers',
                      },
                    ].map((item) => (
                      <div
                        key={item.key}
                        className="flex items-start justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div className="flex-1">
                          <p className="font-semibold">{item.label}</p>
                          <p className="text-sm text-gray-600">{item.description}</p>
                        </div>
                        <button
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            notifications[item.key as keyof typeof notifications]
                              ? 'bg-blue-600'
                              : 'bg-gray-300'
                          }`}
                          onClick={() =>
                            setNotifications({
                              ...notifications,
                              [item.key]: !notifications[item.key as keyof typeof notifications],
                            })
                          }
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              notifications[item.key as keyof typeof notifications]
                                ? 'translate-x-6'
                                : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Phone className="w-5 h-5" />
                      SMS Notifications
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {[
                      {
                        key: 'smsUrgentUpdates',
                        label: 'Urgent Updates',
                        description: 'Critical updates on offers and time-sensitive matters',
                      },
                      {
                        key: 'smsTourReminders',
                        label: 'Tour Reminders',
                        description: 'SMS reminders 1 hour before scheduled tours',
                      },
                    ].map((item) => (
                      <div
                        key={item.key}
                        className="flex items-start justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div className="flex-1">
                          <p className="font-semibold">{item.label}</p>
                          <p className="text-sm text-gray-600">{item.description}</p>
                        </div>
                        <button
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            notifications[item.key as keyof typeof notifications]
                              ? 'bg-blue-600'
                              : 'bg-gray-300'
                          }`}
                          onClick={() =>
                            setNotifications({
                              ...notifications,
                              [item.key]: !notifications[item.key as keyof typeof notifications],
                            })
                          }
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              notifications[item.key as keyof typeof notifications]
                                ? 'translate-x-6'
                                : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <div className="flex justify-end">
                  <Button onClick={handleSaveNotifications} disabled={isSaving}>
                    {isSaving ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Save Settings
                      </>
                    )}
                  </Button>
                </div>
              </TabsContent>

              {/* Documents */}
              <TabsContent value="documents" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <FileText className="w-5 h-5" />
                      Document Vault
                    </CardTitle>
                    <CardDescription>
                      Securely store important documents for quick access during the buying
                      process
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Button className="w-full" variant="outline">
                      <Upload className="w-4 h-4 mr-2" />
                      Upload New Document
                    </Button>

                    <div className="space-y-2">
                      {documents.map((doc) => (
                        <div
                          key={doc.id}
                          className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <FileText className="w-8 h-8 text-blue-600" />
                            <div>
                              <p className="font-semibold">{doc.name}</p>
                              <p className="text-sm text-gray-600">
                                Uploaded {doc.uploadDate} • {doc.size}
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button variant="ghost" size="sm">
                              View
                            </Button>
                            <Button variant="ghost" size="sm">
                              Delete
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-blue-50 border-blue-200">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-blue-600 mt-0.5" />
                      <div>
                        <p className="font-semibold text-blue-900">Secure Storage</p>
                        <p className="text-sm text-blue-800 mt-1">
                          All documents are encrypted and stored securely. Only you and authorized
                          parties can access them.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}