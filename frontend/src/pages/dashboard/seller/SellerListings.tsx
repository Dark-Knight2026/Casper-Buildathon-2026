import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { useToast } from '@/hooks/use-toast';
import { useSellerDashboard } from '@/hooks/useSellerDashboard';
import AddPropertyWizard from '@/components/property/AddPropertyWizard';
import {
  Home,
  MapPin,
  Bed,
  Bath,
  Square,
  Plus,
} from 'lucide-react';

export default function SellerListings() {
  const { toast } = useToast();
  const { myListings } = useSellerDashboard();
  const [showAddPropertyWizard, setShowAddPropertyWizard] = useState(false);

  const getListingStatusColor = (status: string) => {
    switch (status) {
      case 'Active': return 'bg-green-100 text-green-800';
      case 'Pending': return 'bg-yellow-100 text-yellow-800';
      case 'Sold': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleAddPropertyComplete = (formData: unknown) => {
    console.log('Adding property:', formData);
    toast({
      title: 'Property Added',
      description: 'Your property has been successfully added.'
    });
    setShowAddPropertyWizard(false);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>My Property Listings</CardTitle>
            <Button onClick={() => setShowAddPropertyWizard(true)} aria-label="Add new property listing">
              <Plus className="h-4 w-4 mr-2" />
              Add New Listing
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {myListings.length > 0 ? (
            <div className="space-y-6">
              {myListings.map((listing) => (
                <Card key={listing.id} className="overflow-hidden">
                  <div className="flex flex-col md:flex-row">
                    <img 
                      src={listing.image} 
                      alt={listing.title}
                      className="w-full md:w-48 h-48 object-cover"
                    />
                    <div className="flex-1 p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="text-xl font-semibold mb-2">{listing.title}</h3>
                          <p className="text-gray-600 flex items-center mb-2">
                            <MapPin className="h-4 w-4 mr-1" />
                            {listing.address}
                          </p>
                          <div className="flex items-center space-x-4 text-sm text-gray-600 mb-3">
                            <span className="flex items-center">
                              <Bed className="h-4 w-4 mr-1" />
                              {listing.bedrooms} bed
                            </span>
                            <span className="flex items-center">
                              <Bath className="h-4 w-4 mr-1" />
                              {listing.bathrooms} bath
                            </span>
                            <span className="flex items-center">
                              <Square className="h-4 w-4 mr-1" />
                              {listing.sqft.toLocaleString()} sqft
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-blue-600 mb-2">
                            ${listing.price.toLocaleString()}
                          </div>
                          <Badge className={getListingStatusColor(listing.status)}>
                            {listing.status}
                          </Badge>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div className="text-center p-2 bg-gray-50 rounded">
                          <div className="font-semibold">{listing.daysOnMarket}</div>
                          <div className="text-gray-600">Days on Market</div>
                        </div>
                        <div className="text-center p-2 bg-gray-50 rounded">
                          <div className="font-semibold">{listing.views}</div>
                          <div className="text-gray-600">Views</div>
                        </div>
                        <div className="text-center p-2 bg-gray-50 rounded">
                          <div className="font-semibold">{listing.inquiries}</div>
                          <div className="text-gray-600">Inquiries</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Home}
              title="No listings yet"
              description="Create your first property listing to start selling"
              action={{
                label: "Add New Listing",
                onClick: () => setShowAddPropertyWizard(true)
              }}
            />
          )}
        </CardContent>
      </Card>

      {showAddPropertyWizard && (
        <AddPropertyWizard
          onComplete={handleAddPropertyComplete}
          onCancel={() => setShowAddPropertyWizard(false)}
        />
      )}
    </div>
  );
}