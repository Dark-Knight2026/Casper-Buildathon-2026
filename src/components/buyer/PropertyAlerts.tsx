import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Switch } from '../ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import {
  Bell,
  Plus,
  Edit2,
  Trash2,
  Check,
  X,
  Mail,
  Smartphone,
  Clock,
  TrendingUp,
} from 'lucide-react';

interface Alert {
  id: string;
  name: string;
  criteria: {
    priceMin: number;
    priceMax: number;
    bedrooms: number[];
    bathrooms: number[];
    propertyTypes: string[];
    locations: string[];
    features: string[];
  };
  frequency: 'instant' | 'daily' | 'weekly';
  notificationMethods: ('email' | 'sms' | 'push')[];
  isActive: boolean;
  createdAt: string;
  lastTriggered?: string;
  matchCount: number;
}

interface AlertHistory {
  id: string;
  alertId: string;
  alertName: string;
  propertyTitle: string;
  propertyAddress: string;
  propertyPrice: number;
  matchedAt: string;
  viewed: boolean;
}

const mockAlerts: Alert[] = [
  {
    id: 'alert-1',
    name: 'Downtown Condos',
    criteria: {
      priceMin: 300000,
      priceMax: 500000,
      bedrooms: [2, 3],
      bathrooms: [2],
      propertyTypes: ['Condo'],
      locations: ['Downtown', 'Midtown'],
      features: ['Parking', 'Gym'],
    },
    frequency: 'instant',
    notificationMethods: ['email', 'push'],
    isActive: true,
    createdAt: '2024-01-15',
    lastTriggered: '2024-01-20',
    matchCount: 12,
  },
  {
    id: 'alert-2',
    name: 'Family Homes in Suburbs',
    criteria: {
      priceMin: 400000,
      priceMax: 700000,
      bedrooms: [3, 4],
      bathrooms: [2, 3],
      propertyTypes: ['House'],
      locations: ['Westside', 'Northridge'],
      features: ['Garage', 'Backyard', 'Good Schools'],
    },
    frequency: 'daily',
    notificationMethods: ['email'],
    isActive: true,
    createdAt: '2024-01-10',
    lastTriggered: '2024-01-19',
    matchCount: 8,
  },
  {
    id: 'alert-3',
    name: 'Luxury Waterfront',
    criteria: {
      priceMin: 800000,
      priceMax: 1500000,
      bedrooms: [4, 5],
      bathrooms: [3, 4],
      propertyTypes: ['House', 'Villa'],
      locations: ['Marina', 'Beachfront'],
      features: ['Waterfront', 'Pool', 'Ocean View'],
    },
    frequency: 'weekly',
    notificationMethods: ['email', 'sms'],
    isActive: false,
    createdAt: '2024-01-05',
    matchCount: 3,
  },
];

const mockAlertHistory: AlertHistory[] = [
  {
    id: 'history-1',
    alertId: 'alert-1',
    alertName: 'Downtown Condos',
    propertyTitle: 'Modern Downtown Condo',
    propertyAddress: '123 Main St, Downtown',
    propertyPrice: 425000,
    matchedAt: '2024-01-20T10:30:00',
    viewed: true,
  },
  {
    id: 'history-2',
    alertId: 'alert-1',
    alertName: 'Downtown Condos',
    propertyTitle: 'Luxury Midtown Apartment',
    propertyAddress: '456 Park Ave, Midtown',
    propertyPrice: 475000,
    matchedAt: '2024-01-20T09:15:00',
    viewed: true,
  },
  {
    id: 'history-3',
    alertId: 'alert-2',
    alertName: 'Family Homes in Suburbs',
    propertyTitle: 'Spacious Family Home',
    propertyAddress: '789 Oak St, Westside',
    propertyPrice: 550000,
    matchedAt: '2024-01-19T14:20:00',
    viewed: false,
  },
  {
    id: 'history-4',
    alertId: 'alert-2',
    alertName: 'Family Homes in Suburbs',
    propertyTitle: 'Beautiful 4BR House',
    propertyAddress: '321 Elm St, Northridge',
    propertyPrice: 625000,
    matchedAt: '2024-01-19T11:45:00',
    viewed: false,
  },
];

