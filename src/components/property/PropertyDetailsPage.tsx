import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Property } from '@/types/clientLandlord';
import PropertyMetricsCard from './PropertyMetricsCard';
import TenantDialog from '@/components/tenant/TenantDialog';
import {
  Home,
  MapPin,
  Bed,
  Bath,
  Square,
  Calendar,
  DollarSign,
  Users,
  Wrench,
  FileText,
  TrendingUp,
  Edit,
  Trash2,
  ChevronLeft,
  Plus,
  Download,
  Share2,
  AlertCircle,
  CheckCircle,
  Clock
} from 'lucide-react';

interface PropertyDetailsPageProps {
  property: Property;
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export default function PropertyDetailsPage({
  property,
  onBack,
  onEdit,
  onDelete
}: PropertyDetailsPageProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [showAddTenantDialog, setShowAddTenantDialog] = useState(false);

  // Calculate metrics
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

  const metrics = {
    monthlyIncome,
    monthlyExpenses,
    netIncome,
    roi,
    daysVacant,
    occupancyRate: property.tenantIds.length > 0 ? 100 : 0
  };

  // Property address for tenant dialog
  const propertyAddress = `${property.details.address.street}, ${property.details.address.city}, ${property.details.address.state}`;

  // Mock data for tenants and maintenance
  const mockTenants = property.tenantIds.map((id, index) => ({
    id,
    name: `Tenant ${index + 1}`,
    email: `tenant${index + 1}@example.com`,
    phone: '(555) 123-4567',
    leaseStart: new Date(2024, 0, 1),
    leaseEnd: new Date(2025, 0, 1),
    monthlyRent: monthlyIncome / property.tenantIds.length,
    status: 'active' as const
  }));

  const mockMaintenanceRequests = [
    {
      id: '1',
      title: 'Leaking Faucet',
      category: 'plumbing',
      priority: 'medium',
      status: 'in_progress',
      createdAt: new Date(2024, 10, 25),
      tenant: 'Tenant 1'
    },
    {
      id: '2',
      title: 'AC Not Working',
      category: 'hvac',
      priority: 'high',
      status: 'scheduled',
      createdAt: new Date(2024, 10, 28),
      tenant: 'Tenant 2'
    }
  ];

  const mockDocuments = [
    {
      id: '1',
      name: 'Lease Agreement',
      category: 'lease',
      uploadedAt: new Date(2024, 0, 1),
      size: '2.4 MB'
    },
    {
      id: '2',
      name: 'Property Insurance',
      category: 'insurance',
      uploadedAt: new Date(2024, 0, 15),
      size: '1.8 MB'
    },
    {
      id: '3',
      name: 'Inspection Report',
      category: 'inspection',
      uploadedAt: new Date(2024, 5, 10),
      size: '3.2 MB'
    }
  ];

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

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800';
      case 'high':
        return 'bg-orange-100 text-orange-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getMaintenanceStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'in_progress':
        return <Clock className="h-4 w-4 text-blue-600" />;
      case 'scheduled':
        return <Calendar className="h-4 w-4 text-orange-600" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-600" />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <Button variant="ghost" onClick={onBack} className="mb-4">
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back to Properties
          </Button>

          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold text-gray-900">
                  {property.details.address.street}
                </h1>
                <Badge className={getStatusColor(property.status)}>
                  {property.status}
                </Badge>
              </div>
              <div className="flex items-center text-gray-600">
                <MapPin className="h-4 w-4 mr-1" />
                <span>
                  {property.details.address.city}, {property.details.address.state} {property.details.address.zipCode}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </Button>
              <Button variant="outline" size="sm" onClick={onEdit}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
              <Button variant="outline" size="sm" onClick={onDelete}>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Property Value</p>
                  <p className="text-2xl font-bold text-gray-900">
                    ${property.details.price.toLocaleString()}
                  </p>
                </div>
                <Home className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Monthly Income</p>
                  <p className="text-2xl font-bold text-green-600">
                    ${monthlyIncome.toLocaleString()}
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
                  <p className="text-sm text-gray-600">ROI</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {roi.toFixed(2)}%
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Tenants</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {property.tenantIds.length}
                  </p>
                </div>
                <Users className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="tenants">
              Tenants ({property.tenantIds.length})
            </TabsTrigger>
            <TabsTrigger value="maintenance">
              Maintenance ({mockMaintenanceRequests.length})
            </TabsTrigger>
            <TabsTrigger value="financials">Financials</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6 mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                {/* Property Details */}
                <Card>
                  <CardHeader>
                    <CardTitle>Property Details</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center p-4 bg-gray-50 rounded-lg">
                        <Bed className="h-6 w-6 mx-auto mb-2 text-blue-600" />
                        <div className="text-2xl font-bold">{property.details.bedrooms}</div>
                        <div className="text-sm text-gray-600">Bedrooms</div>
                      </div>
                      <div className="text-center p-4 bg-gray-50 rounded-lg">
                        <Bath className="h-6 w-6 mx-auto mb-2 text-blue-600" />
                        <div className="text-2xl font-bold">{property.details.bathrooms}</div>
                        <div className="text-sm text-gray-600">Bathrooms</div>
                      </div>
                      <div className="text-center p-4 bg-gray-50 rounded-lg">
                        <Square className="h-6 w-6 mx-auto mb-2 text-blue-600" />
                        <div className="text-2xl font-bold">{property.details.squareFootage.toLocaleString()}</div>
                        <div className="text-sm text-gray-600">Sq Ft</div>
                      </div>
                      <div className="text-center p-4 bg-gray-50 rounded-lg">
                        <Home className="h-6 w-6 mx-auto mb-2 text-blue-600" />
                        <div className="text-2xl font-bold">{property.details.yearBuilt || 'N/A'}</div>
                        <div className="text-sm text-gray-600">Year Built</div>
                      </div>
                    </div>

                    <div className="mt-6 space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Property Type:</span>
                        <span className="font-medium capitalize">{property.details.propertyType.replace('-', ' ')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Listed Date:</span>
                        <span className="font-medium">{property.listingDate.toLocaleDateString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Last Updated:</span>
                        <span className="font-medium">{property.lastUpdated.toLocaleDateString()}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Features & Amenities */}
                {property.details.features && property.details.features.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Features & Amenities</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {property.details.features.map((feature, index) => (
                          <Badge key={index} variant="secondary">
                            {feature}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Description */}
                {property.details.description && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Description</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-gray-700 leading-relaxed">{property.details.description}</p>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                <PropertyMetricsCard property={property} metrics={metrics} />

                {/* Recent Activity */}
                <Card>
                  <CardHeader>
                    <CardTitle>Recent Activity</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-start space-x-3">
                        <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">Property listed</p>
                          <p className="text-xs text-gray-500">{property.listingDate.toLocaleDateString()}</p>
                        </div>
                      </div>
                      <div className="flex items-start space-x-3">
                        <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">Last updated</p>
                          <p className="text-xs text-gray-500">{property.lastUpdated.toLocaleDateString()}</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Tenants Tab */}
          <TabsContent value="tenants" className="space-y-6 mt-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Tenants</h2>
              <Button onClick={() => setShowAddTenantDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Tenant
              </Button>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {mockTenants.length > 0 ? (
                mockTenants.map((tenant) => (
                  <Card key={tenant.id}>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
                            <Users className="h-6 w-6 text-blue-600" />
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold">{tenant.name}</h3>
                            <p className="text-gray-600">{tenant.email}</p>
                            <p className="text-sm text-gray-500">{tenant.phone}</p>
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <p className="text-lg font-semibold">
                            ${tenant.monthlyRent.toLocaleString()}/month
                          </p>
                          <p className="text-sm text-gray-500">
                            Lease: {tenant.leaseStart.toLocaleDateString()} - {tenant.leaseEnd.toLocaleDateString()}
                          </p>
                          <Badge className="mt-2 bg-green-100 text-green-800">
                            {tenant.status}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <Card>
                  <CardContent className="p-12 text-center">
                    <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No tenants yet</h3>
                    <p className="text-gray-600 mb-4">
                      Add tenants to start tracking leases and payments
                    </p>
                    <Button onClick={() => setShowAddTenantDialog(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add First Tenant
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Maintenance Tab */}
          <TabsContent value="maintenance" className="space-y-6 mt-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Maintenance Requests</h2>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Request
              </Button>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {mockMaintenanceRequests.map((request) => (
                <Card key={request.id}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-4">
                        <div className="mt-1">
                          {getMaintenanceStatusIcon(request.status)}
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold">{request.title}</h3>
                          <p className="text-sm text-gray-600 mt-1">
                            Reported by: {request.tenant}
                          </p>
                          <p className="text-sm text-gray-500">
                            {request.createdAt.toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex flex-col items-end gap-2">
                        <Badge className={getPriorityColor(request.priority)}>
                          {request.priority}
                        </Badge>
                        <Badge variant="outline" className="capitalize">
                          {request.status.replace('_', ' ')}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Financials Tab */}
          <TabsContent value="financials" className="space-y-6 mt-6">
            <h2 className="text-2xl font-bold">Financial Overview</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-green-600">Income</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Monthly Rent:</span>
                      <span className="font-semibold">${monthlyIncome.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Annual Rent:</span>
                      <span className="font-semibold">${(monthlyIncome * 12).toLocaleString()}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-red-600">Expenses</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {property.financialInfo.expenses.map((expense, index) => (
                      <div key={index} className="flex justify-between">
                        <span className="text-gray-600 capitalize">{expense.category}:</span>
                        <span className="font-semibold">${expense.amount.toLocaleString()}</span>
                      </div>
                    ))}
                    <div className="flex justify-between pt-3 border-t">
                      <span className="text-gray-600 font-semibold">Total Monthly:</span>
                      <span className="font-bold">${monthlyExpenses.toLocaleString()}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Net Income & ROI</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">Monthly Net Income</p>
                    <p className="text-2xl font-bold text-blue-600">
                      ${netIncome.toLocaleString()}
                    </p>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">Annual Net Income</p>
                    <p className="text-2xl font-bold text-green-600">
                      ${(netIncome * 12).toLocaleString()}
                    </p>
                  </div>
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">ROI</p>
                    <p className="text-2xl font-bold text-purple-600">
                      {roi.toFixed(2)}%
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Documents Tab */}
          <TabsContent value="documents" className="space-y-6 mt-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Documents</h2>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Upload Document
              </Button>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {mockDocuments.map((doc) => (
                <Card key={doc.id}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <FileText className="h-8 w-8 text-blue-600" />
                        <div>
                          <h3 className="font-semibold">{doc.name}</h3>
                          <p className="text-sm text-gray-600">
                            {doc.size} • Uploaded {doc.uploadedAt.toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="capitalize">
                          {doc.category}
                        </Badge>
                        <Button variant="outline" size="sm">
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Add Tenant Dialog */}
      <TenantDialog
        open={showAddTenantDialog}
        onOpenChange={setShowAddTenantDialog}
        propertyId={property.id}
        propertyAddress={propertyAddress}
        onSuccess={() => {
          // Refresh tenant list
        }}
      />
    </div>
  );
}