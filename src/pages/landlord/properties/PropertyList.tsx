/**
 * Property List Page
 * The landlord's own listings (any state) with search, filters, and pagination.
 */

import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Plus,
  Search,
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
import { Input } from '@/components/ui/input';
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
} from '@/lib/listingDisplay';
import { useDebounce } from '@/hooks/useDebounce';
import type {
  ListingSearchParams,
  ListingState,
  ListingSortBy,
  RealPropertyType,
  RentLtrTerms,
} from '@/types/listingContract';

const PAGE_SIZE = 20;

const PROPERTY_TYPES: RealPropertyType[] = [
  'single_family',
  'multi_family',
  'apartment',
  'condo',
  'townhouse',
  'commercial',
  'other',
];

// Landlord listings span the full lifecycle (unlike the public, active-only
// feed), so every state needs a badge.
const STATE_BADGE: Record<ListingState, { label: string; className: string }> =
  {
    draft: { label: 'Draft', className: 'bg-gray-500' },
    active: { label: 'Active', className: 'bg-green-500' },
    pending: { label: 'Pending', className: 'bg-yellow-500' },
    leased: { label: 'Leased', className: 'bg-blue-500' },
    sold: { label: 'Sold', className: 'bg-blue-500' },
    withdrawn: { label: 'Withdrawn', className: 'bg-gray-500' },
    expired: { label: 'Expired', className: 'bg-red-500' },
  };

const SORT_OPTIONS: { value: ListingSortBy; label: string }[] = [
  { value: 'createdAt', label: 'Date Created' },
  { value: 'updatedAt', label: 'Last Updated' },
  { value: 'rent', label: 'Rent' },
  { value: 'availableDate', label: 'Available Date' },
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
  const [search, setSearch] = useState('');
  const [propertyType, setPropertyType] = useState('all');
  const [minRent, setMinRent] = useState('');
  const [maxRent, setMaxRent] = useState('');
  const [minBedrooms, setMinBedrooms] = useState('');
  const [petsAllowed, setPetsAllowed] = useState(false);
  const [furnished, setFurnished] = useState(false);
  const [sortBy, setSortBy] = useState<ListingSortBy>('createdAt');
  const [page, setPage] = useState(1);

  const debouncedSearch = useDebounce(search, 400);

  const activeFilterCount =
    (propertyType !== 'all' ? 1 : 0) +
    (minRent ? 1 : 0) +
    (maxRent ? 1 : 0) +
    (minBedrooms ? 1 : 0) +
    (petsAllowed ? 1 : 0) +
    (furnished ? 1 : 0);

  // Only the filters the backend honors are sent. The landlord endpoint returns
  // every lifecycle state; there's no server state/city/parking filter, so
  // those controls are intentionally absent.
  const params = useMemo<ListingSearchParams>(() => {
    const p: ListingSearchParams = { page, pageSize: PAGE_SIZE, sortBy };
    const q = debouncedSearch.trim();
    if (q) p.search = q;
    if (propertyType !== 'all')
      p.propertyType = propertyType as RealPropertyType;
    if (minRent) p.minRent = Number(minRent);
    if (maxRent) p.maxRent = Number(maxRent);
    if (minBedrooms) p.minBedrooms = Number(minBedrooms);
    if (petsAllowed) p.petsAllowed = true;
    if (furnished) p.furnished = true;
    return p;
  }, [
    page,
    sortBy,
    debouncedSearch,
    propertyType,
    minRent,
    maxRent,
    minBedrooms,
    petsAllowed,
    furnished,
  ]);

  // Reset to the first page whenever the result set changes shape.
  useEffect(() => {
    setPage(1);
  }, [
    debouncedSearch,
    propertyType,
    minRent,
    maxRent,
    minBedrooms,
    petsAllowed,
    furnished,
    sortBy,
  ]);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['landlord-listings', params],
    queryFn: () => getLandlordListings(params),
  });

  const listings = data?.data ?? [];
  const total = data?.itemCount ?? 0;
  const pageCount = data?.pageCount ?? 1;

  const handleClearFilters = () => {
    setSearch('');
    setPropertyType('all');
    setMinRent('');
    setMaxRent('');
    setMinBedrooms('');
    setPetsAllowed(false);
    setFurnished(false);
    setPage(1);
  };

  const hasActiveFilters = activeFilterCount > 0 || search.length > 0;

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

      {/* Search and Filters */}
      <div className="flex gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by title or address..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-11"
          />
        </div>

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
                Refine your listings with filters
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 mt-6">
              {/* Property Type */}
              <div>
                <Label className="text-base font-semibold mb-3 block">
                  Property Type
                </Label>
                <Select value={propertyType} onValueChange={setPropertyType}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {PROPERTY_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {formatPropertyType(type)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Rent Range */}
              <div>
                <Label className="text-base font-semibold mb-3 block">
                  Rent Range
                </Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    placeholder="Min"
                    value={minRent}
                    onChange={(e) => setMinRent(e.target.value)}
                  />
                  <Input
                    type="number"
                    placeholder="Max"
                    value={maxRent}
                    onChange={(e) => setMaxRent(e.target.value)}
                  />
                </div>
              </div>

              {/* Bedrooms */}
              <div>
                <Label className="text-base font-semibold mb-3 block">
                  Minimum Bedrooms
                </Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={minBedrooms}
                  onChange={(e) => setMinBedrooms(e.target.value)}
                />
              </div>

              {/* Boolean Filters */}
              <div className="space-y-3">
                <div className="flex items-center">
                  <Checkbox
                    id="pets-allowed"
                    checked={petsAllowed}
                    onCheckedChange={(checked) =>
                      setPetsAllowed(checked === true)
                    }
                  />
                  <label
                    htmlFor="pets-allowed"
                    className="ml-2 text-sm cursor-pointer"
                  >
                    Pets Allowed
                  </label>
                </div>
                <div className="flex items-center">
                  <Checkbox
                    id="furnished"
                    checked={furnished}
                    onCheckedChange={(checked) =>
                      setFurnished(checked === true)
                    }
                  />
                  <label
                    htmlFor="furnished"
                    className="ml-2 text-sm cursor-pointer"
                  >
                    Furnished
                  </label>
                </div>
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
              ? 'Try adjusting your filters or search term'
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
            const stateBadge = STATE_BADGE[listing.state];
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
