import React, { useState } from 'react';
import { TaxCard } from '@/components/tax/shared/TaxCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { TaxDocument } from '@/services/taxService';
import { FileText, Upload, Download, Search, Shield, Eye } from 'lucide-react';
import { toast } from 'sonner';

interface TaxDocumentManagerProps {
  documents: TaxDocument[];
  onUpload?: (file: File, category: string, year: number) => void;
  isLoading?: boolean;
}

export const TaxDocumentManager: React.FC<TaxDocumentManagerProps> = ({ 
  documents, 
  onUpload, 
  isLoading 
}) => {
  const [showUpload, setShowUpload] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [uploadCategory, setUploadCategory] = useState('');
  
  const filteredDocs = documents.filter(doc => 
    doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    doc.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onUpload) {
      if (!uploadCategory) {
        toast.error('Please select a category first');
        return;
      }
      onUpload(file, uploadCategory, new Date().getFullYear());
      toast.success('Document uploaded successfully');
      setShowUpload(false);
      setUploadCategory('');
    }
  };

  if (isLoading) {
    return (
      <TaxCard title="Tax Documents">
        <div className="space-y-4">
          {[1, 2, 3].map(i => <div key={i} className="h-16 bg-muted animate-pulse rounded" />)}
        </div>
      </TaxCard>
    );
  }

  return (
    <TaxCard
      title="Tax Document Vault"
      description="Securely store and manage tax documents"
      icon={<Shield className="h-5 w-5 text-blue-600" />}
      headerAction={
        <Button onClick={() => setShowUpload(!showUpload)}>
          <Upload className="h-4 w-4 mr-2" />
          Upload
        </Button>
      }
    >
      <div className="space-y-6">
        {/* Upload Area */}
        {showUpload && (
          <div className="p-6 border-2 border-dashed rounded-lg bg-blue-50/50 border-blue-200 animate-in fade-in slide-in-from-top-4">
            <div className="space-y-4 max-w-md mx-auto text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                <Upload className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold">Upload New Document</h3>
                <p className="text-sm text-muted-foreground">PDF, JPG, PNG up to 10MB</p>
              </div>
              
              <div className="text-left space-y-2">
                <Label>Category</Label>
                <Select value={uploadCategory} onValueChange={setUploadCategory}>
                  <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Income">Income (W2, 1099)</SelectItem>
                    <SelectItem value="Deductions">Deductions</SelectItem>
                    <SelectItem value="Property">Property Records</SelectItem>
                    <SelectItem value="Receipts">Expense Receipts</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="relative">
                <Input 
                  type="file" 
                  className="hidden" 
                  id="file-upload"
                  onChange={handleFileUpload}
                  accept=".pdf,.jpg,.jpeg,.png"
                />
                <Button asChild className="w-full" disabled={!uploadCategory}>
                  <label htmlFor="file-upload" className="cursor-pointer">
                    Select File
                  </label>
                </Button>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setShowUpload(false)}>Cancel</Button>
            </div>
          </div>
        )}

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search documents..." 
            className="pl-9"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>

        {/* List */}
        <div className="space-y-3">
          {filteredDocs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No documents found
            </div>
          ) : (
            filteredDocs.map((doc) => (
              <div key={doc.id} className="flex items-start gap-4 p-3 border rounded-lg hover:shadow-sm transition-shadow">
                <div className="mt-1 bg-blue-50 p-2 rounded">
                  <FileText className="h-5 w-5 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-medium text-sm truncate">{doc.name}</h4>
                      <div className="flex gap-2 mt-1">
                        <Badge variant="outline" className="text-[10px]">{doc.type}</Badge>
                        <Badge variant="secondary" className="text-[10px]">{doc.category}</Badge>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Eye className="h-4 w-4 text-gray-500" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Download className="h-4 w-4 text-gray-500" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                    <span>{new Date(doc.uploadDate).toLocaleDateString()}</span>
                    <span>{doc.size}</span>
                    <span>{doc.taxYear}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </TaxCard>
  );
};