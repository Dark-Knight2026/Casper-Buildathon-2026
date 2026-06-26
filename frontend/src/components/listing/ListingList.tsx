import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useListings } from '@/contexts/ListingContext';
import { useToast } from '@/hooks/use-toast';
import { Property } from '@/types/listing';
import AddListingModal from './AddListingModal';
import { 
  Search, 
  Filter, 
  MapPin, 
  DollarSign,
  Home,
  Bed,
  Bath,
  Square,
  Calendar,
  Eye,
  MessageSquare,
  MoreVertical,
  Edit,
  Trash2,
  Star,
  TrendingUp,
  Users
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ListingListProps {
  showAddButton?: boolean;
  maxHeight?: string;
  compact?: boolean;
}

export default function ListingList({ showAddButton = true, maxHeight, compact = false }: ListingListProps) {
  const { filteredListings, filters, setFilters, updateListingStatus, deleteListing, isLoading } = useListings();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState(filters.searchTerm || '');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [priceRange, setPriceRange] = useState<string>('all');

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setFilters({ ...filters, searchTerm: value || undefined });
  };

  const handleStatusFilter = (status: string) => {
    setSelectedStatus(status);
    setFilters({ 
      ...filters, 
      status: status === 'all' ? undefined : [status] 
    });
  };

  const handleTypeFilter = (type: string) => {
    setSelectedType(type);
    setFilters({ 
      ...filters, 
      propertyType: type === 'all' ? undefined : [type] 
    });
  };

  const handlePriceFilter = (range: string) => {
    setPriceRange(range);
    let priceRange = undefined;
    
    switch (range) {
      case 'under_200k':
        priceRange = { min: 0, max: 200000 };
        break;
      case '200k_400k':
        priceRange = { min: 200000, max: 400000 };
        break;
      case '400k_600k':
        priceRange = { min: 400000, max: 600000 };
        break;
      case '600k_plus':
        priceRange = { min: 600000, max: 999999999 };
        break;
      default:
        priceRange = undefined;
    }
    
    setFilters({ ...filters, priceRange });
  };

  const getStatusColor = (status: Property['status']) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'sold': return 'bg-blue-100 text-blue-800';
      case 'withdrawn': return 'bg-red-100 text-red-800';
      case 'draft': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPropertyTypeIcon = (type: Property['propertyType']) => {
    switch (type) {
      case 'single_family': return '🏠';
      case 'condo': return '🏢';
      case 'townhouse': return '🏘️';
      case 'multi_family': return '🏬';
      case 'land': return '🌳';
      case 'commercial': return '🏪';
      default: return '🏠';
    }
  };

  const formatPropertyType = (type: Property['propertyType']) => {
    return type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const handleStatusChange = async (listingId: string, newStatus: Property['status']) => {
    try {
      await updateListingStatus(listingId, newStatus);
      toast({
        title: "Status Updated",
        description: `Listing status changed to ${newStatus}.`,
      });
    } catch (error) {
      console.error('Failed to update listing status:', error);
      toast({
        title: "Error",
        description: "Failed to update listing status.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteListing = async (listingId: string) => {
    if (window.confirm('Are you sure you want to delete this listing?')) {
      try {
        await deleteListing(listingId);
        toast({
          title: "Listing Deleted",
          description: "Property listing has been removed successfully.",
        });
      } catch (error) {
        console.error('Failed to delete listing:', error);
        toast({
          title: "Error",
          description: "Failed to delete listing.",
          variant: "destructive",
        });
      }
    }
  };

  return (
    <div className="space-y-4">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex items-center space-x-2">
          <h2 className="text-xl font-semibold">Property Listings</h2>
          <Badge variant="outline">{filteredListings.length}</Badge>
        </div>
        {showAddButton && <AddListingModal />}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search listings..."
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={selectedStatus} onValueChange={handleStatusFilter}>
          <SelectTrigger className="w-full sm:w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="sold">Sold</SelectItem>
            <SelectItem value="withdrawn">Withdrawn</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
          </SelectContent>
        </Select>
        <Select value={selectedType} onValueChange={handleTypeFilter}>
          <SelectTrigger className="w-full sm:w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="single_family">Single Family</SelectItem>
            <SelectItem value="condo">Condo</SelectItem>
            <SelectItem value="townhouse">Townhouse</SelectItem>
            <SelectItem value="multi_family">Multi-Family</SelectItem>
            <SelectItem value="land">Land</SelectItem>
            <SelectItem value="commercial">Commercial</SelectItem>
          </SelectContent>
        </Select>
        <Select value={priceRange} onValueChange={handlePriceFilter}>
          <SelectTrigger className="w-full sm:w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Prices</SelectItem>
            <SelectItem value="under_200k">Under $200K</SelectItem>
            <SelectItem value="200k_400k">$200K - $400K</SelectItem>
            <SelectItem value="400k_600k">$400K - $600K</SelectItem>
            <SelectItem value="600k_plus">$600K+</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Listing List */}
      <div 
        className="space-y-3"
        style={{ maxHeight: maxHeight, overflowY: maxHeight ? 'auto' : 'visible' }}
      >
        {isLoading ? (
          // Loading Skeletons
          Array.from({ length: 3 }).map((_, index) => (
            <Card key={index} className="hover:shadow-md transition-shadow">
              <CardContent className={compact ? "p-4" : "p-6"}>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start space-x-3 w-full">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <div className="w-full space-y-2">
                      <Skeleton className="h-6 w-1/3" />
                      <div className="flex space-x-2">
                        <Skeleton className="h-5 w-16" />
                        <Skeleton className="h-5 w-24" />
                        <Skeleton className="h-5 w-20" />
                      </div>
                      <Skeleton className="h-4 w-1/2" />
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <Skeleton className="h-12 w-full rounded" />
                  <Skeleton className="h-12 w-full rounded" />
                  <Skeleton className="h-12 w-full rounded" />
                  <Skeleton className="h-12 w-full rounded" />
                </div>
                <div className="flex gap-2 mb-4">
                  <Skeleton className="h-6 w-20 rounded-full" />
                  <Skeleton className="h-6 w-20 rounded-full" />
                  <Skeleton className="h-6 w-20 rounded-full" />
                </div>
                <Skeleton className="h-10 w-full" />
              </CardContent>
            </Card>
          ))
        ) : filteredListings.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Home className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No listings found</h3>
              <p className="text-gray-500 mb-4">
                {searchTerm || selectedStatus !== 'all' || selectedType !== 'all' || priceRange !== 'all'
                  ? 'Try adjusting your filters to see more results.'
                  : 'Get started by adding your first property listing.'}
              </p>
              {showAddButton && <AddListingModal />}
            </CardContent>
          </Card>
        ) : (
          filteredListings.map((listing) => (
            <Card key={listing.id} className="hover:shadow-md transition-shadow">
              <CardContent className={compact ? "p-4" : "p-6"}>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start space-x-3">
                    <div className="text-2xl">{getPropertyTypeIcon(listing.propertyType)}</div>
                    <div>
                      <h3 className="text-lg font-semibold">
                        {listing.title}
                      </h3>
                      <div className="flex items-center space-x-2 mt-1">
                        <Badge className={getStatusColor(listing.status)}>
                          {listing.status}
                        </Badge>
                        <Badge variant="outline">
                          {formatPropertyType(listing.propertyType)}
                        </Badge>
                        <div className="text-2xl font-bold text-blue-600">
                          ${listing.price.toLocaleString()}
                        </div>
                      </div>
                      <div className="flex items-center text-gray-600 mt-1">
                        <MapPin className="h-4 w-4 mr-1" />
                        <span className="text-sm">
                          {listing.address.street}, {listing.address.city}, {listing.address.state}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>
                        <Eye className="h-4 w-4 mr-2" />
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit Listing
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Schedule Showing
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => handleStatusChange(listing.id, 'sold')}
                        disabled={listing.status === 'sold'}
                      >
                        <Star className="h-4 w-4 mr-2" />
                        Mark as Sold
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => handleDeleteListing(listing.id)}
                        className="text-red-600"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Listing
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Property Details */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
                  {listing.bedrooms && (
                    <div className="flex items-center space-x-2">
                      <Bed className="h-4 w-4 text-gray-400" />
                      <span>{listing.bedrooms} bed</span>
                    </div>
                  )}
                  {listing.bathrooms && (
                    <div className="flex items-center space-x-2">
                      <Bath className="h-4 w-4 text-gray-400" />
                      <span>{listing.bathrooms} bath</span>
                    </div>
                  )}
                  {listing.squareFootage && (
                    <div className="flex items-center space-x-2">
                      <Square className="h-4 w-4 text-gray-400" />
                      <span>{listing.squareFootage.toLocaleString()} sqft</span>
                    </div>
                  )}
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <span>{listing.daysOnMarket} days</span>
                  </div>
                </div>

                {/* Performance Metrics */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
                  <div className="text-center p-2 bg-gray-50 rounded">
                    <div className="font-semibold">{listing.views || 0}</div>
                    <div className="text-gray-600">Views</div>
                  </div>
                  <div className="text-center p-2 bg-gray-50 rounded">
                    <div className="font-semibold">{listing.inquiries || 0}</div>
                    <div className="text-gray-600">Inquiries</div>
                  </div>
                  <div className="text-center p-2 bg-gray-50 rounded">
                    <div className="font-semibold">{listing.showings?.length || 0}</div>
                    <div className="text-gray-600">Showings</div>
                  </div>
                  <div className="text-center p-2 bg-gray-50 rounded">
                    <div className="font-semibold">{listing.listingAgent}</div>
                    <div className="text-gray-600">Agent</div>
                  </div>
                </div>

                {/* Features */}
                {listing.features && listing.features.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-4">
                    {listing.features.slice(0, 6).map((feature, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {feature}
                      </Badge>
                    ))}
                    {listing.features.length > 6 && (
                      <Badge variant="secondary" className="text-xs">
                        +{listing.features.length - 6} more
                      </Badge>
                    )}
                  </div>
                )}

                {/* Description */}
                {listing.description && (
                  <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                    {listing.description}
                  </p>
                )}

                {!compact && (
                  <div className="flex space-x-2">
                    <Button size="sm" variant="outline">
                      <Eye className="h-4 w-4 mr-1" />
                      View Details
                    </Button>
                    <Button size="sm" variant="outline">
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    <Button size="sm" variant="outline">
                      <MessageSquare className="h-4 w-4 mr-1" />
                      Schedule Showing
                    </Button>
                    <Button size="sm" variant="outline">
                      <TrendingUp className="h-4 w-4 mr-1" />
                      Analytics
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}