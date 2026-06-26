import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import {
  Upload,
  FileText,
  Scan,
  CheckCircle2,
  AlertCircle,
  Camera,
  Image as ImageIcon,
  Download,
  Eye,
  Trash2,
  RefreshCw,
  Sparkles,
  FileCheck,
} from 'lucide-react';

interface ScannedDocument {
  id: string;
  fileName: string;
  fileType: string;
  uploadDate: string;
  status: 'processing' | 'completed' | 'error';
  extractedData: {
    documentType: string;
    confidence: number;
    fields: {
      label: string;
      value: string;
      confidence: number;
    }[];
  } | null;
  preview: string;
}

const mockScannedDocs: ScannedDocument[] = [
  {
    id: 'scan-001',
    fileName: 'mortgage_interest_statement_2024.pdf',
    fileType: 'Form 1098',
    uploadDate: '2024-01-15T10:30:00',
    status: 'completed',
    extractedData: {
      documentType: 'Form 1098 - Mortgage Interest Statement',
      confidence: 98,
      fields: [
        { label: 'Lender Name', value: 'First National Bank', confidence: 99 },
        { label: 'Lender TIN', value: '12-3456789', confidence: 98 },
        { label: 'Borrower Name', value: 'John Smith', confidence: 99 },
        { label: 'Mortgage Interest', value: '$18,450.00', confidence: 97 },
        { label: 'Points Paid', value: '$2,500.00', confidence: 96 },
        { label: 'Property Address', value: '123 Main St, Los Angeles, CA 90001', confidence: 98 },
      ],
    },
    preview: '/images/PropertyTax.jpg',
  },
  {
    id: 'scan-002',
    fileName: '/images/PropertyTax.jpg',
    fileType: 'Property Tax Statement',
    uploadDate: '2024-01-14T14:20:00',
    status: 'completed',
    extractedData: {
      documentType: 'Property Tax Statement',
      confidence: 95,
      fields: [
        { label: 'Property Address', value: '123 Main St, Los Angeles, CA 90001', confidence: 97 },
        { label: 'Tax Year', value: '2024', confidence: 99 },
        { label: 'Total Tax Amount', value: '$8,200.00', confidence: 96 },
        { label: 'Payment Due Date', value: '04/10/2024', confidence: 98 },
        { label: 'Parcel Number', value: '1234-567-890', confidence: 95 },
      ],
    },
    preview: 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=400',
  },
  {
    id: 'scan-003',
    fileName: '/images/HomeImprovement.jpg',
    fileType: 'Receipt',
    uploadDate: '2024-01-13T09:15:00',
    status: 'processing',
    extractedData: null,
    preview: 'https://images.unsplash.com/photo-1554224154-26032ffc0d07?w=400',
  },
];

