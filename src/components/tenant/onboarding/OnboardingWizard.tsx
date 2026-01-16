import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import {
  CheckCircle,
  Circle,
  Clock,
  AlertCircle,
  ChevronRight,
  Save,
  Send,
  FileText,
  CreditCard,
  Users,
  Home
} from 'lucide-react';
import { OnboardingProgress, CoTenant } from '@/types/tenant-enhanced';

interface OnboardingWizardProps {
  onComplete: () => void;
}

export default function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  const { toast } = useToast();
  const [progress, setProgress] = useState<OnboardingProgress>({
    tenant_id: 'tenant-1',
    current_step: 'lease_review',
    overall_progress: 0,
    started_at: new Date(),
    auto_save_data: {},
    co_tenants: [],
    steps: [
      {
        id: 'lease_review',
        title: 'Review & Sign Lease',
        description: 'Review your lease agreement and provide digital signature',
        status: 'in_progress',
        required: true,
        order: 1,
        substeps: [
          { id: 'read_lease', title: 'Read lease agreement', completed: false, required: true },
          { id: 'sign_lease', title: 'Provide digital signature', completed: false, required: true },
          { id: 'co_tenant_sign', title: 'Co-tenant signatures', completed: false, required: false }
        ]
      },
      {
        id: 'payment_setup',
        title: 'Payment Method Setup',
        description: 'Add and verify your payment method',
        status: 'pending',
        required: true,
        order: 2,
        substeps: [
          { id: 'add_method', title: 'Add payment method', completed: false, required: true },
          { id: 'verify_method', title: 'Verify payment method', completed: false, required: true }
        ]
      },
      {
        id: 'initial_payments',
        title: 'Initial Payments',
        description: 'Pay security deposit and first month rent',
        status: 'pending',
        required: true,
        order: 3,
        substeps: [
          { id: 'security_deposit', title: 'Pay security deposit', completed: false, required: true },
          { id: 'first_rent', title: 'Pay first month rent', completed: false, required: true }
        ]
      },
      {
        id: 'condition_report',
        title: 'Property Condition Report',
        description: 'Document the initial condition of your rental',
        status: 'pending',
        required: true,
        order: 4,
        substeps: [
          { id: 'walkthrough', title: 'Complete walkthrough', completed: false, required: true },
          { id: 'photos', title: 'Upload photos', completed: false, required: false },
          { id: 'submit_report', title: 'Submit report', completed: false, required: true }
        ]
      },
      {
        id: 'profile_setup',
        title: 'Complete Your Profile',
        description: 'Set up your tenant profile and preferences',
        status: 'pending',
        required: false,
        order: 5,
        substeps: [
          { id: 'contact_info', title: 'Update contact information', completed: false, required: false },
          { id: 'emergency_contact', title: 'Add emergency contact', completed: false, required: false },
          { id: 'preferences', title: 'Set notification preferences', completed: false, required: false }
        ]
      }
    ]
  });

  const [coTenantEmail, setCoTenantEmail] = useState('');
  const [autoSaveEnabled] = useState(true);

  // Auto-save functionality
  useEffect(() => {
    if (autoSaveEnabled) {
      const timer = setTimeout(() => {
        localStorage.setItem('onboarding_progress', JSON.stringify(progress));
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [progress, autoSaveEnabled]);

  // Load saved progress on mount
  useEffect(() => {
    const saved = localStorage.getItem('onboarding_progress');
    if (saved) {
      try {
        const savedProgress = JSON.parse(saved);
        setProgress(savedProgress);
        toast({
          title: 'Progress Restored',
          description: 'Your onboarding progress has been restored.'
        });
      } catch (error) {
        console.error('Failed to restore progress:', error);
      }
    }
  }, [toast]); // Added toast to dependency array

  const calculateProgress = useCallback(() => {
    const totalSteps = progress.steps.reduce((acc, step) => {
      return acc + (step.substeps?.length || 1);
    }, 0);
    
    const completedSteps = progress.steps.reduce((acc, step) => {
      if (step.substeps) {
        return acc + step.substeps.filter(s => s.completed).length;
      }
      return acc + (step.status === 'completed' ? 1 : 0);
    }, 0);
    
    return Math.round((completedSteps / totalSteps) * 100);
  }, [progress.steps]);

  const getStepIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-6 w-6 text-green-600" />;
      case 'in_progress':
        return <Clock className="h-6 w-6 text-blue-600" />;
      case 'pending':
        return <Circle className="h-6 w-6 text-gray-400" />;
      default:
        return <Circle className="h-6 w-6 text-gray-400" />;
    }
  };

  const completeSubstep = (stepId: string, substepId: string) => {
    setProgress(prev => {
      const newSteps = prev.steps.map(step => {
        if (step.id === stepId && step.substeps) {
          const updatedSubsteps = step.substeps.map(substep =>
            substep.id === substepId ? { ...substep, completed: true } : substep
          );
          const allCompleted = updatedSubsteps.every(s => s.completed || !s.required);
          return {
            ...step,
            substeps: updatedSubsteps,
            status: allCompleted ? 'completed' as const : step.status
          };
        }
        return step;
      });

      // Calculate new progress based on updated steps
      const totalSteps = newSteps.reduce((acc, step) => {
        return acc + (step.substeps?.length || 1);
      }, 0);
      
      const completedSteps = newSteps.reduce((acc, step) => {
        if (step.substeps) {
          return acc + step.substeps.filter(s => s.completed).length;
        }
        return acc + (step.status === 'completed' ? 1 : 0);
      }, 0);
      
      const newOverallProgress = Math.round((completedSteps / totalSteps) * 100);

      return {
        ...prev,
        steps: newSteps,
        overall_progress: newOverallProgress
      };
    });

    toast({
      title: 'Step Completed',
      description: 'Your progress has been saved automatically.'
    });
  };

  const inviteCoTenant = () => {
    if (!coTenantEmail) return;

    const newCoTenant: CoTenant = {
      id: `co-tenant-${Date.now()}`,
      name: coTenantEmail.split('@')[0],
      email: coTenantEmail,
      status: 'invited',
      invited_at: new Date()
    };

    setProgress(prev => ({
      ...prev,
      co_tenants: [...prev.co_tenants, newCoTenant]
    }));

    setCoTenantEmail('');

    toast({
      title: 'Invitation Sent',
      description: `Co-tenant invitation sent to ${newCoTenant.email}`
    });
  };

  const sendReminder = (coTenantId: string) => {
    setProgress(prev => ({
      ...prev,
      co_tenants: prev.co_tenants.map(ct =>
        ct.id === coTenantId ? { ...ct, reminder_sent_at: new Date() } : ct
      )
    }));

    toast({
      title: 'Reminder Sent',
      description: 'A reminder has been sent to the co-tenant.'
    });
  };

  const currentStepIndex = progress.steps.findIndex(s => s.id === progress.current_step);
  const currentStep = progress.steps[currentStepIndex];
  const overallProgress = calculateProgress();

  const canProceed = () => {
    if (!currentStep.substeps) return currentStep.status === 'completed';
    return currentStep.substeps.every(s => s.completed || !s.required);
  };

  const goToNextStep = () => {
    if (currentStepIndex < progress.steps.length - 1) {
      const nextStep = progress.steps[currentStepIndex + 1];
      setProgress(prev => ({
        ...prev,
        current_step: nextStep.id,
        steps: prev.steps.map(step =>
          step.id === nextStep.id ? { ...step, status: 'in_progress' } : step
        )
      }));
    } else {
      // All steps completed
      setProgress(prev => ({
        ...prev,
        completed_at: new Date()
      }));
      localStorage.removeItem('onboarding_progress');
      toast({
        title: 'Onboarding Complete!',
        description: 'Welcome to your new home! You can now access all features.'
      });
      onComplete();
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">Welcome to Your New Home!</CardTitle>
              <p className="text-gray-600 mt-2">
                Complete these steps to get started with your tenancy
              </p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-blue-600">{overallProgress}%</div>
              <p className="text-sm text-gray-600">Complete</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Progress value={overallProgress} className="h-3" />
          <div className="flex items-center justify-between mt-2 text-sm text-gray-600">
            <span>Step {currentStepIndex + 1} of {progress.steps.length}</span>
            {autoSaveEnabled && (
              <span className="flex items-center">
                <Save className="h-4 w-4 mr-1" />
                Auto-saving enabled
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Steps Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Onboarding Checklist</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {progress.steps.map((step) => (
              <div
                key={step.id}
                className={`flex items-start space-x-4 p-4 rounded-lg border-2 transition-all ${
                  step.id === currentStep.id
                    ? 'border-blue-500 bg-blue-50'
                    : step.status === 'completed'
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-200 bg-white'
                }`}
              >
                <div className="flex-shrink-0 mt-1">
                  {getStepIcon(step.status)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h3 className="font-semibold text-lg flex items-center">
                        {step.title}
                        {step.required && (
                          <Badge variant="destructive" className="ml-2">Required</Badge>
                        )}
                      </h3>
                      <p className="text-sm text-gray-600">{step.description}</p>
                    </div>
                    <Badge
                      className={
                        step.status === 'completed'
                          ? 'bg-green-100 text-green-800'
                          : step.status === 'in_progress'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-100 text-gray-800'
                      }
                    >
                      {step.status.replace('_', ' ')}
                    </Badge>
                  </div>
                  
                  {step.substeps && step.id === currentStep.id && (
                    <div className="mt-4 space-y-2 pl-4 border-l-2 border-blue-300">
                      {step.substeps.map(substep => (
                        <div key={substep.id} className="flex items-center space-x-3">
                          <Checkbox
                            checked={substep.completed}
                            onCheckedChange={() => completeSubstep(step.id, substep.id)}
                            disabled={substep.completed}
                          />
                          <Label className="flex-1 cursor-pointer">
                            {substep.title}
                            {substep.required && (
                              <span className="text-red-500 ml-1">*</span>
                            )}
                          </Label>
                          {substep.completed && (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Current Step Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            {currentStep.id === 'lease_review' && <FileText className="h-5 w-5 mr-2" />}
            {currentStep.id === 'payment_setup' && <CreditCard className="h-5 w-5 mr-2" />}
            {currentStep.id === 'initial_payments' && <CreditCard className="h-5 w-5 mr-2" />}
            {currentStep.id === 'condition_report' && <Home className="h-5 w-5 mr-2" />}
            {currentStep.id === 'profile_setup' && <Users className="h-5 w-5 mr-2" />}
            {currentStep.title}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Lease Review Step */}
          {currentStep.id === 'lease_review' && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold mb-2">Digital Signature Required</h4>
                <p className="text-sm text-gray-700 mb-4">
                  Please review your lease agreement carefully before signing. Your digital signature
                  is legally binding.
                </p>
                <Button className="w-full">
                  <FileText className="h-4 w-4 mr-2" />
                  Open Lease Agreement
                </Button>
              </div>

              {/* Co-tenant Management */}
              <div className="border rounded-lg p-4">
                <h4 className="font-semibold mb-3">Co-Tenant Signatures</h4>
                <div className="space-y-3">
                  {progress.co_tenants.map(coTenant => (
                    <div key={coTenant.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                      <div>
                        <p className="font-medium">{coTenant.email}</p>
                        <p className="text-sm text-gray-600">
                          Invited {new Date(coTenant.invited_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge
                          className={
                            coTenant.status === 'completed'
                              ? 'bg-green-100 text-green-800'
                              : coTenant.status === 'pending_signature'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-blue-100 text-blue-800'
                          }
                        >
                          {coTenant.status.replace('_', ' ')}
                        </Badge>
                        {coTenant.status !== 'completed' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => sendReminder(coTenant.id)}
                          >
                            <Send className="h-4 w-4 mr-1" />
                            Remind
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                  
                  <div className="flex space-x-2">
                    <Input
                      placeholder="Co-tenant email address"
                      value={coTenantEmail}
                      onChange={(e) => setCoTenantEmail(e.target.value)}
                    />
                    <Button onClick={inviteCoTenant}>
                      <Send className="h-4 w-4 mr-2" />
                      Invite
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Payment Setup Step */}
          {currentStep.id === 'payment_setup' && (
            <div className="space-y-4">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start space-x-3">
                <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-yellow-800">
                  <p className="font-medium mb-1">Payment Method Verification Required</p>
                  <p>
                    You must add and verify a payment method before proceeding. This ensures smooth
                    rent payments throughout your tenancy.
                  </p>
                </div>
              </div>
              <Button className="w-full" size="lg">
                <CreditCard className="h-5 w-5 mr-2" />
                Add Payment Method
              </Button>
            </div>
          )}

          {/* Other steps can be similarly implemented */}
          {currentStep.id !== 'lease_review' && currentStep.id !== 'payment_setup' && (
            <div className="text-center py-8">
              <p className="text-gray-600 mb-4">
                Complete the tasks above to proceed with this step.
              </p>
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between pt-6 border-t">
            <Button
              variant="outline"
              disabled={currentStepIndex === 0}
              onClick={() => {
                const prevStep = progress.steps[currentStepIndex - 1];
                setProgress(prev => ({
                  ...prev,
                  current_step: prevStep.id
                }));
              }}
            >
              Previous
            </Button>
            <Button
              onClick={goToNextStep}
              disabled={!canProceed()}
            >
              {currentStepIndex === progress.steps.length - 1 ? 'Complete Onboarding' : 'Next Step'}
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}