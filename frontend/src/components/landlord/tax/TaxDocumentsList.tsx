import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Download, Eye, Clock, CheckCircle, AlertCircle } from "lucide-react";
import { TaxDocument } from '@/types/landlordTax';
import { format } from 'date-fns';

interface TaxDocumentsListProps {
  documents: TaxDocument[];
  onDownload: (doc: TaxDocument) => void;
  onView: (doc: TaxDocument) => void;
}

export const TaxDocumentsList: React.FC<TaxDocumentsListProps> = ({ documents, onDownload, onView }) => {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'filed':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-200">Filed</Badge>;
      case 'ready-for-review':
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200">Ready</Badge>;
      case 'draft':
        return <Badge variant="outline">Draft</Badge>;
      case 'amended':
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200">Amended</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getDocIcon = (type: string) => {
    switch (type) {
      case 'schedule-e':
        return <FileText className="h-8 w-8 text-blue-600" />;
      case 'form-1099-misc':
      case 'form-1099-nec':
        return <FileText className="h-8 w-8 text-purple-600" />;
      case 'depreciation-schedule':
        return <Clock className="h-8 w-8 text-orange-600" />;
      default:
        return <FileText className="h-8 w-8 text-gray-600" />;
    }
  };

  const formatDocType = (type: string) => {
    return type.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tax Documents</CardTitle>
        <CardDescription>Generated forms and reports for your tax filing.</CardDescription>
      </CardHeader>
      <CardContent>
        {documents.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <AlertCircle className="h-12 w-12 mx-auto mb-3 opacity-20" />
            <p>No tax documents generated yet for this year.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {documents.map((doc) => (
              <div key={doc.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-4 mb-4 sm:mb-0">
                  {getDocIcon(doc.documentType)}
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold">{formatDocType(doc.documentType)}</h4>
                      {getStatusBadge(doc.status)}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Generated: {format(new Date(doc.generatedAt), 'MMM d, yyyy')} • Version {doc.version}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                  <Button variant="outline" size="sm" onClick={() => onView(doc)} className="flex-1 sm:flex-none">
                    <Eye className="mr-2 h-4 w-4" />
                    View
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => onDownload(doc)} className="flex-1 sm:flex-none">
                    <Download className="mr-2 h-4 w-4" />
                    Download
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};