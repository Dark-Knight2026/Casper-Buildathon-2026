import React, { useState, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Download, Sparkles, RefreshCw, Bell, Home } from 'lucide-react';
import { useLandlordManagement } from '@/contexts/LandlordManagementContext';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Property } from '@/types/clientLandlord';
import PropertyListEnhanced from '@/components/property/PropertyListEnhanced';
import AddPropertyWizard from '@/components/property/AddPropertyWizard';
import AdvancedFilter, { FilterOption, ActiveFilter, SavedFilter } from '@/components/shared/AdvancedFilter';
import BulkOperations from '@/components/shared/BulkOperations';
import SmartFilterSuggestions from '@/components/shared/SmartFilterSuggestions';
import { EmptyState } from '@/components/ui/empty-state';

export const PropertyList: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { 
    clients, 
    properties, 
    getTenantsForProperty 
  } = useLandlordManagement();

  // State
  const [showAddPropertyWizard, setShowAddPropertyWizard] = useState(false);
  const [showSmartFilters, setShowSmartFilters] = useState(false);
  const [propertyFilters, setPropertyFilters] = useState<ActiveFilter[]>([]);
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([]);
  const [selectedPropertyIds, setSelectedPropertyIds] = useState<string[]>([]);

  // Memoize current landlord
  const currentLandlord = useMemo(() => 
    clients.find(c => c.personalInfo.email === user?.email),
    [clients, user?.email]
  );

  // Memoize landlord properties
  const landlordProperties = useMemo(() => 
    currentLandlord ? properties.filter(p => currentLandlord.propertyIds.includes(p.id)) : [],
    [currentLandlord, properties]
  );

  // Memoize property metrics (simplified for list view)
  const propertiesWithMetrics = useMemo(() => 
    landlordProperties.map(property => {
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
        property,
        metrics: {
          monthlyIncome,
          monthlyExpenses,
          netIncome,
          roi,
          daysVacant,
          occupancyRate: property.tenantIds.length > 0 ? 100 : 0
        }
      };
    }),
    [landlordProperties]
  );

  // Filter Options
  const propertyFilterOptions: FilterOption[] = useMemo(() => [
    {
      id: 'status',
      label: 'Status',
      type: 'select',
      options: [
        { value: 'available', label: 'Available' },
        { value: 'rented', label: 'Rented' },
        { value: 'maintenance', label: 'Under Maintenance' }
      ]
    },
    {
      id: 'city',
      label: 'City',
      type: 'text'
    },
    {
      id: 'roi',
      label: 'ROI (%)',
      type: 'range'
    },
    {
      id: 'monthlyIncome',
      label: 'Monthly Income',
      type: 'range'
    },
    {
      id: 'bedrooms',
      label: 'Bedrooms',
      type: 'number'
    }
  ], []);

  // Handlers
  const handleAddProperty = useCallback(() => {
    setShowAddPropertyWizard(true);
  }, []);

  const handleAddPropertyComplete = useCallback((formData: unknown) => {
    console.log('Adding property:', formData);
    toast({
      title: 'Property Added',
      description: 'Your property has been successfully added to your portfolio.'
    });
    setShowAddPropertyWizard(false);
  }, [toast]);

  const handlePropertySelect = useCallback((property: Property) => {
    // Navigate to property details (future implementation)
    toast({
      title: 'Property Selected',
      description: `Selected ${property.details.address.street}`
    });
  }, [toast]);

  const handlePropertyEdit = useCallback((property: Property) => {
    toast({
      title: 'Edit Property',
      description: 'Property editing functionality will be available soon.'
    });
  }, [toast]);

  const handleSaveFilter = useCallback((name: string, filters: ActiveFilter[]) => {
    const newFilter: SavedFilter = {
      id: `filter-${Date.now()}`,
      name,
      filters,
      createdAt: new Date()
    };
    setSavedFilters(prev => [...prev, newFilter]);
  }, []);

  const handleLoadFilter = useCallback((filter: SavedFilter) => {
    setPropertyFilters(filter.filters);
  }, []);

  const handleDeleteFilter = useCallback((filterId: string) => {
    setSavedFilters(prev => prev.filter(f => f.id !== filterId));
  }, []);

  const handleBulkAction = useCallback((action: { id: string }, selectedIds: string[], options?: Record<string, string>) => {
    console.log('Bulk action:', action, selectedIds, options);
    toast({
      title: 'Bulk Action Complete',
      description: `${action.id} applied to ${selectedIds.length} items`
    });
  }, [toast]);

  const handleApplySmartFilter = useCallback((filters: { field: string; operator: string; value: string | number | Date }[]) => {
    console.log('Apply smart filter:', filters);
    toast({
      title: 'Filter Applied',
      description: 'Smart filter has been applied to your data'
    });
  }, [toast]);

  const handleExport = useCallback(() => {
    toast({
      title: 'Export Initiated',
      description: 'Downloading property list...'
    });
  }, [toast]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Properties</h1>
          <p className="text-muted-foreground">
            Manage your {landlordProperties.length} properties
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowSmartFilters(!showSmartFilters)} variant="outline">
            <Sparkles className="h-4 w-4 mr-2" />
            Smart Filters
          </Button>
          <Button onClick={handleExport} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button onClick={handleAddProperty}>
            <Plus className="h-4 w-4 mr-2" />
            Add Property
          </Button>
        </div>
      </div>

      {showSmartFilters && (
        <SmartFilterSuggestions
          data={landlordProperties}
          onApplyFilter={handleApplySmartFilter}
        />
      )}

      <AdvancedFilter
        options={propertyFilterOptions}
        activeFilters={propertyFilters}
        onFiltersChange={setPropertyFilters}
        savedFilters={savedFilters}
        onSaveFilter={handleSaveFilter}
        onLoadFilter={handleLoadFilter}
        onDeleteFilter={handleDeleteFilter}
      />

      {selectedPropertyIds.length > 0 && (
        <BulkOperations
          selectedCount={selectedPropertyIds.length}
          actions={[
            { id: 'export', label: 'Export Selected', icon: Download },
            { id: 'update-status', label: 'Update Status', icon: RefreshCw },
            { id: 'send-notice', label: 'Send Notice', icon: Bell }
          ]}
          onAction={handleBulkAction}
          onClearSelection={() => setSelectedPropertyIds([])}
        />
      )}

      {landlordProperties.length > 0 ? (
        <PropertyListEnhanced
          properties={landlordProperties}
          onPropertySelect={handlePropertySelect}
          onPropertyEdit={handlePropertyEdit}
          filters={propertyFilters}
          selectedIds={selectedPropertyIds}
          onSelectionChange={setSelectedPropertyIds}
        />
      ) : (
        <EmptyState
          icon={Home}
          title="No properties yet"
          description="Add your first property to start managing your rental portfolio"
          action={{
            label: "Add Property",
            onClick: handleAddProperty
          }}
        />
      )}

      {showAddPropertyWizard && (
        <AddPropertyWizard
          onComplete={handleAddPropertyComplete}
          onCancel={() => setShowAddPropertyWizard(false)}
        />
      )}
    </div>
  );
};