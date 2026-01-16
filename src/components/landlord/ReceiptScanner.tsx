import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useTaxPreparation } from '@/contexts/TaxPreparationContext';
import { useLandlordManagement } from '@/contexts/LandlordManagementContext';
import { SCHEDULE_E_CATEGORIES, ScheduleECategory } from '@/types/landlordTax';
import {
  Camera,
  Upload,
  FileText,
  CheckCircle,
  XCircle,
  Loader2,
  Image as ImageIcon,
  Trash2,
  Save
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ReceiptScannerProps {
  landlordId: string;
}

interface ScannedReceipt {
  id: string;
  file: File;
  previewUrl: string;
  status: 'scanning' | 'complete' | 'error';
  data?: {
    merchant?: string;
    date?: string;
    amount?: number;
    category?: ScheduleECategory;
    confidence: number;
  };
}

export default function ReceiptScanner({ landlordId }: ReceiptScannerProps) {
  const { toast } = useToast();
  const { categorizeExpense } = useTaxPreparation();
  const { properties } = useLandlordManagement();
  const landlordProperties = properties.filter(p => p.landlordId === landlordId);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [receipts, setReceipts] = useState<ScannedReceipt[]>([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('');

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const newReceipts: ScannedReceipt[] = Array.from(files).map(file => ({
      id: `receipt-${Date.now()}-${Math.random()}`,
      file,
      previewUrl: URL.createObjectURL(file),
      status: 'scanning'
    }));

    setReceipts(prev => [...prev, ...newReceipts]);
    
    // Simulate OCR processing for each new receipt
    newReceipts.forEach(receipt => processReceipt(receipt.id));
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const processReceipt = (receiptId: string) => {
    // Simulate API call to OCR service
    setTimeout(() => {
      setReceipts(prev => prev.map(r => {
        if (r.id !== receiptId) return r;
        
        // Mock OCR results
        return {
          ...r,
          status: 'complete',
          data: {
            merchant: 'Home Depot',
            date: new Date().toISOString().split('T')[0],
            amount: Math.floor(Math.random() * 500) + 50,
            category: 'repairs',
            confidence: 0.92
          }
        };
      }));
      
      toast({
        title: 'Scan Complete',
        description: 'Receipt processed successfully.',
      });
    }, 2000);
  };

  const handleSaveReceipt = async (receipt: ScannedReceipt) => {
    if (!selectedPropertyId) {
      toast({
        title: 'Property Required',
        description: 'Please select a property for this expense.',
        variant: 'destructive',
      });
      return;
    }

    if (!receipt.data) return;

    try {
      // In a real app, this would upload the file and create an expense record
      // For now, we'll just simulate success
      
      toast({
        title: 'Expense Saved',
        description: `Saved $${receipt.data.amount} expense for ${receipt.data.merchant}`,
      });
      
      // Remove from list
      setReceipts(prev => prev.filter(r => r.id !== receipt.id));
      
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save expense.',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteReceipt = (receiptId: string) => {
    setReceipts(prev => prev.filter(r => r.id !== receiptId));
  };

  const updateReceiptData = (receiptId: string, field: string, value: string | number | ScheduleECategory) => {
    setReceipts(prev => prev.map(r => {
      if (r.id !== receiptId || !r.data) return r;
      return {
        ...r,
        data: {
          ...r.data,
          [field]: value
        }
      };
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Receipt Scanner</h2>
          <p className="text-gray-600 mt-1">
            Upload receipts to automatically extract expense details
          </p>
        </div>
        <div className="flex gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            className="hidden"
            accept="image/*,.pdf"
            multiple
          />
          <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
            <Upload className="h-4 w-4 mr-2" />
            Upload File
          </Button>
          <Button onClick={() => fileInputRef.current?.click()}>
            <Camera className="h-4 w-4 mr-2" />
            Scan Receipt
          </Button>
        </div>
      </div>

      {/* Drop Zone */}
      {receipts.length === 0 && (
        <div 
          className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center hover:bg-gray-50 transition-colors cursor-pointer"
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Upload className="h-8 w-8 text-blue-500" />
          </div>
          <h3 className="text-lg font-medium text-gray-900">Drop receipts here or click to upload</h3>
          <p className="text-gray-500 mt-2">Supports JPG, PNG, PDF up to 10MB</p>
        </div>
      )}

      {/* Processing Queue */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {receipts.map(receipt => (
          <Card key={receipt.id} className="overflow-hidden">
            <div className="flex flex-col md:flex-row h-full">
              {/* Image Preview */}
              <div className="w-full md:w-1/3 bg-gray-100 relative min-h-[200px]">
                {receipt.file.type.includes('image') ? (
                  <img 
                    src={receipt.previewUrl} 
                    alt="Receipt" 
                    className="w-full h-full object-cover absolute inset-0"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <FileText className="h-12 w-12 text-gray-400" />
                  </div>
                )}
              </div>

              {/* Data Form */}
              <div className="flex-1 p-4 space-y-4">
                {receipt.status === 'scanning' ? (
                  <div className="h-full flex flex-col items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-4" />
                    <p className="font-medium text-gray-900">Scanning receipt...</p>
                    <p className="text-sm text-gray-500">Extracting merchant and amount</p>
                  </div>
                ) : receipt.status === 'error' ? (
                  <div className="h-full flex flex-col items-center justify-center py-8 text-center">
                    <XCircle className="h-8 w-8 text-red-500 mb-4" />
                    <p className="font-medium text-gray-900">Scan Failed</p>
                    <Button variant="outline" size="sm" className="mt-4" onClick={() => handleDeleteReceipt(receipt.id)}>
                      Remove
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Scanned
                      </Badge>
                      <Button variant="ghost" size="sm" onClick={() => handleDeleteReceipt(receipt.id)}>
                        <Trash2 className="h-4 w-4 text-gray-400 hover:text-red-600" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs">Merchant</Label>
                        <Input 
                          value={receipt.data?.merchant} 
                          onChange={(e) => updateReceiptData(receipt.id, 'merchant', e.target.value)}
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Amount</Label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                          <Input 
                            type="number" 
                            className="pl-6"
                            value={receipt.data?.amount}
                            onChange={(e) => updateReceiptData(receipt.id, 'amount', parseFloat(e.target.value))}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs">Date</Label>
                        <Input 
                          type="date"
                          value={receipt.data?.date}
                          onChange={(e) => updateReceiptData(receipt.id, 'date', e.target.value)}
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Category</Label>
                        <Select 
                          value={receipt.data?.category}
                          onValueChange={(value) => updateReceiptData(receipt.id, 'category', value as ScheduleECategory)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(SCHEDULE_E_CATEGORIES).map(([key, cat]) => (
                              <SelectItem key={key} value={key}>{cat.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div>
                      <Label className="text-xs">Property</Label>
                      <Select value={selectedPropertyId} onValueChange={setSelectedPropertyId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select Property" />
                        </SelectTrigger>
                        <SelectContent>
                          {landlordProperties.map(p => (
                            <SelectItem key={p.id} value={p.id}>{p.details.address.street}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <Button className="w-full" onClick={() => handleSaveReceipt(receipt)}>
                      <Save className="h-4 w-4 mr-2" />
                      Save Expense
                    </Button>
                  </>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}