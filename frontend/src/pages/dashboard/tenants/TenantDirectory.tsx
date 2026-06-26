import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { 
  Search, 
  Filter, 
  MoreHorizontal, 
  User, 
  Mail, 
  Phone, 
  Home, 
  Download,
  Plus
} from 'lucide-react';
import { useLandlordManagement } from '@/contexts/LandlordManagementContext';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import TenantDialog from '@/components/tenant/TenantDialog';

export const TenantDirectory: React.FC = () => {
  const { tenants, properties } = useLandlordManagement();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddTenantDialog, setShowAddTenantDialog] = useState(false);

  const filteredTenants = useMemo(() => {
    return tenants.filter(tenant => {
      const searchLower = searchQuery.toLowerCase();
      const fullName = `${tenant.personalInfo.firstName} ${tenant.personalInfo.lastName}`.toLowerCase();
      const email = tenant.personalInfo.email.toLowerCase();
      const property = properties.find(p => p.id === tenant.propertyId);
      const address = property?.details.address.street.toLowerCase() || '';

      return (
        fullName.includes(searchLower) ||
        email.includes(searchLower) ||
        address.includes(searchLower)
      );
    });
  }, [tenants, properties, searchQuery]);

  const getPropertyAddress = (propertyId: string) => {
    const property = properties.find(p => p.id === propertyId);
    return property ? property.details.address.street : 'Unknown Property';
  };

  const handleViewDetails = (tenantId: string) => {
    toast({
      title: "View Details",
      description: `Viewing details for tenant ${tenantId}`,
    });
  };

  const handleContact = (email: string) => {
    window.location.href = `mailto:${email}`;
  };

  const handleAddTenantSuccess = () => {
    toast({
      title: "Success",
      description: "Tenant has been added successfully",
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tenants</h1>
          <p className="text-muted-foreground">
            Manage your {tenants.length} tenants across all properties.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button onClick={() => setShowAddTenantDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Tenant
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <CardTitle>Tenant Directory</CardTitle>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative w-full sm:w-[300px]">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, email, or property..."
                  className="pl-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Button variant="outline" size="icon">
                <Filter className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tenant</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Property</TableHead>
                  <TableHead>Lease Term</TableHead>
                  <TableHead>Rent Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTenants.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      No tenants found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTenants.map((tenant) => (
                    <TableRow key={tenant.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                            <User className="h-5 w-5 text-muted-foreground" />
                          </div>
                          <div className="flex flex-col">
                            <span className="font-medium">
                              {tenant.personalInfo.firstName} {tenant.personalInfo.lastName}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              ID: {tenant.id.slice(0, 8)}
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1 text-sm">
                          <div className="flex items-center gap-2">
                            <Mail className="h-3 w-3 text-muted-foreground" />
                            <span>{tenant.personalInfo.email}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Phone className="h-3 w-3 text-muted-foreground" />
                            <span>{tenant.personalInfo.phone}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Home className="h-4 w-4 text-muted-foreground" />
                          <span>{getPropertyAddress(tenant.propertyId)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col text-sm">
                          <span>{format(new Date(tenant.leaseInfo.startDate), 'MMM d, yyyy')}</span>
                          <span className="text-muted-foreground text-xs">
                            to {format(new Date(tenant.leaseInfo.endDate), 'MMM d, yyyy')}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          Paid
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Open menu</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => handleViewDetails(tenant.id)}>
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleContact(tenant.personalInfo.email)}>
                              Send Email
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-red-600">
                              End Lease
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Add Tenant Dialog */}
      <TenantDialog
        open={showAddTenantDialog}
        onOpenChange={setShowAddTenantDialog}
        onSuccess={handleAddTenantSuccess}
      />
    </div>
  );
};