/**
 * Enhanced Lease Generation Wizard
 * Complete workflow integrating template engine, validation, PDF generation, and e-signature
 */

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  ChevronLeft,
  ChevronRight,
  Save,
  FileText,
  Check,
  AlertCircle,
  Eye,
  Download,
  Sparkles,
  Shield,
  Send
} from 'lucide-react';
import { useLeaseGeneration } from '@/hooks/useLeaseGeneration';
import { leaseTemplateEngine } from '@/services/leaseTemplateEngine';
import { PDFGenerator } from '@/services/pdfGenerator';
import { useToast } from '@/hooks/use-toast';
import { LeaseFormData, LeaseAgreement } from '@/types/lease';

// Import step components
import PropertyDetailsStep from './wizard-steps/PropertyDetailsStep';
import PartiesInformationStep from './wizard-steps/PartiesInformationStep';
import LeaseTermsStep from './wizard-steps/LeaseTermsStep';
import FinancialTermsStep from './wizard-steps/FinancialTermsStep';
import ClausesStep from './wizard-steps/ClausesStep';
import ReviewStep from './wizard-steps/ReviewStep';

// Import signature workflow
import SignatureWorkflowManager from './signing/SignatureWorkflowManager';

interface EnhancedLeaseWizardProps {
  templateId?: string;
  existingLeaseId?: string;
  onComplete?: (leaseId: string) => void;
  onCancel?: () => void;
}

const steps = [
  {
    id: 'property',
    title: 'Property Details',
    description: 'Select property and lease type',
    component: PropertyDetailsStep
  },
  {
    id: 'parties',
    title: 'Parties Information',
    description: 'Landlord and tenant details',
    component: PartiesInformationStep
  },
  {
    id: 'terms',
    title: 'Lease Terms',
    description: 'Duration and dates',
    component: LeaseTermsStep
  },
  {
    id: 'financial',
    title: 'Financial Terms',
    description: 'Rent and deposits',
    component: FinancialTermsStep
  },
  {
    id: 'clauses',
    title: 'Clauses & Compliance',
    description: 'Legal terms and conditions',
    component: ClausesStep
  },
  {
    id: 'review',
    title: 'Review & Generate',
    description: 'Final review and PDF generation',
    component: ReviewStep
  }
];

