import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Grid3x3, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import VendorCard from '@/components/vendor/VendorCard';
import VendorForm from '@/components/vendor/VendorForm';
import { vendorService } from '@/services/vendorService';
import { VENDOR_CATEGORIES, VENDOR_STATUSES } from '@/types/vendor';
import type { CreateVendorParams, UpdateVendorParams, VendorFilterParams, Vendor, VendorCategory, VendorStatus } from '@/types/vendor';

export default function VendorDirectory() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('active');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);

  // Build filter params
  const filters: VendorFilterParams = {
    search: searchQuery || undefined,
    category: categoryFilter !== 'all' ? categoryFilter as VendorCategory : undefined,
    status: statusFilter !== 'all' ? statusFilter as VendorStatus : undefined,
  };

  // Fetch vendors
  const { data: vendors = [], isLoading } = useQuery({
    queryKey: ['vendors', filters],
    queryFn: () => vendorService.getVendors(filters),
  });

  // Create vendor mutation
  const createMutation = useMutation({
    mutationFn: (data: CreateVendorParams) => vendorService.createVendor(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      setShowCreateModal(false);
      toast({
        title: 'Vendor Created',
        description: 'The vendor has been successfully created.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create vendor',
        variant: 'destructive',
      });
    },
  });

  // Update vendor mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateVendorParams }) =>
      vendorService.updateVendor(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      setEditingVendor(null);
      toast({
        title: 'Vendor Updated',
        description: 'The vendor has been successfully updated.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update vendor',
        variant: 'destructive',
      });
    },
  });

  // Delete vendor mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => vendorService.deleteVendor(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      toast({
        title: 'Vendor Deleted',
        description: 'The vendor has been successfully deleted.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete vendor',
        variant: 'destructive',
      });
    },
  });

  const handleCreateVendor = (data: CreateVendorParams) => {
    createMutation.mutate(data);
  };

  const handleUpdateVendor = (data: UpdateVendorParams) => {
    if (editingVendor) {
      updateMutation.mutate({ id: editingVendor.id, data });
    }
  };

  const handleDeleteVendor = (vendor: Vendor) => {
    if (confirm(`Are you sure you want to delete ${vendor.company_name}?`)) {
      deleteMutation.mutate(vendor.id);
    }
  };

  return (
    <div className="container mx-auto py-8 max-w-7xl">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Vendor Directory</h1>
            <p className="text-gray-600 mt-2">
              Manage your service providers and contractors
            </p>
          </div>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Vendor
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <Input
              placeholder="Search vendors..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {VENDOR_CATEGORIES.map((cat) => (
                <SelectItem key={cat.value} value={cat.value}>
                  {cat.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              {VENDOR_STATUSES.map((status) => (
                <SelectItem key={status.value} value={status.value}>
                  {status.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex gap-2">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'outline'}
              size="icon"
              onClick={() => setViewMode('grid')}
            >
              <Grid3x3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'outline'}
              size="icon"
              onClick={() => setViewMode('list')}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Vendor List */}
        {isLoading ? (
          <div className="text-center py-12">Loading vendors...</div>
        ) : vendors.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600">No vendors found</p>
            <Button
              variant="outline"
              onClick={() => setShowCreateModal(true)}
              className="mt-4"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Vendor
            </Button>
          </div>
        ) : (
          <div
            className={
              viewMode === 'grid'
                ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
                : 'space-y-4'
            }
          >
            {vendors.map((vendor) => (
              <VendorCard
                key={vendor.id}
                vendor={vendor}
                onEdit={() => setEditingVendor(vendor)}
                onDelete={() => handleDeleteVendor(vendor)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Create Vendor Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Vendor</DialogTitle>
          </DialogHeader>
          <VendorForm
            onSubmit={handleCreateVendor}
            onCancel={() => setShowCreateModal(false)}
            isLoading={createMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Vendor Modal */}
      <Dialog open={!!editingVendor} onOpenChange={() => setEditingVendor(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Vendor</DialogTitle>
          </DialogHeader>
          {editingVendor && (
            <VendorForm
              vendor={editingVendor}
              onSubmit={handleUpdateVendor}
              onCancel={() => setEditingVendor(null)}
              isLoading={updateMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}