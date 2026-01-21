import React, { createContext, useContext, useState, ReactNode } from 'react';
import { logger } from '@/utils/logger';
import { LeaseFormData } from '@/types/lease';

interface LeaseManagementContextType {
  currentStep: number;
  totalSteps: number;
  formData: LeaseFormData;
  isLoading: boolean;
  errors: Record<string, string>;
  mode: 'landlord' | 'agent'; // Added mode to context
  // Actions
  setStep: (step: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  updateFormData: (data: Partial<LeaseFormData>) => void;
  setLoading: (loading: boolean) => void;
  setErrors: (errors: Record<string, string>) => void;
  validateStep: (step: number) => boolean;
  saveDraft: () => Promise<void>;
}

const initialFormData: LeaseFormData = {
  propertyId: '',
  landlordId: '',
  tenantIds: [],
  type: 'residential-long-term',
  startDate: new Date(),
  endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
  monthlyRent: 0,
  securityDeposit: 0,
  clauses: [],
  customTerms: '',
  agentCommission: 0, // Initialize agentCommission
};

const LeaseManagementContext = createContext<LeaseManagementContextType | undefined>(undefined);

// Exporting the hook separately from the component to avoid fast refresh warning
// eslint-disable-next-line react-refresh/only-export-components
export const useLeaseManagement = () => {
  const context = useContext(LeaseManagementContext);
  if (!context) {
    throw new Error('useLeaseManagement must be used within a LeaseManagementProvider');
  }
  return context;
};

interface LeaseManagementProviderProps {
  children: ReactNode;
  initialData?: Partial<LeaseFormData>;
  onSave?: (data: LeaseFormData) => Promise<void>;
  mode?: 'landlord' | 'agent'; // Accept mode as prop
}

export const LeaseManagementProvider: React.FC<LeaseManagementProviderProps> = ({ 
  children, 
  initialData,
  onSave,
  mode = 'landlord' // Default to landlord
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<LeaseFormData>({ ...initialFormData, ...initialData });
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const totalSteps = 5;

  const updateFormData = (data: Partial<LeaseFormData>) => {
    setFormData(prev => ({ ...prev, ...data }));
    // Clear errors for fields being updated
    const newErrors = { ...errors };
    Object.keys(data).forEach(key => delete newErrors[key]);
    setErrors(newErrors);
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, totalSteps));
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const setStep = (step: number) => {
    if (step < currentStep || validateStep(currentStep)) {
      setCurrentStep(step);
    }
  };

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};
    let isValid = true;

    switch (step) {
      case 1: // Property Selection
        if (!formData.propertyId) newErrors.propertyId = 'Property is required';
        if (!formData.type) newErrors.type = 'Lease type is required';
        break;

      case 2: // Parties Info
        if (!formData.landlordId) newErrors.landlordId = 'Landlord is required';
        if (formData.tenantIds.length === 0) newErrors.tenantIds = 'At least one tenant is required';
        break;

      case 3: // Lease Terms
        if (!formData.startDate) newErrors.startDate = 'Start date is required';
        if (!formData.endDate) newErrors.endDate = 'End date is required';
        if (formData.startDate >= formData.endDate) newErrors.endDate = 'End date must be after start date';
        if (formData.monthlyRent <= 0) newErrors.monthlyRent = 'Monthly rent must be greater than 0';
        break;

      // Add more validation logic as needed
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      isValid = false;
    }

    return isValid;
  };

  const saveDraft = async () => {
    if (onSave) {
      setIsLoading(true);
      try {
        await onSave(formData);
      } catch (error) {
        logger.error('Failed to save draft:', error);
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <LeaseManagementContext.Provider value={{
      currentStep,
      totalSteps,
      formData,
      isLoading,
      errors,
      mode, // Provide mode
      setStep,
      nextStep,
      prevStep,
      updateFormData,
      setLoading: setIsLoading,
      setErrors,
      validateStep,
      saveDraft
    }}>
      {children}
    </LeaseManagementContext.Provider>
  );
};