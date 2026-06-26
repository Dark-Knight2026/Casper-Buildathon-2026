import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  Home,
  MapPin,
  DollarSign,
  FileText,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Building2,
  Upload,
  AlertCircle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface PropertyFormData {
  // Step 1: Property Type
  propertyType: 'single-unit' | 'multi-unit' | '';
  unitCount: number;
  listingType: 'rental' | 'for_sale';
  
  // Step 2: Basic Information
  propertySubType: string;
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  
  // Step 3: Property Details
  bedrooms: number;
  bathrooms: number;
  squareFootage: number;
  yearBuilt: number;
  lotSize: string;
  parkingSpaces: number;
  
  // Step 4: Features & Amenities
  features: string[];
  amenities: string[];
  description: string;
  
  // Step 5: Financial Information
  purchasePrice: number;
  currentValue: number;
  monthlyRent: number;
  securityDeposit: number;
  expenses: {
    propertyTax: number;
    insurance: number;
    hoa: number;
    maintenance: number;
    utilities: number;
  };
  
  // Step 6: Images & Documents
  images: File[];
  documents: File[];
}

interface AddPropertyWizardProps {
  onComplete: (data: PropertyFormData) => void;
  onCancel: () => void;
}

const STEPS = [
  { id: 1, title: 'Property Type', icon: Home },
  { id: 2, title: 'Basic Info', icon: MapPin },
  { id: 3, title: 'Details', icon: Building2 },
  { id: 4, title: 'Features', icon: FileText },
  { id: 5, title: 'Financials', icon: DollarSign },
  { id: 6, title: 'Photos', icon: Upload },
  { id: 7, title: 'Review', icon: CheckCircle }
];

const PROPERTY_FEATURES = [
  'Hardwood Floors', 'Granite Counters', 'Stainless Appliances', 'Walk-in Closets',
  'Central Air', 'Fireplace', 'Balcony/Deck', 'Smart Home Technology',
  'In-Unit Laundry', 'Dishwasher', 'Microwave', 'Ceiling Fans'
];

const PROPERTY_AMENITIES = [
  'Pool', 'Gym', 'Parking', 'Storage', 'Pet Friendly', 'Garden',
  'Security System', 'Elevator', 'Bike Storage', 'Playground'
];

