/**
 * Property List Page
 * The landlord's own listings (any state) with the filters the
 * `GET /listings/landlord` endpoint actually honors — lifecycle state, city and
 * parking — plus sort and pagination. (The public search filters
 * title/type/rent/bedrooms/pets/furnished are NOT supported here, so they're
 * intentionally absent — they were silently no-ops before.)
 */

import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Plus,
  Filter,
  X,
  Home,
  MapPin,
  Bed,
  Bath,
  ArrowUpDown,
  ShieldCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { getLandlordListings } from '@/services/listingService';
import {
  listingRentMonthly,
  formatPropertyType,
  derivePetsAllowed,
  LISTING_STATE_BADGE,
} from '@/lib/listingDisplay';
import type {
  LandlordListingParams,
  ListingSortBy,
  ListingState,
  RentLtrTerms,
} from '@/types/listingContract';

const PAGE_SIZE = 20;

const STATES: ListingState[] = [
  'draft',
  'active',
  'pending',
  'leased',
  'sold',
  'withdrawn',
  'expired',
];

const SORT_OPTIONS: { value: ListingSortBy; label: string }[] = [
  { value: 'createdAt', label: 'Date Created' },
  { value: 'updatedAt', label: 'Last Updated' },
  { value: 'rent', label: 'Rent' },
  { value: 'availableDate', label: 'Available Date' },
  { value: 'views', label: 'Most Viewed' },
];

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);

