import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useClients } from '@/contexts/ClientContext';
import { ClientFormData, Client } from '@/types/client';
import { Plus, User, MapPin, DollarSign, Tag, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface AddClientModalProps {
  trigger?: React.ReactNode;
  onClientAdded?: (client: Client) => void;
}

export default function AddClientModal({ trigger, onClientAdded }: AddClientModalProps) {
  const { addClient, isLoading } = useClients();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');
  const [formData, setFormData] = useState<ClientFormData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    type: 'buyer',
    source: 'website',
    notes: '',
    priority: 'medium',
    communicationPreference: 'email',
    tags: []
  });

  const [tempTag, setTempTag] = useState('');
  const [locations, setLocations] = useState<string[]>([]);
  const [tempLocation, setTempLocation] = useState('');
  const [propertyTypes, setPropertyTypes] = useState<string[]>([]);

  const handleInputChange = (field: keyof ClientFormData, value: string | number | { min: number; max: number } | string[]) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const addTag = () => {
    if (tempTag.trim() && !formData.tags?.includes(tempTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...(prev.tags || []), tempTag.trim()]
      }));
      setTempTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags?.filter(tag => tag !== tagToRemove) || []
    }));
  };

  const addLocation = () => {
    if (tempLocation.trim() && !locations.includes(tempLocation.trim())) {
      setLocations(prev => [...prev, tempLocation.trim()]);
      setTempLocation('');
    }
  };

  const removeLocation = (locationToRemove: string) => {
    setLocations(prev => prev.filter(loc => loc !== locationToRemove));
  };

  const togglePropertyType = (type: string) => {
    setPropertyTypes(prev => 
      prev.includes(type) 
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.firstName || !formData.lastName || !formData.email || !formData.phone) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields.",
        variant: "destructive"
      });
      return;
    }

    try {
      const clientData: ClientFormData = {
        ...formData,
        location: locations.length > 0 ? locations : undefined,
        propertyType: propertyTypes.length > 0 ? propertyTypes : undefined
      };

      const newClient = await addClient(clientData);
      
      toast({
        title: "Success!",
        description: `Client ${formData.firstName} ${formData.lastName} has been added successfully.`,
      });

      onClientAdded?.(newClient);
      setOpen(false);
      
      // Reset form
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        type: 'buyer',
        source: 'website',
        notes: '',
        priority: 'medium',
        communicationPreference: 'email',
        tags: []
      });
      setLocations([]);
      setPropertyTypes([]);
      setActiveTab('basic');
      
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add client. Please try again.",
        variant: "destructive"
      });
    }
  };

  const defaultTrigger = (
    <Button>
      <Plus className="h-4 w-4 mr-2" />
      Add New Client
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <User className="h-5 w-5 mr-2" />
            Add New Client
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="basic">Basic Info</TabsTrigger>
              <TabsTrigger value="preferences">Preferences</TabsTrigger>
              <TabsTrigger value="additional">Additional</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Contact Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="firstName">First Name *</Label>
                      <Input
                        id="firstName"
                        value={formData.firstName}
                        onChange={(e) => handleInputChange('firstName', e.target.value)}
                        placeholder="Enter first name"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="lastName">Last Name *</Label>
                      <Input
                        id="lastName"
                        value={formData.lastName}
                        onChange={(e) => handleInputChange('lastName', e.target.value)}
                        placeholder="Enter last name"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="email">Email Address *</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        placeholder="Enter email address"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="phone">Phone Number *</Label>
                      <Input
                        id="phone"
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => handleInputChange('phone', e.target.value)}
                        placeholder="(757) 555-0123"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="type">Client Type</Label>
                      <Select value={formData.type} onValueChange={(value: 'buyer' | 'seller' | 'renter' | 'investor') => handleInputChange('type', value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="buyer">Buyer</SelectItem>
                          <SelectItem value="seller">Seller</SelectItem>
                          <SelectItem value="renter">Renter</SelectItem>
                          <SelectItem value="investor">Investor</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="source">Lead Source</Label>
                      <Select value={formData.source} onValueChange={(value: 'referral' | 'website' | 'social_media' | 'cold_call' | 'walk_in' | 'other') => handleInputChange('source', value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="website">Website</SelectItem>
                          <SelectItem value="referral">Referral</SelectItem>
                          <SelectItem value="social_media">Social Media</SelectItem>
                          <SelectItem value="cold_call">Cold Call</SelectItem>
                          <SelectItem value="walk_in">Walk-in</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="priority">Priority Level</Label>
                      <Select value={formData.priority} onValueChange={(value: 'low' | 'medium' | 'high' | 'urgent') => handleInputChange('priority', value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="urgent">Urgent</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="communication">Communication Preference</Label>
                      <Select value={formData.communicationPreference} onValueChange={(value: 'email' | 'phone' | 'text' | 'in_person') => handleInputChange('communicationPreference', value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="email">Email</SelectItem>
                          <SelectItem value="phone">Phone</SelectItem>
                          <SelectItem value="text">Text Message</SelectItem>
                          <SelectItem value="in_person">In Person</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="preferences" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center">
                    <DollarSign className="h-5 w-5 mr-2" />
                    Budget & Property Preferences
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="minBudget">Minimum Budget</Label>
                      <Input
                        id="minBudget"
                        type="number"
                        value={formData.budget?.min || ''}
                        onChange={(e) => handleInputChange('budget', {
                          ...formData.budget,
                          min: parseInt(e.target.value) || 0,
                          max: formData.budget?.max || 0
                        })}
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <Label htmlFor="maxBudget">Maximum Budget</Label>
                      <Input
                        id="maxBudget"
                        type="number"
                        value={formData.budget?.max || ''}
                        onChange={(e) => handleInputChange('budget', {
                          min: formData.budget?.min || 0,
                          max: parseInt(e.target.value) || 0
                        })}
                        placeholder="0"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="bedrooms">Preferred Bedrooms</Label>
                      <Select value={formData.bedrooms?.toString() || ''} onValueChange={(value) => handleInputChange('bedrooms', parseInt(value))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Any" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1 Bedroom</SelectItem>
                          <SelectItem value="2">2 Bedrooms</SelectItem>
                          <SelectItem value="3">3 Bedrooms</SelectItem>
                          <SelectItem value="4">4 Bedrooms</SelectItem>
                          <SelectItem value="5">5+ Bedrooms</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="bathrooms">Preferred Bathrooms</Label>
                      <Select value={formData.bathrooms?.toString() || ''} onValueChange={(value) => handleInputChange('bathrooms', parseInt(value))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Any" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1 Bathroom</SelectItem>
                          <SelectItem value="2">2 Bathrooms</SelectItem>
                          <SelectItem value="3">3 Bathrooms</SelectItem>
                          <SelectItem value="4">4+ Bathrooms</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label className="flex items-center mb-2">
                      <MapPin className="h-4 w-4 mr-1" />
                      Preferred Locations
                    </Label>
                    <div className="flex gap-2 mb-2">
                      <Input
                        value={tempLocation}
                        onChange={(e) => setTempLocation(e.target.value)}
                        placeholder="Add location"
                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addLocation())}
                      />
                      <Button type="button" onClick={addLocation} size="sm">
                        Add
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {locations.map((location, index) => (
                        <Badge key={index} variant="secondary" className="flex items-center gap-1">
                          {location}
                          <X className="h-3 w-3 cursor-pointer" onClick={() => removeLocation(location)} />
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label>Property Types</Label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                      {['Single Family', 'Townhouse', 'Condo', 'Multi-Family', 'Land', 'Commercial'].map((type) => (
                        <Button
                          key={type}
                          type="button"
                          variant={propertyTypes.includes(type) ? "default" : "outline"}
                          size="sm"
                          onClick={() => togglePropertyType(type)}
                        >
                          {type}
                        </Button>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="additional" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Additional Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="flex items-center mb-2">
                      <Tag className="h-4 w-4 mr-1" />
                      Tags
                    </Label>
                    <div className="flex gap-2 mb-2">
                      <Input
                        value={tempTag}
                        onChange={(e) => setTempTag(e.target.value)}
                        placeholder="Add tag"
                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                      />
                      <Button type="button" onClick={addTag} size="sm">
                        Add
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {formData.tags?.map((tag, index) => (
                        <Badge key={index} variant="secondary" className="flex items-center gap-1">
                          {tag}
                          <X className="h-3 w-3 cursor-pointer" onClick={() => removeTag(tag)} />
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      value={formData.notes}
                      onChange={(e) => handleInputChange('notes', e.target.value)}
                      placeholder="Add any additional notes about this client..."
                      rows={4}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end space-x-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Adding Client...' : 'Add Client'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}