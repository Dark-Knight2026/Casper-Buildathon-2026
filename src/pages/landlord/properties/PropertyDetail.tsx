/**
 * Property Detail Page
 * Displays detailed information about a property
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit, Trash2, Home, MapPin, DollarSign, Eye, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { propertyService } from '@/services/propertyService';
import { useAuth } from '@/hooks/useAuth';
import type { Property, PropertyStatistics } from '@/types/property';
import { getLeasesByProperty } from '@/data/tenantLeases';
import { LandlordListingActions } from '@/components/landlord/LandlordListingActions';

export default function PropertyDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { profile } = useAuth();

  const [property, setProperty] = useState<Property | null>(null);
  const [statistics, setStatistics] = useState<PropertyStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  const loadProperty = useCallback(async () => {
    try {
      setLoading(true);
      if (!id) return;

      const data = await propertyService.getPropertyById(id);
      if (!data) {
        toast({
          title: 'Error',
          description: 'Property not found',
          variant: 'destructive'
        });
        navigate('/landlord/properties');
        return;
      }

      setProperty(data);
      
      // Increment view count
      await propertyService.incrementPropertyViews(id);
    } catch (error) {
      console.error('Error loading property:', error);
      toast({
        title: 'Error',
        description: 'Failed to load property',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }, [id, navigate, toast]);

  const loadStatistics = useCallback(async () => {
    try {
      if (!id) return;
      const stats = await propertyService.getPropertyStatistics(id);
      setStatistics(stats);
    } catch (error) {
      console.error('Error loading statistics:', error);
    }
  }, [id]);

  useEffect(() => {
    loadProperty();
    loadStatistics();
  }, [loadProperty, loadStatistics]);

  const handleDelete = async () => {
    try {
      setDeleting(true);
      const landlordId = profile?.id;
      if (!landlordId || !id) return;

      await propertyService.deleteProperty(id, landlordId);
      
      toast({
        title: 'Success',
        description: 'Property deleted successfully'
      });

      navigate('/landlord/properties');
    } catch (error) {
      console.error('Error deleting property:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete property',
        variant: 'destructive'
      });
    } finally {
      setDeleting(false);
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

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(date);
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Skeleton className="h-8 w-48 mb-4" />
        <Skeleton className="h-64 w-full mb-4" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!property) {
    return null;
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'pending': return 'bg-yellow-500';
      case 'rented': return 'bg-blue-500';
      case 'inactive': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-6">
        <Button variant="ghost" onClick={() => navigate('/landlord/properties')} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Properties
        </Button>
        
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold mb-2">{property.title}</h1>
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span>{property.address}, {property.city}, {property.state} {property.zipCode}</span>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button onClick={() => navigate(`/landlord/properties/${id}/edit`)}>
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </Button>
            
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the property
                    and all associated data.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} disabled={deleting}>
                    {deleting ? 'Deleting...' : 'Delete'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </div>

      {/* Image Gallery */}
      {property.images && property.images.length > 0 && (
        <div className="mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2 relative h-96">
              <img
                src={property.images[0]}
                alt={property.title}
                className="w-full h-full object-cover rounded-lg"
              />
              <Badge className={`absolute top-4 right-4 ${getStatusColor(property.status)}`}>
                {property.status}
              </Badge>
            </div>
            {property.images.slice(1, 5).map((image, index) => (
              <div key={index} className="relative h-48">
                <img
                  src={image}
                  alt={`${property.title} ${index + 2}`}
                  className="w-full h-full object-cover rounded-lg"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Statistics Cards */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
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
              <CardTitle className="text-sm font-medium">Applications</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statistics.totalApplications}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Leases</CardTitle>
              <Home className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statistics.activeLeases}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(statistics.monthlyRevenue)}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Lease lifecycle actions — Task 5 demo (mock data) */}
      {(() => {
        const activeLease = property.id
          ? getLeasesByProperty(property.id).find((l) => l.status === 'active')
          : null;
        return activeLease ? (
          <div className="mb-4">
            <LandlordListingActions
              leaseId={activeLease.id}
              endDate={activeLease.endDate}
            />
          </div>
        ) : null;
      })()}

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
                  <p className="font-medium">{property.propertyType}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge className={getStatusColor(property.status)}>{property.status}</Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Bedrooms</p>
                  <p className="font-medium">{property.bedrooms}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Bathrooms</p>
                  <p className="font-medium">{property.bathrooms}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Square Feet</p>
                  <p className="font-medium">{property.squareFeet?.toLocaleString() || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Monthly Rent</p>
                  <p className="font-medium text-green-600">{formatCurrency(property.rent)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Security Deposit</p>
                  <p className="font-medium">{formatCurrency(property.securityDeposit)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Available Date</p>
                  <p className="font-medium">{formatDate(property.availableDate)}</p>
                </div>
              </div>

              {property.description && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Description</p>
                  <p className="text-sm">{property.description}</p>
                </div>
              )}

              <div>
                <p className="text-sm text-muted-foreground mb-2">Lease Terms</p>
                <div className="flex flex-wrap gap-2">
                  {property.leaseTerms.map((term) => (
                    <Badge key={term} variant="outline">{term}</Badge>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-sm text-muted-foreground mb-2">Pet Policy</p>
                <p className="font-medium">{property.petPolicy}</p>
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
                {property.amenities.map((amenity) => (
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
                {property.utilitiesIncluded.map((utility) => (
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
                  <Badge variant={property.furnished ? 'default' : 'secondary'}>
                    {property.furnished ? 'Yes' : 'No'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Pets Allowed</span>
                  <Badge variant={property.petsAllowed ? 'default' : 'secondary'}>
                    {property.petsAllowed ? 'Yes' : 'No'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Parking Available</span>
                  <Badge variant={property.parkingAvailable ? 'default' : 'secondary'}>
                    {property.parkingAvailable ? 'Yes' : 'No'}
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
                View all leases for this property
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Lease information will be displayed here
              </p>
              <Button className="mt-4" onClick={() => navigate('/landlord/leases')}>
                View All Leases
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}