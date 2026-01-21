import React, { Suspense, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLeaseContext } from '@/contexts/LeaseContext';
import SignatureWorkflowManager from '@/components/lease/signing/SignatureWorkflowManager';
import { PageLoadingFallback } from '@/components/common/LoadingFallback';
import { PDFGenerator } from '@/services/pdfGenerator';

export const LeaseSigningPage: React.FC = () => {
  const { lease, refreshLease } = useLeaseContext();
  const navigate = useNavigate();
  const [documentUrl, setDocumentUrl] = useState<string>('');

  useEffect(() => {
    const generate = async () => {
      if (lease) {
        try {
          const blob = await PDFGenerator.generateLeasePDF(lease, false);
          setDocumentUrl(URL.createObjectURL(blob));
        } catch (e) {
          console.error("Failed to generate PDF preview", e);
        }
      }
    };
    generate();
  }, [lease]);

  const handleComplete = async (certificateId: string) => {
    // certificateId is used to track the signed document
    console.log('Signature completed with certificate:', certificateId);
    await refreshLease();
    navigate(`/leases/${lease?.id}`);
  };

  if (!lease) return <PageLoadingFallback />;

  if (!documentUrl) return <PageLoadingFallback />;

  return (
    <div className="container mx-auto py-6">
       <h1 className="text-2xl font-bold mb-6">Signature Workflow</h1>
       <Suspense fallback={<PageLoadingFallback />}>
         <SignatureWorkflowManager 
           lease={lease}
           documentUrl={documentUrl}
           onComplete={handleComplete}
         />
       </Suspense>
    </div>
  );
};