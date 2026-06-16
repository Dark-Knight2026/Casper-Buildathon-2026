/**
 * Property Detail Page (landlord)
 * Shows one of the landlord's own listings with its nested property,
 * statistics, and historical-data counts.
 */

import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  Edit,
  Trash2,
  Home,
  MapPin,
  DollarSign,
  Eye,
  FileText,
  Calendar,
  Percent,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { TrustBadges } from '@/components/property/TrustBadges';
import { ListingLifecycle } from '@/components/listing/ListingLifecycle';
import { AuthorityGate } from '@/components/listing/AuthorityGate';
import { FairHousingScreen } from '@/components/listing/FairHousingScreen';
import {
  getListing,
  getListingStatistics,
  getListingHistoricalData,
} from '@/services/listingService';
import {
  listingRentMonthly,
  formatPropertyType,
  derivePetsAllowed,
  formatFullAddress,
  LISTING_STATE_BADGE,
} from '@/lib/listingDisplay';
import type { RentLtrTerms } from '@/types/listingContract';

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);

const formatDate = (value: string | null) => {
  if (!value) return 'TBD';
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? 'TBD'
    : new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }).format(d);
};

export default function PropertyDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const {
    data: listing,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['listing', id],
    queryFn: () => getListing(id as string),
    enabled: !!id,
  });

  const { data: statistics } = useQuery({
    queryKey: ['listing-statistics', id],
    queryFn: () => getListingStatistics(id as string),
    enabled: !!id,
  });

  const { data: historical } = useQuery({
    queryKey: ['listing-historical', id],
    queryFn: () => getListingHistoricalData(id as string),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Skeleton className="h-8 w-48 mb-4" />
        <Skeleton className="h-64 w-full mb-4" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (isError || !listing) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Button
          variant="ghost"
          onClick={() => navigate('/landlord/properties')}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Properties
        </Button>
        <Card className="p-12 text-center">
          <Home className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Listing not found</h3>
          <p className="text-muted-foreground">
            We couldn't load this listing. It may have been removed.
          </p>
        </Card>
      </div>
    );
  }

  // Derive display values from the Property + Listing split.
  const asset = listing.property;
  const terms =
    listing.intent === 'rent_ltr' ? (listing.terms as RentLtrTerms) : null;
  const stateBadge = LISTING_STATE_BADGE[listing.state];
  // Owner reads return all media (incl. pending), so the landlord sees their
  // own images regardless of moderation status.
  const images = [...listing.media]
    .sort((a, b) => a.position - b.position)
    .map((m) => m.url);
  const parkingFeatures = asset?.parkingFeatures ?? [];
  const petsOk = derivePetsAllowed(listing);

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => navigate('/landlord/properties')}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Properties
        </Button>

        <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-start">
          <div>
            <h1 className="text-3xl font-bold mb-2">{listing.title}</h1>
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span>{formatFullAddress(asset)}</span>
            </div>
            <TrustBadges
              verifiedLister={listing.provenance.verifiedListerBadge}
              onChain={listing.onChain?.provenanceOnChain}
              className="mt-2"
            />
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() =>
                navigate(`/landlord/properties/${id}/applications`)
              }
            >
              <FileText className="mr-2 h-4 w-4" />
              Applications
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate(`/landlord/properties/${id}/viewings`)}
            >
              <Calendar className="mr-2 h-4 w-4" />
              Viewings
            </Button>
            <Button onClick={() => navigate(`/landlord/properties/${id}/edit`)}>
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </Button>

            {/* Withdrawing a listing is part of the lifecycle controls (coming
                with the listing state machine), not a hard delete. Disabled
                until that ships. */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  {/* span wrapper: disabled buttons don't emit the pointer events the tooltip needs */}
                  <span className="inline-flex">
                    <Button variant="destructive" disabled>
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </Button>
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  Withdrawing a listing is coming with the lifecycle controls.
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </div>

      {/* Lifecycle + publish gate — manage the listing's state and clear the
          authority / fair-housing requirements without leaving the detail page. */}
      <div className="space-y-6 mb-6">
        <ListingLifecycle listing={listing} />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <AuthorityGate listing={listing} />
          <FairHousingScreen listing={listing} />
        </div>
      </div>

      {/* Image Gallery */}
      {images.length > 0 && (
        <div className="mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2 relative h-96">
              <img
                src={images[0]}
                alt={listing.title}
                className="w-full h-full object-cover rounded-lg"
              />
              <Badge
                className={`absolute top-4 right-4 ${stateBadge.className}`}
              >
                {stateBadge.label}
              </Badge>
            </div>
            {images.slice(1, 5).map((image, index) => (
              <div key={index} className="relative h-48">
                <img
                  src={image}
                  alt={`${listing.title} ${index + 2}`}
                  className="w-full h-full object-cover rounded-lg"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Statistics Cards */}
      {statistics && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Views</CardTitle>
              <Eye className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statistics.totalViews}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Applications
              </CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statistics.totalApplications}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Active Leases
              </CardTitle>
              <Home className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statistics.activeLeases}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Monthly Revenue
              </CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(statistics.monthlyRevenue)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Occupancy</CardTitle>
              <Percent className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statistics.occupancyRate.toFixed(0)}%
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="details" className="space-y-4">
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="amenities">Amenities</TabsTrigger>
          <TabsTrigger value="leases">Leases</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Property Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Property Type</p>
                  <p className="font-medium">
                    {asset ? formatPropertyType(asset.propertyType) : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge className={stateBadge.className}>
                    {stateBadge.label}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Bedrooms</p>
                  <p className="font-medium">{asset?.bedroomsTotal ?? '—'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Bathrooms</p>
                  <p className="font-medium">{asset?.bathroomsTotal ?? '—'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Square Feet</p>
                  <p className="font-medium">
                    {asset?.livingArea?.toLocaleString() ?? 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Monthly Rent</p>
                  <p className="font-medium text-green-600">
                    {formatCurrency(listingRentMonthly(listing))}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    Security Deposit
                  </p>
                  <p className="font-medium">
                    {formatCurrency(terms?.securityDeposit ?? 0)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    Available Date
                  </p>
                  <p className="font-medium">
                    {formatDate(listing.availableDate)}
                  </p>
                </div>
              </div>

              {listing.description && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">
                    Description
                  </p>
                  <p className="text-sm">{listing.description}</p>
                </div>
              )}

              <div>
                <p className="text-sm text-muted-foreground mb-2">
                  Lease Terms
                </p>
                <div className="flex flex-wrap gap-2">
                  {(terms?.leaseTermsOffered ?? []).map((term) => (
                    <Badge key={term} variant="outline">
                      {term}
                    </Badge>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-sm text-muted-foreground mb-2">Pet Policy</p>
                <p className="font-medium">{listing.petPolicy ?? '—'}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="amenities" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Amenities</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {listing.amenities.map((amenity) => (
                  <div key={amenity} className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-primary rounded-full" />
                    <span className="text-sm">{amenity}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Utilities Included</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {listing.utilitiesIncluded.map((utility) => (
                  <div key={utility} className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-primary rounded-full" />
                    <span className="text-sm">{utility}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Additional Features</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Furnished</span>
                  <Badge variant={terms?.furnished ? 'default' : 'secondary'}>
                    {terms?.furnished ? 'Yes' : 'No'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Pets Allowed</span>
                  <Badge variant={petsOk ? 'default' : 'secondary'}>
                    {petsOk ? 'Yes' : 'No'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Parking</span>
                  <Badge
                    variant={
                      parkingFeatures.length > 0 ? 'default' : 'secondary'
                    }
                  >
                    {parkingFeatures.length > 0
                      ? parkingFeatures.join(', ')
                      : 'No'}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="leases">
          <Card>
            <CardHeader>
              <CardTitle>Associated Leases</CardTitle>
              <CardDescription>
                Lease and view history for this listing
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {historical?.hasHistoricalData ? (
                <div className="flex gap-8">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Total Leases
                    </p>
                    <p className="text-2xl font-bold">
                      {historical.totalLeases}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Views</p>
                    <p className="text-2xl font-bold">
                      {historical.totalViews}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No lease history yet.
                </p>
              )}
              <Button onClick={() => navigate('/landlord/leases')}>
                View All Leases
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