export default function EnhancedLeaseWizard({
  templateId,
  existingLeaseId,
  onComplete,
  onCancel
}: EnhancedLeaseWizardProps) {
  const { toast } = useToast();
  const {
    formData,
    currentStep,
    isLoading,
    isSaving,
    errors,
    lastSaved,
    hasUnsavedChanges,
    updateFormData,
    nextStep,
    previousStep,
    goToStep,
    saveDraft,
    generateLease,
    addClause,
    removeClause,
    updateClause
  } = useLeaseGeneration({ templateId, existingLeaseId });

  const [complianceScore, setComplianceScore] = useState(0);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [generatedLease, setGeneratedLease] = useState<LeaseAgreement | null>(null);
  const [documentUrl, setDocumentUrl] = useState<string>('');
  const [showSignatureWorkflow, setShowSignatureWorkflow] = useState(false);

  const currentStepConfig = steps[currentStep];
  const progress = ((currentStep + 1) / steps.length) * 100;
  const StepComponent = currentStepConfig.component;

  /**
   * Check compliance when moving to review step
   */
  const checkCompliance = useCallback(async () => {
    try {
      // Use template engine for compliance checking
      const validation = await leaseTemplateEngine.validateLease(
        formData as LeaseFormData,
        formData.state || 'CA'
      );

      setComplianceScore(validation.complianceScore);

      if (!validation.isValid) {
        toast({
          title: 'Compliance Issues Found',
          description: `${validation.errors.length} issues need attention`,
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Compliance check failed:', error);
    }
  }, [formData, toast]);

  useEffect(() => {
    if (currentStep === 5 && formData.propertyId) {
      checkCompliance();
    }
  }, [currentStep, formData.propertyId, checkCompliance]);

  /**
   * Handle next step
   */
  const handleNext = () => {
    if (nextStep()) {
      // Auto-save on step change
      saveDraft(undefined, true);
    }
  };

  /**
   * Handle previous step
   */
  const handlePrevious = () => {
    previousStep();
  };

  /**
   * Handle save draft
   */
  const handleSaveDraft = async () => {
    await saveDraft();
  };

  /**
   * Handle generate lease
   */
  const handleGenerate = async () => {
    const lease = await generateLease();
    if (lease) {
      setGeneratedLease(lease);
      
      // Generate PDF and get URL
      const pdfBlob = await PDFGenerator.generateLeasePDF(lease, false);
      const url = URL.createObjectURL(pdfBlob);
      setDocumentUrl(url);
      
      toast({
        title: 'Lease Generated',
        description: 'Your lease agreement has been created successfully'
      });
    }
  };

  /**
   * Generate and download PDF
   */
  const handleDownloadPDF = async () => {
    setIsGeneratingPDF(true);
    try {
      const lease = generatedLease || await generateLease();
      if (lease) {
        const pdfBlob = await PDFGenerator.generateLeasePDF(lease, false);
        PDFGenerator.downloadPDF(pdfBlob, `lease_${lease.id}.pdf`);
        
        toast({
          title: 'PDF Generated',
          description: 'Lease PDF has been downloaded'
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to generate PDF',
        variant: 'destructive'
      });
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  /**
   * Preview PDF
   */
  const handlePreviewPDF = async () => {
    setIsGeneratingPDF(true);
    try {
      const lease = generatedLease || await generateLease();
      if (lease) {
        const pdfBlob = await PDFGenerator.generateLeasePDF(lease, true);
        PDFGenerator.openPDFInNewTab(pdfBlob);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to preview PDF',
        variant: 'destructive'
      });
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  /**
   * Send for signature
   */
  const handleSendForSignature = async () => {
    if (!generatedLease) {
      const lease = await generateLease();
      if (!lease) return;
      setGeneratedLease(lease);
      
      // Generate PDF
      const pdfBlob = await PDFGenerator.generateLeasePDF(lease, false);
      const url = URL.createObjectURL(pdfBlob);
      setDocumentUrl(url);
    }
    
    setShowSignatureWorkflow(true);
  };

  /**
   * Handle signature workflow completion
   */
  const handleSignatureComplete = (certificateId: string) => {
    toast({
      title: 'All Signatures Collected',
      description: 'The lease agreement is now fully executed'
    });
    
    if (onComplete && generatedLease) {
      onComplete(generatedLease.id);
    }
  };

  // Show signature workflow if lease is generated and user clicked "Send for Signature"
  if (showSignatureWorkflow && generatedLease && documentUrl) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="mb-6">
          <Button
            variant="outline"
            onClick={() => setShowSignatureWorkflow(false)}
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back to Review
          </Button>
        </div>
        <SignatureWorkflowManager
          lease={generatedLease}
          documentUrl={documentUrl}
          onComplete={handleSignatureComplete}
        />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Create Lease Agreement
            </h1>
            <p className="text-gray-600 mt-1">
              {currentStepConfig.description}
            </p>
          </div>
          <div className="flex items-center gap-4">
            {lastSaved && (
              <div className="text-sm text-gray-500">
                Last saved: {lastSaved.toLocaleTimeString()}
                {hasUnsavedChanges && (
                  <span className="ml-2 text-yellow-600">• Unsaved changes</span>
                )}
              </div>
            )}
            <Badge variant="outline">
              Step {currentStep + 1} of {steps.length}
            </Badge>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <Progress value={progress} className="h-2" />
          <div className="flex justify-between text-xs text-gray-500">
            <span>Progress: {Math.round(progress)}%</span>
            <span>{currentStep + 1} of {steps.length} completed</span>
          </div>
        </div>
      </div>

      {/* Step Navigation */}
      <div className="mb-8">
        <ScrollArea className="w-full">
          <div className="flex items-center gap-2 pb-2">
            {steps.map((step, index) => (
              <button
                key={step.id}
                onClick={() => goToStep(index)}
                disabled={index > currentStep}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
                  index === currentStep
                    ? 'bg-blue-100 text-blue-900'
                    : index < currentStep
                    ? 'bg-green-50 text-green-900 hover:bg-green-100'
                    : 'bg-gray-50 text-gray-400 cursor-not-allowed'
                }`}
              >
                <div
                  className={`flex items-center justify-center w-6 h-6 rounded-full text-sm ${
                    index === currentStep
                      ? 'bg-blue-600 text-white'
                      : index < currentStep
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-300 text-gray-600'
                  }`}
                >
                  {index < currentStep ? <Check className="h-4 w-4" /> : index + 1}
                </div>
                <span className="font-medium">{step.title}</span>
              </button>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Validation Errors */}
      {Object.keys(errors).length > 0 && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Please fix the following errors:
            <ul className="list-disc list-inside mt-2">
              {Object.values(errors).map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Step Content */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {currentStepConfig.title}
            {currentStep === 4 && (
              <Badge variant="outline" className="ml-2">
                <Sparkles className="h-3 w-3 mr-1" />
                AI-Powered
              </Badge>
            )}
          </CardTitle>
          <CardDescription>{currentStepConfig.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <StepComponent
            formData={formData}
            updateFormData={updateFormData}
            errors={errors}
            addClause={addClause}
            removeClause={removeClause}
            updateClause={updateClause}
          />
        </CardContent>
      </Card>

      {/* Compliance Score (on review step) */}
      {currentStep === 5 && complianceScore > 0 && (
        <Card className="mb-8 border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-900">
              <Shield className="h-5 w-5" />
              Compliance Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="text-4xl font-bold text-green-600">
                {complianceScore}%
              </div>
              <div className="flex-1">
                <Progress value={complianceScore} className="h-3" />
                <p className="text-sm text-gray-600 mt-2">
                  {complianceScore >= 90
                    ? 'Excellent! Your lease meets all compliance requirements.'
                    : complianceScore >= 70
                    ? 'Good! Minor improvements recommended.'
                    : 'Attention needed. Please review compliance issues.'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            variant="outline"
            onClick={handleSaveDraft}
            disabled={isSaving || !hasUnsavedChanges}
          >
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? 'Saving...' : 'Save Draft'}
          </Button>
        </div>

        <div className="flex gap-2">
          {currentStep > 0 && (
            <Button variant="outline" onClick={handlePrevious}>
              <ChevronLeft className="h-4 w-4 mr-2" />
              Previous
            </Button>
          )}

          {currentStep < steps.length - 1 ? (
            <Button onClick={handleNext}>
              Next
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handlePreviewPDF}
                disabled={isGeneratingPDF}
              >
                <Eye className="h-4 w-4 mr-2" />
                Preview PDF
              </Button>
              <Button
                variant="outline"
                onClick={handleDownloadPDF}
                disabled={isGeneratingPDF}
              >
                <Download className="h-4 w-4 mr-2" />
                Download PDF
              </Button>
              {!generatedLease ? (
                <Button
                  onClick={handleGenerate}
                  disabled={isLoading}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  {isLoading ? 'Generating...' : 'Generate Lease'}
                </Button>
              ) : (
                <Button
                  onClick={handleSendForSignature}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Send className="h-4 w-4 mr-2" />
                  Send for Signature
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}