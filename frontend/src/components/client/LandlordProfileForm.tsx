import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { useLandlordManagement } from '@/contexts/LandlordManagementContext';
import { ClientLandlordFormData, ContactDetails, PropertyPreferences, ClientSegmentation, ClientLandlord } from '@/types/clientLandlord';
import { X, Plus, Save, User, Home, Target, Tag } from 'lucide-react';

interface LandlordProfileFormProps {
  clientId?: string;
  onSave?: (client: ClientLandlord) => void;
  onCancel?: () => void;
}

export default function LandlordProfileForm({ clientId, onSave, onCancel }: LandlordProfileFormProps) {
  const { createClient, updateClient, getClientById, properties } = useLandlordManagement();
  
  const existingClient = clientId ? getClientById(clientId) : null;
  
  const [formData, setFormData] = useState<ClientLandlordFormData>({
    personalInfo: existingClient?.personalInfo || {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      preferredContactMethod: 'email',
      address: {
        street: '',
        city: '',
        state: 'VA',
        zipCode: ''
      }
    },
    propertyIds: existingClient?.propertyIds || [],
    agentId: existingClient?.agentId || '',
    preferences: existingClient?.preferences || {
      priceRange: { min: 0, max: 1000000 },
      propertyTypes: [],
      bedrooms: { min: 1, max: 10 },
      bathrooms: { min: 1, max: 10 },
      squareFootage: { min: 500, max: 10000 },
      preferredLocations: [],
      amenities: [],
      investmentGoals: []
    },
    segmentation: existingClient?.segmentation || {
      clientType: 'investor',
      budgetTier: 'mid-range',
      urgency: 'flexible',
      source: 'website',
      tags: []
    },
    notes: ''
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [newTag, setNewTag] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [newAmenity, setNewAmenity] = useState('');

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.personalInfo?.firstName?.trim()) {
      newErrors.firstName = 'First name is required';
    }
    if (!formData.personalInfo?.lastName?.trim()) {
      newErrors.lastName = 'Last name is required';
    }
    if (!formData.personalInfo?.email?.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.personalInfo.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    if (!formData.personalInfo?.phone?.trim()) {
      newErrors.phone = 'Phone number is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      let result;
      if (clientId && existingClient) {
        result = await updateClient(clientId, {
          personalInfo: formData.personalInfo as ContactDetails,
          propertyIds: formData.propertyIds,
          agentId: formData.agentId,
          preferences: formData.preferences as PropertyPreferences,
          segmentation: formData.segmentation as ClientSegmentation
        });
      } else {
        result = await createClient(formData);
      }
      
      onSave?.(result);
    } catch (error) {
      console.error('Error saving landlord:', error);
      setErrors({ submit: error instanceof Error ? error.message : 'Failed to save landlord profile' });
    } finally {
      setLoading(false);
    }
  };

  const updatePersonalInfo = (field: keyof ContactDetails, value: string) => {
    setFormData(prev => ({
      ...prev,
      personalInfo: {
        ...prev.personalInfo!,
        [field]: value
      }
    }));
  };

  const updateAddress = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      personalInfo: {
        ...prev.personalInfo!,
        address: {
          ...prev.personalInfo!.address!,
          [field]: value
        }
      }
    }));
  };

  const updatePreferences = (field: keyof PropertyPreferences, value: PropertyPreferences[keyof PropertyPreferences]) => {
    setFormData(prev => ({
      ...prev,
      preferences: {
        ...prev.preferences!,
        [field]: value
      }
    }));
  };

  const updateSegmentation = (field: keyof ClientSegmentation, value: ClientSegmentation[keyof ClientSegmentation]) => {
    setFormData(prev => ({
      ...prev,
      segmentation: {
        ...prev.segmentation!,
        [field]: value
      }
    }));
  };

  const handlePropertySelection = (propertyId: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      propertyIds: checked 
        ? [...(prev.propertyIds || []), propertyId]
        : (prev.propertyIds || []).filter(id => id !== propertyId)
    }));
  };

  const addTag = () => {
    if (newTag.trim() && !formData.segmentation?.tags?.includes(newTag.trim())) {
      updateSegmentation('tags', [...(formData.segmentation?.tags || []), newTag.trim()]);
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    updateSegmentation('tags', formData.segmentation?.tags?.filter(tag => tag !== tagToRemove) || []);
  };

  const addLocation = () => {
    if (newLocation.trim() && !formData.preferences?.preferredLocations?.includes(newLocation.trim())) {
      updatePreferences('preferredLocations', [...(formData.preferences?.preferredLocations || []), newLocation.trim()]);
      setNewLocation('');
    }
  };

  const removeLocation = (locationToRemove: string) => {
    updatePreferences('preferredLocations', formData.preferences?.preferredLocations?.filter(loc => loc !== locationToRemove) || []);
  };

  const addAmenity = () => {
    if (newAmenity.trim() && !formData.preferences?.amenities?.includes(newAmenity.trim())) {
      updatePreferences('amenities', [...(formData.preferences?.amenities || []), newAmenity.trim()]);
      setNewAmenity('');
    }
  };

  const removeAmenity = (amenityToRemove: string) => {
    updatePreferences('amenities', formData.preferences?.amenities?.filter(amenity => amenity !== amenityToRemove) || []);
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          {clientId ? 'Edit Landlord Profile' : 'Create New Landlord Profile'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit}>
          <Tabs defaultValue="personal" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="personal">Personal Info</TabsTrigger>
              <TabsTrigger value="properties">Properties</TabsTrigger>
              <TabsTrigger value="preferences">Preferences</TabsTrigger>
              <TabsTrigger value="segmentation">Segmentation</TabsTrigger>
            </TabsList>

            <TabsContent value="personal" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input
                    id="firstName"
                    value={formData.personalInfo?.firstName || ''}
                    onChange={(e) => updatePersonalInfo('firstName', e.target.value)}
                    className={errors.firstName ? 'border-red-500' : ''}
                  />
                  {errors.firstName && <p className="text-sm text-red-500 mt-1">{errors.firstName}</p>}
                </div>
                
                <div>
                  <Label htmlFor="lastName">Last Name *</Label>
                  <Input
                    id="lastName"
                    value={formData.personalInfo?.lastName || ''}
                    onChange={(e) => updatePersonalInfo('lastName', e.target.value)}
                    className={errors.lastName ? 'border-red-500' : ''}
                  />
                  {errors.lastName && <p className="text-sm text-red-500 mt-1">{errors.lastName}</p>}
                </div>
                
                <div>
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.personalInfo?.email || ''}
                    onChange={(e) => updatePersonalInfo('email', e.target.value)}
                    className={errors.email ? 'border-red-500' : ''}
                  />
                  {errors.email && <p className="text-sm text-red-500 mt-1">{errors.email}</p>}
                </div>
                
                <div>
                  <Label htmlFor="phone">Phone *</Label>
                  <Input
                    id="phone"
                    value={formData.personalInfo?.phone || ''}
                    onChange={(e) => updatePersonalInfo('phone', e.target.value)}
                    className={errors.phone ? 'border-red-500' : ''}
                  />
                  {errors.phone && <p className="text-sm text-red-500 mt-1">{errors.phone}</p>}
                </div>
                
                <div>
                  <Label htmlFor="alternatePhone">Alternate Phone</Label>
                  <Input
                    id="alternatePhone"
                    value={formData.personalInfo?.alternatePhone || ''}
                    onChange={(e) => updatePersonalInfo('alternatePhone', e.target.value)}
                  />
                </div>
                
                <div>
                  <Label htmlFor="preferredContactMethod">Preferred Contact Method</Label>
                  <Select
                    value={formData.personalInfo?.preferredContactMethod || 'email'}
                    onValueChange={(value) => updatePersonalInfo('preferredContactMethod', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="phone">Phone</SelectItem>
                      <SelectItem value="text">Text</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Address</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <Label htmlFor="street">Street Address</Label>
                    <Input
                      id="street"
                      value={formData.personalInfo?.address?.street || ''}
                      onChange={(e) => updateAddress('street', e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      value={formData.personalInfo?.address?.city || ''}
                      onChange={(e) => updateAddress('city', e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="state">State</Label>
                    <Input
                      id="state"
                      value={formData.personalInfo?.address?.state || ''}
                      onChange={(e) => updateAddress('state', e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="zipCode">ZIP Code</Label>
                    <Input
                      id="zipCode"
                      value={formData.personalInfo?.address?.zipCode || ''}
                      onChange={(e) => updateAddress('zipCode', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="properties" className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <Home className="h-5 w-5" />
                <h3 className="text-lg font-semibold">Property Assignment</h3>
              </div>
              
              <div>
                <Label htmlFor="agentId">Assigned Agent</Label>
                <Select
                  value={formData.agentId || ''}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, agentId: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select an agent" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No agent assigned</SelectItem>
                    <SelectItem value="agent-1">Mike Agent</SelectItem>
                    <SelectItem value="agent-2">Sarah Johnson</SelectItem>
                    <SelectItem value="agent-3">David Wilson</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Assigned Properties</Label>
                <p className="text-sm text-gray-600 mb-3">
                  Select multiple properties that this landlord owns. Landlords can own multiple properties.
                </p>
                <div className="space-y-2 max-h-60 overflow-y-auto border rounded-md p-3">
                  {properties.map((property) => (
                    <div key={property.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={property.id}
                        checked={formData.propertyIds?.includes(property.id) || false}
                        onCheckedChange={(checked) => handlePropertySelection(property.id, checked as boolean)}
                      />
                      <label htmlFor={property.id} className="text-sm cursor-pointer flex-1">
                        {property.details.address.street}, {property.details.address.city} - 
                        ${property.details.price.toLocaleString()} 
                        ({property.details.bedrooms}bed/{property.details.bathrooms}bath)
                      </label>
                    </div>
                  ))}
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  Selected: {formData.propertyIds?.length || 0} properties
                </p>
              </div>
            </TabsContent>

            <TabsContent value="preferences" className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <Target className="h-5 w-5" />
                <h3 className="text-lg font-semibold">Investment Preferences</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Price Range</Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      placeholder="Min"
                      value={formData.preferences?.priceRange?.min || ''}
                      onChange={(e) => updatePreferences('priceRange', {
                        ...formData.preferences?.priceRange,
                        min: parseInt(e.target.value) || 0
                      })}
                    />
                    <Input
                      type="number"
                      placeholder="Max"
                      value={formData.preferences?.priceRange?.max || ''}
                      onChange={(e) => updatePreferences('priceRange', {
                        ...formData.preferences?.priceRange,
                        max: parseInt(e.target.value) || 0
                      })}
                    />
                  </div>
                </div>

                <div>
                  <Label>Bedrooms</Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      placeholder="Min"
                      value={formData.preferences?.bedrooms?.min || ''}
                      onChange={(e) => updatePreferences('bedrooms', {
                        ...formData.preferences?.bedrooms,
                        min: parseInt(e.target.value) || 0
                      })}
                    />
                    <Input
                      type="number"
                      placeholder="Max"
                      value={formData.preferences?.bedrooms?.max || ''}
                      onChange={(e) => updatePreferences('bedrooms', {
                        ...formData.preferences?.bedrooms,
                        max: parseInt(e.target.value) || 0
                      })}
                    />
                  </div>
                </div>

                <div>
                  <Label>Bathrooms</Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      placeholder="Min"
                      value={formData.preferences?.bathrooms?.min || ''}
                      onChange={(e) => updatePreferences('bathrooms', {
                        ...formData.preferences?.bathrooms,
                        min: parseInt(e.target.value) || 0
                      })}
                    />
                    <Input
                      type="number"
                      placeholder="Max"
                      value={formData.preferences?.bathrooms?.max || ''}
                      onChange={(e) => updatePreferences('bathrooms', {
                        ...formData.preferences?.bathrooms,
                        max: parseInt(e.target.value) || 0
                      })}
                    />
                  </div>
                </div>

                <div>
                  <Label>Square Footage</Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      placeholder="Min"
                      value={formData.preferences?.squareFootage?.min || ''}
                      onChange={(e) => updatePreferences('squareFootage', {
                        ...formData.preferences?.squareFootage,
                        min: parseInt(e.target.value) || 0
                      })}
                    />
                    <Input
                      type="number"
                      placeholder="Max"
                      value={formData.preferences?.squareFootage?.max || ''}
                      onChange={(e) => updatePreferences('squareFootage', {
                        ...formData.preferences?.squareFootage,
                        max: parseInt(e.target.value) || 0
                      })}
                    />
                  </div>
                </div>
              </div>

              <div>
                <Label>Preferred Locations</Label>
                <div className="flex gap-2 mb-2">
                  <Input
                    placeholder="Add location"
                    value={newLocation}
                    onChange={(e) => setNewLocation(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addLocation())}
                  />
                  <Button type="button" onClick={addLocation}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.preferences?.preferredLocations?.map((location, index) => (
                    <Badge key={index} variant="secondary" className="flex items-center gap-1">
                      {location}
                      <X
                        className="h-3 w-3 cursor-pointer"
                        onClick={() => removeLocation(location)}
                      />
                    </Badge>
                  ))}
                </div>
              </div>

              <div>
                <Label>Amenities</Label>
                <div className="flex gap-2 mb-2">
                  <Input
                    placeholder="Add amenity"
                    value={newAmenity}
                    onChange={(e) => setNewAmenity(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addAmenity())}
                  />
                  <Button type="button" onClick={addAmenity}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.preferences?.amenities?.map((amenity, index) => (
                    <Badge key={index} variant="secondary" className="flex items-center gap-1">
                      {amenity}
                      <X
                        className="h-3 w-3 cursor-pointer"
                        onClick={() => removeAmenity(amenity)}
                      />
                    </Badge>
                  ))}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="segmentation" className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <Tag className="h-5 w-5" />
                <h3 className="text-lg font-semibold">Client Segmentation</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="clientType">Client Type</Label>
                  <Select
                    value={formData.segmentation?.clientType || 'investor'}
                    onValueChange={(value) => updateSegmentation('clientType', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="investor">Investor</SelectItem>
                      <SelectItem value="owner-occupier">Owner-Occupier</SelectItem>
                      <SelectItem value="first-time-buyer">First-Time Buyer</SelectItem>
                      <SelectItem value="downsizing">Downsizing</SelectItem>
                      <SelectItem value="upgrading">Upgrading</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="budgetTier">Budget Tier</Label>
                  <Select
                    value={formData.segmentation?.budgetTier || 'mid-range'}
                    onValueChange={(value) => updateSegmentation('budgetTier', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="budget">Budget</SelectItem>
                      <SelectItem value="mid-range">Mid-Range</SelectItem>
                      <SelectItem value="luxury">Luxury</SelectItem>
                      <SelectItem value="ultra-luxury">Ultra-Luxury</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="urgency">Urgency</Label>
                  <Select
                    value={formData.segmentation?.urgency || 'flexible'}
                    onValueChange={(value) => updateSegmentation('urgency', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="immediate">Immediate</SelectItem>
                      <SelectItem value="within-3-months">Within 3 Months</SelectItem>
                      <SelectItem value="within-6-months">Within 6 Months</SelectItem>
                      <SelectItem value="flexible">Flexible</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="source">Source</Label>
                  <Select
                    value={formData.segmentation?.source || 'website'}
                    onValueChange={(value) => updateSegmentation('source', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="referral">Referral</SelectItem>
                      <SelectItem value="website">Website</SelectItem>
                      <SelectItem value="social-media">Social Media</SelectItem>
                      <SelectItem value="advertising">Advertising</SelectItem>
                      <SelectItem value="walk-in">Walk-in</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Tags</Label>
                <div className="flex gap-2 mb-2">
                  <Input
                    placeholder="Add tag"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                  />
                  <Button type="button" onClick={addTag}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.segmentation?.tags?.map((tag, index) => (
                    <Badge key={index} variant="secondary" className="flex items-center gap-1">
                      {tag}
                      <X
                        className="h-3 w-3 cursor-pointer"
                        onClick={() => removeTag(tag)}
                      />
                    </Badge>
                  ))}
                </div>
              </div>

              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Add any additional notes about this landlord..."
                  value={formData.notes || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  rows={4}
                />
              </div>
            </TabsContent>
          </Tabs>

          {errors.submit && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{errors.submit}</p>
            </div>
          )}

          <div className="flex justify-end gap-2 mt-6">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              <Save className="h-4 w-4 mr-2" />
              {loading ? 'Saving...' : 'Save Landlord Profile'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}