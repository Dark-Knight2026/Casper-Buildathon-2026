import { useState, useEffect, useRef } from 'react';
import {
  useParams,
  useNavigate,
  useLocation,
  Navigate,
  Link,
} from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

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
  Car,
  Loader2,
  Lock,
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button, buttonVariants } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useAuthPrompt } from '@/hooks/useAuthPrompt';
import { useAuth } from '@/hooks/useAuth';
import { getSearchRoute } from '@/types/user';
import { SavePropertyButton } from '@/components/property/SavePropertyButton';
import { ContactLandlordModal } from '@/components/property/ContactLandlordModal';
import { ScheduleViewingModal } from '@/components/property/ScheduleViewingModal';
import { VerificationDisclaimer } from '@/components/property/VerificationDisclaimer';
import { PropertyGallery } from '@/components/property/PropertyGallery';
import { TrustBadges } from '@/components/property/TrustBadges';
import { AuthPromptModal } from '@/components/auth/AuthPromptModal';
import { getListing, recordListingView } from '@/services/listingService';
import {
  listingRentMonthly,
  approvedMedia,
  formatPropertyType,
  derivePetsAllowed,
  formatFullAddress,
} from '@/lib/listingDisplay';
import { logger } from '@/utils/logger';
import type { Listing, RentLtrTerms } from '@/types/listingContract';

const APPLICATION_FEE = 50;

// Returns a formatted date or `null` when the input cannot be parsed —
// callers render a fallback ("—") instead of letting `format()` throw
// `RangeError: Invalid time value` and unmount the whole page. A listing's
// `availableDate` is nullable, so this is reachable in practice.
function formatDateSafe(
  value: string | null | undefined,
  fmt: string
): string | null {
  if (value === null || value === undefined) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : format(d, fmt);
}

