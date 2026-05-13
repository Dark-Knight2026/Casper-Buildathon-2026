import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation, Navigate, Link } from 'react-router-dom';

import { format } from 'date-fns';
import {
  ArrowLeft,
  Bed,
  Bath,
  Maximize2,
  MapPin,
  Calendar,
  Share2,
  Phone,
  Mail,
  Check,
  X,
  Home,
  Car,
  Loader2,
  FileText,
  Lock,
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button, buttonVariants } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useAuthPrompt } from '@/hooks/useAuthPrompt';
import { SavePropertyButton } from '@/components/property/SavePropertyButton';
import { ContactLandlordModal } from '@/components/property/ContactLandlordModal';
import { ScheduleViewingModal } from '@/components/property/ScheduleViewingModal';
import { VerificationDisclaimer } from '@/components/property/VerificationDisclaimer';
import { propertyService } from '@/services/propertyService';
import { FEATURED_PROPERTIES } from '@/data/featuredProperties';
import { cn } from '@/lib/utils';
import { logger } from '@/utils/logger';
import type { Property } from '@/types/property';

const APPLICATION_FEE = 50;

// Returns a formatted date or `null` when the input cannot be parsed —
// callers render a fallback ("—") instead of letting `format()` throw
// `RangeError: Invalid time value` and unmount the whole page. Backend
// `properties.available_date` is nullable, so this is reachable in practice.
function formatDateSafe(value: Date | string | null | undefined, fmt: string): string | null {
  if (value === null || value === undefined) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : format(d, fmt);
}