export function TaxDocumentOCR() {
  const [scannedDocs, setScannedDocs] = useState<ScannedDocument[]>(mockScannedDocs);
  const [selectedDoc, setSelectedDoc] = useState<ScannedDocument | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setUploadProgress(0);

    // Simulate upload and OCR processing
    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsUploading(false);
          
          // Add new document to list
          const newDoc: ScannedDocument = {
            id: `scan-${Date.now()}`,
            fileName: files[0].name,
            fileType: 'Unknown',
            uploadDate: new Date().toISOString(),
            status: 'processing',
            extractedData: null,
            preview: 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=400',
          };
          
          setScannedDocs((prev) => [newDoc, ...prev]);
          
          // Simulate OCR completion after 3 seconds
          setTimeout(() => {
            setScannedDocs((prev) =>
              prev.map((doc) =>
                doc.id === newDoc.id
                  ? {
                      ...doc,
                      status: 'completed' as const,
                      fileType: 'Receipt',
                      extractedData: {
                        documentType: 'Home Improvement Receipt',
                        confidence: 92,
                        fields: [
                          { label: 'Vendor', value: 'ABC Home Improvement', confidence: 95 },
                          { label: 'Date', value: new Date().toLocaleDateString(), confidence: 98 },
                          { label: 'Amount', value: '$5,250.00', confidence: 94 },
                          { label: 'Description', value: 'Kitchen Renovation', confidence: 90 },
                        ],
                      },
                    }
                  : doc
              )
            );
          }, 3000);
          
          return 100;
        }
        return prev + 10;
      });
    }, 200);
  }, []);

  const handleRescan = (docId: string) => {
    setScannedDocs((prev) =>
      prev.map((doc) =>
        doc.id === docId
          ? { ...doc, status: 'processing' as const, extractedData: null }
          : doc
      )
    );

    setTimeout(() => {
      setScannedDocs((prev) =>
        prev.map((doc) =>
          doc.id === docId
            ? { ...doc, status: 'completed' as const }
            : doc
        )
      );
    }, 2000);
  };

  const handleDelete = (docId: string) => {
    if (confirm('Are you sure you want to delete this scanned document?')) {
      setScannedDocs((prev) => prev.filter((doc) => doc.id !== docId));
      if (selectedDoc?.id === docId) {
        setSelectedDoc(null);
      }
    }
  };

  const completedDocs = scannedDocs.filter((d) => d.status === 'completed').length;
  const processingDocs = scannedDocs.filter((d) => d.status === 'processing').length;
  const totalFields = scannedDocs.reduce(
    (sum, doc) => sum + (doc.extractedData?.fields.length || 0),
    0
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scan className="w-5 h-5" />
            AI-Powered Document Scanner & OCR
          </CardTitle>
          <CardDescription>
            Upload tax documents and automatically extract data using advanced OCR technology
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Stats */}
          <div className="grid md:grid-cols-4 gap-4 mb-6">
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-blue-600 mb-1">Total Scanned</p>
                    <p className="text-2xl font-bold text-blue-900">{scannedDocs.length}</p>
                  </div>
                  <FileText className="w-8 h-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-green-50 border-green-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-green-600 mb-1">Completed</p>
                    <p className="text-2xl font-bold text-green-900">{completedDocs}</p>
                  </div>
                  <CheckCircle2 className="w-8 h-8 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-orange-50 border-orange-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-orange-600 mb-1">Processing</p>
                    <p className="text-2xl font-bold text-orange-900">{processingDocs}</p>
                  </div>
                  <RefreshCw className="w-8 h-8 text-orange-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-purple-50 border-purple-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-purple-600 mb-1">Fields Extracted</p>
                    <p className="text-2xl font-bold text-purple-900">{totalFields}</p>
                  </div>
                  <Sparkles className="w-8 h-8 text-purple-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Upload Section */}
          <Card className="mb-6 bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200">
            <CardContent className="p-6">
              <div className="text-center">
                <div className="flex justify-center mb-4">
                  <div className="p-4 bg-blue-100 rounded-full">
                    <Upload className="w-8 h-8 text-blue-600" />
                  </div>
                </div>
                <h3 className="font-semibold text-lg mb-2">Upload Tax Documents</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Supported formats: PDF, JPG, PNG, HEIC • Max size: 10MB per file
                </p>
                
                {isUploading ? (
                  <div className="space-y-2">
                    <Progress value={uploadProgress} className="h-2" />
                    <p className="text-sm text-gray-600">
                      Processing document... {uploadProgress}%
                    </p>
                  </div>
                ) : (
                  <div className="flex gap-2 justify-center">
                    <Button className="bg-blue-600 hover:bg-blue-700" asChild>
                      <label>
                        <Upload className="w-4 h-4 mr-2" />
                        Upload Files
                        <input
                          type="file"
                          className="hidden"
                          accept=".pdf,.jpg,.jpeg,.png,.heic"
                          multiple
                          onChange={handleFileUpload}
                        />
                      </label>
                    </Button>
                    <Button variant="outline">
                      <Camera className="w-4 h-4 mr-2" />
                      Take Photo
                    </Button>
                  </div>
                )}
              </div>

              <div className="mt-4 p-3 bg-white rounded-lg">
                <p className="text-xs font-semibold text-gray-700 mb-2">
                  Supported Document Types:
                </p>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">Form 1098</Badge>
                  <Badge variant="outline">Property Tax Bills</Badge>
                  <Badge variant="outline">Receipts</Badge>
                  <Badge variant="outline">Closing Statements</Badge>
                  <Badge variant="outline">HOA Statements</Badge>
                  <Badge variant="outline">Utility Bills</Badge>
                  <Badge variant="outline">Insurance Documents</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Document List */}
          <div className="grid lg:grid-cols-2 gap-6">
            {/* List View */}
            <div>
              <h3 className="font-semibold mb-4">Scanned Documents</h3>
              <div className="space-y-3">
                {scannedDocs.map((doc) => (
                  <Card
                    key={doc.id}
                    className={`cursor-pointer hover:shadow-md transition-shadow ${
                      selectedDoc?.id === doc.id ? 'border-blue-500 bg-blue-50' : ''
                    }`}
                    onClick={() => setSelectedDoc(doc)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <img
                          src={doc.preview}
                          alt={doc.fileName}
                          className="w-16 h-16 object-cover rounded"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between mb-1">
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-sm truncate">{doc.fileName}</p>
                              <p className="text-xs text-gray-600">{doc.fileType}</p>
                            </div>
                            {doc.status === 'completed' && (
                              <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                            )}
                            {doc.status === 'processing' && (
                              <RefreshCw className="w-5 h-5 text-orange-600 animate-spin flex-shrink-0" />
                            )}
                            {doc.status === 'error' && (
                              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                            )}
                          </div>
                          <p className="text-xs text-gray-500 mb-2">
                            {new Date(doc.uploadDate).toLocaleString()}
                          </p>
                          {doc.extractedData && (
                            <Badge className="bg-green-600 text-white text-xs">
                              {doc.extractedData.confidence}% Confidence
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Detail View */}
            <div>
              {selectedDoc ? (
                <Card>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">Extracted Data</CardTitle>
                        <CardDescription>{selectedDoc.fileName}</CardDescription>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRescan(selectedDoc.id)}
                        >
                          <RefreshCw className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDelete(selectedDoc.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {selectedDoc.status === 'processing' ? (
                      <div className="text-center py-12">
                        <RefreshCw className="w-12 h-12 text-orange-600 animate-spin mx-auto mb-4" />
                        <p className="text-gray-600 mb-2">Processing document...</p>
                        <p className="text-sm text-gray-500">
                          Using AI to extract data from your document
                        </p>
                      </div>
                    ) : selectedDoc.extractedData ? (
                      <div className="space-y-4">
                        <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                          <div className="flex items-center justify-between mb-2">
                            <p className="font-semibold text-sm">
                              {selectedDoc.extractedData.documentType}
                            </p>
                            <Badge className="bg-green-600 text-white">
                              {selectedDoc.extractedData.confidence}% Match
                            </Badge>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <p className="font-semibold text-sm">Extracted Fields:</p>
                          {selectedDoc.extractedData.fields.map((field, index) => (
                            <div
                              key={index}
                              className="flex items-start justify-between p-3 bg-gray-50 rounded-lg"
                            >
                              <div className="flex-1">
                                <p className="text-xs text-gray-600 mb-1">{field.label}</p>
                                <p className="font-semibold">{field.value}</p>
                              </div>
                              <Badge variant="outline" className="text-xs">
                                {field.confidence}%
                              </Badge>
                            </div>
                          ))}
                        </div>

                        <div className="flex gap-2 pt-4">
                          <Button className="flex-1 bg-blue-600 hover:bg-blue-700">
                            <FileCheck className="w-4 h-4 mr-2" />
                            Save to Vault
                          </Button>
                          <Button variant="outline" className="flex-1">
                            <Download className="w-4 h-4 mr-2" />
                            Export Data
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
                        <p className="text-gray-600 mb-2">Failed to extract data</p>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRescan(selectedDoc.id)}
                        >
                          <RefreshCw className="w-4 h-4 mr-2" />
                          Try Again
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <Card className="h-full flex items-center justify-center">
                  <CardContent className="text-center p-12">
                    <Eye className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-600 mb-2">Select a document to view details</p>
                    <p className="text-sm text-gray-500">
                      Click on any scanned document to see extracted data
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          {/* Features */}
          <Card className="mt-6 bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-200">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Sparkles className="w-5 h-5" />
                AI-Powered Features
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-3 p-3 bg-white rounded-lg">
                <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
                <div>
                  <p className="font-semibold text-sm">Intelligent Document Recognition</p>
                  <p className="text-xs text-gray-600">
                    Automatically identifies document types (Form 1098, property tax bills,
                    receipts) with 95%+ accuracy
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-white rounded-lg">
                <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
                <div>
                  <p className="font-semibold text-sm">Advanced OCR Technology</p>
                  <p className="text-xs text-gray-600">
                    Extracts text from scanned documents, photos, and PDFs with high precision
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-white rounded-lg">
                <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
                <div>
                  <p className="font-semibold text-sm">Smart Field Extraction</p>
                  <p className="text-xs text-gray-600">
                    Automatically identifies and extracts key fields like amounts, dates, and
                    addresses
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-white rounded-lg">
                <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
                <div>
                  <p className="font-semibold text-sm">Confidence Scoring</p>
                  <p className="text-xs text-gray-600">
                    Each extracted field includes a confidence score so you can verify accuracy
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-white rounded-lg">
                <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
                <div>
                  <p className="font-semibold text-sm">Batch Processing</p>
                  <p className="text-xs text-gray-600">
                    Upload multiple documents at once for efficient bulk processing
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  );
}