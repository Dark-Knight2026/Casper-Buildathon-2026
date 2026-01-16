/**
 * Lease Export Manager Component
 * Export lease data in various formats
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import {
  Download,
  FileText,
  Table,
  FileSpreadsheet,
  CheckCircle
} from 'lucide-react';
import { LeaseAgreement } from '@/types/lease';
import { useToast } from '@/hooks/use-toast';

interface LeaseExportManagerProps {
  leases: LeaseAgreement[];
}

export default function LeaseExportManager({ leases }: LeaseExportManagerProps) {
  const { toast } = useToast();
  const [format, setFormat] = useState<'csv' | 'excel' | 'pdf' | 'json'>('csv');
  const [isExporting, setIsExporting] = useState(false);
  const [selectedFields, setSelectedFields] = useState<string[]>([
    'id',
    'propertyId',
    'status',
    'startDate',
    'endDate',
    'monthlyRent'
  ]);

  const availableFields = [
    { id: 'id', label: 'Lease ID' },
    { id: 'propertyId', label: 'Property ID' },
    { id: 'landlordId', label: 'Landlord ID' },
    { id: 'tenantIds', label: 'Tenant IDs' },
    { id: 'type', label: 'Lease Type' },
    { id: 'status', label: 'Status' },
    { id: 'startDate', label: 'Start Date' },
    { id: 'endDate', label: 'End Date' },
    { id: 'monthlyRent', label: 'Monthly Rent' },
    { id: 'securityDeposit', label: 'Security Deposit' },
    { id: 'createdAt', label: 'Created Date' }
  ];

  const formatOptions = [
    {
      value: 'csv',
      label: 'CSV',
      description: 'Comma-separated values',
      icon: <Table className="h-5 w-5" />
    },
    {
      value: 'excel',
      label: 'Excel',
      description: 'Microsoft Excel format',
      icon: <FileSpreadsheet className="h-5 w-5" />
    },
    {
      value: 'pdf',
      label: 'PDF',
      description: 'Portable document format',
      icon: <FileText className="h-5 w-5" />
    },
    {
      value: 'json',
      label: 'JSON',
      description: 'JavaScript object notation',
      icon: <FileText className="h-5 w-5" />
    }
  ];

  const toggleField = (fieldId: string) => {
    setSelectedFields(prev =>
      prev.includes(fieldId)
        ? prev.filter(f => f !== fieldId)
        : [...prev, fieldId]
    );
  };

  const handleExport = async () => {
    setIsExporting(true);

    // Simulate export
    await new Promise(resolve => setTimeout(resolve, 2000));

    toast({
      title: 'Export Complete',
      description: `${leases.length} leases exported as ${format.toUpperCase()}`
    });

    setIsExporting(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle>Export Leases</CardTitle>
          <CardDescription>
            Export {leases.length} lease{leases.length !== 1 ? 's' : ''} in your preferred format
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Format Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Select Export Format</CardTitle>
        </CardHeader>
        <CardContent>
          <RadioGroup value={format} onValueChange={(v) => setFormat(v as typeof format)}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {formatOptions.map(option => (
                <div key={option.value} className="flex items-start space-x-3">
                  <RadioGroupItem value={option.value} id={option.value} />
                  <Label
                    htmlFor={option.value}
                    className="flex items-start gap-3 cursor-pointer flex-1"
                  >
                    <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                      {option.icon}
                    </div>
                    <div>
                      <p className="font-medium">{option.label}</p>
                      <p className="text-sm text-gray-600">{option.description}</p>
                    </div>
                  </Label>
                </div>
              ))}
            </div>
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Field Selection */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Select Fields to Export</CardTitle>
            <Badge variant="outline">
              {selectedFields.length} of {availableFields.length} selected
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {availableFields.map(field => (
              <div key={field.id} className="flex items-center space-x-2">
                <Checkbox
                  id={field.id}
                  checked={selectedFields.includes(field.id)}
                  onCheckedChange={() => toggleField(field.id)}
                />
                <Label
                  htmlFor={field.id}
                  className="text-sm cursor-pointer"
                >
                  {field.label}
                </Label>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Export Summary */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <CheckCircle className="h-6 w-6 text-blue-600 flex-shrink-0" />
            <div className="flex-1">
              <h4 className="font-semibold text-blue-900 mb-2">Export Summary</h4>
              <ul className="space-y-1 text-sm text-blue-800">
                <li>• {leases.length} lease records</li>
                <li>• {selectedFields.length} fields per record</li>
                <li>• Format: {format.toUpperCase()}</li>
                <li>• Estimated file size: {Math.round(leases.length * selectedFields.length * 0.1)}KB</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Export Button */}
      <div className="flex justify-end">
        <Button
          size="lg"
          onClick={handleExport}
          disabled={isExporting || selectedFields.length === 0}
        >
          <Download className="h-4 w-4 mr-2" />
          {isExporting ? 'Exporting...' : 'Export Leases'}
        </Button>
      </div>
    </div>
  );
}