export default function PropertyDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { requireAuth, isAuthenticated } = useAuthPrompt();

  const stateProperty = (location.state?.property as Property) ?? null;
  // Hydrate from FEATURED_PROPERTIES on direct URL access (refresh, bookmark,
  // shared link) so demo IDs `prop-1`...`prop-6` work without router state.
  // Active in production too — backend endpoints for property fetch don't
  // exist yet, so without this fallback direct URLs render `$NaN/mo` and a
  // mapless disclaimer. Once /api/v1/properties/:id ships, drop this.
  const demoFallback = !stateProperty && id
    ? FEATURED_PROPERTIES.find(p => p.id === id) ?? null
    : null;
  const initialProperty = stateProperty ?? demoFallback;
  const [property, setProperty] = useState<Property | null>(initialProperty);
  const [loading, setLoading] = useState(!initialProperty);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showContactModal, setShowContactModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);

  const loadProperty = useCallback(async () => {
    if (!id || initialProperty) return; // skip if data already hydrated (state or demo fallback)

    setLoading(true);
    try {
      const data = await propertyService.getPropertyById(id);
      if (data) {
        setProperty(data);
        await propertyService.incrementPropertyViews(id);
      } else {
        toast({
          title: 'Error',
          description: 'Property not found',
          variant: 'destructive',
        });
        navigate('/tenant/properties');
      }
    } catch (error) {
      logger.error('Error loading property:', error);
      toast({
        title: 'Error',
        description: 'Failed to load property details',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [id, navigate, toast, initialProperty]);

  useEffect(() => {
    loadProperty();
  }, [loadProperty]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const handleContactLandlord = () => {
    const canProceed = requireAuth({
      action: 'contact the landlord',
      redirectPath: window.location.pathname,
    });
    if (canProceed) {
      setShowContactModal(true);
    }
  };

  const handleScheduleViewing = () => {
    const canProceed = requireAuth({
      action: 'schedule a property viewing',
      redirectPath: window.location.pathname,
    });
    if (canProceed) {
      setShowScheduleModal(true);
    }
  };

  const handleApply = () => {
    const canProceed = requireAuth({
      action: 'submit your rental application',
      redirectPath: window.location.pathname,
    });
    if (canProceed && property) {
      navigate('/tenant/application', { state: { propertyId: property.id } });
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: property?.title,
        text: `Check out this property: ${property?.title}`,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast({
        title: 'Link Copied',
        description: 'Property link copied to clipboard',
      });
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!property) {
    return <Navigate to="/listings" replace />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <Button
              variant="ghost"
              onClick={() => navigate('/tenant/properties')}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Search
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleShare}>
                <Share2 className="mr-2 h-4 w-4" />
                Share
              </Button>
              <SavePropertyButton variant="outline" size="sm" />
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardContent className="p-0">
                <div className="relative">
                  {property.images && property.images.length > 0 ? (
                    <>
                      <img
                        src={property.images[currentImageIndex]}
                        alt={property.title}
                        className="w-full h-96 object-cover"
                      />
                      {property.images.length > 1 && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            aria-label="Previous image"
                            className="absolute left-4 top-1/2 transform -translate-y-1/2"
                            onClick={() => setCurrentImageIndex(Math.max(0, currentImageIndex - 1))}
                            disabled={currentImageIndex === 0}
                          >
                            ‹
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            aria-label="Next image"
                            className="absolute right-4 top-1/2 transform -translate-y-1/2"
                            onClick={() => setCurrentImageIndex(Math.min(property.images.length - 1, currentImageIndex + 1))}
                            disabled={currentImageIndex === property.images.length - 1}
                          >
                            ›
                          </Button>
                          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2">
                            {property.images.map((_, index) => (
                              <button
                                key={index}
                                aria-label={`Go to image ${index + 1}`}
                                aria-current={index === currentImageIndex ? 'true' : undefined}
                                className={cn(
                                  'w-2 h-2 rounded-full',
                                  index === currentImageIndex ? 'bg-white' : 'bg-white/50'
                                )}
                                onClick={() => setCurrentImageIndex(index)}
                              />
                            ))}
                          </div>
                        </>
                      )}
                    </>
                  ) : (
                    <div className="w-full h-96 bg-gray-200 flex items-center justify-center">
                      <Home className="h-24 w-24 text-gray-400" />
                    </div>
                  )}
                  <Badge className="absolute top-4 right-4 bg-white text-gray-900">
                    {property.propertyType}
                  </Badge>
                </div>

                {/* Thumbnail Strip */}
                {property.images && property.images.length > 1 && (
                  <div className="flex gap-2 p-4 overflow-x-auto">
                    {property.images.map((image, index) => (
                      <button
                        key={index}
                        onClick={() => setCurrentImageIndex(index)}
                        className={cn(
                          'shrink-0 w-20 h-20 rounded overflow-hidden border-2',
                          index === currentImageIndex ? 'border-primary' : 'border-transparent'
                        )}
                      >
                        <img
                          src={image}
                          alt={`${property.title} ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Property Info */}
            <Card>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-2xl mb-2">{property.title}</CardTitle>
                    <p className="text-gray-600 flex items-center">
                      <MapPin className="h-4 w-4 mr-1" />
                      {property.address}, {property.city}, {property.state} {property.zipCode}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-bold text-primary">
                      {formatCurrency(property.rent)}
                      <span className="text-sm text-gray-500 font-normal">/mo</span>
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="flex items-center gap-2">
                    <Bed className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">Bedrooms</p>
                      <p className="font-semibold">{property.bedrooms}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Bath className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">Bathrooms</p>
                      <p className="font-semibold">{property.bathrooms}</p>
                    </div>
                  </div>
                  {property.squareFeet && (
                    <div className="flex items-center gap-2">
                      <Maximize2 className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-500">Square Feet</p>
                        <p className="font-semibold">{property.squareFeet.toLocaleString()}</p>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">Available</p>
                      <p className="font-semibold">
                        {formatDateSafe(property.availableDate, 'MMM d') ?? '—'}
                      </p>
                    </div>
                  </div>
                </div>

                {property.description && (
                  <div className="mb-6">
                    <h3 className="font-semibold mb-2">Description</h3>
                    <p className="text-gray-700 whitespace-pre-line">{property.description}</p>
                  </div>
                )}

                {/* Task 10 — Verification Disclaimer */}
                <VerificationDisclaimer
                  latitude={property.latitude}
                  longitude={property.longitude}
                  address={`${property.address}, ${property.city}, ${property.state} ${property.zipCode}`}
                  className="mb-4"
                />

                <Tabs defaultValue="amenities" className="w-full">
                  <TabsList className={`grid w-full ${isAuthenticated ? 'grid-cols-3' : 'grid-cols-2'}`}>
                    <TabsTrigger value="amenities">Amenities</TabsTrigger>
                    <TabsTrigger value="policies">Policies</TabsTrigger>
                    {isAuthenticated && <TabsTrigger value="lease">Lease Terms</TabsTrigger>}
                  </TabsList>
                  
                  <TabsContent value="amenities" className="space-y-4">
                    {property.amenities && property.amenities.length > 0 ? (
                      <div className="grid grid-cols-2 gap-3">
                        {property.amenities.map((amenity, index) => (
                          <div key={index} className="flex items-center gap-2">
                            <Check className="h-4 w-4 text-green-600" />
                            <span className="text-sm">{amenity}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-sm">No amenities listed</p>
                    )}
                  </TabsContent>

                  <TabsContent value="policies" className="space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Pets</span>
                        <div className="flex items-center gap-2">
                          {property.petsAllowed ? (
                            <Check className="h-4 w-4 text-green-600" />
                          ) : (
                            <X className="h-4 w-4 text-red-600" />
                          )}
                          <span className="text-sm">{property.petPolicy}</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Furnished</span>
                        <div className="flex items-center gap-2">
                          {property.furnished ? (
                            <Check className="h-4 w-4 text-green-600" />
                          ) : (
                            <X className="h-4 w-4 text-red-600" />
                          )}
                          <span className="text-sm">{property.furnished ? 'Yes' : 'No'}</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Parking</span>
                        <div className="flex items-center gap-2">
                          {property.parkingAvailable ? (
                            <>
                              <Car className="h-4 w-4 text-green-600" />
                              <span className="text-sm">Available</span>
                            </>
                          ) : (
                            <>
                              <X className="h-4 w-4 text-red-600" />
                              <span className="text-sm">Not Available</span>
                            </>
                          )}
                        </div>
                      </div>
                      {property.utilitiesIncluded && property.utilitiesIncluded.length > 0 && (
                        <div>
                          <span className="text-sm font-medium block mb-2">Utilities Included</span>
                          <div className="flex flex-wrap gap-2">
                            {property.utilitiesIncluded.map((utility, index) => (
                              <Badge key={index} variant="secondary">
                                {utility}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  {isAuthenticated && (
                    <TabsContent value="lease" className="space-y-4">
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-sm font-medium">Security Deposit</span>
                          <span className="text-sm">{formatCurrency(property.securityDeposit)}</span>
                        </div>
                        {property.leaseTerms && property.leaseTerms.length > 0 && (
                          <div>
                            <span className="text-sm font-medium block mb-2">Available Lease Terms</span>
                            <div className="flex flex-wrap gap-2">
                              {property.leaseTerms.map((term, index) => (
                                <Badge key={index} variant="outline">
                                  {term}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </TabsContent>
                  )}
                </Tabs>
              </CardContent>
            </Card>

            {/* Action Buttons Section */}
            <Card>
              <CardHeader>
                <CardTitle>Interested in this property?</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Contact Landlord Button */}
                  <Button
                    onClick={handleContactLandlord}
                    variant="outline"
                    className="w-full"
                  >
                    <Mail className="mr-2 h-5 w-5" />
                    Contact Landlord
                  </Button>

                  {/* Schedule Viewing Button */}
                  <Button
                    onClick={handleScheduleViewing}
                    variant="outline"
                    className="w-full"
                  >
                    <Calendar className="mr-2 h-5 w-5" />
                    Schedule Viewing
                  </Button>

                  {/* Apply Now Button */}
                  <Button
                    onClick={handleApply}
                    className="w-full"
                  >
                    <FileText className="mr-2 h-5 w-5" />
                    Apply Now
                  </Button>
                </div>

                {/* Favorite Button */}
                <div className="flex justify-center pt-2">
                  <SavePropertyButton variant="outline" size="default" className="w-full md:w-auto" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Move-in Costs — gated. Guests see a sign-in prompt instead of
                a pricing breakdown they can't act on (Apply is auth-gated). */}
            {isAuthenticated ? (
              <Card className="sticky top-24">
                <CardHeader>
                  <CardTitle>Move-in Costs</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Monthly Rent</span>
                      <span className="font-semibold">{formatCurrency(property.rent)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Security Deposit</span>
                      <span className="font-semibold">{formatCurrency(property.securityDeposit)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Application Fee</span>
                      <span className="font-semibold">{formatCurrency(APPLICATION_FEE)}</span>
                    </div>
                    <div className="border-t pt-2 flex justify-between">
                      <span className="font-semibold">Total Move-in Cost</span>
                      <span className="font-bold text-lg">
                        {formatCurrency(property.rent + property.securityDeposit + APPLICATION_FEE)}
                      </span>
                    </div>
                  </div>

                  <Button onClick={handleApply} className="w-full" size="lg">
                    Apply Now
                  </Button>

                  <p className="text-xs text-center text-gray-500">
                    Available {formatDateSafe(property.availableDate, 'MMMM d, yyyy') ?? 'TBD'}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <Card className="sticky top-24">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Lock className="h-5 w-5 text-muted-foreground" />
                    Pricing &amp; Lease Terms
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Sign in to see the full cost breakdown (rent, deposit, application fee),
                    available lease terms, and apply for this property.
                  </p>
                  <div className="space-y-2">
                    <Link
                      to="/auth/register"
                      className={buttonVariants({ size: 'lg', className: 'w-full' })}
                    >
                      Create account
                    </Link>
                    <Link
                      to="/auth/login"
                      className={buttonVariants({ variant: 'outline', size: 'lg', className: 'w-full' })}
                    >
                      Sign in
                    </Link>
                  </div>
                  <p className="text-xs text-center text-gray-500">
                    Available {formatDateSafe(property.availableDate, 'MMMM d, yyyy') ?? 'TBD'}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Contact Card */}
            <Card>
              <CardHeader>
                <CardTitle>Questions?</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={handleContactLandlord}
                >
                  <Phone className="mr-2 h-4 w-4" />
                  Call Property Manager
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={handleContactLandlord}
                >
                  <Mail className="mr-2 h-4 w-4" />
                  Send Message
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Modals */}
      <ContactLandlordModal
        open={showContactModal}
        onClose={() => setShowContactModal(false)}
        propertyId={property.id}
        landlordName="Property Owner"
      />

      <ScheduleViewingModal
        open={showScheduleModal}
        onClose={() => setShowScheduleModal(false)}
        propertyId={property.id}
        propertyAddress={`${property.address}, ${property.city}, ${property.state}`}
      />
    </div>
  );
}