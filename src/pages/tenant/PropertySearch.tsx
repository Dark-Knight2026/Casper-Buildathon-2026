import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import {
  PropertyCard,
  type PropertyCardData,
} from '@/components/property/PropertyCard';
import { searchListings } from '@/services/listingService';
import { listingRentMonthly, approvedMedia } from '@/lib/listingDisplay';
import { useDebounce } from '@/hooks/useDebounce';
import type {
  Listing,
  ListingSearchParams,
  RealPropertyType,
} from '@/types/listingContract';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Minus, Plus, Search, SlidersHorizontal } from 'lucide-react';

type FilterOption = { value: string; label: string };

const PRICE_MIN = 0;
const PRICE_MAX = 10000;
const PRICE_STEP = 100;
const PRICE_DEFAULT: [number, number] = [PRICE_MIN, PRICE_MAX];

const PAGE_SIZE = 12;

const formatPrice = (n: number) =>
  n >= PRICE_MAX ? `$${PRICE_MAX.toLocaleString()}+` : `$${n.toLocaleString()}`;

const ROOM_MAX = 6;

const RADIUS_OPTIONS: FilterOption[] = [
  { value: '5', label: '5 mi' },
  { value: '10', label: '10 mi' },
  { value: '25', label: '25 mi' },
  { value: '50', label: '50 mi' },
];
const DEFAULT_RADIUS_MILES = 25;

// RESO-aligned property types — the value set the backend `GET /listings`
// filter accepts (NOT the legacy apartment/house/studio/loft set).
const PROPERTY_TYPE_OPTIONS: FilterOption[] = [
  { value: 'all', label: 'All Types' },
  { value: 'single_family', label: 'Single Family' },
  { value: 'multi_family', label: 'Multi Family' },
  { value: 'apartment', label: 'Apartment' },
  { value: 'condo', label: 'Condo' },
  { value: 'townhouse', label: 'Townhouse' },
  { value: 'commercial', label: 'Commercial' },
  { value: 'other', label: 'Other' },
];

/** Map a search listing (with its nested property) to the card's flat shape. */
function listingToCard(listing: Listing): PropertyCardData {
  const media = approvedMedia(listing.media);
  return {
    id: listing.id,
    title: listing.title,
    address: listing.property?.addressLine1 ?? '',
    city: listing.property?.city ?? '',
    state: listing.property?.stateOrProvince ?? '',
    price: listingRentMonthly(listing),
    bedrooms: listing.property?.bedroomsTotal ?? 0,
    bathrooms: listing.property?.bathroomsTotal ?? 0,
    squareFeet: listing.property?.livingArea ?? undefined,
    images: media.map((m) => m.url),
    photoCount: media.length || undefined,
    daysOnMarket: listing.daysOnMarket,
    verifiedListerBadge: listing.provenance.verifiedListerBadge,
    onChainProvenance: listing.onChain?.provenanceOnChain ?? false,
  };
}