export function PropertyAlerts() {
  const [alerts, setAlerts] = useState<Alert[]>(mockAlerts);
  const [alertHistory] = useState<AlertHistory[]>(mockAlertHistory);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingAlert, setEditingAlert] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'alerts' | 'history'>('alerts');

  const [formData, setFormData] = useState({
    name: '',
    priceMin: '',
    priceMax: '',
    bedrooms: [] as number[],
    bathrooms: [] as number[],
    propertyTypes: [] as string[],
    locations: '',
    features: [] as string[],
    frequency: 'daily' as 'instant' | 'daily' | 'weekly',
    notificationMethods: ['email'] as ('email' | 'sms' | 'push')[],
  });

  const handleToggleAlert = (alertId: string) => {
    setAlerts((prev) =>
      prev.map((alert) =>
        alert.id === alertId ? { ...alert, isActive: !alert.isActive } : alert
      )
    );
  };

  const handleDeleteAlert = (alertId: string) => {
    if (confirm('Are you sure you want to delete this alert?')) {
      setAlerts((prev) => prev.filter((alert) => alert.id !== alertId));
    }
  };

  const handleEditAlert = (alertId: string) => {
    const alert = alerts.find((a) => a.id === alertId);
    if (alert) {
      setFormData({
        name: alert.name,
        priceMin: alert.criteria.priceMin.toString(),
        priceMax: alert.criteria.priceMax.toString(),
        bedrooms: alert.criteria.bedrooms,
        bathrooms: alert.criteria.bathrooms,
        propertyTypes: alert.criteria.propertyTypes,
        locations: alert.criteria.locations.join(', '),
        features: alert.criteria.features,
        frequency: alert.frequency,
        notificationMethods: alert.notificationMethods,
      });
      setEditingAlert(alertId);
      setShowCreateForm(true);
    }
  };

  const handleSubmitAlert = () => {
    const newAlert: Alert = {
      id: editingAlert || `alert-${Date.now()}`,
      name: formData.name,
      criteria: {
        priceMin: parseInt(formData.priceMin),
        priceMax: parseInt(formData.priceMax),
        bedrooms: formData.bedrooms,
        bathrooms: formData.bathrooms,
        propertyTypes: formData.propertyTypes,
        locations: formData.locations.split(',').map((l) => l.trim()),
        features: formData.features,
      },
      frequency: formData.frequency,
      notificationMethods: formData.notificationMethods,
      isActive: true,
      createdAt: new Date().toISOString().split('T')[0],
      matchCount: 0,
    };

    if (editingAlert) {
      setAlerts((prev) => prev.map((alert) => (alert.id === editingAlert ? newAlert : alert)));
    } else {
      setAlerts((prev) => [...prev, newAlert]);
    }

    setShowCreateForm(false);
    setEditingAlert(null);
    setFormData({
      name: '',
      priceMin: '',
      priceMax: '',
      bedrooms: [],
      bathrooms: [],
      propertyTypes: [],
      locations: '',
      features: [],
      frequency: 'daily',
      notificationMethods: ['email'],
    });
  };

  const handleCancelForm = () => {
    setShowCreateForm(false);
    setEditingAlert(null);
    setFormData({
      name: '',
      priceMin: '',
      priceMax: '',
      bedrooms: [],
      bathrooms: [],
      propertyTypes: [],
      locations: '',
      features: [],
      frequency: 'daily',
      notificationMethods: ['email'],
    });
  };

  const toggleArrayValue = <T,>(array: T[], value: T, setter: (val: T[]) => void) => {
    if (array.includes(value)) {
      setter(array.filter((v) => v !== value));
    } else {
      setter([...array, value]);
    }
  };

  const unviewedCount = alertHistory.filter((h) => !h.viewed).length;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5" />
                Property Alerts
              </CardTitle>
              <CardDescription>
                Get notified when properties matching your criteria become available
              </CardDescription>
            </div>
            <Button onClick={() => setShowCreateForm(true)} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Create Alert
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-6">
            <Button
              variant={activeTab === 'alerts' ? 'default' : 'outline'}
              onClick={() => setActiveTab('alerts')}
              className={activeTab === 'alerts' ? 'bg-blue-600' : ''}
            >
              <Bell className="w-4 h-4 mr-2" />
              My Alerts ({alerts.length})
            </Button>
            <Button
              variant={activeTab === 'history' ? 'default' : 'outline'}
              onClick={() => setActiveTab('history')}
              className={activeTab === 'history' ? 'bg-blue-600' : ''}
            >
              <Clock className="w-4 h-4 mr-2" />
              Alert History
              {unviewedCount > 0 && (
                <Badge className="ml-2 bg-red-500 text-white">{unviewedCount}</Badge>
              )}
            </Button>
          </div>

          {activeTab === 'alerts' && (
            <div className="space-y-4">
              {showCreateForm && (
                <Card className="border-2 border-blue-200 bg-blue-50">
                  <CardHeader>
                    <CardTitle className="text-lg">
                      {editingAlert ? 'Edit Alert' : 'Create New Alert'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label>Alert Name</Label>
                      <Input
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="e.g., Downtown Condos"
                      />
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <Label>Min Price</Label>
                        <Input
                          type="number"
                          value={formData.priceMin}
                          onChange={(e) => setFormData({ ...formData, priceMin: e.target.value })}
                          placeholder="300000"
                        />
                      </div>
                      <div>
                        <Label>Max Price</Label>
                        <Input
                          type="number"
                          value={formData.priceMax}
                          onChange={(e) => setFormData({ ...formData, priceMax: e.target.value })}
                          placeholder="500000"
                        />
                      </div>
                    </div>

                    <div>
                      <Label>Bedrooms</Label>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {[1, 2, 3, 4, 5].map((num) => (
                          <Button
                            key={num}
                            type="button"
                            variant={formData.bedrooms.includes(num) ? 'default' : 'outline'}
                            size="sm"
                            onClick={() =>
                              toggleArrayValue(formData.bedrooms, num, (val) =>
                                setFormData({ ...formData, bedrooms: val })
                              )
                            }
                          >
                            {num}+ BR
                          </Button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <Label>Bathrooms</Label>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {[1, 2, 3, 4].map((num) => (
                          <Button
                            key={num}
                            type="button"
                            variant={formData.bathrooms.includes(num) ? 'default' : 'outline'}
                            size="sm"
                            onClick={() =>
                              toggleArrayValue(formData.bathrooms, num, (val) =>
                                setFormData({ ...formData, bathrooms: val })
                              )
                            }
                          >
                            {num}+ BA
                          </Button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <Label>Property Types</Label>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {['House', 'Condo', 'Townhouse', 'Villa'].map((type) => (
                          <Button
                            key={type}
                            type="button"
                            variant={formData.propertyTypes.includes(type) ? 'default' : 'outline'}
                            size="sm"
                            onClick={() =>
                              toggleArrayValue(formData.propertyTypes, type, (val) =>
                                setFormData({ ...formData, propertyTypes: val })
                              )
                            }
                          >
                            {type}
                          </Button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <Label>Locations (comma-separated)</Label>
                      <Input
                        value={formData.locations}
                        onChange={(e) => setFormData({ ...formData, locations: e.target.value })}
                        placeholder="Downtown, Midtown, Westside"
                      />
                    </div>

                    <div>
                      <Label>Features</Label>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {['Parking', 'Gym', 'Pool', 'Garage', 'Backyard', 'Ocean View'].map(
                          (feature) => (
                            <Button
                              key={feature}
                              type="button"
                              variant={formData.features.includes(feature) ? 'default' : 'outline'}
                              size="sm"
                              onClick={() =>
                                toggleArrayValue(formData.features, feature, (val) =>
                                  setFormData({ ...formData, features: val })
                                )
                              }
                            >
                              {feature}
                            </Button>
                          )
                        )}
                      </div>
                    </div>

                    <div>
                      <Label>Notification Frequency</Label>
                      <Select
                        value={formData.frequency}
                        onValueChange={(value: 'instant' | 'daily' | 'weekly') =>
                          setFormData({ ...formData, frequency: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="instant">Instant</SelectItem>
                          <SelectItem value="daily">Daily Digest</SelectItem>
                          <SelectItem value="weekly">Weekly Summary</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Notification Methods</Label>
                      <div className="flex flex-wrap gap-4 mt-2">
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={formData.notificationMethods.includes('email')}
                            onCheckedChange={() =>
                              toggleArrayValue(formData.notificationMethods, 'email' as const, (val) =>
                                setFormData({ ...formData, notificationMethods: val })
                              )
                            }
                          />
                          <Mail className="w-4 h-4" />
                          <span className="text-sm">Email</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={formData.notificationMethods.includes('sms')}
                            onCheckedChange={() =>
                              toggleArrayValue(formData.notificationMethods, 'sms' as const, (val) =>
                                setFormData({ ...formData, notificationMethods: val })
                              )
                            }
                          />
                          <Smartphone className="w-4 h-4" />
                          <span className="text-sm">SMS</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={formData.notificationMethods.includes('push')}
                            onCheckedChange={() =>
                              toggleArrayValue(formData.notificationMethods, 'push' as const, (val) =>
                                setFormData({ ...formData, notificationMethods: val })
                              )
                            }
                          />
                          <Bell className="w-4 h-4" />
                          <span className="text-sm">Push</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-4">
                      <Button
                        onClick={handleSubmitAlert}
                        className="bg-blue-600 hover:bg-blue-700"
                        disabled={!formData.name || !formData.priceMin || !formData.priceMax}
                      >
                        <Check className="w-4 h-4 mr-2" />
                        {editingAlert ? 'Update Alert' : 'Create Alert'}
                      </Button>
                      <Button variant="outline" onClick={handleCancelForm}>
                        <X className="w-4 h-4 mr-2" />
                        Cancel
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {alerts.length === 0 ? (
                <div className="text-center py-12">
                  <Bell className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-600 mb-2">No alerts created yet</p>
                  <p className="text-sm text-gray-500">
                    Create your first alert to get notified about new properties
                  </p>
                </div>
              ) : (
                alerts.map((alert) => (
                  <Card key={alert.id} className={alert.isActive ? 'border-blue-200' : ''}>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold">{alert.name}</h3>
                            <Badge className={alert.isActive ? 'bg-green-600' : 'bg-gray-400'}>
                              {alert.isActive ? 'Active' : 'Paused'}
                            </Badge>
                            <Badge variant="outline" className="flex items-center gap-1">
                              <TrendingUp className="w-3 h-3" />
                              {alert.matchCount} matches
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600">
                            Created: {new Date(alert.createdAt).toLocaleDateString()}
                            {alert.lastTriggered && (
                              <> • Last triggered: {new Date(alert.lastTriggered).toLocaleDateString()}</>
                            )}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={alert.isActive}
                            onCheckedChange={() => handleToggleAlert(alert.id)}
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditAlert(alert.id)}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteAlert(alert.id)}
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </Button>
                        </div>
                      </div>

                      <div className="grid md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-gray-600 mb-1">Price Range:</p>
                          <p className="font-semibold">
                            ${alert.criteria.priceMin.toLocaleString()} - $
                            {alert.criteria.priceMax.toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-600 mb-1">Bedrooms:</p>
                          <div className="flex gap-1">
                            {alert.criteria.bedrooms.map((bed) => (
                              <Badge key={bed} variant="outline">
                                {bed}+
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <div>
                          <p className="text-gray-600 mb-1">Property Types:</p>
                          <div className="flex flex-wrap gap-1">
                            {alert.criteria.propertyTypes.map((type) => (
                              <Badge key={type} variant="outline">
                                {type}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <div>
                          <p className="text-gray-600 mb-1">Locations:</p>
                          <div className="flex flex-wrap gap-1">
                            {alert.criteria.locations.map((loc) => (
                              <Badge key={loc} variant="outline">
                                {loc}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 pt-4 border-t">
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-4">
                            <span className="text-gray-600">Frequency:</span>
                            <Badge variant="outline">{alert.frequency}</Badge>
                          </div>
                          <div className="flex items-center gap-2">
                            {alert.notificationMethods.map((method) => (
                              <Badge key={method} variant="outline" className="flex items-center gap-1">
                                {method === 'email' && <Mail className="w-3 h-3" />}
                                {method === 'sms' && <Smartphone className="w-3 h-3" />}
                                {method === 'push' && <Bell className="w-3 h-3" />}
                                {method}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-3">
              {alertHistory.length === 0 ? (
                <div className="text-center py-12">
                  <Clock className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-600 mb-2">No alert history yet</p>
                  <p className="text-sm text-gray-500">
                    When properties match your alerts, they'll appear here
                  </p>
                </div>
              ) : (
                alertHistory.map((history) => (
                  <Card
                    key={history.id}
                    className={`cursor-pointer hover:shadow-md transition-shadow ${
                      !history.viewed ? 'border-blue-200 bg-blue-50' : ''
                    }`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold">{history.propertyTitle}</h4>
                            {!history.viewed && (
                              <Badge className="bg-blue-600 text-white">New</Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 mb-2">{history.propertyAddress}</p>
                          <div className="flex items-center gap-4 text-sm">
                            <span className="font-semibold text-blue-900">
                              ${history.propertyPrice.toLocaleString()}
                            </span>
                            <Badge variant="outline">{history.alertName}</Badge>
                            <span className="text-gray-500">
                              {new Date(history.matchedAt).toLocaleString()}
                            </span>
                          </div>
                        </div>
                        <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                          View Property
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}