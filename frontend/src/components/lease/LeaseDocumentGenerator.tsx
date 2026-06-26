/**
 * Lease Document Generator Component
 * Generate various lease-related documents
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  FileText,
  Download,
  Eye,
  Printer,
  Mail,
  CheckCircle
} from 'lucide-react';
import { LeaseAgreement } from '@/types/lease';
import { useToast } from '@/hooks/use-toast';

interface DocumentType {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: React.ReactNode;
  available: boolean;
}

interface LeaseDocumentGeneratorProps {
  lease: LeaseAgreement;
}

export default function LeaseDocumentGenerator({
  lease
}: LeaseDocumentGeneratorProps) {
  const { toast } = useToast();
  const [generating, setGenerating] = useState<string | null>(null);

  const documentTypes: DocumentType[] = [
    {
      id: 'lease-agreement',
      name: 'Lease Agreement',
      description: 'Complete lease agreement document',
      category: 'Core Documents',
      icon: <FileText className="h-5 w-5" />,
      available: true
    },
    {
      id: 'move-in-checklist',
      name: 'Move-In Checklist',
      description: 'Property condition inspection form',
      category: 'Move-In',
      icon: <FileText className="h-5 w-5" />,
      available: true
    },
    {
      id: 'rent-receipt',
      name: 'Rent Receipt',
      description: 'Monthly rent payment receipt',
      category: 'Financial',
      icon: <FileText className="h-5 w-5" />,
      available: true
    },
    {
      id: 'notice-to-vacate',
      name: 'Notice to Vacate',
      description: 'Tenant move-out notice template',
      category: 'Move-Out',
      icon: <FileText className="h-5 w-5" />,
      available: true
    },
    {
      id: 'lease-renewal',
      name: 'Lease Renewal Offer',
      description: 'Renewal terms and conditions',
      category: 'Renewals',
      icon: <FileText className="h-5 w-5" />,
      available: true
    },
    {
      id: 'pet-addendum',
      name: 'Pet Addendum',
      description: 'Pet policy and agreement',
      category: 'Addendums',
      icon: <FileText className="h-5 w-5" />,
      available: true
    }
  ];

  const handleGenerate = async (documentId: string) => {
    setGenerating(documentId);

    // Simulate document generation
    await new Promise(resolve => setTimeout(resolve, 2000));

    toast({
      title: 'Document Generated',
      description: 'Your document is ready for download'
    });

    setGenerating(null);
  };

  const handlePreview = (documentId: string) => {
    toast({
      title: 'Preview',
      description: 'Opening document preview...'
    });
  };

  const handleEmail = (documentId: string) => {
    toast({
      title: 'Email',
      description: 'Document sent via email'
    });
  };

  const groupedDocuments = documentTypes.reduce((acc, doc) => {
    if (!acc[doc.category]) {
      acc[doc.category] = [];
    }
    acc[doc.category].push(doc);
    return acc;
  }, {} as Record<string, DocumentType[]>);

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle>Document Generator</CardTitle>
          <CardDescription>
            Generate lease-related documents for {lease.propertyId}
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Documents */}
      <ScrollArea className="h-[600px]">
        <div className="space-y-6">
          {Object.entries(groupedDocuments).map(([category, docs]) => (
            <div key={category}>
              <h3 className="text-lg font-semibold mb-4">{category}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {docs.map(doc => (
                  <Card key={doc.id}>
                    <CardContent className="pt-6">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                          {doc.icon}
                        </div>

                        <div className="flex-1">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h4 className="font-semibold">{doc.name}</h4>
                              <p className="text-sm text-gray-600">{doc.description}</p>
                            </div>
                            {doc.available && (
                              <Badge variant="outline" className="bg-green-50 text-green-700">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Ready
                              </Badge>
                            )}
                          </div>

                          <div className="flex gap-2 mt-4">
                            <Button
                              size="sm"
                              onClick={() => handleGenerate(doc.id)}
                              disabled={!doc.available || generating === doc.id}
                            >
                              <Download className="h-4 w-4 mr-2" />
                              {generating === doc.id ? 'Generating...' : 'Generate'}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handlePreview(doc.id)}
                              disabled={!doc.available}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEmail(doc.id)}
                              disabled={!doc.available}
                            >
                              <Mail className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Bulk Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Bulk Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Download All
            </Button>
            <Button variant="outline">
              <Printer className="h-4 w-4 mr-2" />
              Print Package
            </Button>
            <Button variant="outline">
              <Mail className="h-4 w-4 mr-2" />
              Email Package
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}