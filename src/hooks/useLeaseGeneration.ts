/**
 * Custom hook for lease generation workflow
 * Manages state, validation, and auto-save functionality
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { LeaseFormData, LeaseAgreement, LeaseClause } from '@/types/lease';
import { leaseApi } from '@/services/leaseApi';
import { leaseTemplateEngine } from '@/services/leaseTemplateEngine';
import { useToast } from '@/hooks/use-toast';

interface UseLeaseGenerationOptions {
  templateId?: string;
  existingLeaseId?: string;
  autoSaveInterval?: number; // in milliseconds
}

export function useLeaseGeneration(options: UseLeaseGenerationOptions = {}) {
  const { toast } = useToast();
  const { templateId, existingLeaseId, autoSaveInterval = 30000 } = options;

  const [formData, setFormData] = useState<Partial<LeaseFormData>>({});
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [draftId, setDraftId] = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const formDataRef = useRef(formData);

  // Update ref when formData changes
  useEffect(() => {
    formDataRef.current = formData;
    setHasUnsavedChanges(true);
  }, [formData]);

  /**
   * Load template
   */
  const loadTemplate = useCallback(async (id: string) => {
    setIsLoading(true);
    try {
      const template = await leaseTemplateEngine.getTemplate(id);
      if (template) {
        setFormData({
          templateId: template.id,
          type: template.category,
          clauses: template.clauses
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load template',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  /**
   * Load existing lease
   */
  const loadExistingLease = useCallback(async (id: string) => {
    setIsLoading(true);
    try {
      const lease = await leaseApi.getLease(id);
      if (lease) {
        setFormData({
          propertyId: lease.propertyId,
          landlordId: lease.landlordId,
          tenantIds: lease.tenantIds,
          type: lease.type,
          startDate: lease.startDate,
          endDate: lease.endDate,
          monthlyRent: lease.monthlyRent,
          securityDeposit: lease.securityDeposit,
          clauses: lease.clauses
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load lease',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  /**
   * Save draft
   */
  const saveDraft = useCallback(async (data?: Partial<LeaseFormData>, isAutoSave: boolean = false) => {
    setIsSaving(true);
    try {
      const dataToSave = data || formData;
      const result = await leaseApi.saveDraft(dataToSave);
      
      if (!draftId) {
        setDraftId(result.id);
      }
      
      setLastSaved(new Date());
      setHasUnsavedChanges(false);

      if (!isAutoSave) {
        toast({
          title: 'Draft Saved',
          description: 'Your lease draft has been saved successfully'
        });
      }
    } catch (error) {
      if (!isAutoSave) {
        toast({
          title: 'Error',
          description: 'Failed to save draft',
          variant: 'destructive'
        });
      }
    } finally {
      setIsSaving(false);
    }
  }, [formData, draftId, toast]);

  /**
   * Load template data
   */
  useEffect(() => {
    if (templateId) {
      loadTemplate(templateId);
    }
  }, [templateId, loadTemplate]);

  /**
   * Load existing lease
   */
  useEffect(() => {
    if (existingLeaseId) {
      loadExistingLease(existingLeaseId);
    }
  }, [existingLeaseId, loadExistingLease]);

  /**
   * Auto-save functionality
   */
  useEffect(() => {
    if (autoSaveInterval > 0) {
      autoSaveTimerRef.current = setInterval(() => {
        if (hasUnsavedChanges && formDataRef.current) {
          saveDraft(formDataRef.current, true);
        }
      }, autoSaveInterval);

      return () => {
        if (autoSaveTimerRef.current) {
          clearInterval(autoSaveTimerRef.current);
        }
      };
    }
  }, [autoSaveInterval, hasUnsavedChanges, saveDraft]);

  /**
   * Update form data
   */
  const updateFormData = useCallback((updates: Partial<LeaseFormData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
    
    // Clear errors for updated fields
    const newErrors = { ...errors };
    Object.keys(updates).forEach(key => delete newErrors[key]);
    setErrors(newErrors);
  }, [errors]);

  /**
   * Validate current step
   */
  const validateStep = useCallback((step: number): boolean => {
    const newErrors: Record<string, string> = {};

    switch (step) {
      case 0: // Property Details
        if (!formData.propertyId) newErrors.propertyId = 'Property is required';
        if (!formData.type) newErrors.type = 'Lease type is required';
        break;

      case 1: // Parties Information
        if (!formData.landlordId) newErrors.landlordId = 'Landlord is required';
        if (!formData.tenantIds || formData.tenantIds.length === 0) {
          newErrors.tenantIds = 'At least one tenant is required';
        }
        break;

      case 2: // Lease Terms
        if (!formData.startDate) newErrors.startDate = 'Start date is required';
        if (!formData.endDate) newErrors.endDate = 'End date is required';
        if (formData.startDate && formData.endDate && formData.startDate >= formData.endDate) {
          newErrors.endDate = 'End date must be after start date';
        }
        break;

      case 3: // Financial Terms
        if (!formData.monthlyRent || formData.monthlyRent <= 0) {
          newErrors.monthlyRent = 'Monthly rent must be greater than 0';
        }
        if (!formData.securityDeposit || formData.securityDeposit < 0) {
          newErrors.securityDeposit = 'Security deposit is required';
        }
        break;

      case 4: // Clauses
        if (!formData.clauses || formData.clauses.length === 0) {
          newErrors.clauses = 'At least one clause is required';
        }
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  /**
   * Navigate to next step
   */
  const nextStep = useCallback(() => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => prev + 1);
      return true;
    }
    return false;
  }, [currentStep, validateStep]);

  /**
   * Navigate to previous step
   */
  const previousStep = useCallback(() => {
    setCurrentStep(prev => Math.max(0, prev - 1));
  }, []);

  /**
   * Go to specific step
   */
  const goToStep = useCallback((step: number) => {
    setCurrentStep(step);
  }, []);

  /**
   * Generate lease
   */
  const generateLease = useCallback(async (): Promise<LeaseAgreement | null> => {
    setIsLoading(true);
    try {
      // Validate all steps
      for (let i = 0; i <= 4; i++) {
        if (!validateStep(i)) {
          setCurrentStep(i);
          toast({
            title: 'Validation Error',
            description: 'Please complete all required fields',
            variant: 'destructive'
          });
          return null;
        }
      }

      const lease = await leaseApi.createLease(formData as LeaseFormData);
      
      // Clear draft after successful generation
      if (draftId) {
        await leaseApi.deleteDraft(draftId);
        setDraftId(null);
      }

      setHasUnsavedChanges(false);

      toast({
        title: 'Lease Generated',
        description: 'Your lease agreement has been created successfully'
      });

      return lease;
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to generate lease',
        variant: 'destructive'
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [formData, draftId, validateStep, toast]);

  /**
   * Add clause
   */
  const addClause = useCallback((clause: LeaseClause) => {
    setFormData(prev => ({
      ...prev,
      clauses: [...(prev.clauses || []), clause]
    }));
  }, []);

  /**
   * Remove clause
   */
  const removeClause = useCallback((clauseId: string) => {
    setFormData(prev => ({
      ...prev,
      clauses: (prev.clauses || []).filter(c => c.id !== clauseId)
    }));
  }, []);

  /**
   * Update clause
   */
  const updateClause = useCallback((clauseId: string, updates: Partial<LeaseClause>) => {
    setFormData(prev => ({
      ...prev,
      clauses: (prev.clauses || []).map(c =>
        c.id === clauseId ? { ...c, ...updates } : c
      )
    }));
  }, []);

  return {
    formData,
    currentStep,
    isLoading,
    isSaving,
    errors,
    draftId,
    lastSaved,
    hasUnsavedChanges,
    updateFormData,
    validateStep,
    nextStep,
    previousStep,
    goToStep,
    saveDraft,
    generateLease,
    addClause,
    removeClause,
    updateClause
  };
}