export default function PropertyList() {
  const navigate = useNavigate();

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [states, setStates] = useState<ListingState[]>([]);
  const [city, setCity] = useState('all');
  const [hasParking, setHasParking] = useState(false);
  const [sortBy, setSortBy] = useState<ListingSortBy>('createdAt');
  const [page, setPage] = useState(1);

  // Distinct cities across the landlord's listings, to populate the filter
  // dropdown — the backend matches city by exact value, so free text was easy to
  // get wrong (a partial city returned 0). Capped at 100 listings (MVP-fine).
  const { data: cityData } = useQuery({
    queryKey: ['landlord-listings', 'cities'],
    queryFn: () => getLandlordListings({ pageSize: 100 }),
  });
  const cities = useMemo(
    () =>
      Array.from(
        new Set(
          (cityData?.data ?? [])
            .map((listing) => listing.property?.city)
            .filter((c): c is string => Boolean(c))
        )
      ).sort((a, b) => a.localeCompare(b)),
    [cityData]
  );

  const activeFilterCount =
    states.length + (city !== 'all' ? 1 : 0) + (hasParking ? 1 : 0);

  const toggleState = (state: ListingState) =>
    setStates((prev) =>
      prev.includes(state) ? prev.filter((s) => s !== state) : [...prev, state]
    );

  // Only the filters the landlord endpoint honors. `state` is CSV (the UI holds
  // an array, joined here — queryString can't serialize arrays).
  const params = useMemo<LandlordListingParams>(() => {
    const p: LandlordListingParams = { page, pageSize: PAGE_SIZE, sortBy };
    if (states.length) p.state = states.join(',');
    if (city !== 'all') p.city = city;
    if (hasParking) p.hasParking = true;
    return p;
  }, [page, sortBy, states, city, hasParking]);

  // Reset to the first page whenever the result set changes shape.
  useEffect(() => {
    setPage(1);
  }, [states, city, hasParking, sortBy]);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['landlord-listings', params],
    queryFn: () => getLandlordListings(params),
  });

  const listings = data?.data ?? [];
  const total = data?.itemCount ?? 0;
  const pageCount = data?.pageCount ?? 1;

  const handleClearFilters = () => {
    setStates([]);
    setCity('all');
    setHasParking(false);
    setPage(1);
  };

  const hasActiveFilters = activeFilterCount > 0;

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Header — mobile: title on top, action stacked below; ≥sm: row */}
      <div className="flex flex-col gap-4 mb-8 sm:flex-row sm:justify-between sm:items-center">
        <div>
          <h1 className="text-3xl font-bold">My Properties</h1>
          <p className="text-muted-foreground mt-1">
            Manage your property listings
          </p>
        </div>
        <Button
          onClick={() => navigate('/landlord/properties/create')}
          className="w-full sm:w-auto"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Property
        </Button>
      </div>

      {/* City filter + Filters + Sort */}
      <div className="flex gap-4 mb-6">
        <Select value={city} onValueChange={setCity}>
          <SelectTrigger className="flex-1 h-11" aria-label="Filter by city">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <SelectValue placeholder="All cities" />
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All cities</SelectItem>
            {cities.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Dialog open={filtersOpen} onOpenChange={setFiltersOpen}>
          <DialogTrigger asChild>
            <Button variant="outline">
              <Filter className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Filters</span>
              {activeFilterCount > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {activeFilterCount}
                </Badge>
              )}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Filter Properties</DialogTitle>
              <DialogDescription>
                Refine your listings by lifecycle state and parking
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 mt-6">
              {/* Lifecycle state (multi-select) */}
              <div>
                <Label className="text-base font-semibold mb-3 block">
                  Status
                </Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {STATES.map((state) => (
                    <div key={state} className="flex items-center">
                      <Checkbox
                        id={`state-${state}`}
                        checked={states.includes(state)}
                        onCheckedChange={() => toggleState(state)}
                      />
                      <label
                        htmlFor={`state-${state}`}
                        className="ml-2 text-sm cursor-pointer"
                      >
                        {LISTING_STATE_BADGE[state].label}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Parking */}
              <div className="flex items-center">
                <Checkbox
                  id="has-parking"
                  checked={hasParking}
                  onCheckedChange={(checked) => setHasParking(checked === true)}
                />
                <label
                  htmlFor="has-parking"
                  className="ml-2 text-sm cursor-pointer"
                >
                  Has parking
                </label>
              </div>

              <DialogFooter className="gap-2 sm:gap-0">
                <Button
                  onClick={() => setFiltersOpen(false)}
                  className="flex-1"
                >
                  Done
                </Button>
                <Button
                  onClick={() => {
                    handleClearFilters();
                    setFiltersOpen(false);
                  }}
                  variant="outline"
                >
                  <X className="h-4 w-4" />
                </Button>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>

        <Select
          value={sortBy}
          onValueChange={(value) => setSortBy(value as ListingSortBy)}
        >
          <SelectTrigger className="w-auto sm:w-45" aria-label="Sort by">
            <ArrowUpDown className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">
              <SelectValue placeholder="Sort by" />
            </span>
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Results Summary */}
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-muted-foreground">
          Showing {listings.length} of {total} properties
        </p>
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={handleClearFilters}>
            Clear all filters
          </Button>
        )}
      </div>

      {/* Property Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <Skeleton className="h-48 w-full" />
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : isError ? (
        <Card className="p-12 text-center">
          <Home className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">
            Couldn't load your listings
          </h3>
          <p className="text-muted-foreground">Please try again in a moment.</p>
        </Card>
      ) : listings.length === 0 ? (
        <Card className="p-12 text-center">
          <Home className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No properties found</h3>
          <p className="text-muted-foreground mb-4">
            {hasActiveFilters
              ? 'Try adjusting your filters'
              : 'Get started by adding your first property'}
          </p>
          <Button onClick={() => navigate('/landlord/properties/create')}>
            <Plus className="mr-2 h-4 w-4" />
            Add Property
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {listings.map((listing) => {
            const asset = listing.property;
            const terms =
              listing.intent === 'rent_ltr'
                ? (listing.terms as RentLtrTerms)
                : null;
            const image = [...listing.media].sort(
              (a, b) => a.position - b.position
            )[0]?.url;
            const stateBadge = LISTING_STATE_BADGE[listing.state];
            const petsOk = derivePetsAllowed(listing);
            return (
              <Card
                key={listing.id}
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => navigate(`/landlord/properties/${listing.id}`)}
              >
                {/* Property Image */}
                <div className="relative h-48 bg-muted">
                  {image ? (
                    <img
                      src={image}
                      alt={listing.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Home className="h-12 w-12 text-muted-foreground" />
                    </div>
                  )}
                  <Badge
                    className={`absolute top-2 right-2 ${stateBadge.className}`}
                  >
                    {stateBadge.label}
                  </Badge>
                  {listing.provenance.verifiedListerBadge && (
                    <Badge
                      variant="secondary"
                      className="absolute top-2 left-2 flex items-center gap-1"
                    >
                      <ShieldCheck className="h-3 w-3 text-emerald-600" />
                      Verified
                    </Badge>
                  )}
                </div>

                <CardHeader>
                  <CardTitle className="line-clamp-1">
                    {listing.title}
                  </CardTitle>
                  <CardDescription className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {asset ? `${asset.city}, ${asset.stateOrProvince}` : '—'}
                  </CardDescription>
                </CardHeader>

                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-bold">
                        {formatCurrency(listingRentMonthly(listing))}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        /month
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Bed className="h-4 w-4" />
                        {asset?.bedroomsTotal ?? '—'} bed
                      </div>
                      <div className="flex items-center gap-1">
                        <Bath className="h-4 w-4" />
                        {asset?.bathroomsTotal ?? '—'} bath
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {asset && (
                        <Badge variant="outline">
                          {formatPropertyType(asset.propertyType)}
                        </Badge>
                      )}
                      {terms?.furnished && (
                        <Badge variant="outline">Furnished</Badge>
                      )}
                      {petsOk && <Badge variant="outline">Pets OK</Badge>}
                    </div>
                  </div>
                </CardContent>

                <CardFooter className="text-xs text-muted-foreground">
                  {listing.views} views
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {pageCount > 1 && (
        <div className="flex justify-center items-center gap-2 mt-8">
          <Button
            variant="outline"
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {pageCount}
          </span>
          <Button
            variant="outline"
            disabled={page === pageCount}
            onClick={() => setPage(page + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
