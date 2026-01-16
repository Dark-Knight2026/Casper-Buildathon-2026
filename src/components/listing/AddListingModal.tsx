import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useListings } from '@/contexts/ListingContext';
import { useClients } from '@/contexts/ClientContext';
import { ListingFormData } from '@/types/listing';
import { useToast } from '@/hooks/use-toast';
import {
  Home,
  MapPin,
  DollarSign,
  FileText,
  Camera,
  Settings,
  Plus,
  X,
  Save,
  Eye,
  Users
} from 'lucide-react';

interface AddListingModalProps {
  trigger?: React.ReactNode;
}

export default function AddListingModal({ trigger }: AddListingModalProps) {
  const { addListing } = useListings();
  const { clients } = useClients();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState('basic');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState<ListingFormData>({
    title: '',
    description: '',
    address: {
      street: '',
      city: '',
      state: 'VA',
      zipCode: '',
      country: 'USA'
    },
    price: 0,
    propertyType: 'single_family',
    listingType: 'for_sale',
    clientType: 'seller'
  });

  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);
  const [selectedAppliances, setSelectedAppliances] = useState<string[]>([]);
  const [selectedUtilities, setSelectedUtilities] = useState<string[]>([]);

  const availableFeatures = [
    'Hardwood Floors', 'Tile Floors', 'Carpet', 'Fireplace', 'Deck', 'Patio',
    'Balcony', 'Pool', 'Hot Tub', 'Garage', 'Carport', 'Storage', 'Basement',
    'Attic', 'Walk-in Closet', 'Master Suite', 'Updated Kitchen', 'Updated Bathrooms',
    'Stainless Steel Appliances', 'Granite Countertops', 'Island Kitchen',
    'Open Floor Plan', 'High Ceilings', 'Crown Molding', 'Bay Windows',
    'Skylight', 'French Doors', 'Security System', 'Fenced Yard'
  ];

  const availableAppliances = [
    'Dishwasher', 'Disposal', 'Microwave', 'Range/Oven', 'Refrigerator',
    'Washer/Dryer', 'Wine Cooler', 'Ice Maker', 'Trash Compactor'
  ];

  const availableUtilities = [
    'Electric', 'Natural Gas', 'Propane', 'Water', 'Sewer', 'Septic',
    'Well Water', 'Cable', 'Internet', 'Security System'
  ];

  const updateFormData = (field: keyof ListingFormData, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const updateNestedFormData = (parent: keyof ListingFormData, field: string, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [parent]: {
        ...prev[parent],
        [field]: value
      }
    }));
  };

  const toggleFeature = (feature: string, list: string[], setList: (list: string[]) => void) => {
    if (list.includes(feature)) {
      setList(list.filter(f => f !== feature));
    } else {
      setList([...list, feature]);
    }
  };

  const handleSubmit = async () => {
    if (!formData.title || !formData.address.street || !formData.price) {
      toast({
        title: "Error",
        description: "Please fill in all required fields.",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const listingData: ListingFormData = {
        ...formData,
        features: selectedFeatures.length > 0 ? selectedFeatures : undefined,
        appliances: selectedAppliances.length > 0 ? selectedAppliances : undefined,
        utilities: selectedUtilities.length > 0 ? selectedUtilities : undefined
      };

      await addListing(listingData);
      
      toast({
        title: "Success!",
        description: "New listing created successfully.",
      });
      
      setOpen(false);
      resetForm();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create listing. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      address: {
        street: '',
        city: '',
        state: 'VA',
        zipCode: '',
        country: 'USA'
      },
      price: 0,
      propertyType: 'single_family',
      listingType: 'for_sale',
      clientType: 'seller'
    });
    setSelectedFeatures([]);
    setSelectedAppliances([]);
    setSelectedUtilities([]);
    setCurrentStep('basic');
  };

  const getStepIcon = (step: string) => {
    switch (step) {
      case 'basic': return <Home className="h-4 w-4" />;
      case 'details': return <Settings className="h-4 w-4" />;
      case 'features': return <FileText className="h-4 w-4" />;
      case 'financial': return <DollarSign className="h-4 w-4" />;
      case 'marketing': return <Camera className="h-4 w-4" />;
      case 'client': return <Users className="h-4 w-4" />;
      default: return <Home className="h-4 w-4" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add New Listing
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Property Listing</DialogTitle>
        </DialogHeader>

        <Tabs value={currentStep} onValueChange={setCurrentStep} className="w-full">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="basic" className="flex items-center space-x-2">
              {getStepIcon('basic')}
              <span className="hidden sm:inline">Basic Info</span>
            </TabsTrigger>
            <TabsTrigger value="details" className="flex items-center space-x-2">
              {getStepIcon('details')}
              <span className="hidden sm:inline">Details</span>
            </TabsTrigger>
            <TabsTrigger value="features" className="flex items-center space-x-2">
              {getStepIcon('features')}
              <span className="hidden sm:inline">Features</span>
            </TabsTrigger>
            <TabsTrigger value="financial" className="flex items-center space-x-2">
              {getStepIcon('financial')}
              <span className="hidden sm:inline">Financial</span>
            </TabsTrigger>
            <TabsTrigger value="marketing" className="flex items-center space-x-2">
              {getStepIcon('marketing')}
              <span className="hidden sm:inline">Marketing</span>
            </TabsTrigger>
            <TabsTrigger value="client" className="flex items-center space-x-2">
              {getStepIcon('client')}
              <span className="hidden sm:inline">Client</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Home className="h-5 w-5 mr-2" />
                  Basic Property Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="title">Property Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => updateFormData('title', e.target.value)}
                    placeholder="e.g., Stunning Waterfront Colonial"
                  />
                </div>

                <div>
                  <Label htmlFor="description">Property Description *</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => updateFormData('description', e.target.value)}
                    placeholder="Describe the property's key features and appeal..."
                    rows={4}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="propertyType">Property Type *</Label>
                    <Select 
                      value={formData.propertyType} 
                      onValueChange={(value) => updateFormData('propertyType', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="single_family">Single Family Home</SelectItem>
                        <SelectItem value="condo">Condominium</SelectItem>
                        <SelectItem value="townhouse">Townhouse</SelectItem>
                        <SelectItem value="multi_family">Multi-Family</SelectItem>
                        <SelectItem value="land">Land/Lot</SelectItem>
                        <SelectItem value="commercial">Commercial</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="listingType">Listing Type *</Label>
                    <Select 
                      value={formData.listingType} 
                      onValueChange={(value) => updateFormData('listingType', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="for_sale">For Sale</SelectItem>
                        <SelectItem value="rental">Rental</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="price">Listing Price *</Label>
                  <Input
                    id="price"
                    type="number"
                    value={formData.price || ''}
                    onChange={(e) => updateFormData('price', parseInt(e.target.value) || 0)}
                    placeholder="0"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <MapPin className="h-5 w-5 mr-2" />
                  Property Address
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="street">Street Address *</Label>
                  <Input
                    id="street"
                    value={formData.address.street}
                    onChange={(e) => updateNestedFormData('address', 'street', e.target.value)}
                    placeholder="123 Main Street"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="city">City *</Label>
                    <Input
                      id="city"
                      value={formData.address.city}
                      onChange={(e) => updateNestedFormData('address', 'city', e.target.value)}
                      placeholder="Norfolk"
                    />
                  </div>
                  <div>
                    <Label htmlFor="state">State *</Label>
                    <Select 
                      value={formData.address.state} 
                      onValueChange={(value) => updateNestedFormData('address', 'state', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="VA">Virginia</SelectItem>
                        <SelectItem value="NC">North Carolina</SelectItem>
                        <SelectItem value="MD">Maryland</SelectItem>
                        <SelectItem value="DC">Washington DC</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="zipCode">ZIP Code *</Label>
                    <Input
                      id="zipCode"
                      value={formData.address.zipCode}
                      onChange={(e) => updateNestedFormData('address', 'zipCode', e.target.value)}
                      placeholder="23510"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="details" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Settings className="h-5 w-5 mr-2" />
                  Property Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <Label htmlFor="bedrooms">Bedrooms</Label>
                    <Input
                      id="bedrooms"
                      type="number"
                      value={formData.bedrooms || ''}
                      onChange={(e) => updateFormData('bedrooms', parseInt(e.target.value) || 0)}
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <Label htmlFor="bathrooms">Full Bathrooms</Label>
                    <Input
                      id="bathrooms"
                      type="number"
                      value={formData.bathrooms || ''}
                      onChange={(e) => updateFormData('bathrooms', parseInt(e.target.value) || 0)}
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <Label htmlFor="halfBaths">Half Bathrooms</Label>
                    <Input
                      id="halfBaths"
                      type="number"
                      value={formData.halfBaths || ''}
                      onChange={(e) => updateFormData('halfBaths', parseInt(e.target.value) || 0)}
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <Label htmlFor="yearBuilt">Year Built</Label>
                    <Input
                      id="yearBuilt"
                      type="number"
                      value={formData.yearBuilt || ''}
                      onChange={(e) => updateFormData('yearBuilt', parseInt(e.target.value) || 0)}
                      placeholder="2000"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="squareFootage">Square Footage</Label>
                    <Input
                      id="squareFootage"
                      type="number"
                      value={formData.squareFootage || ''}
                      onChange={(e) => updateFormData('squareFootage', parseInt(e.target.value) || 0)}
                      placeholder="1500"
                    />
                  </div>
                  <div>
                    <Label htmlFor="lotSize">Lot Size (acres)</Label>
                    <Input
                      id="lotSize"
                      type="number"
                      step="0.01"
                      value={formData.lotSize || ''}
                      onChange={(e) => updateFormData('lotSize', parseFloat(e.target.value) || 0)}
                      placeholder="0.25"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="features" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FileText className="h-5 w-5 mr-2" />
                  Property Features & Amenities
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label className="text-base font-semibold mb-3 block">Property Features</Label>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {availableFeatures.map((feature) => (
                      <div key={feature} className="flex items-center space-x-2">
                        <Checkbox
                          id={`feature-${feature}`}
                          checked={selectedFeatures.includes(feature)}
                          onCheckedChange={() => toggleFeature(feature, selectedFeatures, setSelectedFeatures)}
                        />
                        <Label htmlFor={`feature-${feature}`} className="text-sm">
                          {feature}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <Label className="text-base font-semibold mb-3 block">Included Appliances</Label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {availableAppliances.map((appliance) => (
                      <div key={appliance} className="flex items-center space-x-2">
                        <Checkbox
                          id={`appliance-${appliance}`}
                          checked={selectedAppliances.includes(appliance)}
                          onCheckedChange={() => toggleFeature(appliance, selectedAppliances, setSelectedAppliances)}
                        />
                        <Label htmlFor={`appliance-${appliance}`} className="text-sm">
                          {appliance}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <Label className="text-base font-semibold mb-3 block">Utilities</Label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {availableUtilities.map((utility) => (
                      <div key={utility} className="flex items-center space-x-2">
                        <Checkbox
                          id={`utility-${utility}`}
                          checked={selectedUtilities.includes(utility)}
                          onCheckedChange={() => toggleFeature(utility, selectedUtilities, setSelectedUtilities)}
                        />
                        <Label htmlFor={`utility-${utility}`} className="text-sm">
                          {utility}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="financial" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <DollarSign className="h-5 w-5 mr-2" />
                  Financial Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="annualTaxes">Annual Property Taxes</Label>
                    <Input
                      id="annualTaxes"
                      type="number"
                      value={formData.taxes?.annual || ''}
                      onChange={(e) => updateNestedFormData('taxes', 'annual', parseInt(e.target.value) || 0)}
                      placeholder="5000"
                    />
                  </div>
                  <div>
                    <Label htmlFor="taxYear">Tax Year</Label>
                    <Input
                      id="taxYear"
                      type="number"
                      value={formData.taxes?.year || new Date().getFullYear()}
                      onChange={(e) => updateNestedFormData('taxes', 'year', parseInt(e.target.value) || new Date().getFullYear())}
                      placeholder={new Date().getFullYear().toString()}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="marketing" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Camera className="h-5 w-5 mr-2" />
                  Marketing Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="marketingRemarks">Marketing Remarks</Label>
                  <Textarea
                    id="marketingRemarks"
                    value={formData.marketingRemarks || ''}
                    onChange={(e) => updateFormData('marketingRemarks', e.target.value)}
                    placeholder="Public marketing description..."
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="client" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Users className="h-5 w-5 mr-2" />
                  Client Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="clientType">Client Type</Label>
                  <Select 
                    value={formData.clientType} 
                    onValueChange={(value) => updateFormData('clientType', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="seller">Seller</SelectItem>
                      <SelectItem value="landlord">Landlord</SelectItem>
                      <SelectItem value="developer">Developer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Preview Summary */}
                <div className="mt-6 p-4 border rounded-lg bg-gray-50">
                  <h3 className="text-lg font-semibold mb-2">Listing Preview</h3>
                  <div className="space-y-2">
                    <div>
                      <h4 className="font-medium">{formData.title || 'Property Title'}</h4>
                      <p className="text-sm text-gray-600">
                        {formData.address.street && formData.address.city 
                          ? `${formData.address.street}, ${formData.address.city}, ${formData.address.state} ${formData.address.zipCode}`
                          : 'Property Address'
                        }
                      </p>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-xl font-bold text-blue-600">
                        ${formData.price ? formData.price.toLocaleString() : '0'}
                      </div>
                      <Badge variant="outline" className="capitalize">
                        {formData.propertyType.replace('_', ' ')}
                      </Badge>
                      <Badge variant="secondary" className="capitalize">
                        {formData.listingType === 'for_sale' ? 'For Sale' : 'Rental'}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-between items-center pt-6 border-t">
          <Button
            variant="outline"
            onClick={() => {
              setOpen(false);
              resetForm();
            }}
          >
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !formData.title || !formData.address.street || !formData.price}
          >
            {isSubmitting ? (
              'Creating...'
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Create Listing
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}