export default function PropertyDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const {
    requireAuth,
    isAuthenticated,
    isPromptOpen,
    promptContext,
    closePrompt,
    goToSignUp,
    goToLogin,
  } = useAuthPrompt();
  const { profile } = useAuth();
  // Role-aware back path — see getSearchRoute() for the mapping. Pass
  // undefined for guests so the helper returns the public search.
  const backToSearchPath = getSearchRoute(
    isAuthenticated ? profile?.role : undefined
  );

  // Search passes the already-loaded listing in router state for an instant
  // render; direct URL access (refresh, bookmark, shared link) falls back to
  // fetching by id.
  const stateListing =
    (location.state?.listing as Listing | undefined) ?? undefined;
  const {
    data: listing,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['listing', id],
    queryFn: () => getListing(id as string),
    enabled: !!id,
    initialData:
      stateListing && stateListing.id === id ? stateListing : undefined,
  });

  const [showContactModal, setShowContactModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);

  // Record a unique registered-tenant view once per listing. The query object
  // changes identity on every refetch, so gate on the id (via a ref) to avoid
  // re-POSTing on each response. Tenant-only and skipped for guests.
  const viewedIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (listing && isAuthenticated && viewedIdRef.current !== listing.id) {
      viewedIdRef.current = listing.id;
      recordListingView(listing.id).catch((error) => {
        logger.error('Failed to record listing view:', error);
      });
    }
  }, [listing, isAuthenticated]);

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
    if (canProceed && listing) {
      navigate('/tenant/application', {
        state: { listingId: listing.id, landlordId: listing.listedBy },
      });
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: listing?.title,
        text: `Check out this property: ${listing?.title}`,
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

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (isError || !listing) {
    return <Navigate to="/listings" replace />;
  }

  // Derive display values from the Property + Listing split.
  const asset = listing.property;
  const terms =
    listing.intent === 'rent_ltr' ? (listing.terms as RentLtrTerms) : null;
  const rent = listingRentMonthly(listing);
  const securityDeposit = terms?.securityDeposit ?? 0;
  const furnished = terms?.furnished ?? false;
  const leaseTermsOffered = terms?.leaseTermsOffered ?? [];
  const images = approvedMedia(listing.media).map((m) => m.url);
  const parkingFeatures = asset?.parkingFeatures ?? [];
  const parkingAvailable = parkingFeatures.length > 0;
  const petsAllowed = derivePetsAllowed(listing);
  const fullAddress = formatFullAddress(asset);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <Button variant="ghost" onClick={() => navigate(backToSearchPath)}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Search
            </Button>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleShare}
                aria-label="Share property"
              >
                <Share2 className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Share</span>
              </Button>
              <SavePropertyButton
                variant="outline"
                size="sm"
                hideTextOnMobile
              />
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardContent className="p-0">
                <PropertyGallery
                  images={images}
                  title={listing.title}
                  overlay={
                    asset && (
                      <Badge className="absolute top-4 right-4 bg-white text-gray-900">
                        {formatPropertyType(asset.propertyType)}
                      </Badge>
                    )
                  }
                />
              </CardContent>
            </Card>

            {/* Property Info */}
            <Card>
              <CardHeader>
                <div className="flex flex-col md:flex-row justify-between items-start gap-3">
                  <div className="min-w-0">
                    <CardTitle className="text-xl sm:text-2xl mb-2">
                      {listing.title}
                    </CardTitle>
                    <p className="text-gray-600 flex items-center text-sm sm:text-base">
                      <MapPin className="h-4 w-4 mr-1 shrink-0" />
                      <span className=" sm:whitespace-normal">
                        {fullAddress}
                      </span>
                    </p>
                    <TrustBadges
                      verifiedLister={listing.provenance.verifiedListerBadge}
                      onChain={listing.onChain?.provenanceOnChain}
                      className="mt-2"
                    />
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-2xl sm:text-3xl font-bold text-primary whitespace-nowrap">
                      {formatCurrency(rent)}
                      <span className="text-sm text-gray-500 font-normal">
                        /mo
                      </span>
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
                      <p className="font-semibold">
                        {asset?.bedroomsTotal ?? '—'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Bath className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">Bathrooms</p>
                      <p className="font-semibold">
                        {asset?.bathroomsTotal ?? '—'}
                      </p>
                    </div>
                  </div>
                  {asset?.livingArea != null && (
                    <div className="flex items-center gap-2">
                      <Maximize2 className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-500">Square Feet</p>
                        <p className="font-semibold">
                          {asset.livingArea.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">Available</p>
                      <p className="font-semibold">
                        {formatDateSafe(listing.availableDate, 'MMM d') ?? '—'}
                      </p>
                    </div>
                  </div>
                </div>

                {listing.description && (
                  <div className="mb-6">
                    <h3 className="font-semibold mb-2">Description</h3>
                    <p className="text-gray-700 whitespace-pre-line">
                      {listing.description}
                    </p>
                  </div>
                )}

                {/* Task 10 — Verification Disclaimer */}
                <VerificationDisclaimer
                  latitude={asset?.latitude ?? null}
                  longitude={asset?.longitude ?? null}
                  address={fullAddress}
                  className="mb-4"
                />

                <Tabs defaultValue="amenities" className="w-full">
                  <TabsList
                    className={`grid w-full ${isAuthenticated ? 'grid-cols-3' : 'grid-cols-2'}`}
                  >
                    <TabsTrigger value="amenities">Amenities</TabsTrigger>
                    <TabsTrigger value="policies">Policies</TabsTrigger>
                    {isAuthenticated && (
                      <TabsTrigger value="lease">Lease Terms</TabsTrigger>
                    )}
                  </TabsList>

                  <TabsContent value="amenities" className="space-y-4">
                    {listing.amenities && listing.amenities.length > 0 ? (
                      <div className="grid grid-cols-2 gap-3">
                        {listing.amenities.map((amenity, index) => (
                          <div key={index} className="flex items-center gap-2">
                            <Check className="h-4 w-4 text-green-600" />
                            <span className="text-sm">{amenity}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-sm">
                        No amenities listed
                      </p>
                    )}
                  </TabsContent>

                  <TabsContent value="policies" className="space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Pets</span>
                        <div className="flex items-center gap-2">
                          {petsAllowed ? (
                            <Check className="h-4 w-4 text-green-600" />
                          ) : (
                            <X className="h-4 w-4 text-red-600" />
                          )}
                          <span className="text-sm">
                            {listing.petPolicy ?? '—'}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Furnished</span>
                        <div className="flex items-center gap-2">
                          {furnished ? (
                            <Check className="h-4 w-4 text-green-600" />
                          ) : (
                            <X className="h-4 w-4 text-red-600" />
                          )}
                          <span className="text-sm">
                            {furnished ? 'Yes' : 'No'}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Parking</span>
                        <div className="flex items-center gap-2">
                          {parkingAvailable ? (
                            <>
                              <Car className="h-4 w-4 text-green-600" />
                              <span className="text-sm">
                                {parkingFeatures.join(', ')}
                              </span>
                            </>
                          ) : (
                            <>
                              <X className="h-4 w-4 text-red-600" />
                              <span className="text-sm">Not Available</span>
                            </>
                          )}
                        </div>
                      </div>
                      {listing.utilitiesIncluded &&
                        listing.utilitiesIncluded.length > 0 && (
                          <div>
                            <span className="text-sm font-medium block mb-2">
                              Utilities Included
                            </span>
                            <div className="flex flex-wrap gap-2">
                              {listing.utilitiesIncluded.map(
                                (utility, index) => (
                                  <Badge key={index} variant="secondary">
                                    {utility}
                                  </Badge>
                                )
                              )}
                            </div>
                          </div>
                        )}
                    </div>
                  </TabsContent>

                  {isAuthenticated && (
                    <TabsContent value="lease" className="space-y-4">
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-sm font-medium">
                            Security Deposit
                          </span>
                          <span className="text-sm">
                            {formatCurrency(securityDeposit)}
                          </span>
                        </div>
                        {leaseTermsOffered.length > 0 && (
                          <div>
                            <span className="text-sm font-medium block mb-2">
                              Available Lease Terms
                            </span>
                            <div className="flex flex-wrap gap-2">
                              {leaseTermsOffered.map((term, index) => (
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

                  {/* Favorite Button */}
                  <SavePropertyButton
                    variant="outline"
                    size="default"
                    className="w-full"
                  />
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
                      <span className="font-semibold">
                        {formatCurrency(rent)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Security Deposit</span>
                      <span className="font-semibold">
                        {formatCurrency(securityDeposit)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Application Fee</span>
                      <span className="font-semibold">
                        {formatCurrency(APPLICATION_FEE)}
                      </span>
                    </div>
                    <div className="border-t pt-2 flex justify-between">
                      <span className="font-semibold">Total Move-in Cost</span>
                      <span className="font-bold text-lg">
                        {formatCurrency(
                          rent + securityDeposit + APPLICATION_FEE
                        )}
                      </span>
                    </div>
                  </div>

                  <Button onClick={handleApply} className="w-full" size="lg">
                    Apply Now
                  </Button>

                  <p className="text-xs text-center text-gray-500">
                    Available{' '}
                    {formatDateSafe(listing.availableDate, 'MMMM d, yyyy') ??
                      'TBD'}
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
                    Sign in to see the full cost breakdown (rent, deposit,
                    application fee), available lease terms, and apply for this
                    property.
                  </p>
                  <div className="space-y-2">
                    <Link
                      to="/auth/register"
                      className={buttonVariants({
                        size: 'lg',
                        className: 'w-full',
                      })}
                    >
                      Create account
                    </Link>
                    <Link
                      to="/auth/login"
                      className={buttonVariants({
                        variant: 'outline',
                        size: 'lg',
                        className: 'w-full',
                      })}
                    >
                      Sign in
                    </Link>
                  </div>
                  <p className="text-xs text-center text-gray-500">
                    Available{' '}
                    {formatDateSafe(listing.availableDate, 'MMMM d, yyyy') ??
                      'TBD'}
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

      {/* Modals — propertyId here carries the listing id as a bridge; the
          contact/viewing services are rekeyed onto listingId in the downstream
          favorites/applications/viewings task. */}
      <ContactLandlordModal
        open={showContactModal}
        onClose={() => setShowContactModal(false)}
        propertyId={listing.id}
        landlordName="Property Owner"
      />

      <ScheduleViewingModal
        open={showScheduleModal}
        onClose={() => setShowScheduleModal(false)}
        propertyId={listing.id}
        propertyAddress={fullAddress}
        landlordId={listing.listedBy}
      />

      {/* Guest auth prompt — opens whenever requireAuth() is called by a
          guest. Without this mount the modal state on useAuthPrompt would
          go nowhere and the action buttons would appear unresponsive. */}
      <AuthPromptModal
        isOpen={isPromptOpen}
        onClose={closePrompt}
        onSignUp={goToSignUp}
        onLogin={goToLogin}
        action={promptContext?.action}
      />
    </div>
  );
}
