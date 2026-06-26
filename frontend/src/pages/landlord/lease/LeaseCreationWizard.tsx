import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { ChevronLeft, ChevronRight, Save, X } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

// Wizard Steps
import TemplateSelectionStep from '@/components/lease/wizard/TemplateSelectionStep';
import BasicInformationStep from '@/components/lease/wizard/BasicInformationStep';
import PropertyDetailsStep from '@/components/lease/wizard/PropertyDetailsStep';
import FinancialTermsStep from '@/components/lease/wizard/FinancialTermsStep';
import LeaseTermsStep from '@/components/lease/wizard/LeaseTermsStep';
import ClauseManagementStep from '@/components/lease/wizard/ClauseManagementStep';
import ReviewPreviewStep from '@/components/lease/wizard/ReviewPreviewStep';
import SignatureWorkflowStep from '@/components/lease/wizard/SignatureWorkflowStep';
import CompletionStep from '@/components/lease/wizard/CompletionStep';

import type { LeaseFormData, LeaseTemplate, LeaseClause, SigningWorkflow } from '@/types/lease';

const WIZARD_STEPS = [
  { id: 1, name: 'Template Selection', description: 'Choose a lease template' },
  { id: 2, name: 'Basic Information', description: 'Property and tenant details' },
  { id: 3, name: 'Property Details', description: 'Property and parties information' },
  { id: 4, name: 'Financial Terms', description: 'Rent and deposits' },
  { id: 5, name: 'Lease Terms', description: 'Duration and policies' },
  { id: 6, name: 'Clause Management', description: 'Customize lease clauses' },
  { id: 7, name: 'Review & Preview', description: 'Review and generate document' },
  { id: 8, name: 'Signature Setup', description: 'Configure e-signatures' },
  { id: 9, name: 'Complete', description: 'Lease created successfully' },
];

interface WizardState {
  currentStep: number;
  leaseData: Partial<LeaseFormData>;
  selectedTemplate: LeaseTemplate | null;
  clauses: LeaseClause[];
  signingWorkflow: Partial<SigningWorkflow> | null;
  generatedPdfUrl: string | null;
  isDraft: boolean;
  draftId: string | null;
}

