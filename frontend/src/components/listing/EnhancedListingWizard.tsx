import React, { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { useListings } from '@/contexts/ListingContext';
import { 
  generateAIDescription, 
  uploadListingPhoto,
  getPricingRecommendation,
  generateSEOMetadata,
  generateListingQRCode
} from '@/lib/listingEnhancements';
import { checkDuplicateListing } from '@/lib/fingerprint';
import type { AIDescriptionRequest, ListingPhoto, PricingRecommendation } from '@/types/listing-enhanced';
import type { ListingFormData } from '@/types/listing';
import {
  Home,
  MapPin,
  DollarSign,
  Camera,
  Sparkles,
  Save,
  X,
  Upload,
  Loader2,
  TrendingUp,
  ChevronRight,
  ChevronLeft,
  Check,
  AlertTriangle,
  Eye,
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface EnhancedListingWizardProps {
  trigger?: React.ReactNode;
  onSuccess?: () => void;
}

export default function EnhancedListingWizard({ trigger, onSuccess }: EnhancedListingWizardProps) {
  const { addListing } = useListings();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [isUploadingPhotos, setIsUploadingPhotos] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isCheckingDuplicate, setIsCheckingDuplicate] = useState(false);
  const [duplicateError, setDuplicateError] = useState<string | null>(null);
  const [existingListingId, setExistingListingId] = useState<string | null>(null);

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
    clientType: 'seller'
  });

  const [photos, setPhotos] = useState<File[]>([]);
  const [uploadedPhotos, setUploadedPhotos] = useState<ListingPhoto[]>([]);
  const [pricingRec, setPricingRec] = useState<PricingRecommendation | null>(null);
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);

  const steps = [
    { id: 0, name: 'Basic Info', icon: Home, description: 'Property details' },
    { id: 1, name: 'Location', icon: MapPin, description: 'Address & area' },
    { id: 2, name: 'Photos', icon: Camera, description: 'Upload images' },
    { id: 3, name: 'Pricing', icon: DollarSign, description: 'Set price' },
    { id: 4, name: 'AI Enhance', icon: Sparkles, description: 'Generate content' },
  ];

  const availableFeatures = [
    'Hardwood Floors', 'Updated Kitchen', 'Granite Countertops', 'Stainless Steel Appliances',
    'Walk-in Closet', 'Master Suite', 'Fireplace', 'Deck', 'Patio', 'Pool',
    'Garage', 'Basement', 'High Ceilings', 'Open Floor Plan', 'Security System',
  ];

  const updateFormData = (field: keyof ListingFormData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const updateNestedFormData = (parent: keyof ListingFormData, field: string, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [parent]: { ...prev[parent], [field]: value }
    }));
    // Clear duplicate error when address changes
    if (parent === 'address') {
      setDuplicateError(null);
      setExistingListingId(null);
    }
  };

  const toggleFeature = (feature: string) => {
    setSelectedFeatures(prev =>
      prev.includes(feature) ? prev.filter(f => f !== feature) : [...prev, feature]
    );
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setPhotos(prev => [...prev, ...newFiles]);
    }
  };

  const handlePhotoUpload = async () => {
    if (photos.length === 0) return;

    setIsUploadingPhotos(true);
    setUploadProgress(0);

    try {
      const uploaded: ListingPhoto[] = [];
      for (let i = 0; i < photos.length; i++) {
        const photo = await uploadListingPhoto(
          'temp-listing-id', // Will be replaced with actual ID
          photos[i],
          i,
          i === 0 // First photo is featured
        );
        if (photo) {
          uploaded.push(photo);
        }
        setUploadProgress(((i + 1) / photos.length) * 100);
      }
      setUploadedPhotos(uploaded);
      
      toast({
        title: 'Photos uploaded!',
        description: `${uploaded.length} photos uploaded successfully.`,
      });
    } catch (error) {
      toast({
        title: 'Upload failed',
        description: 'Failed to upload some photos. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsUploadingPhotos(false);
    }
  };

  const handleGenerateAI = async () => {
    if (!formData.propertyType || !formData.bedrooms || !formData.price) {
      toast({
        title: 'Missing information',
        description: 'Please fill in property type, bedrooms, and price first.',
        variant: 'destructive',
      });
      return;
    }

    setIsGeneratingAI(true);

    try {
      const request: AIDescriptionRequest = {
        propertyType: formData.propertyType,
        bedrooms: formData.bedrooms || 0,
        bathrooms: formData.bathrooms || 0,
        squareFootage: formData.squareFootage,
        features: selectedFeatures,
        location: `${formData.address.city}, ${formData.address.state}`,
        price: formData.price,
        tone: 'professional',
        length: 'medium',
      };

      const result = await generateAIDescription(request);

      if (result) {
        setFormData(prev => ({
          ...prev,
          title: result.title,
          description: result.description,
          marketingRemarks: result.marketingRemarks,
        }));

        toast({
          title: 'AI content generated!',
          description: 'Your listing description has been created.',
        });
      }
    } catch (error) {
      toast({
        title: 'Generation failed',
        description: 'Failed to generate AI content. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const handleGetPricing = async () => {
    // Mock pricing recommendation for demo
    const mockRec: PricingRecommendation = {
      recommendedPrice: Math.round(formData.price * 1.05),
      priceRange: {
        min: Math.round(formData.price * 0.95),
        max: Math.round(formData.price * 1.15),
      },
      confidence: 0.82,
      comparables: [],
      marketTrends: [],
      reasoning: 'Based on recent sales in your area, this price is competitive.',
      lastUpdated: new Date(),
    };
    setPricingRec(mockRec);
  };

  const handleSubmit = async () => {
    if (!formData.title || !formData.address.street || !formData.price) {
      toast({
        title: 'Missing required fields',
        description: 'Please fill in all required fields.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const seoData = generateSEOMetadata(formData);
      const qrCode = generateListingQRCode('temp-id');

      const listingData: ListingFormData = {
        ...formData,
        features: selectedFeatures,
        // Add SEO and marketing data
        seoTitle: seoData.title,
        seoDescription: seoData.description,
        qrCode,
      };

      await addListing(listingData);

      toast({
        title: 'Success!',
        description: 'Your listing has been created successfully.',
      });

      setOpen(false);
      resetForm();
      onSuccess?.();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create listing. Please try again.',
        variant: 'destructive',
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
      clientType: 'seller'
    });
    setPhotos([]);
    setUploadedPhotos([]);
    setSelectedFeatures([]);
    setPricingRec(null);
    setCurrentStep(0);
    setDuplicateError(null);
    setExistingListingId(null);
  };

  const validateStep = async (step: number): Promise<boolean> => {
    // Step 0: Basic Info
    if (step === 0) {
      if (!formData.propertyType || !formData.clientType) {
        toast({
          title: 'Missing fields',
          description: 'Please select property and listing type.',
          variant: 'destructive',
        });
        return false;
      }
      return true;
    }

    // Step 1: Location (Check for duplicates)
    if (step === 1) {
      if (!formData.address.street || !formData.address.city || !formData.address.state || !formData.address.zipCode) {
        toast({
          title: 'Missing address',
          description: 'Please fill in the complete address.',
          variant: 'destructive',
        });
        return false;
      }

      setIsCheckingDuplicate(true);
      setDuplicateError(null);
      setExistingListingId(null);
      
      try {
        const duplicateCheck = await checkDuplicateListing({
          address: {
            street: formData.address.street,
            city: formData.address.city,
            state: formData.address.state,
            zipCode: formData.address.zipCode,
            unit: formData.address.unit
          },
          squareFootage: formData.squareFootage,
          lotSize: formData.lotSize
        });

        if (duplicateCheck.isDuplicate) {
          setDuplicateError('This property is already listed in the system.');
          setExistingListingId(duplicateCheck.existingId || null);
          setIsCheckingDuplicate(false);
          return false;
        }
      } catch (error) {
        console.error('Duplicate check failed:', error);
        // We allow proceeding if check fails, but log it
      } finally {
        setIsCheckingDuplicate(false);
      }
      
      return true;
    }

    // Step 3: Pricing
    if (step === 3) {
      if (!formData.price || formData.price <= 0) {
        toast({
          title: 'Invalid price',
          description: 'Please enter a valid listing price.',
          variant: 'destructive',
        });
        return false;
      }
      return true;
    }

    return true;
  };

  const nextStep = async () => {
    const isValid = await validateStep(currentStep);
    if (isValid && currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const progress = ((currentStep + 1) / steps.length) * 100;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
            <Home className="h-4 w-4 mr-2" />
            Create Smart Listing
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center text-2xl">
            <Sparkles className="h-6 w-6 mr-2 text-purple-600" />
            Smart Listing Wizard
          </DialogTitle>
        </DialogHeader>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            {steps.map((step) => (
              <div
                key={step.id}
                className={`flex items-center ${
                  step.id === currentStep
                    ? 'text-blue-600 font-semibold'
                    : step.id < currentStep
                    ? 'text-green-600'
                    : 'text-gray-400'
                }`}
              >
                {step.id < currentStep ? (
                  <Check className="h-4 w-4 mr-1" />
                ) : (
                  <step.icon className="h-4 w-4 mr-1" />
                )}
                <span className="hidden sm:inline">{step.name}</span>
              </div>
            ))}
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Step Content */}
        <div className="mt-6 min-h-[400px]">
          {/* Step 0: Basic Info */}
          {currentStep === 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Home className="h-5 w-5 mr-2" />
                  Basic Property Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
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
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="clientType">Listing Type *</Label>
                    <Select 
                      value={formData.clientType} 
                      onValueChange={(value) => updateFormData('clientType', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="seller">For Sale</SelectItem>
                        <SelectItem value="landlord">For Rent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <Label htmlFor="bedrooms">Bedrooms *</Label>
                    <Input
                      id="bedrooms"
                      type="number"
                      value={formData.bedrooms || ''}
                      onChange={(e) => updateFormData('bedrooms', parseInt(e.target.value) || 0)}
                      placeholder="3"
                    />
                  </div>
                  <div>
                    <Label htmlFor="bathrooms">Bathrooms *</Label>
                    <Input
                      id="bathrooms"
                      type="number"
                      value={formData.bathrooms || ''}
                      onChange={(e) => updateFormData('bathrooms', parseInt(e.target.value) || 0)}
                      placeholder="2"
                    />
                  </div>
                  <div>
                    <Label htmlFor="squareFootage">Sq Ft</Label>
                    <Input
                      id="squareFootage"
                      type="number"
                      value={formData.squareFootage || ''}
                      onChange={(e) => updateFormData('squareFootage', parseInt(e.target.value) || 0)}
                      placeholder="1500"
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

                <div>
                  <Label className="mb-3 block">Key Features</Label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {availableFeatures.map((feature) => (
                      <Badge
                        key={feature}
                        variant={selectedFeatures.includes(feature) ? 'default' : 'outline'}
                        className="cursor-pointer justify-center py-2"
                        onClick={() => toggleFeature(feature)}
                      >
                        {feature}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 1: Location */}
          {currentStep === 1 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <MapPin className="h-5 w-5 mr-2" />
                  Property Location
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {duplicateError && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Duplicate Listing Detected</AlertTitle>
                    <AlertDescription className="flex flex-col gap-3 mt-2">
                      <p>{duplicateError} Please check if this property is already listed or modify the details.</p>
                      {existingListingId && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="w-fit bg-white hover:bg-gray-50 text-red-600 border-red-200"
                          onClick={() => window.open(`/listings/${existingListingId}`, '_blank')}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View Existing Listing
                        </Button>
                      )}
                    </AlertDescription>
                  </Alert>
                )}
                
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
          )}

          {/* Step 2: Photos */}
          {currentStep === 2 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Camera className="h-5 w-5 mr-2" />
                  Property Photos
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                  <Upload className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <p className="text-sm text-gray-600 mb-4">
                    Drag and drop photos here, or click to select files
                  </p>
                  <Input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handlePhotoSelect}
                    className="hidden"
                    id="photo-upload"
                  />
                  <Label htmlFor="photo-upload">
                    <Button variant="outline" asChild>
                      <span>Select Photos</span>
                    </Button>
                  </Label>
                </div>

                {photos.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-2">{photos.length} photos selected</p>
                    <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
                      {photos.map((photo, index) => (
                        <div key={index} className="relative aspect-square bg-gray-100 rounded">
                          <img
                            src={URL.createObjectURL(photo)}
                            alt={`Preview ${index + 1}`}
                            className="w-full h-full object-cover rounded"
                          />
                          {index === 0 && (
                            <Badge className="absolute top-1 left-1 text-xs">Featured</Badge>
                          )}
                        </div>
                      ))}
                    </div>
                    {!isUploadingPhotos && (
                      <Button onClick={handlePhotoUpload} className="w-full mt-4">
                        <Upload className="h-4 w-4 mr-2" />
                        Upload Photos
                      </Button>
                    )}
                    {isUploadingPhotos && (
                      <div className="mt-4">
                        <Progress value={uploadProgress} />
                        <p className="text-sm text-center mt-2">Uploading... {Math.round(uploadProgress)}%</p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Step 3: Pricing */}
          {currentStep === 3 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <DollarSign className="h-5 w-5 mr-2" />
                  Pricing Strategy
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="price">Listing Price *</Label>
                  <Input
                    id="price"
                    type="number"
                    value={formData.price || ''}
                    onChange={(e) => updateFormData('price', parseInt(e.target.value) || 0)}
                    placeholder="450000"
                  />
                </div>

                <Button onClick={handleGetPricing} variant="outline" className="w-full">
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Get AI Pricing Recommendation
                </Button>

                {pricingRec && (
                  <div className="bg-blue-50 p-4 rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">Recommended Price:</span>
                      <span className="text-2xl font-bold text-blue-600">
                        ${pricingRec.recommendedPrice.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span>Price Range:</span>
                      <span>
                        ${pricingRec.priceRange.min.toLocaleString()} - {pricingRec.priceRange.max.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span>Confidence:</span>
                      <Badge variant="outline">{Math.round(pricingRec.confidence * 100)}%</Badge>
                    </div>
                    <p className="text-sm text-gray-600">{pricingRec.reasoning}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Step 4: AI Enhancement */}
          {currentStep === 4 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Sparkles className="h-5 w-5 mr-2 text-purple-600" />
                  AI-Powered Content Generation
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button 
                  onClick={handleGenerateAI} 
                  disabled={isGeneratingAI}
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                >
                  {isGeneratingAI ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Generate AI Description
                    </>
                  )}
                </Button>

                <div>
                  <Label htmlFor="title">Property Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => updateFormData('title', e.target.value)}
                    placeholder="Stunning Waterfront Colonial"
                  />
                </div>

                <div>
                  <Label htmlFor="description">Property Description *</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => updateFormData('description', e.target.value)}
                    placeholder="Describe the property's key features..."
                    rows={6}
                  />
                </div>

                <div>
                  <Label htmlFor="marketingRemarks">Marketing Remarks</Label>
                  <Textarea
                    id="marketingRemarks"
                    value={formData.marketingRemarks || ''}
                    onChange={(e) => updateFormData('marketingRemarks', e.target.value)}
                    placeholder="Brief marketing highlights..."
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Navigation */}
        <div className="flex justify-between items-center pt-6 border-t">
          <Button
            variant="outline"
            onClick={prevStep}
            disabled={currentStep === 0}
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Previous
          </Button>

          <div className="flex space-x-2">
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

            {currentStep < steps.length - 1 ? (
              <Button 
                onClick={nextStep}
                disabled={isCheckingDuplicate}
              >
                {isCheckingDuplicate ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Checking...
                  </>
                ) : (
                  <>
                    Next
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </>
                )}
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting || !formData.title || !formData.address.street || !formData.price}
                className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Create Listing
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}