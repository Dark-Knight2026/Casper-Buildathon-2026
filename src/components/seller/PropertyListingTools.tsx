import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Property } from '@/types/seller';
import { 
  Plus, 
  Home, 
  Camera, 
  FileText, 
  Edit, 
  Eye, 
  Trash2,
  Upload,
  Video,
  Box,
  MapPin,
  DollarSign
} from 'lucide-react';

export default function PropertyListingTools() {
  const [isCreateListingOpen, setIsCreateListingOpen] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<string | null>(null);

  // Mock property listings
  const properties: Property[] = [
    {
      id: 'prop-1',
      sellerId: 'seller-1',
      address: '123 Main St, Downtown',
      propertyType: 'single_family',
      listingType: 'sale',
      price: 850000,
      bedrooms: 4,
      bathrooms: 3,
      squareFeet: 2400,
      yearBuilt: 2015,
      description: 'Beautiful modern home with open floor plan and updated kitchen.',
      features: ['Hardwood floors', 'Granite countertops', 'Two-car garage', 'Fenced yard'],
      media: [
        { id: 'media-1', type: 'photo', url: '/photos/main.jpg', title: 'Front exterior', isPrimary: true, uploadedAt: new Date() },
        { id: 'media-2', type: 'video', url: '/videos/tour.mp4', title: 'Virtual tour', isPrimary: false, uploadedAt: new Date() }
      ],
      documents: [
        { id: 'doc-1', type: 'disclosure', name: 'Property Disclosure', url: '/docs/disclosure.pdf', uploadedAt: new Date() }
      ],
      status: 'active',
      isAgentRepresented: true,
      assignedAgentId: 'agent-1',
      createdAt: new Date('2024-08-15'),
      updatedAt: new Date('2024-09-01')
    },
    {
      id: 'prop-2',
      sellerId: 'seller-1',
      address: '456 Oak Ave, North District',
      propertyType: 'condo',
      listingType: 'lease',
      price: 3200,
      bedrooms: 2,
      bathrooms: 2,
      squareFeet: 1200,
      yearBuilt: 2018,
      description: 'Luxury condo with city views and modern amenities.',
      features: ['City views', 'In-unit laundry', 'Gym access', 'Rooftop deck'],
      media: [
        { id: 'media-3', type: 'photo', url: '/photos/condo.jpg', title: 'Living room', isPrimary: true, uploadedAt: new Date() }
      ],
      documents: [],
      status: 'draft',
      isAgentRepresented: false,
      createdAt: new Date('2024-09-01'),
      updatedAt: new Date('2024-09-01')
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 border-green-200';
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'sold': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'leased': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'draft': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'withdrawn': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getListingTypeColor = (type: string) => {
    switch (type) {
      case 'sale': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'lease': return 'bg-green-100 text-green-800 border-green-200';
      case 'lease_to_own': return 'bg-purple-100 text-purple-800 border-purple-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Property Listings</h2>
          <p className="text-gray-600">Manage your property listings and media</p>
        </div>
        <Dialog open={isCreateListingOpen} onOpenChange={setIsCreateListingOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
              <Plus className="h-4 w-4 mr-2" />
              Create Listing
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Property Listing</DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Basic Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Property Address</Label>
                    <Input placeholder="123 Main Street" />
                  </div>
                  <div className="space-y-2">
                    <Label>Property Type</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="single_family">Single Family Home</SelectItem>
                        <SelectItem value="condo">Condominium</SelectItem>
                        <SelectItem value="townhouse">Townhouse</SelectItem>
                        <SelectItem value="multi_family">Multi-Family</SelectItem>
                        <SelectItem value="commercial">Commercial</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Listing Type</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select listing type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sale">For Sale</SelectItem>
                        <SelectItem value="lease">For Lease</SelectItem>
                        <SelectItem value="lease_to_own">Lease-to-Own</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Price</Label>
                    <Input type="number" placeholder="850000" />
                  </div>
                </div>
                
                <div className="grid grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label>Bedrooms</Label>
                    <Input type="number" placeholder="4" />
                  </div>
                  <div className="space-y-2">
                    <Label>Bathrooms</Label>
                    <Input type="number" step="0.5" placeholder="3" />
                  </div>
                  <div className="space-y-2">
                    <Label>Square Feet</Label>
                    <Input type="number" placeholder="2400" />
                  </div>
                  <div className="space-y-2">
                    <Label>Year Built</Label>
                    <Input type="number" placeholder="2015" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea placeholder="Describe your property..." rows={4} />
                </div>
              </div>

              {/* Agent Representation */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Representation</h3>
                <div className="flex items-center space-x-2">
                  <Switch id="agent-represented" />
                  <Label htmlFor="agent-represented">I want agent representation</Label>
                </div>
                <p className="text-sm text-gray-600">
                  Toggle between self-listed or agent-represented mode. Agent representation includes professional marketing, negotiation, and transaction management.
                </p>
              </div>

              {/* Media Upload */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Media & Documents</h3>
                <div className="grid grid-cols-3 gap-4">
                  <Card className="border-dashed border-2 border-gray-300 hover:border-gray-400 cursor-pointer">
                    <CardContent className="p-6 text-center">
                      <Camera className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm font-medium text-gray-600">Upload Photos</p>
                      <p className="text-xs text-gray-500">JPG, PNG up to 10MB</p>
                    </CardContent>
                  </Card>
                  
                  <Card className="border-dashed border-2 border-gray-300 hover:border-gray-400 cursor-pointer">
                    <CardContent className="p-6 text-center">
                      <Video className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm font-medium text-gray-600">Upload Videos</p>
                      <p className="text-xs text-gray-500">MP4, MOV up to 100MB</p>
                    </CardContent>
                  </Card>
                  
                  <Card className="border-dashed border-2 border-gray-300 hover:border-gray-400 cursor-pointer">
                    <CardContent className="p-6 text-center">
                      <Box className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm font-medium text-gray-600">3D Tours</p>
                      <p className="text-xs text-gray-500">Matterport, virtual tours</p>
                    </CardContent>
                  </Card>
                </div>
              </div>

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsCreateListingOpen(false)}>
                  Save as Draft
                </Button>
                <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                  Publish Listing
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Property Listings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {properties.map((property) => (
          <Card key={property.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="flex items-center space-x-2">
                    <MapPin className="h-5 w-5 text-gray-500" />
                    <span>{property.address}</span>
                  </CardTitle>
                  <div className="flex items-center space-x-2 mt-2">
                    <Badge className={`${getStatusColor(property.status)} border text-xs`}>
                      {property.status}
                    </Badge>
                    <Badge className={`${getListingTypeColor(property.listingType)} border text-xs`}>
                      {property.listingType === 'lease_to_own' ? 'Lease-to-Own' : property.listingType}
                    </Badge>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-green-600">
                    ${property.price.toLocaleString()}
                    {property.listingType === 'lease' && <span className="text-sm text-gray-500">/mo</span>}
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between text-sm text-gray-600">
                  <span>{property.bedrooms} bed • {property.bathrooms} bath</span>
                  <span>{property.squareFeet?.toLocaleString()} sq ft</span>
                  <span>Built {property.yearBuilt}</span>
                </div>
                
                <p className="text-sm text-gray-700 line-clamp-2">{property.description}</p>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4 text-sm text-gray-600">
                    <span className="flex items-center">
                      <Camera className="h-4 w-4 mr-1" />
                      {property.media.filter(m => m.type === 'photo').length} photos
                    </span>
                    <span className="flex items-center">
                      <Video className="h-4 w-4 mr-1" />
                      {property.media.filter(m => m.type === 'video').length} videos
                    </span>
                    <span className="flex items-center">
                      <FileText className="h-4 w-4 mr-1" />
                      {property.documents.length} docs
                    </span>
                  </div>
                  
                  {property.isAgentRepresented && (
                    <Badge variant="outline" className="text-xs">
                      Agent Represented
                    </Badge>
                  )}
                </div>
                
                <div className="flex items-center space-x-2">
                  <Button variant="outline" size="sm" className="flex-1">
                    <Eye className="h-4 w-4 mr-1" />
                    Preview
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1">
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                  <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button variant="outline" className="h-20 flex flex-col items-center justify-center space-y-2">
              <Upload className="h-6 w-6" />
              <span>Bulk Upload Media</span>
            </Button>
            <Button variant="outline" className="h-20 flex flex-col items-center justify-center space-y-2">
              <FileText className="h-6 w-6" />
              <span>Generate Marketing Materials</span>
            </Button>
            <Button variant="outline" className="h-20 flex flex-col items-center justify-center space-y-2">
              <DollarSign className="h-6 w-6" />
              <span>Update Pricing</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}