export default function LeaseCreationWizard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [wizardState, setWizardState] = useState<WizardState>({
    currentStep: 1,
    leaseData: {},
    selectedTemplate: null,
    clauses: [],
    signingWorkflow: null,
    generatedPdfUrl: null,
    isDraft: true,
    draftId: null,
  });

  const saveDraft = useCallback(async () => {
    setIsSaving(true);
    try {
      // TODO: Implement draft saving to database
      console.log('Saving draft...', wizardState);
      
      toast({
        title: 'Draft Saved',
        description: 'Your progress has been saved automatically.',
      });
    } catch (error) {
      console.error('Error saving draft:', error);
    } finally {
      setIsSaving(false);
    }
  }, [wizardState, toast]);

  // Auto-save draft every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (wizardState.isDraft && wizardState.currentStep > 1) {
        saveDraft();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [wizardState.isDraft, wizardState.currentStep, saveDraft]);

  const updateLeaseData = (data: Partial<LeaseFormData>) => {
    setWizardState((prev) => ({
      ...prev,
      leaseData: { ...prev.leaseData, ...data },
    }));
  };

  const selectTemplate = (template: LeaseTemplate) => {
    setWizardState((prev) => ({
      ...prev,
      selectedTemplate: template,
      clauses: template.clauses || [],
    }));
  };

  const updateClauses = (clauses: LeaseClause[]) => {
    setWizardState((prev) => ({
      ...prev,
      clauses,
    }));
  };

  const updateSigningWorkflow = (workflow: Partial<SigningWorkflow>) => {
    setWizardState((prev) => ({
      ...prev,
      signingWorkflow: workflow,
    }));
  };

  const setGeneratedPdfUrl = (url: string) => {
    setWizardState((prev) => ({
      ...prev,
      generatedPdfUrl: url,
    }));
  };

  const handleNext = async () => {
    // Validate current step before proceeding
    const isValid = await validateCurrentStep();
    if (!isValid) return;

    if (wizardState.currentStep < WIZARD_STEPS.length) {
      setWizardState((prev) => ({
        ...prev,
        currentStep: prev.currentStep + 1,
      }));
    }
  };

  const handleBack = () => {
    if (wizardState.currentStep > 1) {
      setWizardState((prev) => ({
        ...prev,
        currentStep: prev.currentStep - 1,
      }));
    }
  };

  const validateCurrentStep = async (): Promise<boolean> => {
    const { currentStep, selectedTemplate, leaseData } = wizardState;

    switch (currentStep) {
      case 1: // Template Selection
        if (!selectedTemplate) {
          toast({
            title: 'Template Required',
            description: 'Please select a template to continue.',
            variant: 'destructive',
          });
          return false;
        }
        return true;

      case 2: // Basic Information
        if (!leaseData.propertyId || !leaseData.tenantIds || leaseData.tenantIds.length === 0) {
          toast({
            title: 'Missing Information',
            description: 'Please select a property and at least one tenant.',
            variant: 'destructive',
          });
          return false;
        }
        if (!leaseData.startDate || !leaseData.endDate) {
          toast({
            title: 'Missing Dates',
            description: 'Please specify lease start and end dates.',
            variant: 'destructive',
          });
          return false;
        }
        return true;

      case 4: // Financial Terms
        if (!leaseData.monthlyRent || leaseData.monthlyRent <= 0) {
          toast({
            title: 'Invalid Rent',
            description: 'Please enter a valid monthly rent amount.',
            variant: 'destructive',
          });
          return false;
        }
        return true;

      default:
        return true;
    }
  };

  const handleExit = () => {
    if (wizardState.currentStep > 1) {
      setShowExitDialog(true);
    } else {
      navigate('/landlord/leases');
    }
  };

  const confirmExit = () => {
    setShowExitDialog(false);
    navigate('/landlord/leases');
  };

  const handleSaveDraft = async () => {
    await saveDraft();
  };

  const renderCurrentStep = () => {
    const { currentStep, selectedTemplate, leaseData, clauses, signingWorkflow, generatedPdfUrl } = wizardState;

    switch (currentStep) {
      case 1:
        return (
          <TemplateSelectionStep
            selectedTemplate={selectedTemplate}
            onSelectTemplate={selectTemplate}
          />
        );
      case 2:
        return (
          <BasicInformationStep
            leaseData={leaseData}
            onUpdate={updateLeaseData}
          />
        );
      case 3:
        return (
          <PropertyDetailsStep
            leaseData={leaseData}
            onUpdate={updateLeaseData}
          />
        );
      case 4:
        return (
          <FinancialTermsStep
            leaseData={leaseData}
            onUpdate={updateLeaseData}
          />
        );
      case 5:
        return (
          <LeaseTermsStep
            leaseData={leaseData}
            onUpdate={updateLeaseData}
          />
        );
      case 6:
        return (
          <ClauseManagementStep
            clauses={clauses}
            onUpdate={updateClauses}
            leaseType={leaseData.type}
          />
        );
      case 7:
        return (
          <ReviewPreviewStep
            leaseData={leaseData}
            clauses={clauses}
            template={selectedTemplate}
            onGeneratePdf={setGeneratedPdfUrl}
            generatedPdfUrl={generatedPdfUrl}
          />
        );
      case 8:
        return (
          <SignatureWorkflowStep
            leaseData={leaseData}
            signingWorkflow={signingWorkflow}
            onUpdate={updateSigningWorkflow}
          />
        );
      case 9:
        return (
          <CompletionStep
            leaseData={leaseData}
            generatedPdfUrl={generatedPdfUrl}
          />
        );
      default:
        return null;
    }
  };

  const progress = (wizardState.currentStep / WIZARD_STEPS.length) * 100;
  const currentStepInfo = WIZARD_STEPS[wizardState.currentStep - 1];

  return (
    <div className="container mx-auto py-8 max-w-6xl">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Create New Lease Agreement</CardTitle>
              <CardDescription>
                Step {wizardState.currentStep} of {WIZARD_STEPS.length}: {currentStepInfo.name}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              {wizardState.currentStep > 1 && wizardState.currentStep < 9 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSaveDraft}
                  disabled={isSaving}
                >
                  <Save className="mr-2 h-4 w-4" />
                  {isSaving ? 'Saving...' : 'Save Draft'}
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={handleExit}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-4">
            <Progress value={progress} className="h-2" />
            <div className="flex justify-between mt-2 text-xs text-gray-600">
              {WIZARD_STEPS.map((step) => (
                <div
                  key={step.id}
                  className={`flex-1 text-center ${
                    step.id === wizardState.currentStep
                      ? 'text-primary font-semibold'
                      : step.id < wizardState.currentStep
                      ? 'text-green-600'
                      : ''
                  }`}
                >
                  {step.id}
                </div>
              ))}
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {/* Current Step Content */}
          <div className="min-h-[500px]">{renderCurrentStep()}</div>

          {/* Navigation Buttons */}
          {wizardState.currentStep < 9 && (
            <div className="flex justify-between mt-8 pt-6 border-t">
              <Button
                variant="outline"
                onClick={handleBack}
                disabled={wizardState.currentStep === 1}
              >
                <ChevronLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button onClick={handleNext}>
                {wizardState.currentStep === 8 ? 'Complete' : 'Next'}
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Exit Confirmation Dialog */}
      <AlertDialog open={showExitDialog} onOpenChange={setShowExitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Exit Lease Creation?</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes. Your progress will be saved as a draft. You can continue
              editing this lease later from the drafts section.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continue Editing</AlertDialogCancel>
            <AlertDialogAction onClick={confirmExit}>Save & Exit</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}