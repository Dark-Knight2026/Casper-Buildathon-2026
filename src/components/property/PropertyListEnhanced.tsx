import { useState, useMemo, memo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Property } from '@/types/clientLandlord';
import {
  Home,
  MapPin,
  Bed,
  Bath,
  Square,
  DollarSign,
  Calendar,
  Search,
  Filter,
  SortAsc,
  SortDesc,
  Grid3x3,
  List,
  Map,
  Download,
  Mail,
  CheckSquare,
  X,
  TrendingUp,
  AlertCircle,
  Users
} from 'lucide-react';

interface PropertyMetrics {
  monthlyIncome: number;
  monthlyExpenses: number;
  netIncome: number;
  roi: number;
  daysVacant: number;
  occupancyRate: number;
}

interface PropertyWithMetrics extends Property {
  metrics: PropertyMetrics;
}

interface PropertyListEnhancedProps {
  properties: Property[];
  onPropertySelect?: (property: Property) => void;
  onPropertyEdit?: (property: Property) => void;
  showBatchActions?: boolean;
}

type ViewType = 'grid' | 'list' | 'map';
type SortField = 'address' | 'price' | 'status' | 'created' | 'updated' | 'rent';
type SortDirection = 'asc' | 'desc';

interface PropertyFilters {
  status: string[];
  propertyType: string[];
  priceRange: { min: number; max: number };
  bedrooms: { min: number; max: number };
  location: string;
  searchQuery: string;
}