export default function AddPropertyWizard({ onComplete, onCancel }: AddPropertyWizardProps) {
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<PropertyFormData>({
    propertyType: '',
    unitCount: 1,
    listingType: 'for_sale',
    propertySubType: '',
    address: {
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: 'USA'
    },
    bedrooms: 0,
    bathrooms: 0,
    squareFootage: 0,
    yearBuilt: new Date().getFullYear(),
    lotSize: '',
    parkingSpaces: 0,
    features: [],
    amenities: [],
    description: '',
    purchasePrice: 0,
    currentValue: 0,
    monthlyRent: 0,
    securityDeposit: 0,
    expenses: {
      propertyTax: 0,
      insurance: 0,
      hoa: 0,
      maintenance: 0,
      utilities: 0
    },
    images: [],
    documents: []
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const updateFormData = (field: string, value: unknown) => {
    setFormData(prev => {
      if (field.includes('.')) {
        const [parent, child] = field.split('.');
        return {
          ...prev,
          [parent]: {
            ...(prev[parent as keyof PropertyFormData] as Record<string, unknown>),
            [child]: value
          }
        };
      }
      return { ...prev, [field]: value };
    });
    // Clear error when field is updated
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};

    switch (step) {
      case 1:
        if (!formData.propertyType) {
          newErrors.propertyType = 'Please select a property type';
        }
        if (formData.propertyType === 'multi-unit' && formData.unitCount < 2) {
          newErrors.unitCount = 'Multi-unit properties must have at least 2 units';
        }
        break;

      case 2:
        if (!formData.propertySubType) {
          newErrors.propertySubType = 'Please select a property sub-type';
        }
        if (!formData.address.street) {
          newErrors['address.street'] = 'Street address is required';
        }
        if (!formData.address.city) {
          newErrors['address.city'] = 'City is required';
        }
        if (!formData.address.state) {
          newErrors['address.state'] = 'State is required';
        }
        if (!formData.address.zipCode) {
          newErrors['address.zipCode'] = 'ZIP code is required';
        }
        break;

      case 3:
        if (formData.bedrooms < 0) {
          newErrors.bedrooms = 'Bedrooms must be 0 or greater';
        }
        if (formData.bathrooms < 0) {
          newErrors.bathrooms = 'Bathrooms must be 0 or greater';
        }
        if (formData.squareFootage <= 0) {
          newErrors.squareFootage = 'Square footage must be greater than 0';
        }
        if (formData.yearBuilt < 1800 || formData.yearBuilt > new Date().getFullYear() + 1) {
          newErrors.yearBuilt = 'Please enter a valid year';
        }
        break;

      case 4:
        // Features and amenities are optional
        break;

      case 5:
        if (formData.purchasePrice < 0) {
          newErrors.purchasePrice = 'Purchase price must be 0 or greater';
        }
        if (formData.currentValue < 0) {
          newErrors.currentValue = 'Current value must be 0 or greater';
        }
        if (formData.monthlyRent < 0) {
          newErrors.monthlyRent = 'Monthly rent must be 0 or greater';
        }
        break;
      
      case 6:
        // Photos are optional
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      if (currentStep < STEPS.length) {
        setCurrentStep(currentStep + 1);
      }
    } else {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields correctly',
        variant: 'destructive'
      });
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = () => {
    if (validateStep(7)) {
      onComplete(formData);
      toast({
        title: 'Success',
        description: 'Property added successfully'
      });
    }
  };

  const toggleFeature = (feature: string) => {
    setFormData(prev => ({
      ...prev,
      features: prev.features.includes(feature)
        ? prev.features.filter(f => f !== feature)
        : [...prev.features, feature]
    }));
  };

  const toggleAmenity = (amenity: string) => {
    setFormData(prev => ({
      ...prev,
      amenities: prev.amenities.includes(amenity)
        ? prev.amenities.filter(a => a !== amenity)
        : [...prev.amenities, amenity]
    }));
  };

  const calculateROI = () => {
    const annualRent = formData.monthlyRent * 12;
    const annualExpenses = Object.values(formData.expenses).reduce((sum, exp) => sum + exp * 12, 0);
    const netIncome = annualRent - annualExpenses;
    const roi = formData.currentValue > 0 ? (netIncome / formData.currentValue) * 100 : 0;
    return roi.toFixed(2);
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {STEPS.map((step, index) => {
            const Icon = step.icon;
            const isActive = currentStep === step.id;
            const isCompleted = currentStep > step.id;
            
            return (
              <div key={step.id} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      isActive
                        ? 'bg-blue-600 text-white'
                        : isCompleted
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <span
                    className={`text-xs mt-2 ${
                      isActive ? 'text-blue-600 font-semibold' : 'text-gray-600'
                    }`}
                  >
                    {step.title}
                  </span>
                </div>
                {index < STEPS.length - 1 && (
                  <div
                    className={`h-1 flex-1 mx-2 ${
                      isCompleted ? 'bg-green-600' : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Step Content */}
      <Card>
        <CardHeader>
          <CardTitle>{STEPS[currentStep - 1].title}</CardTitle>
          <CardDescription>
            {currentStep === 1 && 'Select the type of property you want to add'}
            {currentStep === 2 && 'Enter the property address and basic information'}
            {currentStep === 3 && 'Provide detailed property specifications'}
            {currentStep === 4 && 'Select features and amenities'}
            {currentStep === 5 && 'Enter financial information'}
            {currentStep === 6 && 'Upload property photos and documents'}
            {currentStep === 7 && 'Review and confirm property details'}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Step 1: Property Type */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div>
                <Label>Property Type *</Label>
                <RadioGroup
                  value={formData.propertyType}
                  onValueChange={(value) => updateFormData('propertyType', value)}
                  className="grid grid-cols-2 gap-4 mt-2"
                >
                  <div>
                    <RadioGroupItem value="single-unit" id="single-unit" className="peer sr-only" />
                    <Label
                      htmlFor="single-unit"
                      className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                    >
                      <Home className="mb-3 h-6 w-6" />
                      <div className="text-center">
                        <div className="font-semibold">Single Unit</div>
                        <div className="text-xs text-muted-foreground">
                          One rental unit per property
                        </div>
                      </div>
                    </Label>
                  </div>
                  <div>
                    <RadioGroupItem value="multi-unit" id="multi-unit" className="peer sr-only" />
                    <Label
                      htmlFor="multi-unit"
                      className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                    >
                      <Building2 className="mb-3 h-6 w-6" />
                      <div className="text-center">
                        <div className="font-semibold">Multi-Unit</div>
                        <div className="text-xs text-muted-foreground">
                          Multiple rental units
                        </div>
                      </div>
                    </Label>
                  </div>
                </RadioGroup>
                {errors.propertyType && (
                  <p className="text-sm text-red-600 mt-1">{errors.propertyType}</p>
                )}
              </div>

              {formData.propertyType === 'multi-unit' && (
                <div>
                  <Label htmlFor="unitCount">Number of Units *</Label>
                  <Input
                    id="unitCount"
                    type="number"
                    min="2"
                    value={formData.unitCount}
                    onChange={(e) => updateFormData('unitCount', parseInt(e.target.value) || 2)}
                    className="mt-1"
                  />
                  {errors.unitCount && (
                    <p className="text-sm text-red-600 mt-1">{errors.unitCount}</p>
                  )}
                </div>
              )}

              <div>
                <Label htmlFor="listingType">Listing Type *</Label>
                <Select
                  value={formData.listingType}
                  onValueChange={(value) => updateFormData('listingType', value)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select listing type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="for_sale">For Sale</SelectItem>
                    <SelectItem value="rental">Rental</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Step 2: Basic Information */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="propertySubType">Property Sub-Type *</Label>
                <Select
                  value={formData.propertySubType}
                  onValueChange={(value) => updateFormData('propertySubType', value)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select property type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="single-family">Single Family Home</SelectItem>
                    <SelectItem value="condo">Condominium</SelectItem>
                    <SelectItem value="townhouse">Townhouse</SelectItem>
                    <SelectItem value="apartment">Apartment</SelectItem>
                    <SelectItem value="duplex">Duplex</SelectItem>
                    <SelectItem value="multi-family">Multi-Family</SelectItem>
                    <SelectItem value="commercial">Commercial</SelectItem>
                  </SelectContent>
                </Select>
                {errors.propertySubType && (
                  <p className="text-sm text-red-600 mt-1">{errors.propertySubType}</p>
                )}
              </div>

              <div>
                <Label htmlFor="street">Street Address *</Label>
                <Input
                  id="street"
                  value={formData.address.street}
                  onChange={(e) => updateFormData('address.street', e.target.value)}
                  placeholder="123 Main Street"
                  className="mt-1"
                />
                {errors['address.street'] && (
                  <p className="text-sm text-red-600 mt-1">{errors['address.street']}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="city">City *</Label>
                  <Input
                    id="city"
                    value={formData.address.city}
                    onChange={(e) => updateFormData('address.city', e.target.value)}
                    placeholder="Los Angeles"
                    className="mt-1"
                  />
                  {errors['address.city'] && (
                    <p className="text-sm text-red-600 mt-1">{errors['address.city']}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="state">State *</Label>
                  <Input
                    id="state"
                    value={formData.address.state}
                    onChange={(e) => updateFormData('address.state', e.target.value)}
                    placeholder="CA"
                    className="mt-1"
                  />
                  {errors['address.state'] && (
                    <p className="text-sm text-red-600 mt-1">{errors['address.state']}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="zipCode">ZIP Code *</Label>
                  <Input
                    id="zipCode"
                    value={formData.address.zipCode}
                    onChange={(e) => updateFormData('address.zipCode', e.target.value)}
                    placeholder="90210"
                    className="mt-1"
                  />
                  {errors['address.zipCode'] && (
                    <p className="text-sm text-red-600 mt-1">{errors['address.zipCode']}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="country">Country</Label>
                  <Input
                    id="country"
                    value={formData.address.country}
                    onChange={(e) => updateFormData('address.country', e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Property Details */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="bedrooms">Bedrooms *</Label>
                  <Input
                    id="bedrooms"
                    type="number"
                    min="0"
                    value={formData.bedrooms}
                    onChange={(e) => updateFormData('bedrooms', parseInt(e.target.value) || 0)}
                    className="mt-1"
                  />
                  {errors.bedrooms && (
                    <p className="text-sm text-red-600 mt-1">{errors.bedrooms}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="bathrooms">Bathrooms *</Label>
                  <Input
                    id="bathrooms"
                    type="number"
                    min="0"
                    step="0.5"
                    value={formData.bathrooms}
                    onChange={(e) => updateFormData('bathrooms', parseFloat(e.target.value) || 0)}
                    className="mt-1"
                  />
                  {errors.bathrooms && (
                    <p className="text-sm text-red-600 mt-1">{errors.bathrooms}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="parkingSpaces">Parking Spaces</Label>
                  <Input
                    id="parkingSpaces"
                    type="number"
                    min="0"
                    value={formData.parkingSpaces}
                    onChange={(e) => updateFormData('parkingSpaces', parseInt(e.target.value) || 0)}
                    className="mt-1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="squareFootage">Square Footage *</Label>
                  <Input
                    id="squareFootage"
                    type="number"
                    min="0"
                    value={formData.squareFootage}
                    onChange={(e) => updateFormData('squareFootage', parseInt(e.target.value) || 0)}
                    placeholder="2000"
                    className="mt-1"
                  />
                  {errors.squareFootage && (
                    <p className="text-sm text-red-600 mt-1">{errors.squareFootage}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="yearBuilt">Year Built *</Label>
                  <Input
                    id="yearBuilt"
                    type="number"
                    min="1800"
                    max={new Date().getFullYear() + 1}
                    value={formData.yearBuilt}
                    onChange={(e) => updateFormData('yearBuilt', parseInt(e.target.value) || new Date().getFullYear())}
                    className="mt-1"
                  />
                  {errors.yearBuilt && (
                    <p className="text-sm text-red-600 mt-1">{errors.yearBuilt}</p>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="lotSize">Lot Size</Label>
                <Input
                  id="lotSize"
                  value={formData.lotSize}
                  onChange={(e) => updateFormData('lotSize', e.target.value)}
                  placeholder="0.25 acres"
                  className="mt-1"
                />
              </div>
            </div>
          )}

          {/* Step 4: Features & Amenities */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div>
                <Label>Interior Features</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-2">
                  {PROPERTY_FEATURES.map((feature) => (
                    <div key={feature} className="flex items-center space-x-2">
                      <Checkbox
                        id={`feature-${feature}`}
                        checked={formData.features.includes(feature)}
                        onCheckedChange={() => toggleFeature(feature)}
                      />
                      <label
                        htmlFor={`feature-${feature}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        {feature}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label>Amenities</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-2">
                  {PROPERTY_AMENITIES.map((amenity) => (
                    <div key={amenity} className="flex items-center space-x-2">
                      <Checkbox
                        id={`amenity-${amenity}`}
                        checked={formData.amenities.includes(amenity)}
                        onCheckedChange={() => toggleAmenity(amenity)}
                      />
                      <label
                        htmlFor={`amenity-${amenity}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        {amenity}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label htmlFor="description">Property Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => updateFormData('description', e.target.value)}
                  placeholder="Describe the property, its condition, and any unique features..."
                  rows={5}
                  className="mt-1"
                />
              </div>
            </div>
          )}

          {/* Step 5: Financial Information */}
          {currentStep === 5 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="purchasePrice">Purchase Price</Label>
                  <Input
                    id="purchasePrice"
                    type="number"
                    min="0"
                    value={formData.purchasePrice}
                    onChange={(e) => updateFormData('purchasePrice', parseFloat(e.target.value) || 0)}
                    placeholder="500000"
                    className="mt-1"
                  />
                  {errors.purchasePrice && (
                    <p className="text-sm text-red-600 mt-1">{errors.purchasePrice}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="currentValue">Current Market Value</Label>
                  <Input
                    id="currentValue"
                    type="number"
                    min="0"
                    value={formData.currentValue}
                    onChange={(e) => updateFormData('currentValue', parseFloat(e.target.value) || 0)}
                    placeholder="550000"
                    className="mt-1"
                  />
                  {errors.currentValue && (
                    <p className="text-sm text-red-600 mt-1">{errors.currentValue}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="monthlyRent">Monthly Rent</Label>
                  <Input
                    id="monthlyRent"
                    type="number"
                    min="0"
                    value={formData.monthlyRent}
                    onChange={(e) => updateFormData('monthlyRent', parseFloat(e.target.value) || 0)}
                    placeholder="3000"
                    className="mt-1"
                  />
                  {errors.monthlyRent && (
                    <p className="text-sm text-red-600 mt-1">{errors.monthlyRent}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="securityDeposit">Security Deposit</Label>
                  <Input
                    id="securityDeposit"
                    type="number"
                    min="0"
                    value={formData.securityDeposit}
                    onChange={(e) => updateFormData('securityDeposit', parseFloat(e.target.value) || 0)}
                    placeholder="3000"
                    className="mt-1"
                  />
                </div>
              </div>

              <div className="border-t pt-4">
                <Label className="text-base font-semibold">Monthly Expenses</Label>
                <div className="grid grid-cols-2 gap-4 mt-3">
                  <div>
                    <Label htmlFor="propertyTax">Property Tax</Label>
                    <Input
                      id="propertyTax"
                      type="number"
                      min="0"
                      value={formData.expenses.propertyTax}
                      onChange={(e) => updateFormData('expenses.propertyTax', parseFloat(e.target.value) || 0)}
                      placeholder="500"
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="insurance">Insurance</Label>
                    <Input
                      id="insurance"
                      type="number"
                      min="0"
                      value={formData.expenses.insurance}
                      onChange={(e) => updateFormData('expenses.insurance', parseFloat(e.target.value) || 0)}
                      placeholder="200"
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="hoa">HOA Fees</Label>
                    <Input
                      id="hoa"
                      type="number"
                      min="0"
                      value={formData.expenses.hoa}
                      onChange={(e) => updateFormData('expenses.hoa', parseFloat(e.target.value) || 0)}
                      placeholder="100"
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="maintenance">Maintenance</Label>
                    <Input
                      id="maintenance"
                      type="number"
                      min="0"
                      value={formData.expenses.maintenance}
                      onChange={(e) => updateFormData('expenses.maintenance', parseFloat(e.target.value) || 0)}
                      placeholder="150"
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="utilities">Utilities</Label>
                    <Input
                      id="utilities"
                      type="number"
                      min="0"
                      value={formData.expenses.utilities}
                      onChange={(e) => updateFormData('expenses.utilities', parseFloat(e.target.value) || 0)}
                      placeholder="100"
                      className="mt-1"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
                <div className="flex items-start space-x-3">
                  <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-blue-900">Estimated ROI</p>
                    <p className="text-2xl font-bold text-blue-600 mt-1">{calculateROI()}%</p>
                    <p className="text-xs text-blue-700 mt-1">
                      Based on annual net income divided by current market value
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 6: Photos & Documents */}
          {currentStep === 6 && (
            <div className="space-y-6">
              <div>
                <Label htmlFor="images">Property Images</Label>
                <div className="mt-2 flex justify-center rounded-lg border border-dashed border-gray-900/25 px-6 py-10">
                  <div className="text-center">
                    <Upload className="mx-auto h-12 w-12 text-gray-300" aria-hidden="true" />
                    <div className="mt-4 flex text-sm leading-6 text-gray-600">
                      <label
                        htmlFor="images"
                        className="relative cursor-pointer rounded-md bg-white font-semibold text-blue-600 focus-within:outline-none focus-within:ring-2 focus-within:ring-blue-600 focus-within:ring-offset-2 hover:text-blue-500"
                      >
                        <span>Upload files</span>
                        <Input
                          id="images"
                          type="file"
                          multiple
                          accept="image/*"
                          className="sr-only"
                          onChange={(e) => {
                            if (e.target.files) {
                              setFormData(prev => ({
                                ...prev,
                                images: [...prev.images, ...Array.from(e.target.files || [])]
                              }));
                            }
                          }}
                        />
                      </label>
                      <p className="pl-1">or drag and drop</p>
                    </div>
                    <p className="text-xs leading-5 text-gray-600">PNG, JPG, GIF up to 10MB</p>
                  </div>
                </div>
                {formData.images.length > 0 && (
                   <div className="mt-4 space-y-2">
                     {formData.images.map((file, index) => (
                       <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                         <span className="text-sm truncate">{file.name}</span>
                         <Button
                           variant="ghost"
                           size="sm"
                           onClick={() => setFormData(prev => ({...prev, images: prev.images.filter((_, i) => i !== index)}))}
                         >
                           Remove
                         </Button>
                       </div>
                     ))}
                   </div>
                )}
              </div>
            </div>
          )}

          {/* Step 7: Review */}
          {currentStep === 7 && (
            <div className="space-y-6">
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold mb-3">Property Summary</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Type:</span>
                    <span className="ml-2 font-medium capitalize">{formData.propertySubType.replace('-', ' ')}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Listing Type:</span>
                    <span className="ml-2 font-medium capitalize">{formData.listingType === 'for_sale' ? 'For Sale' : 'Rental'}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Units:</span>
                    <span className="ml-2 font-medium">{formData.unitCount}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-gray-600">Address:</span>
                    <span className="ml-2 font-medium">
                      {formData.address.street}, {formData.address.city}, {formData.address.state} {formData.address.zipCode}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Bedrooms:</span>
                    <span className="ml-2 font-medium">{formData.bedrooms}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Bathrooms:</span>
                    <span className="ml-2 font-medium">{formData.bathrooms}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Square Feet:</span>
                    <span className="ml-2 font-medium">{formData.squareFootage.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Year Built:</span>
                    <span className="ml-2 font-medium">{formData.yearBuilt}</span>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold mb-3">Financial Summary</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Purchase Price:</span>
                    <span className="ml-2 font-medium">${formData.purchasePrice.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Current Value:</span>
                    <span className="ml-2 font-medium">${formData.currentValue.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Monthly Rent:</span>
                    <span className="ml-2 font-medium text-green-600">${formData.monthlyRent.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Monthly Expenses:</span>
                    <span className="ml-2 font-medium text-red-600">
                      ${Object.values(formData.expenses).reduce((sum, exp) => sum + exp, 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-gray-600">Estimated ROI:</span>
                    <span className="ml-2 font-bold text-blue-600">{calculateROI()}%</span>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold mb-3">Photos & Documents</h3>
                 <div className="text-sm">
                    <span className="text-gray-600">Images Uploaded:</span>
                    <span className="ml-2 font-medium">{formData.images.length}</span>
                 </div>
              </div>

              {formData.features.length > 0 && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold mb-3">Features</h3>
                  <div className="flex flex-wrap gap-2">
                    {formData.features.map((feature) => (
                      <Badge key={feature} variant="secondary">
                        {feature}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {formData.amenities.length > 0 && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold mb-3">Amenities</h3>
                  <div className="flex flex-wrap gap-2">
                    {formData.amenities.map((amenity) => (
                      <Badge key={amenity} variant="outline">
                        {amenity}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {formData.description && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold mb-3">Description</h3>
                  <p className="text-sm text-gray-700">{formData.description}</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation Buttons */}
      <div className="flex justify-between mt-6">
        <Button
          variant="outline"
          onClick={currentStep === 1 ? onCancel : handleBack}
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          {currentStep === 1 ? 'Cancel' : 'Back'}
        </Button>

        {currentStep < STEPS.length ? (
          <Button onClick={handleNext}>
            Next
            <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        ) : (
          <Button onClick={handleSubmit} className="bg-green-600 hover:bg-green-700">
            <CheckCircle className="h-4 w-4 mr-2" />
            Add Property
          </Button>
        )}
      </div>
    </div>
  );
}