import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TaxDocument } from '@/services/taxService';
import { Upload, FileText, Download, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface TaxDocumentUploaderProps {
  documents: TaxDocument[];
  onUpload?: (file: File, category: string) => void;
  onDelete?: (documentId: string) => void;
  isLoading?: boolean;
}

export const TaxDocumentUploader: React.FC<TaxDocumentUploaderProps> = ({ 
  documents, 
  onUpload,
  onDelete,
  isLoading 
}) => {
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = (file: File) => {
    if (onUpload) {
      onUpload(file, 'General');
      toast.success(`${file.name} uploaded successfully`);
    }
  };

  const getDocumentIcon = (type: TaxDocument['type']) => {
    return <FileText className="h-4 w-4" />;
  };

  const getTypeColor = (type: TaxDocument['type']) => {
    const colors = {
      'W2': 'bg-blue-100 text-blue-800',
      '1099': 'bg-purple-100 text-purple-800',
      'Receipt': 'bg-green-100 text-green-800',
      'Statement': 'bg-orange-100 text-orange-800',
      'Form': 'bg-red-100 text-red-800',
      'Other': 'bg-gray-100 text-gray-800'
    };
    return colors[type] || colors['Other'];
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5 text-purple-600" />
          Tax Documents
        </CardTitle>
        <CardDescription>Upload and manage your tax-related documents</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            dragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-sm font-medium mb-2">Drag and drop files here</p>
          <p className="text-xs text-muted-foreground mb-4">or</p>
          <label htmlFor="file-upload">
            <Button variant="outline" size="sm" asChild>
              <span>Browse Files</span>
            </Button>
            <input
              id="file-upload"
              type="file"
              className="hidden"
              onChange={handleChange}
              accept=".pdf,.jpg,.jpeg,.png"
            />
          </label>
          <p className="text-xs text-muted-foreground mt-4">Supported: PDF, JPG, PNG (Max 10MB)</p>
        </div>

        <div className="space-y-2">
          <h4 className="text-sm font-semibold">Uploaded Documents ({documents.length})</h4>
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-16 bg-muted animate-pulse rounded" />
            ))
          ) : documents.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No documents uploaded yet</p>
          ) : (
            documents.map((doc) => (
              <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-3">
                  {getDocumentIcon(doc.type)}
                  <div>
                    <p className="font-medium text-sm">{doc.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge className={getTypeColor(doc.type)} variant="outline">
                        {doc.type}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{doc.size}</span>
                      <span className="text-xs text-muted-foreground">•</span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(doc.uploadDate).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm">
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => {
                      if (onDelete) {
                        onDelete(doc.id);
                        toast.success('Document deleted');
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-red-600" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};