function PropertyListEnhanced({
  properties,
  onPropertySelect,
  onPropertyEdit,
  showBatchActions = true
}: PropertyListEnhancedProps) {
  const [viewType, setViewType] = useState<ViewType>('grid');
  const [sortField, setSortField] = useState<SortField>('updated');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  
  const [filters, setFilters] = useState<PropertyFilters>({
    status: [],
    propertyType: [],
    priceRange: { min: 0, max: 10000000 },
    bedrooms: { min: 0, max: 10 },
    location: '',
    searchQuery: ''
  });

  // Calculate metrics for each property
  const propertiesWithMetrics = useMemo(() => {
    return properties.map(property => {
      const monthlyIncome = property.financialInfo.monthlyIncome || 0;
      const monthlyExpenses = property.financialInfo.expenses
        .filter(exp => exp.recurring)
        .reduce((sum, exp) => sum + exp.amount, 0);
      const netIncome = monthlyIncome - monthlyExpenses;
      const roi = property.details.price > 0 
        ? ((netIncome * 12) / property.details.price) * 100 
        : 0;
      
      const daysVacant = property.status === 'available' 
        ? Math.floor((new Date().getTime() - property.listingDate.getTime()) / (1000 * 60 * 60 * 24))
        : 0;

      return {
        ...property,
        metrics: {
          monthlyIncome,
          monthlyExpenses,
          netIncome,
          roi,
          daysVacant,
          occupancyRate: property.tenantIds.length > 0 ? 100 : 0
        }
      } as PropertyWithMetrics;
    });
  }, [properties]);

  // Filter properties
  const filteredProperties = useMemo(() => {
    return propertiesWithMetrics.filter(property => {
      // Search query
      if (filters.searchQuery) {
        const query = filters.searchQuery.toLowerCase();
        const matchesAddress = property.details.address.street.toLowerCase().includes(query) ||
                              property.details.address.city.toLowerCase().includes(query);
        const matchesId = property.id.toLowerCase().includes(query);
        if (!matchesAddress && !matchesId) return false;
      }

      // Status filter
      if (filters.status.length > 0 && !filters.status.includes(property.status)) {
        return false;
      }

      // Property type filter
      if (filters.propertyType.length > 0 && !filters.propertyType.includes(property.details.propertyType)) {
        return false;
      }

      // Price range
      if (property.details.price < filters.priceRange.min || 
          property.details.price > filters.priceRange.max) {
        return false;
      }

      // Bedrooms
      if (property.details.bedrooms < filters.bedrooms.min || 
          property.details.bedrooms > filters.bedrooms.max) {
        return false;
      }

      // Location
      if (filters.location && 
          !property.details.address.city.toLowerCase().includes(filters.location.toLowerCase())) {
        return false;
      }

      return true;
    });
  }, [propertiesWithMetrics, filters]);

  // Sort properties
  const sortedProperties = useMemo(() => {
    const sorted = [...filteredProperties];
    
    sorted.sort((a, b) => {
      let aValue: number | string;
      let bValue: number | string;

      switch (sortField) {
        case 'address':
          aValue = a.details.address.street;
          bValue = b.details.address.street;
          break;
        case 'price':
          aValue = a.details.price;
          bValue = b.details.price;
          break;
        case 'status':
          aValue = a.status;
          bValue = b.status;
          break;
        case 'created':
          aValue = a.listingDate.getTime();
          bValue = b.listingDate.getTime();
          break;
        case 'updated':
          aValue = a.lastUpdated.getTime();
          bValue = b.lastUpdated.getTime();
          break;
        case 'rent':
          aValue = a.metrics.monthlyIncome;
          bValue = b.metrics.monthlyIncome;
          break;
        default:
          return 0;
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      return sortDirection === 'asc' 
        ? (aValue as number) - (bValue as number)
        : (bValue as number) - (aValue as number);
    });

    return sorted;
  }, [filteredProperties, sortField, sortDirection]);

  // Calculate summary metrics
  const summaryMetrics = useMemo(() => {
    const total = sortedProperties.length;
    const rented = sortedProperties.filter(p => p.status === 'rented').length;
    const available = sortedProperties.filter(p => p.status === 'available').length;
    const totalIncome = sortedProperties.reduce((sum, p) => sum + p.metrics.monthlyIncome, 0);
    const totalExpenses = sortedProperties.reduce((sum, p) => sum + p.metrics.monthlyExpenses, 0);
    const avgRoi = total > 0 
      ? sortedProperties.reduce((sum, p) => sum + p.metrics.roi, 0) / total 
      : 0;

    return {
      total,
      rented,
      available,
      occupancyRate: total > 0 ? (rented / total) * 100 : 0,
      totalIncome,
      totalExpenses,
      netIncome: totalIncome - totalExpenses,
      avgRoi
    };
  }, [sortedProperties]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const togglePropertySelection = (propertyId: string) => {
    setSelectedIds(prev => 
      prev.includes(propertyId)
        ? prev.filter(id => id !== propertyId)
        : [...prev, propertyId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === sortedProperties.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(sortedProperties.map(p => p.id));
    }
  };

  const clearFilters = () => {
    setFilters({
      status: [],
      propertyType: [],
      priceRange: { min: 0, max: 10000000 },
      bedrooms: { min: 0, max: 10 },
      location: '',
      searchQuery: ''
    });
  };

  const handleBatchAction = (action: string) => {
    console.log(`Batch action: ${action} on properties:`, selectedIds);
    // Implement batch actions here
  };

  const getStatusColor = (status: Property['status']) => {
    switch (status) {
      case 'rented':
        return 'bg-green-100 text-green-800';
      case 'available':
        return 'bg-blue-100 text-blue-800';
      case 'maintenance':
        return 'bg-yellow-100 text-yellow-800';
      case 'pending':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Summary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Properties</p>
                <p className="text-2xl font-bold">{summaryMetrics.total}</p>
              </div>
              <Home className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Occupancy Rate</p>
                <p className="text-2xl font-bold">{summaryMetrics.occupancyRate.toFixed(1)}%</p>
                <p className="text-xs text-gray-500">{summaryMetrics.rented} rented / {summaryMetrics.available} available</p>
              </div>
              <Users className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Monthly Net Income</p>
                <p className="text-2xl font-bold text-green-600">
                  ${summaryMetrics.netIncome.toLocaleString()}
                </p>
                <p className="text-xs text-gray-500">
                  ${summaryMetrics.totalIncome.toLocaleString()} income - ${summaryMetrics.totalExpenses.toLocaleString()} expenses
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Average ROI</p>
                <p className="text-2xl font-bold text-purple-600">
                  {summaryMetrics.avgRoi.toFixed(2)}%
                </p>
                <p className="text-xs text-gray-500">Annual return on investment</p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Toolbar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by address, city, or property ID..."
                  value={filters.searchQuery}
                  onChange={(e) => setFilters(prev => ({ ...prev, searchQuery: e.target.value }))}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Sort */}
            <div className="flex items-center gap-2">
              <Select value={sortField} onValueChange={(value) => setSortField(value as SortField)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="updated">Last Updated</SelectItem>
                  <SelectItem value="created">Date Added</SelectItem>
                  <SelectItem value="address">Address</SelectItem>
                  <SelectItem value="price">Price</SelectItem>
                  <SelectItem value="rent">Monthly Rent</SelectItem>
                  <SelectItem value="status">Status</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                size="icon"
                onClick={() => setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')}
              >
                {sortDirection === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
              </Button>
            </div>

            {/* View Toggle */}
            <div className="flex items-center gap-1 border rounded-lg p-1">
              <Button
                variant={viewType === 'grid' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setViewType('grid')}
              >
                <Grid3x3 className="h-4 w-4" />
              </Button>
              <Button
                variant={viewType === 'list' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setViewType('list')}
              >
                <List className="h-4 w-4" />
              </Button>
              <Button
                variant={viewType === 'map' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setViewType('map')}
              >
                <Map className="h-4 w-4" />
              </Button>
            </div>

            {/* Filter Toggle */}
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4 mr-2" />
              Filters
              {(filters.status.length > 0 || filters.propertyType.length > 0 || filters.location) && (
                <Badge variant="secondary" className="ml-2">
                  {filters.status.length + filters.propertyType.length + (filters.location ? 1 : 0)}
                </Badge>
              )}
            </Button>
          </div>

          {/* Filters Panel */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Status Filter */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Status</label>
                  <div className="space-y-2">
                    {['available', 'rented', 'maintenance', 'pending'].map((status) => (
                      <div key={status} className="flex items-center space-x-2">
                        <Checkbox
                          id={`status-${status}`}
                          checked={filters.status.includes(status)}
                          onCheckedChange={(checked) => {
                            setFilters(prev => ({
                              ...prev,
                              status: checked
                                ? [...prev.status, status]
                                : prev.status.filter(s => s !== status)
                            }));
                          }}
                        />
                        <label htmlFor={`status-${status}`} className="text-sm capitalize">
                          {status}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Property Type Filter */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Property Type</label>
                  <div className="space-y-2">
                    {['single-family', 'condo', 'townhouse', 'multi-family'].map((type) => (
                      <div key={type} className="flex items-center space-x-2">
                        <Checkbox
                          id={`type-${type}`}
                          checked={filters.propertyType.includes(type)}
                          onCheckedChange={(checked) => {
                            setFilters(prev => ({
                              ...prev,
                              propertyType: checked
                                ? [...prev.propertyType, type]
                                : prev.propertyType.filter(t => t !== type)
                            }));
                          }}
                        />
                        <label htmlFor={`type-${type}`} className="text-sm capitalize">
                          {type.replace('-', ' ')}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Location Filter */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Location</label>
                  <Input
                    placeholder="City or area"
                    value={filters.location}
                    onChange={(e) => setFilters(prev => ({ ...prev, location: e.target.value }))}
                  />
                </div>

                {/* Bedrooms Filter */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Bedrooms</label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      placeholder="Min"
                      value={filters.bedrooms.min}
                      onChange={(e) => setFilters(prev => ({
                        ...prev,
                        bedrooms: { ...prev.bedrooms, min: parseInt(e.target.value) || 0 }
                      }))}
                    />
                    <span>-</span>
                    <Input
                      type="number"
                      placeholder="Max"
                      value={filters.bedrooms.max}
                      onChange={(e) => setFilters(prev => ({
                        ...prev,
                        bedrooms: { ...prev.bedrooms, max: parseInt(e.target.value) || 10 }
                      }))}
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center">
                <Button variant="outline" size="sm" onClick={clearFilters}>
                  <X className="h-4 w-4 mr-2" />
                  Clear Filters
                </Button>
                <p className="text-sm text-gray-600">
                  Showing {sortedProperties.length} of {properties.length} properties
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Batch Actions Bar */}
      {showBatchActions && selectedIds.length > 0 && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Checkbox
                  checked={selectedIds.length === sortedProperties.length}
                  onCheckedChange={toggleSelectAll}
                />
                <span className="font-medium">
                  {selectedIds.length} propert{selectedIds.length === 1 ? 'y' : 'ies'} selected
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => handleBatchAction('send-reminder')}>
                  <Mail className="h-4 w-4 mr-2" />
                  Send Reminder
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleBatchAction('export')}>
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
                <Button size="sm" variant="outline" onClick={() => setSelectedIds([])}>
                  <X className="h-4 w-4 mr-2" />
                  Clear Selection
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Property List */}
      {sortedProperties.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No properties found</h3>
            <p className="text-gray-600 mb-4">
              {filters.searchQuery || filters.status.length > 0 || filters.propertyType.length > 0
                ? 'Try adjusting your filters or search query'
                : 'Add your first property to get started'}
            </p>
            {(filters.searchQuery || filters.status.length > 0 || filters.propertyType.length > 0) && (
              <Button variant="outline" onClick={clearFilters}>
                Clear Filters
              </Button>
            )}
          </CardContent>
        </Card>
      ) : viewType === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedProperties.map((property) => (
            <PropertyCardGrid
              key={property.id}
              property={property}
              isSelected={selectedIds.includes(property.id)}
              onSelect={() => togglePropertySelection(property.id)}
              onView={() => onPropertySelect?.(property)}
              onEdit={() => onPropertyEdit?.(property)}
              showCheckbox={showBatchActions}
              getStatusColor={getStatusColor}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {sortedProperties.map((property) => (
            <PropertyCardList
              key={property.id}
              property={property}
              isSelected={selectedIds.includes(property.id)}
              onSelect={() => togglePropertySelection(property.id)}
              onView={() => onPropertySelect?.(property)}
              onEdit={() => onPropertyEdit?.(property)}
              showCheckbox={showBatchActions}
              getStatusColor={getStatusColor}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default memo(PropertyListEnhanced);

// Grid View Card Component
interface PropertyCardProps {
  property: PropertyWithMetrics;
  isSelected: boolean;
  onSelect: () => void;
  onView: () => void;
  onEdit: () => void;
  showCheckbox: boolean;
  getStatusColor: (status: Property['status']) => string;
}

const PropertyCardGrid = memo(function PropertyCardGrid({ 
  property, 
  isSelected, 
  onSelect, 
  onView, 
  onEdit, 
  showCheckbox,
  getStatusColor 
}: PropertyCardProps) {
  return (
    <Card className={`hover:shadow-lg transition-shadow ${isSelected ? 'ring-2 ring-blue-500' : ''}`}>
      <CardContent className="p-4">
        {showCheckbox && (
          <div className="flex items-center mb-2">
            <Checkbox checked={isSelected} onCheckedChange={onSelect} />
          </div>
        )}
        
        <div className="aspect-video bg-gray-200 rounded-lg mb-4 flex items-center justify-center">
          {property.details.images && property.details.images.length > 0 ? (
            <img 
              src={property.details.images[0]} 
              alt={property.details.address.street}
              className="w-full h-full object-cover rounded-lg"
            />
          ) : (
            <Home className="h-12 w-12 text-gray-400" />
          )}
        </div>

        <div className="flex items-center justify-between mb-2">
          <Badge className={getStatusColor(property.status)}>
            {property.status}
          </Badge>
          <span className="text-sm text-gray-500">
            {property.tenantIds.length} tenant{property.tenantIds.length !== 1 ? 's' : ''}
          </span>
        </div>

        <h3 className="text-lg font-semibold mb-2">{property.details.address.street}</h3>
        <div className="flex items-center text-gray-600 mb-2">
          <MapPin className="h-4 w-4 mr-1" />
          <span className="text-sm">
            {property.details.address.city}, {property.details.address.state}
          </span>
        </div>

        <div className="text-2xl font-bold text-blue-600 mb-3">
          ${property.details.price.toLocaleString()}
        </div>

        <div className="flex items-center space-x-4 text-sm text-gray-600 mb-4">
          <div className="flex items-center">
            <Bed className="h-4 w-4 mr-1" />
            <span>{property.details.bedrooms}</span>
          </div>
          <div className="flex items-center">
            <Bath className="h-4 w-4 mr-1" />
            <span>{property.details.bathrooms}</span>
          </div>
          <div className="flex items-center">
            <Square className="h-4 w-4 mr-1" />
            <span>{property.details.squareFootage.toLocaleString()}</span>
          </div>
        </div>

        {property.metrics.monthlyIncome > 0 && (
          <div className="bg-green-50 p-2 rounded mb-4">
            <div className="flex justify-between text-sm">
              <span className="text-green-800">Monthly Income:</span>
              <span className="font-semibold text-green-800">
                ${property.metrics.monthlyIncome.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between text-xs text-green-700 mt-1">
              <span>ROI:</span>
              <span>{property.metrics.roi.toFixed(2)}%</span>
            </div>
          </div>
        )}

        <div className="flex space-x-2">
          <Button size="sm" className="flex-1" onClick={onView}>
            View Details
          </Button>
          <Button size="sm" variant="outline" onClick={onEdit}>
            Manage
          </Button>
        </div>
      </CardContent>
    </Card>
  );
});

// List View Card Component
const PropertyCardList = memo(function PropertyCardList({ 
  property, 
  isSelected, 
  onSelect, 
  onView, 
  onEdit, 
  showCheckbox,
  getStatusColor 
}: PropertyCardProps) {
  return (
    <Card className={`hover:shadow-md transition-shadow ${isSelected ? 'ring-2 ring-blue-500' : ''}`}>
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          {showCheckbox && (
            <Checkbox checked={isSelected} onCheckedChange={onSelect} />
          )}

          <div className="w-24 h-24 bg-gray-200 rounded-lg flex items-center justify-center flex-shrink-0">
            {property.details.images && property.details.images.length > 0 ? (
              <img 
                src={property.details.images[0]} 
                alt={property.details.address.street}
                className="w-full h-full object-cover rounded-lg"
              />
            ) : (
              <Home className="h-8 w-8 text-gray-400" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-lg font-semibold truncate">{property.details.address.street}</h3>
              <Badge className={getStatusColor(property.status)}>
                {property.status}
              </Badge>
            </div>

            <div className="flex items-center text-gray-600 mb-2">
              <MapPin className="h-4 w-4 mr-1" />
              <span className="text-sm">
                {property.details.address.city}, {property.details.address.state} {property.details.address.zipCode}
              </span>
            </div>

            <div className="flex items-center space-x-6 text-sm text-gray-600">
              <div className="flex items-center">
                <Bed className="h-4 w-4 mr-1" />
                <span>{property.details.bedrooms} bed</span>
              </div>
              <div className="flex items-center">
                <Bath className="h-4 w-4 mr-1" />
                <span>{property.details.bathrooms} bath</span>
              </div>
              <div className="flex items-center">
                <Square className="h-4 w-4 mr-1" />
                <span>{property.details.squareFootage.toLocaleString()} sqft</span>
              </div>
              <div className="flex items-center">
                <Users className="h-4 w-4 mr-1" />
                <span>{property.tenantIds.length} tenant{property.tenantIds.length !== 1 ? 's' : ''}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-end gap-2">
            <div className="text-right">
              <div className="text-2xl font-bold text-blue-600">
                ${property.details.price.toLocaleString()}
              </div>
              {property.metrics.monthlyIncome > 0 && (
                <div className="text-sm text-green-600 font-medium">
                  ${property.metrics.monthlyIncome.toLocaleString()}/mo
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <Button size="sm" onClick={onView}>
                View Details
              </Button>
              <Button size="sm" variant="outline" onClick={onEdit}>
                Manage
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});