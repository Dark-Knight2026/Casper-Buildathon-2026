/**
 * Reusable Tenant Dialog Component
 * Used across the application for adding new tenants
 */

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import TenantInviteWizard from './TenantInviteWizard';
import { useToast } from '@/hooks/use-toast';
import { useLandlordManagement } from '@/contexts/LandlordManagementContext';

interface TenantFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  leaseStartDate: string;
  leaseEndDate: string;
  monthlyRent: number;
  securityDeposit: number;
  includeWelcomePacket: boolean;
  welcomeMessage: string;
  documents: string[];
  onboardingSteps: string[];
}

interface TenantDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  propertyId?: string;
  propertyAddress?: string;
  onSuccess?: () => void;
}

export default function TenantDialog({
  open,
  onOpenChange,
  propertyId,
  propertyAddress,
  onSuccess
}: TenantDialogProps) {
  const { toast } = useToast();
  const { properties, addTenant } = useLandlordManagement();

  // If no propertyId provided, use the first available property or show selection
  const defaultProperty = properties[0];
  const selectedPropertyId = propertyId || defaultProperty?.id || '';
  const selectedPropertyAddress = propertyAddress || 
    (defaultProperty ? `${defaultProperty.details.address.street}, ${defaultProperty.details.address.city}` : 'Select Property');

  const handleComplete = async (formData: TenantFormData) => {
    try {
      // Create tenant data structure
      const tenantData = {
        id: `tenant_${Date.now()}`,
        propertyId: selectedPropertyId,
        personalInfo: {
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          phone: formData.phone,
          dateOfBirth: new Date(),
          ssn: ''
        },
        leaseInfo: {
          startDate: formData.leaseStartDate,
          endDate: formData.leaseEndDate,
          monthlyRent: formData.monthlyRent,
          securityDeposit: formData.securityDeposit,
          leaseStatus: 'pending' as const
        },
        paymentInfo: {
          preferredMethod: 'bank-transfer' as const,
          bankAccount: {
            accountNumber: '',
            routingNumber: '',
            accountType: 'checking' as const
          },
          autoPayEnabled: false,
          paymentHistory: []
        },
        documents: [],
        maintenanceRequests: [],
        communications: [],
        emergencyContact: {
          name: '',
          relationship: '',
          phone: ''
        },
        status: 'active' as const,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Add tenant to context
      addTenant(tenantData);

      toast({
        title: 'Tenant Added Successfully',
        description: `${formData.firstName} ${formData.lastName} has been invited to ${selectedPropertyAddress}`,
      });

      // Close dialog and trigger success callback
      onOpenChange(false);
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to add tenant. Please try again.',
        variant: 'destructive'
      });
    }
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 shrink-0">
          <DialogTitle className="text-2xl">Add New Tenant</DialogTitle>
          <DialogDescription>
            Invite a new tenant and set up their lease agreement
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-1 px-6 pb-6">
          <TenantInviteWizard
            propertyId={selectedPropertyId}
            propertyAddress={selectedPropertyAddress}
            onComplete={handleComplete}
            onCancel={handleCancel}
          />
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}