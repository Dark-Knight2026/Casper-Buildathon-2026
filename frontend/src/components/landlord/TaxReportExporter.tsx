import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useTaxPreparation } from '@/contexts/TaxPreparationContext';
import { useLandlordManagement } from '@/contexts/LandlordManagementContext';
import {
  Download,
  FileSpreadsheet,
  FileText,
  FileJson,
  CheckCircle,
  Share2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface TaxReportExporterProps {
  landlordId: string;
}

type ExportFormat = 'pdf' | 'csv' | 'excel' | 'turbotax' | 'json';

export default function TaxReportExporter({ landlordId }: TaxReportExporterProps) {
  const { toast } = useToast();
  const { selectedTaxYear, taxYearSummary } = useTaxPreparation();
  const { properties } = useLandlordManagement();
  const landlordProperties = properties.filter(p => p.landlordId === landlordId);

  const [exportFormat, setExportFormat] = useState<ExportFormat>('pdf');
  const [selectedProperties, setSelectedProperties] = useState<string[]>([]);
  const [includeReceipts, setIncludeReceipts] = useState(true);
  const [includeDepreciation, setIncludeDepreciation] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  const handleSelectAllProperties = () => {
    if (selectedProperties.length === landlordProperties.length) {
      setSelectedProperties([]);
    } else {
      setSelectedProperties(landlordProperties.map(p => p.id));
    }
  };

  const handlePropertyToggle = (propertyId: string) => {
    setSelectedProperties(prev =>
      prev.includes(propertyId)
        ? prev.filter(id => id !== propertyId)
        : [...prev, propertyId]
    );
  };

  const handleExport = async () => {
    if (selectedProperties.length === 0) {
      toast({
        title: 'No Properties Selected',
        description: 'Please select at least one property to export.',
        variant: 'destructive',
      });
      return;
    }

    setIsExporting(true);

    // Simulate export process
    setTimeout(() => {
      setIsExporting(false);
      toast({
        title: 'Export Complete',
        description: `Tax report for ${selectedTaxYear} has been exported as ${exportFormat.toUpperCase()}.`,
      });
    }, 2000);
  };

  const getFormatIcon = (format: string) => {
    switch (format) {
      case 'pdf': return <FileText className="h-5 w-5" />;
      case 'csv':
      case 'excel': return <FileSpreadsheet className="h-5 w-5" />;
      case 'json': return <FileJson className="h-5 w-5" />;
      case 'turbotax': return <CheckCircle className="h-5 w-5" />;
      default: return <FileText className="h-5 w-5" />;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Tax Report Exporter</h2>
        <p className="text-gray-600 mt-1">
          Export your tax data in various formats for filing or sharing with your CPA
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Configuration Panel */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Export Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Format Selection */}
            <div className="space-y-3">
              <Label>Export Format</Label>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {[
                  { id: 'pdf', label: 'PDF Report', icon: FileText },
                  { id: 'csv', label: 'CSV Data', icon: FileSpreadsheet },
                  { id: 'excel', label: 'Excel Sheet', icon: FileSpreadsheet },
                  { id: 'turbotax', label: 'TurboTax', icon: CheckCircle },
                  { id: 'json', label: 'JSON Data', icon: FileJson },
                ].map((format) => (
                  <div
                    key={format.id}
                    className={`flex flex-col items-center justify-center p-3 rounded-lg border cursor-pointer transition-all ${
                      exportFormat === format.id
                        ? 'bg-blue-50 border-blue-500 ring-1 ring-blue-500'
                        : 'bg-white hover:bg-gray-50'
                    }`}
                    onClick={() => setExportFormat(format.id as ExportFormat)}
                  >
                    <format.icon className={`h-6 w-6 mb-2 ${
                      exportFormat === format.id ? 'text-blue-600' : 'text-gray-500'
                    }`} />
                    <span className={`text-xs font-medium ${
                      exportFormat === format.id ? 'text-blue-700' : 'text-gray-600'
                    }`}>
                      {format.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Property Selection */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Select Properties</Label>
                <Button variant="ghost" size="sm" onClick={handleSelectAllProperties}>
                  {selectedProperties.length === landlordProperties.length ? 'Deselect All' : 'Select All'}
                </Button>
              </div>
              <div className="border rounded-lg divide-y max-h-60 overflow-y-auto">
                {landlordProperties.map(property => (
                  <div key={property.id} className="flex items-center p-3 hover:bg-gray-50">
                    <Checkbox
                      id={`prop-${property.id}`}
                      checked={selectedProperties.includes(property.id)}
                      onCheckedChange={() => handlePropertyToggle(property.id)}
                    />
                    <label
                      htmlFor={`prop-${property.id}`}
                      className="ml-3 flex-1 text-sm font-medium cursor-pointer"
                    >
                      {property.details.address.street}
                      <span className="block text-xs text-gray-500">
                        {property.details.address.city}, {property.details.address.state}
                      </span>
                    </label>
                    {taxYearSummary?.propertySummaries.find(p => p.propertyId === property.id) && (
                      <Badge variant="secondary" className="ml-2 text-xs">
                        Has Data
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-500">
                {selectedProperties.length} properties selected
              </p>
            </div>

            {/* Options */}
            <div className="space-y-3">
              <Label>Additional Options</Label>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="include-receipts"
                    checked={includeReceipts}
                    onCheckedChange={(checked) => setIncludeReceipts(!!checked)}
                  />
                  <label htmlFor="include-receipts" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    Include receipt images (PDF only)
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="include-depreciation"
                    checked={includeDepreciation}
                    onCheckedChange={(checked) => setIncludeDepreciation(!!checked)}
                  />
                  <label htmlFor="include-depreciation" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    Include depreciation schedule
                  </label>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t">
              <Button 
                className="w-full" 
                size="lg" 
                onClick={handleExport}
                disabled={isExporting || selectedProperties.length === 0}
              >
                {isExporting ? (
                  <>
                    <Download className="h-4 w-4 mr-2 animate-bounce" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Export Report
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Summary Panel */}
        <div className="space-y-6">
          <Card className="bg-blue-50 border-blue-200">
            <CardHeader>
              <CardTitle className="text-blue-900 text-lg">Export Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-blue-800">Tax Year:</span>
                <span className="font-semibold text-blue-900">{selectedTaxYear}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-blue-800">Format:</span>
                <span className="font-semibold text-blue-900 uppercase">{exportFormat}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-blue-800">Properties:</span>
                <span className="font-semibold text-blue-900">{selectedProperties.length}</span>
              </div>
              <div className="pt-3 border-t border-blue-200">
                <p className="text-xs text-blue-700">
                  This export includes sensitive financial data. Please ensure you store it securely.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Integration Partners</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-3 border rounded-lg flex items-center gap-3">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <p className="font-semibold text-sm">TurboTax</p>
                  <p className="text-xs text-gray-500">Direct import supported</p>
                </div>
              </div>
              <div className="p-3 border rounded-lg flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <FileSpreadsheet className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="font-semibold text-sm">QuickBooks</p>
                  <p className="text-xs text-gray-500">Export as IIF or CSV</p>
                </div>
              </div>
              <div className="p-3 border rounded-lg flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <Share2 className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="font-semibold text-sm">H&R Block</p>
                  <p className="text-xs text-gray-500">Compatible PDF/CSV</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}