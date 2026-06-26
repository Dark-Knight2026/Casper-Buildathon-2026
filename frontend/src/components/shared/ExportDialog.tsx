import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Download, FileText, Table, FileSpreadsheet } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exportType: 'properties' | 'tenants' | 'financials' | 'maintenance';
  data: unknown[];
}

const EXPORT_FORMATS = [
  { value: 'csv', label: 'CSV', icon: Table, description: 'Comma-separated values' },
  { value: 'excel', label: 'Excel', icon: FileSpreadsheet, description: 'Microsoft Excel format' },
  { value: 'pdf', label: 'PDF', icon: FileText, description: 'Portable Document Format' }
];

const PROPERTY_FIELDS = [
  { id: 'address', label: 'Address', default: true },
  { id: 'status', label: 'Status', default: true },
  { id: 'type', label: 'Property Type', default: true },
  { id: 'price', label: 'Purchase Price', default: true },
  { id: 'monthlyIncome', label: 'Monthly Income', default: true },
  { id: 'monthlyExpenses', label: 'Monthly Expenses', default: true },
  { id: 'roi', label: 'ROI', default: true },
  { id: 'bedrooms', label: 'Bedrooms', default: false },
  { id: 'bathrooms', label: 'Bathrooms', default: false },
  { id: 'squareFeet', label: 'Square Feet', default: false },
  { id: 'yearBuilt', label: 'Year Built', default: false },
  { id: 'listingDate', label: 'Listing Date', default: false }
];

const TENANT_FIELDS = [
  { id: 'name', label: 'Name', default: true },
  { id: 'email', label: 'Email', default: true },
  { id: 'phone', label: 'Phone', default: true },
  { id: 'property', label: 'Property Address', default: true },
  { id: 'monthlyRent', label: 'Monthly Rent', default: true },
  { id: 'leaseStart', label: 'Lease Start Date', default: true },
  { id: 'leaseEnd', label: 'Lease End Date', default: true },
  { id: 'status', label: 'Status', default: true },
  { id: 'securityDeposit', label: 'Security Deposit', default: false },
  { id: 'moveInDate', label: 'Move-in Date', default: false }
];

const FINANCIAL_FIELDS = [
  { id: 'property', label: 'Property', default: true },
  { id: 'monthlyIncome', label: 'Monthly Income', default: true },
  { id: 'monthlyExpenses', label: 'Monthly Expenses', default: true },
  { id: 'netIncome', label: 'Net Income', default: true },
  { id: 'roi', label: 'ROI', default: true },
  { id: 'occupancyRate', label: 'Occupancy Rate', default: true },
  { id: 'totalValue', label: 'Total Property Value', default: false },
  { id: 'annualIncome', label: 'Annual Income', default: false },
  { id: 'annualExpenses', label: 'Annual Expenses', default: false }
];

const MAINTENANCE_FIELDS = [
  { id: 'title', label: 'Title', default: true },
  { id: 'property', label: 'Property', default: true },
  { id: 'tenant', label: 'Tenant', default: true },
  { id: 'priority', label: 'Priority', default: true },
  { id: 'status', label: 'Status', default: true },
  { id: 'category', label: 'Category', default: true },
  { id: 'createdDate', label: 'Created Date', default: true },
  { id: 'vendor', label: 'Assigned Vendor', default: false },
  { id: 'estimatedCost', label: 'Estimated Cost', default: false },
  { id: 'actualCost', label: 'Actual Cost', default: false },
  { id: 'completedDate', label: 'Completed Date', default: false }
];

export default function ExportDialog({
  open,
  onOpenChange,
  exportType,
  data
}: ExportDialogProps) {
  const { toast } = useToast();
  const [format, setFormat] = useState('csv');
  const [selectedFields, setSelectedFields] = useState<string[]>([]);

  const getFieldsForType = () => {
    switch (exportType) {
      case 'properties':
        return PROPERTY_FIELDS;
      case 'tenants':
        return TENANT_FIELDS;
      case 'financials':
        return FINANCIAL_FIELDS;
      case 'maintenance':
        return MAINTENANCE_FIELDS;
      default:
        return [];
    }
  };

  const fields = getFieldsForType();

  // Initialize selected fields with defaults
  useState(() => {
    const defaultFields = fields.filter(f => f.default).map(f => f.id);
    setSelectedFields(defaultFields);
  });

  const toggleField = (fieldId: string) => {
    setSelectedFields(prev =>
      prev.includes(fieldId)
        ? prev.filter(id => id !== fieldId)
        : [...prev, fieldId]
    );
  };

  const selectAll = () => {
    setSelectedFields(fields.map(f => f.id));
  };

  const selectDefaults = () => {
    setSelectedFields(fields.filter(f => f.default).map(f => f.id));
  };

  const handleExport = () => {
    if (selectedFields.length === 0) {
      toast({
        title: 'No Fields Selected',
        description: 'Please select at least one field to export',
        variant: 'destructive'
      });
      return;
    }

    // Simulate export
    const filename = `${exportType}_export_${new Date().toISOString().split('T')[0]}.${format}`;
    
    toast({
      title: 'Export Started',
      description: `Exporting ${data.length} records to ${format.toUpperCase()}...`
    });

    // Simulate export delay
    setTimeout(() => {
      toast({
        title: 'Export Complete',
        description: `File "${filename}" has been downloaded successfully`
      });
      onOpenChange(false);
    }, 1500);
  };

  const getExportTitle = () => {
    switch (exportType) {
      case 'properties':
        return 'Export Properties';
      case 'tenants':
        return 'Export Tenants';
      case 'financials':
        return 'Export Financial Report';
      case 'maintenance':
        return 'Export Maintenance Requests';
      default:
        return 'Export Data';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{getExportTitle()}</DialogTitle>
          <DialogDescription>
            Select the format and fields you want to export. {data.length} record{data.length !== 1 ? 's' : ''} will be exported.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Format Selection */}
          <div>
            <Label className="mb-3 block">Export Format</Label>
            <div className="grid grid-cols-3 gap-3">
              {EXPORT_FORMATS.map(fmt => {
                const Icon = fmt.icon;
                return (
                  <button
                    key={fmt.value}
                    onClick={() => setFormat(fmt.value)}
                    className={`p-4 border rounded-lg text-left transition-colors ${
                      format === fmt.value
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <Icon className={`h-6 w-6 mb-2 ${format === fmt.value ? 'text-blue-600' : 'text-gray-600'}`} />
                    <div className="font-semibold">{fmt.label}</div>
                    <div className="text-xs text-gray-500">{fmt.description}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Field Selection */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <Label>Select Fields to Export</Label>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={selectDefaults}
                >
                  Default Fields
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={selectAll}
                >
                  Select All
                </Button>
              </div>
            </div>

            <div className="border rounded-lg p-4 max-h-60 overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                {fields.map(field => (
                  <div key={field.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={field.id}
                      checked={selectedFields.includes(field.id)}
                      onCheckedChange={() => toggleField(field.id)}
                    />
                    <label
                      htmlFor={field.id}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      {field.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <p className="text-sm text-gray-500 mt-2">
              {selectedFields.length} field{selectedFields.length !== 1 ? 's' : ''} selected
            </p>
          </div>

          {/* Export Summary */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Download className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-blue-900">Export Summary</p>
                <p className="text-sm text-blue-700 mt-1">
                  {data.length} record{data.length !== 1 ? 's' : ''} • {selectedFields.length} field{selectedFields.length !== 1 ? 's' : ''} • {format.toUpperCase()} format
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleExport} disabled={selectedFields.length === 0}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}