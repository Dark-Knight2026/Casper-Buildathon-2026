/**
 * Lease Documents Page
 * Manage lease documents and storage
 */

import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, Upload, History, Shield, Share2 } from 'lucide-react';
import DocumentList from '@/components/lease/storage/DocumentList';
import DocumentUploader from '@/components/lease/storage/DocumentUploader';
import VersionHistory from '@/components/lease/storage/VersionHistory';
import AuditLog from '@/components/lease/storage/AuditLog';
import ShareDialog from '@/components/lease/storage/ShareDialog';

export default function LeaseDocumentsPage() {
  const { leaseId } = useParams<{ leaseId: string }>();
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);
  const [showUploader, setShowUploader] = useState(false);

  if (!leaseId) {
    return <div>Lease ID not found</div>;
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Lease Documents</h1>
        <p className="text-gray-600 mt-2">Manage documents for lease {leaseId}</p>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="documents" className="space-y-6">
        <TabsList>
          <TabsTrigger value="documents">
            <FileText className="h-4 w-4 mr-2" />
            Documents
          </TabsTrigger>
          <TabsTrigger value="upload">
            <Upload className="h-4 w-4 mr-2" />
            Upload
          </TabsTrigger>
          {selectedDocumentId && (
            <>
              <TabsTrigger value="versions">
                <History className="h-4 w-4 mr-2" />
                Versions
              </TabsTrigger>
              <TabsTrigger value="audit">
                <Shield className="h-4 w-4 mr-2" />
                Audit Log
              </TabsTrigger>
            </>
          )}
        </TabsList>

        <TabsContent value="documents">
          <DocumentList
            leaseId={leaseId}
            onSelectDocument={setSelectedDocumentId}
            onDownload={async (id) => console.log('Download', id)}
            onDelete={async (id) => console.log('Delete', id)}
            onShare={(id) => console.log('Share', id)}
          />
        </TabsContent>

        <TabsContent value="upload">
          <DocumentUploader
            leaseId={leaseId}
            onUploadComplete={(docId) => {
              setSelectedDocumentId(docId);
            }}
          />
        </TabsContent>

        {selectedDocumentId && (
          <>
            <TabsContent value="versions">
              <VersionHistory documentId={selectedDocumentId} />
            </TabsContent>

            <TabsContent value="audit">
              <AuditLog documentId={selectedDocumentId} />
            </TabsContent>
          </>
        )}
      </Tabs>
    </div>
  );
}