function Stepper({
  label,
  value,
  onChange,
  min = 0,
  max,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max: number;
}) {
  const display = value === 0 ? 'Any' : `${value}+`;
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => onChange(Math.max(min, value - 1))}
          disabled={value <= min}
          aria-label={`Decrease ${label}`}
        >
          <Minus className="h-4 w-4" />
        </Button>
        <div className="min-w-12 text-center text-sm font-medium">
          {display}
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => onChange(Math.min(max, value + 1))}
          disabled={value >= max}
          aria-label={`Increase ${label}`}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function FilterSelect({
  value,
  onChange,
  placeholder,
  options,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  options: FilterOption[];
  label?: string;
}) {
  const select = (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent position="popper" sideOffset={4}>
        {options.map(({ value, label }) => (
          <SelectItem key={value} value={value}>
            {label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  if (!label) return select;

  return (
    <div className="space-y-2 flex gap-2 items-center">
      <Label>{label}</Label>
      {select}
    </div>
  );
}

export default function PropertySearch() {
  const navigate = useNavigate();

  const [searchTerm, setSearchTerm] = useState('');
  const [priceRange, setPriceRange] = useState<[number, number]>(PRICE_DEFAULT);
  const [bedrooms, setBedrooms] = useState(0);
  const [propertyType, setPropertyType] = useState('all');
  const [petsAllowed, setPetsAllowed] = useState(false);
  const [furnished, setFurnished] = useState(false);
  const [geo, setGeo] = useState<{ lat: number; lng: number } | null>(null);
  const [radiusMiles, setRadiusMiles] = useState(DEFAULT_RADIUS_MILES);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

  // Debounce the free-text query so typing doesn't fire a request per keystroke.
  const debouncedSearch = useDebounce(searchTerm, 400);

  const isPriceFiltered =
    priceRange[0] !== PRICE_DEFAULT[0] || priceRange[1] !== PRICE_DEFAULT[1];
  const activeFilters =
    (isPriceFiltered ? 1 : 0) +
    (bedrooms > 0 ? 1 : 0) +
    (propertyType !== 'all' ? 1 : 0) +
    (petsAllowed ? 1 : 0) +
    (furnished ? 1 : 0) +
    (geo ? 1 : 0);

  const resetFilters = () => {
    setSearchTerm('');
    setPriceRange(PRICE_DEFAULT);
    setBedrooms(0);
    setPropertyType('all');
    setPetsAllowed(false);
    setFurnished(false);
    setGeo(null);
    setGeoError(null);
  };

  const toggleNearMe = (on: boolean) => {
    setGeoError(null);
    if (!on) {
      setGeo(null);
      return;
    }
    if (!('geolocation' in navigator)) {
      setGeoError('Location is not available in this browser.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => setGeo({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () =>
        setGeoError('Could not get your location. Check browser permissions.')
    );
  };

  // Only the filters the backend `GET /listings` actually honors are sent.
  // Bathrooms / square footage / amenity filters are intentionally not wired
  // until the backend supports them.
  const params = useMemo<ListingSearchParams>(() => {
    const p: ListingSearchParams = { pageSize: PAGE_SIZE };
    const q = debouncedSearch.trim();
    if (q) p.search = q;
    if (priceRange[0] > PRICE_MIN) p.minRent = priceRange[0];
    // PRICE_MAX means "no upper limit" — leave maxRent unset so listings above
    // the slider ceiling are still returned.
    if (priceRange[1] < PRICE_MAX) p.maxRent = priceRange[1];
    if (bedrooms > 0) p.minBedrooms = bedrooms;
    if (propertyType !== 'all')
      p.propertyType = propertyType as RealPropertyType;
    if (petsAllowed) p.petsAllowed = true;
    if (furnished) p.furnished = true;
    // Geo is all-or-nothing: the radius trio travels together, and distance
    // sort only makes sense with a centre point.
    if (geo) {
      p.nearLat = geo.lat;
      p.nearLng = geo.lng;
      p.radiusMiles = radiusMiles;
      p.sortBy = 'distance';
    }
    return p;
  }, [
    debouncedSearch,
    priceRange,
    bedrooms,
    propertyType,
    petsAllowed,
    furnished,
    geo,
    radiusMiles,
  ]);

  const {
    data,
    isLoading,
    isError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['listings-search', params],
    queryFn: ({ pageParam }) => searchListings({ ...params, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      const nextPage = allPages.length + 1;
      return nextPage <= lastPage.pageCount ? nextPage : undefined;
    },
  });

  const listings = data?.pages.flatMap((page) => page.data) ?? [];
  const itemCount = data?.pages[0]?.itemCount ?? 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-3xl font-bold text-foreground mb-4">
            Find Your Perfect Home
          </h1>

          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Search by location or property name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-11"
              />
            </div>

            <Dialog open={isFiltersOpen} onOpenChange={setIsFiltersOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="sm:w-auto h-10">
                  <SlidersHorizontal className="h-4 w-4 mr-2" />
                  Filters
                  {activeFilters > 0 && (
                    <Badge variant="secondary" className="ml-2">
                      {activeFilters}
                    </Badge>
                  )}
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Filters</DialogTitle>
                  <DialogDescription>
                    Refine results by price, bedrooms, and property type.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Price Range</Label>
                      <span className="text-sm text-muted-foreground">
                        {formatPrice(priceRange[0])} –{' '}
                        {formatPrice(priceRange[1])}
                      </span>
                    </div>
                    <Slider
                      min={PRICE_MIN}
                      max={PRICE_MAX}
                      step={PRICE_STEP}
                      value={priceRange}
                      onValueChange={(v) =>
                        setPriceRange([v[0], v[1]] as [number, number])
                      }
                      className="pt-2"
                    />
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <div className="space-y-1">
                        <Label
                          htmlFor="price-min"
                          className="text-xs text-muted-foreground"
                        >
                          Min ($)
                        </Label>
                        <Input
                          id="price-min"
                          type="number"
                          inputMode="numeric"
                          min={PRICE_MIN}
                          max={priceRange[1]}
                          step={1}
                          value={priceRange[0]}
                          onChange={(e) => {
                            const raw = e.target.value;
                            if (raw === '') {
                              setPriceRange([PRICE_MIN, priceRange[1]]);
                              return;
                            }
                            const v = Number(raw);
                            if (!Number.isFinite(v)) return;
                            const clamped = Math.max(
                              PRICE_MIN,
                              Math.min(v, priceRange[1])
                            );
                            setPriceRange([clamped, priceRange[1]]);
                          }}
                          placeholder={String(PRICE_MIN)}
                          aria-label="Minimum price"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label
                          htmlFor="price-max"
                          className="text-xs text-muted-foreground"
                        >
                          Max ($)
                        </Label>
                        <Input
                          id="price-max"
                          type="number"
                          inputMode="numeric"
                          min={priceRange[0]}
                          max={PRICE_MAX}
                          step={1}
                          value={priceRange[1]}
                          onChange={(e) => {
                            const raw = e.target.value;
                            if (raw === '') {
                              setPriceRange([priceRange[0], PRICE_MAX]);
                              return;
                            }
                            const v = Number(raw);
                            if (!Number.isFinite(v)) return;
                            const clamped = Math.min(
                              PRICE_MAX,
                              Math.max(v, priceRange[0])
                            );
                            setPriceRange([priceRange[0], clamped]);
                          }}
                          placeholder={String(PRICE_MAX)}
                          aria-label="Maximum price"
                        />
                      </div>
                    </div>
                  </div>
                  <Stepper
                    label="Bedrooms"
                    value={bedrooms}
                    onChange={setBedrooms}
                    max={ROOM_MAX}
                  />
                  <FilterSelect
                    label="Property Type"
                    value={propertyType}
                    onChange={setPropertyType}
                    placeholder="Property Type"
                    options={PROPERTY_TYPE_OPTIONS}
                  />

                  <div className="flex items-center justify-between">
                    <Label htmlFor="pets-allowed">Pets allowed</Label>
                    <Switch
                      id="pets-allowed"
                      checked={petsAllowed}
                      onCheckedChange={setPetsAllowed}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="furnished">Furnished</Label>
                    <Switch
                      id="furnished"
                      checked={furnished}
                      onCheckedChange={setFurnished}
                    />
                  </div>

                  <div className="pt-2 border-t space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="near-me">Search near me</Label>
                      <Switch
                        id="near-me"
                        checked={geo !== null}
                        onCheckedChange={toggleNearMe}
                      />
                    </div>
                    {geo && (
                      <FilterSelect
                        label="Radius"
                        value={String(radiusMiles)}
                        onChange={(v) => setRadiusMiles(Number(v))}
                        placeholder="Radius"
                        options={RADIUS_OPTIONS}
                      />
                    )}
                    {geoError && (
                      <p className="text-sm text-destructive">{geoError}</p>
                    )}
                  </div>
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                  <Button
                    variant="ghost"
                    onClick={resetFilters}
                    disabled={activeFilters === 0 && !searchTerm}
                  >
                    Clear all
                  </Button>
                  <Button onClick={() => setIsFiltersOpen(false)}>
                    Show {itemCount}{' '}
                    {itemCount === 1 ? 'property' : 'properties'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isLoading ? (
          <LoadingSpinner />
        ) : isError ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-lg">
              Something went wrong loading listings. Please try again.
            </p>
          </div>
        ) : (
          <>
            <p className="text-muted-foreground mb-6">
              {itemCount} {itemCount === 1 ? 'property' : 'properties'} found
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {listings.map((listing) => (
                <PropertyCard
                  key={listing.id}
                  property={listingToCard(listing)}
                  onClick={() => {
                    navigate(`/properties/${listing.id}`, {
                      state: { listing },
                    });
                  }}
                />
              ))}
            </div>

            {listings.length === 0 && (
              <div className="text-center py-12">
                <p className="text-muted-foreground text-lg mb-4">
                  No properties found matching your criteria.
                </p>
                <Button variant="outline" onClick={resetFilters}>
                  Clear Filters
                </Button>
              </div>
            )}

            {hasNextPage && (
              <div className="flex justify-center mt-8">
                <Button
                  variant="outline"
                  onClick={() => fetchNextPage()}
                  disabled={isFetchingNextPage}
                >
                  {isFetchingNextPage ? 'Loading…' : 'Load more'}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
