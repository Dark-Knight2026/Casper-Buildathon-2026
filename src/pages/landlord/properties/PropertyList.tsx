/**
 * Property List Page
 * Displays all properties for a landlord with filters, search, and pagination
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Search, Filter, X, Home, MapPin, DollarSign, Bed, Bath } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { FEATURED_PROPERTIES } from '@/data/featuredProperties';
import type { Property, PropertySearchParams, PropertyStatus, PropertyType } from '@/types/property';

const PROPERTY_TYPES: PropertyType[] = ['Apartment', 'House', 'Condo', 'Townhouse', 'Studio', 'Loft'];
const PROPERTY_STATUSES: PropertyStatus[] = ['active', 'pending', 'rented', 'inactive'];

export default function PropertyList() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [cities, setCities] = useState<string[]>([]);

  // Filter state
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [selectedStatuses, setSelectedStatuses] = useState<PropertyStatus[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<PropertyType[]>([]);
  const [selectedCities, setSelectedCities] = useState<string[]>([]);
  const [minRent, setMinRent] = useState<string>('');
  const [maxRent, setMaxRent] = useState<string>('');
  const [minBedrooms, setMinBedrooms] = useState<string>('');
  const [petsAllowed, setPetsAllowed] = useState<boolean | undefined>(undefined);
  const [furnished, setFurnished] = useState<boolean | undefined>(undefined);
  const [parkingAvailable, setParkingAvailable] = useState<boolean | undefined>(undefined);

  // Pagination state
  const [page, setPage] = useState(Number(searchParams.get('page')) || 1);
  const [sortBy, setSortBy] = useState<PropertySearchParams['sortBy']>(
    (searchParams.get('sortBy') as PropertySearchParams['sortBy']) || 'createdAt'
  );
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(
    (searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc'
  );

  const limit = 20;

  // TODO(BE): replace with GET /api/v1/landlord/properties — BE-blocked
  // (LeaseFi MVP spec §3.3). Filter/sort/paginate the shared mock fixture
  // client-side so the page works on localhost without Supabase (same
  // intentional demo pattern as LandlordDashboard).
  const loadProperties = useCallback(() => {
    setLoading(true);
    const timer = setTimeout(() => {
      let result: Property[] = [...FEATURED_PROPERTIES];

      if (search) {
        const q = search.toLowerCase();
        result = result.filter(
          (p) => p.title.toLowerCase().includes(q) || p.address.toLowerCase().includes(q),
        );
      }
      if (selectedStatuses.length > 0) {
        result = result.filter((p) => selectedStatuses.some((s) => s === p.status));
      }
      if (selectedTypes.length > 0) {
        result = result.filter((p) => selectedTypes.some((t) => t === p.propertyType));
      }
      if (selectedCities.length > 0) {
        result = result.filter((p) => selectedCities.includes(p.city));
      }
      if (minRent) result = result.filter((p) => p.rent >= Number(minRent));
      if (maxRent) result = result.filter((p) => p.rent <= Number(maxRent));
      if (minBedrooms) result = result.filter((p) => p.bedrooms >= Number(minBedrooms));
      if (petsAllowed !== undefined) result = result.filter((p) => p.petsAllowed === petsAllowed);
      if (furnished !== undefined) result = result.filter((p) => p.furnished === furnished);
      if (parkingAvailable !== undefined) {
        result = result.filter((p) => p.parkingAvailable === parkingAvailable);
      }

      const dir = sortOrder === 'asc' ? 1 : -1;
      result.sort((a, b) => {
        switch (sortBy) {
          case 'rent':
            return (a.rent - b.rent) * dir;
          case 'views':
            return (a.views - b.views) * dir;
          case 'availableDate':
            return String(a.availableDate).localeCompare(String(b.availableDate)) * dir;
          case 'updatedAt':
            return (new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()) * dir;
          case 'createdAt':
          default:
            return (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) * dir;
        }
      });

      const totalCount = result.length;
      const start = (page - 1) * limit;
      setProperties(result.slice(start, start + limit));
      setTotal(totalCount);
      setTotalPages(Math.max(1, Math.ceil(totalCount / limit)));
      setLoading(false);
    }, 500);
    return () => clearTimeout(timer);
  }, [page, sortBy, sortOrder, search, selectedStatuses, selectedTypes, selectedCities, minRent, maxRent, minBedrooms, petsAllowed, furnished, parkingAvailable]);

  const loadCities = useCallback(() => {
    setCities([...new Set(FEATURED_PROPERTIES.map((p) => p.city))].sort());
  }, []);

  useEffect(() => {
    const cleanup = loadProperties();
    loadCities();
    return cleanup;
  }, [loadProperties, loadCities]);

  const handleSearch = () => {
    setPage(1);
    updateSearchParams();
    loadProperties();
  };

  const handleClearFilters = () => {
    setSearch('');
    setSelectedStatuses([]);
    setSelectedTypes([]);
    setSelectedCities([]);
    setMinRent('');
    setMaxRent('');
    setMinBedrooms('');
    setPetsAllowed(undefined);
    setFurnished(undefined);
    setParkingAvailable(undefined);
    setPage(1);
    setSearchParams({});
    loadProperties();
  };

  const updateSearchParams = () => {
    const params: Record<string, string> = {};
    if (search) params.search = search;
    if (page > 1) params.page = page.toString();
    if (sortBy !== 'createdAt') params.sortBy = sortBy;
    if (sortOrder !== 'desc') params.sortOrder = sortOrder;
    setSearchParams(params);
  };

  const getStatusColor = (status: PropertyStatus) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'pending': return 'bg-yellow-500';
      case 'rented': return 'bg-blue-500';
      case 'inactive': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">My Properties</h1>
          <p className="text-muted-foreground mt-1">
            Manage your property listings
          </p>
        </div>
        <Button onClick={() => navigate('/landlord/properties/create')}>
          <Plus className="mr-2 h-4 w-4" />
          Add Property
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="flex gap-4 mb-6">
        <div className="flex-1 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by title or address..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="pl-10"
            />
          </div>
          <Button onClick={handleSearch}>Search</Button>
        </div>

        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline">
              <Filter className="mr-2 h-4 w-4" />
              Filters
              {(selectedStatuses.length > 0 || selectedTypes.length > 0 || selectedCities.length > 0) && (
                <Badge variant="secondary" className="ml-2">
                  {selectedStatuses.length + selectedTypes.length + selectedCities.length}
                </Badge>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Filter Properties</SheetTitle>
              <SheetDescription>
                Refine your property search with filters
              </SheetDescription>
            </SheetHeader>

            <div className="space-y-6 mt-6">
              {/* Status Filter */}
              <div>
                <Label className="text-base font-semibold mb-3 block">Status</Label>
                <div className="space-y-2">
                  {PROPERTY_STATUSES.map((status) => (
                    <div key={status} className="flex items-center">
                      <Checkbox
                        id={`status-${status}`}
                        checked={selectedStatuses.includes(status)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedStatuses([...selectedStatuses, status]);
                          } else {
                            setSelectedStatuses(selectedStatuses.filter(s => s !== status));
                          }
                        }}
                      />
                      <label htmlFor={`status-${status}`} className="ml-2 text-sm capitalize cursor-pointer">
                        {status}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Property Type Filter */}
              <div>
                <Label className="text-base font-semibold mb-3 block">Property Type</Label>
                <div className="space-y-2">
                  {PROPERTY_TYPES.map((type) => (
                    <div key={type} className="flex items-center">
                      <Checkbox
                        id={`type-${type}`}
                        checked={selectedTypes.includes(type)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedTypes([...selectedTypes, type]);
                          } else {
                            setSelectedTypes(selectedTypes.filter(t => t !== type));
                          }
                        }}
                      />
                      <label htmlFor={`type-${type}`} className="ml-2 text-sm cursor-pointer">
                        {type}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              {/* City Filter */}
              {cities.length > 0 && (
                <div>
                  <Label className="text-base font-semibold mb-3 block">City</Label>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {cities.map((city) => (
                      <div key={city} className="flex items-center">
                        <Checkbox
                          id={`city-${city}`}
                          checked={selectedCities.includes(city)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedCities([...selectedCities, city]);
                            } else {
                              setSelectedCities(selectedCities.filter(c => c !== city));
                            }
                          }}
                        />
                        <label htmlFor={`city-${city}`} className="ml-2 text-sm cursor-pointer">
                          {city}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Rent Range */}
              <div>
                <Label className="text-base font-semibold mb-3 block">Rent Range</Label>
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
                <Label className="text-base font-semibold mb-3 block">Minimum Bedrooms</Label>
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
                    checked={petsAllowed === true}
                    onCheckedChange={(checked) => setPetsAllowed(checked ? true : undefined)}
                  />
                  <label htmlFor="pets-allowed" className="ml-2 text-sm cursor-pointer">
                    Pets Allowed
                  </label>
                </div>
                <div className="flex items-center">
                  <Checkbox
                    id="furnished"
                    checked={furnished === true}
                    onCheckedChange={(checked) => setFurnished(checked ? true : undefined)}
                  />
                  <label htmlFor="furnished" className="ml-2 text-sm cursor-pointer">
                    Furnished
                  </label>
                </div>
                <div className="flex items-center">
                  <Checkbox
                    id="parking"
                    checked={parkingAvailable === true}
                    onCheckedChange={(checked) => setParkingAvailable(checked ? true : undefined)}
                  />
                  <label htmlFor="parking" className="ml-2 text-sm cursor-pointer">
                    Parking Available
                  </label>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-4">
                <Button onClick={handleSearch} className="flex-1">
                  Apply Filters
                </Button>
                <Button onClick={handleClearFilters} variant="outline">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>

        <Select value={sortBy} onValueChange={(value) => setSortBy(value as PropertySearchParams['sortBy'])}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="createdAt">Date Created</SelectItem>
            <SelectItem value="updatedAt">Last Updated</SelectItem>
            <SelectItem value="rent">Rent</SelectItem>
            <SelectItem value="views">Views</SelectItem>
            <SelectItem value="availableDate">Available Date</SelectItem>
          </SelectContent>
        </Select>

        <Select value={sortOrder} onValueChange={(value) => setSortOrder(value as 'asc' | 'desc')}>
          <SelectTrigger className="w-[120px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="desc">Descending</SelectItem>
            <SelectItem value="asc">Ascending</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Results Summary */}
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-muted-foreground">
          Showing {properties.length} of {total} properties
        </p>
        {(selectedStatuses.length > 0 || selectedTypes.length > 0 || selectedCities.length > 0 || search) && (
          <Button variant="ghost" size="sm" onClick={handleClearFilters}>
            Clear all filters
          </Button>
        )}
      </div>

      {/* Property Grid */}
      {loading ? (
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
      ) : properties.length === 0 ? (
        <Card className="p-12 text-center">
          <Home className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No properties found</h3>
          <p className="text-muted-foreground mb-4">
            {search || selectedStatuses.length > 0 || selectedTypes.length > 0
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
          {properties.map((property) => (
            <Card
              key={property.id}
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => navigate(`/landlord/properties/${property.id}`)}
            >
              {/* Property Image */}
              <div className="relative h-48 bg-muted">
                {property.images && property.images.length > 0 ? (
                  <img
                    src={property.images[0]}
                    alt={property.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Home className="h-12 w-12 text-muted-foreground" />
                  </div>
                )}
                <Badge className={`absolute top-2 right-2 ${getStatusColor(property.status)}`}>
                  {property.status}
                </Badge>
              </div>

              <CardHeader>
                <CardTitle className="line-clamp-1">{property.title}</CardTitle>
                <CardDescription className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {property.city}, {property.state}
                </CardDescription>
              </CardHeader>

              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold">{formatCurrency(property.rent)}</span>
                    <span className="text-sm text-muted-foreground">/month</span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Bed className="h-4 w-4" />
                      {property.bedrooms} bed
                    </div>
                    <div className="flex items-center gap-1">
                      <Bath className="h-4 w-4" />
                      {property.bathrooms} bath
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant="outline">{property.propertyType}</Badge>
                    {property.furnished && <Badge variant="outline">Furnished</Badge>}
                    {property.petsAllowed && <Badge variant="outline">Pets OK</Badge>}
                  </div>
                </div>
              </CardContent>

              <CardFooter className="text-xs text-muted-foreground">
                {property.views} views
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 mt-8">
          <Button
            variant="outline"
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            disabled={page === totalPages}
            onClick={() => setPage(page + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}