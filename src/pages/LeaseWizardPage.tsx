import React from 'react';
import { LeaseWizard } from '@/components/lease/shared/LeaseWizard';
import { LeaseFormData } from '@/types/lease';
import { useNavigate } from 'react-router-dom';
import { leaseApi } from '@/lib/api/lease';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/use-toast';

export const LeaseWizardPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const handleSubmit = async (data: LeaseFormData) => {
    console.log('Lease Data Submitted:', data);
    
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to create a lease.",
        variant: "destructive"
      });
      return;
    }

    try {
      // Call the API to create the lease
      const result = await leaseApi.createLease(data, user.id);
      
      if (result) {
        toast({
          title: "Success",
          description: "Lease created successfully!",
        });
        navigate('/dashboard'); // Redirect to dashboard after success
      } else {
        throw new Error("Failed to create lease");
      }
    } catch (error) {
      console.error("Lease creation error:", error);
      toast({
        title: "Error",
        description: "Failed to create lease. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleCancel = () => {
    navigate(-1); // Go back
  };

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-6 text-center">Create New Lease Agreement</h1>
      <LeaseWizard 
        onSubmit={handleSubmit}
        onCancel={handleCancel}
      />
    </div>
  );
};