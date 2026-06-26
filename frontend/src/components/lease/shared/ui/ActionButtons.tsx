import React from 'react';
import { Button } from '@/components/ui/button';
import { useLeaseManagement } from '@/contexts/LeaseManagementContext';
import { Loader2, ArrowLeft, ArrowRight, Save } from 'lucide-react';

interface ActionButtonsProps {
  onCancel?: () => void;
  onSubmit?: () => void;
  submitLabel?: string;
  showSaveDraft?: boolean;
}

export const ActionButtons: React.FC<ActionButtonsProps> = ({ 
  onCancel, 
  onSubmit, 
  submitLabel = 'Submit',
  showSaveDraft = true
}) => {
  const { currentStep, totalSteps, nextStep, prevStep, isLoading, saveDraft } = useLeaseManagement();

  const isLastStep = currentStep === totalSteps;

  return (
    <div className="flex justify-between items-center mt-8 pt-4 border-t">
      <div className="flex gap-2">
        {currentStep === 1 ? (
          <Button variant="outline" onClick={onCancel} disabled={isLoading}>
            Cancel
          </Button>
        ) : (
          <Button variant="outline" onClick={prevStep} disabled={isLoading}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        )}
      </div>

      <div className="flex gap-2">
        {showSaveDraft && (
          <Button variant="ghost" onClick={saveDraft} disabled={isLoading}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save Draft
          </Button>
        )}
        
        {isLastStep ? (
          <Button onClick={onSubmit} disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {submitLabel}
          </Button>
        ) : (
          <Button onClick={nextStep} disabled={isLoading}>
            Next
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
};