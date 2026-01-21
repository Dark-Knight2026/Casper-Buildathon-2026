import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { ApplicationService } from '@/services/applicationService';
import { documentStorageService, STORAGE_BUCKETS } from '@/services/documentStorageService';
import { stripeService } from '@/services/stripeService';
import type { TenantApplication } from '@/types/application';
import { ChevronLeft, ChevronRight, Upload, X } from 'lucide-react';

// Multi-step form schema
const personalInfoSchema = z.object({
  firstName: z.string().min(2, 'First name is required'),
  lastName: z.string().min(2, 'Last name is required'),
  dateOfBirth: z.string().min(1, 'Date of birth is required'),
  ssn: z.string().regex(/^\d{3}-\d{2}-\d{4}$/, 'SSN must be in format XXX-XX-XXXX'),
  phone: z.string().regex(/^\d{3}-\d{3}-\d{4}$/, 'Phone must be in format XXX-XXX-XXXX'),
  email: z.string().email('Invalid email address'),
  street: z.string().min(5, 'Street address is required'),
  city: z.string().min(2, 'City is required'),
  state: z.string().length(2, 'State must be 2 letters'),
  zipCode: z.string().regex(/^\d{5}$/, 'ZIP code must be 5 digits'),
  desiredMoveInDate: z.string().min(1, 'Move-in date is required'),
  numberOfOccupants: z.number().min(1, 'At least 1 occupant required'),
  hasPets: z.boolean(),
});

const employmentInfoSchema = z.object({
  employerName: z.string().min(2, 'Employer name is required'),
  position: z.string().min(2, 'Position is required'),
  startDate: z.string().min(1, 'Start date is required'),
  monthlyIncome: z.number().min(0, 'Monthly income is required'),
  supervisorName: z.string().min(2, 'Supervisor name is required'),
  supervisorPhone: z.string().regex(/^\d{3}-\d{3}-\d{4}$/, 'Phone must be in format XXX-XXX-XXXX'),
  employerAddress: z.string().min(5, 'Employer address is required'),
});

const rentalHistorySchema = z.object({
  currentLandlordName: z.string().min(2, 'Landlord name is required'),
  currentLandlordPhone: z.string().regex(/^\d{3}-\d{3}-\d{4}$/, 'Phone must be in format XXX-XXX-XXXX'),
  currentAddress: z.string().min(5, 'Address is required'),
  monthlyRent: z.number().min(0, 'Monthly rent is required'),
  leaseStartDate: z.string().min(1, 'Lease start date is required'),
  leaseEndDate: z.string().min(1, 'Lease end date is required'),
  reasonForMoving: z.string().min(10, 'Please provide a reason for moving'),
});

const referencesSchema = z.object({
  reference1Name: z.string().min(2, 'Reference name is required'),
  reference1Relationship: z.string().min(2, 'Relationship is required'),
  reference1Phone: z.string().regex(/^\d{3}-\d{3}-\d{4}$/, 'Phone must be in format XXX-XXX-XXXX'),
  reference2Name: z.string().min(2, 'Reference name is required'),
  reference2Relationship: z.string().min(2, 'Relationship is required'),
  reference2Phone: z.string().regex(/^\d{3}-\d{3}-\d{4}$/, 'Phone must be in format XXX-XXX-XXXX'),
  emergencyName: z.string().min(2, 'Emergency contact name is required'),
  emergencyRelationship: z.string().min(2, 'Relationship is required'),
  emergencyPhone: z.string().regex(/^\d{3}-\d{3}-\d{4}$/, 'Phone must be in format XXX-XXX-XXXX'),
});

const additionalInfoSchema = z.object({
  bankruptcyHistory: z.boolean(),
  bankruptcyDetails: z.string().optional(),
  evictionHistory: z.boolean(),
  evictionDetails: z.string().optional(),
  criminalHistory: z.boolean(),
  criminalDetails: z.string().optional(),
  additionalComments: z.string().optional(),
});

const steps = [
  { id: 1, name: 'Personal Information', schema: personalInfoSchema },
  { id: 2, name: 'Employment', schema: employmentInfoSchema },
  { id: 3, name: 'Rental History', schema: rentalHistorySchema },
  { id: 4, name: 'References', schema: referencesSchema },
  { id: 5, name: 'Additional Information', schema: additionalInfoSchema },
  { id: 6, name: 'Documents & Payment', schema: z.object({}) },
];

export default function TenantApplication() {
  const [searchParams] = useSearchParams();
  const propertyId = searchParams.get('propertyId');
  const navigate = useNavigate();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [applicationId, setApplicationId] = useState<string | null>(null);
  const [uploadedDocuments, setUploadedDocuments] = useState<TenantApplication['documents']>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<Record<string, unknown>>({});

  const form = useForm({
    resolver: zodResolver(steps[currentStep - 1].schema),
    mode: 'onChange',
  });

  const buildApplicationData = useCallback((): Partial<TenantApplication> => {
    return {
      propertyId: propertyId!,
      personalInfo: {
        firstName: formData.firstName as string,
        lastName: formData.lastName as string,
        dateOfBirth: formData.dateOfBirth as string,
        ssn: formData.ssn as string,
        phone: formData.phone as string,
        email: formData.email as string,
        currentAddress: {
          street: formData.street as string,
          city: formData.city as string,
          state: formData.state as string,
          zipCode: formData.zipCode as string,
        },
        desiredMoveInDate: formData.desiredMoveInDate as string,
        numberOfOccupants: formData.numberOfOccupants as number,
        pets: formData.hasPets ? [] : undefined,
      },
      employmentInfo: {
        currentEmployer: {
          name: formData.employerName as string,
          position: formData.position as string,
          startDate: formData.startDate as string,
          monthlyIncome: formData.monthlyIncome as number,
          supervisorName: formData.supervisorName as string,
          supervisorPhone: formData.supervisorPhone as string,
          address: formData.employerAddress as string,
        },
      },
      rentalHistory: {
        currentLandlord: {
          name: formData.currentLandlordName as string,
          phone: formData.currentLandlordPhone as string,
          address: formData.currentAddress as string,
          monthlyRent: formData.monthlyRent as number,
          leaseStartDate: formData.leaseStartDate as string,
          leaseEndDate: formData.leaseEndDate as string,
          reasonForMoving: formData.reasonForMoving as string,
        },
        previousLandlords: [],
      },
      references: {
        personal: [
          {
            name: formData.reference1Name as string,
            relationship: formData.reference1Relationship as string,
            phone: formData.reference1Phone as string,
          },
          {
            name: formData.reference2Name as string,
            relationship: formData.reference2Relationship as string,
            phone: formData.reference2Phone as string,
          },
        ],
        emergency: {
          name: formData.emergencyName as string,
          relationship: formData.emergencyRelationship as string,
          phone: formData.emergencyPhone as string,
        },
      },
      additionalInfo: {
        bankruptcyHistory: formData.bankruptcyHistory as boolean,
        bankruptcyDetails: formData.bankruptcyDetails as string,
        evictionHistory: formData.evictionHistory as boolean,
        evictionDetails: formData.evictionDetails as string,
        criminalHistory: formData.criminalHistory as boolean,
        criminalDetails: formData.criminalDetails as string,
        vehicles: [],
        additionalComments: formData.additionalComments as string,
      },
      documents: uploadedDocuments,
    };
  }, [formData, propertyId, uploadedDocuments]);

  const saveDraft = useCallback(async () => {
    if (!applicationId || !propertyId) return;

    try {
      const applicationData = buildApplicationData();
      await ApplicationService.updateApplication(applicationId, applicationData);
    } catch (error) {
      console.error('Failed to save draft:', error);
    }
  }, [applicationId, propertyId, buildApplicationData]);

  // Auto-save draft every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (applicationId && Object.keys(formData).length > 0) {
        saveDraft();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [applicationId, formData, saveDraft]);

  const handleNext = async () => {
    const isValid = await form.trigger();
    if (!isValid) return;

    const stepData = form.getValues();
    setFormData((prev) => ({ ...prev, ...stepData }));

    // Create application on first step
    if (currentStep === 1 && !applicationId && propertyId) {
      try {
        const application = await ApplicationService.createApplication({
          propertyId,
          personalInfo: {
            firstName: stepData.firstName,
            lastName: stepData.lastName,
            dateOfBirth: stepData.dateOfBirth,
            ssn: stepData.ssn,
            phone: stepData.phone,
            email: stepData.email,
            currentAddress: {
              street: stepData.street,
              city: stepData.city,
              state: stepData.state,
              zipCode: stepData.zipCode,
            },
            desiredMoveInDate: stepData.desiredMoveInDate,
            numberOfOccupants: stepData.numberOfOccupants,
          },
        } as Partial<TenantApplication>);
        setApplicationId(application.id);
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Failed to create application',
          variant: 'destructive',
        });
        return;
      }
    }

    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, type: 'id' | 'pay_stub' | 'bank_statement' | 'other') => {
    const file = event.target.files?.[0];
    if (!file || !applicationId) return;

    try {
      const result = await documentStorageService.uploadDocument(
        file,
        STORAGE_BUCKETS.DOCUMENTS,
        {
          uploadedBy: applicationId,
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type,
          category: 'general',
        },
        'applications'
      );

      if (result.success && result.url) {
        const newDoc = {
          id: result.documentId || crypto.randomUUID(),
          type,
          name: file.name,
          url: result.url,
          uploadedAt: new Date().toISOString(),
        };
        setUploadedDocuments([...uploadedDocuments, newDoc]);
        toast({
          title: 'Success',
          description: 'Document uploaded successfully',
        });
      } else {
        throw new Error(result.error || 'Upload failed');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to upload document',
        variant: 'destructive',
      });
    }
  };

  const handleRemoveDocument = (id: string) => {
    setUploadedDocuments(uploadedDocuments.filter((doc) => doc.id !== id));
  };

  const handleSubmit = async () => {
    if (!applicationId) return;

    setIsSubmitting(true);
    try {
      // Update application with all data
      const applicationData = buildApplicationData();
      await ApplicationService.updateApplication(applicationId, applicationData);

      // Process application fee payment (simplified for now)
      // In production, you would integrate with Stripe properly
      await ApplicationService.markApplicationFeePaid(applicationId);

      // Submit application
      await ApplicationService.submitApplication(applicationId);

      toast({
        title: 'Success',
        description: 'Application submitted successfully!',
      });

      navigate('/tenant/applications');
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to submit application',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>Tenant Application</CardTitle>
          <CardDescription>
            Step {currentStep} of {steps.length}: {steps[currentStep - 1].name}
          </CardDescription>
          <div className="flex gap-2 mt-4">
            {steps.map((step) => (
              <div
                key={step.id}
                className={`h-2 flex-1 rounded ${
                  step.id <= currentStep ? 'bg-primary' : 'bg-gray-200'
                }`}
              />
            ))}
          </div>
        </CardHeader>
        <CardContent>
          <form className="space-y-6">
            {currentStep === 1 && (
              <PersonalInfoStep form={form} />
            )}
            {currentStep === 2 && (
              <EmploymentStep form={form} />
            )}
            {currentStep === 3 && (
              <RentalHistoryStep form={form} />
            )}
            {currentStep === 4 && (
              <ReferencesStep form={form} />
            )}
            {currentStep === 5 && (
              <AdditionalInfoStep form={form} />
            )}
            {currentStep === 6 && (
              <DocumentsStep
                uploadedDocuments={uploadedDocuments}
                onFileUpload={handleFileUpload}
                onRemoveDocument={handleRemoveDocument}
              />
            )}

            <div className="flex justify-between pt-6">
              <Button
                type="button"
                variant="outline"
                onClick={handleBack}
                disabled={currentStep === 1}
              >
                <ChevronLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              {currentStep < steps.length ? (
                <Button type="button" onClick={handleNext}>
                  Next
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              ) : (
                <Button type="button" onClick={handleSubmit} disabled={isSubmitting}>
                  {isSubmitting ? 'Submitting...' : 'Submit Application'}
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

// Component implementations remain the same as before
function PersonalInfoStep({ form }: { form: ReturnType<typeof useForm> }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="firstName">First Name *</Label>
          <Input id="firstName" {...form.register('firstName')} />
          {form.formState.errors.firstName && (
            <p className="text-sm text-red-500 mt-1">{form.formState.errors.firstName.message as string}</p>
          )}
        </div>
        <div>
          <Label htmlFor="lastName">Last Name *</Label>
          <Input id="lastName" {...form.register('lastName')} />
          {form.formState.errors.lastName && (
            <p className="text-sm text-red-500 mt-1">{form.formState.errors.lastName.message as string}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="dateOfBirth">Date of Birth *</Label>
          <Input id="dateOfBirth" type="date" {...form.register('dateOfBirth')} />
          {form.formState.errors.dateOfBirth && (
            <p className="text-sm text-red-500 mt-1">{form.formState.errors.dateOfBirth.message as string}</p>
          )}
        </div>
        <div>
          <Label htmlFor="ssn">SSN (XXX-XX-XXXX) *</Label>
          <Input id="ssn" placeholder="XXX-XX-XXXX" {...form.register('ssn')} />
          {form.formState.errors.ssn && (
            <p className="text-sm text-red-500 mt-1">{form.formState.errors.ssn.message as string}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="phone">Phone *</Label>
          <Input id="phone" placeholder="XXX-XXX-XXXX" {...form.register('phone')} />
          {form.formState.errors.phone && (
            <p className="text-sm text-red-500 mt-1">{form.formState.errors.phone.message as string}</p>
          )}
        </div>
        <div>
          <Label htmlFor="email">Email *</Label>
          <Input id="email" type="email" {...form.register('email')} />
          {form.formState.errors.email && (
            <p className="text-sm text-red-500 mt-1">{form.formState.errors.email.message as string}</p>
          )}
        </div>
      </div>

      <div>
        <Label htmlFor="street">Street Address *</Label>
        <Input id="street" {...form.register('street')} />
        {form.formState.errors.street && (
          <p className="text-sm text-red-500 mt-1">{form.formState.errors.street.message as string}</p>
        )}
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label htmlFor="city">City *</Label>
          <Input id="city" {...form.register('city')} />
          {form.formState.errors.city && (
            <p className="text-sm text-red-500 mt-1">{form.formState.errors.city.message as string}</p>
          )}
        </div>
        <div>
          <Label htmlFor="state">State *</Label>
          <Input id="state" placeholder="CA" maxLength={2} {...form.register('state')} />
          {form.formState.errors.state && (
            <p className="text-sm text-red-500 mt-1">{form.formState.errors.state.message as string}</p>
          )}
        </div>
        <div>
          <Label htmlFor="zipCode">ZIP Code *</Label>
          <Input id="zipCode" placeholder="12345" {...form.register('zipCode')} />
          {form.formState.errors.zipCode && (
            <p className="text-sm text-red-500 mt-1">{form.formState.errors.zipCode.message as string}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="desiredMoveInDate">Desired Move-in Date *</Label>
          <Input id="desiredMoveInDate" type="date" {...form.register('desiredMoveInDate')} />
          {form.formState.errors.desiredMoveInDate && (
            <p className="text-sm text-red-500 mt-1">{form.formState.errors.desiredMoveInDate.message as string}</p>
          )}
        </div>
        <div>
          <Label htmlFor="numberOfOccupants">Number of Occupants *</Label>
          <Input
            id="numberOfOccupants"
            type="number"
            min="1"
            {...form.register('numberOfOccupants', { valueAsNumber: true })}
          />
          {form.formState.errors.numberOfOccupants && (
            <p className="text-sm text-red-500 mt-1">{form.formState.errors.numberOfOccupants.message as string}</p>
          )}
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox id="hasPets" {...form.register('hasPets')} />
        <Label htmlFor="hasPets">I have pets</Label>
      </div>
    </div>
  );
}

function EmploymentStep({ form }: { form: ReturnType<typeof useForm> }) {
  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="employerName">Current Employer *</Label>
        <Input id="employerName" {...form.register('employerName')} />
        {form.formState.errors.employerName && (
          <p className="text-sm text-red-500 mt-1">{form.formState.errors.employerName.message as string}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="position">Position *</Label>
          <Input id="position" {...form.register('position')} />
          {form.formState.errors.position && (
            <p className="text-sm text-red-500 mt-1">{form.formState.errors.position.message as string}</p>
          )}
        </div>
        <div>
          <Label htmlFor="startDate">Start Date *</Label>
          <Input id="startDate" type="date" {...form.register('startDate')} />
          {form.formState.errors.startDate && (
            <p className="text-sm text-red-500 mt-1">{form.formState.errors.startDate.message as string}</p>
          )}
        </div>
      </div>

      <div>
        <Label htmlFor="monthlyIncome">Monthly Income *</Label>
        <Input
          id="monthlyIncome"
          type="number"
          min="0"
          step="0.01"
          {...form.register('monthlyIncome', { valueAsNumber: true })}
        />
        {form.formState.errors.monthlyIncome && (
          <p className="text-sm text-red-500 mt-1">{form.formState.errors.monthlyIncome.message as string}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="supervisorName">Supervisor Name *</Label>
          <Input id="supervisorName" {...form.register('supervisorName')} />
          {form.formState.errors.supervisorName && (
            <p className="text-sm text-red-500 mt-1">{form.formState.errors.supervisorName.message as string}</p>
          )}
        </div>
        <div>
          <Label htmlFor="supervisorPhone">Supervisor Phone *</Label>
          <Input id="supervisorPhone" placeholder="XXX-XXX-XXXX" {...form.register('supervisorPhone')} />
          {form.formState.errors.supervisorPhone && (
            <p className="text-sm text-red-500 mt-1">{form.formState.errors.supervisorPhone.message as string}</p>
          )}
        </div>
      </div>

      <div>
        <Label htmlFor="employerAddress">Employer Address *</Label>
        <Input id="employerAddress" {...form.register('employerAddress')} />
        {form.formState.errors.employerAddress && (
          <p className="text-sm text-red-500 mt-1">{form.formState.errors.employerAddress.message as string}</p>
        )}
      </div>
    </div>
  );
}

function RentalHistoryStep({ form }: { form: ReturnType<typeof useForm> }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="currentLandlordName">Current Landlord Name *</Label>
          <Input id="currentLandlordName" {...form.register('currentLandlordName')} />
          {form.formState.errors.currentLandlordName && (
            <p className="text-sm text-red-500 mt-1">{form.formState.errors.currentLandlordName.message as string}</p>
          )}
        </div>
        <div>
          <Label htmlFor="currentLandlordPhone">Landlord Phone *</Label>
          <Input id="currentLandlordPhone" placeholder="XXX-XXX-XXXX" {...form.register('currentLandlordPhone')} />
          {form.formState.errors.currentLandlordPhone && (
            <p className="text-sm text-red-500 mt-1">{form.formState.errors.currentLandlordPhone.message as string}</p>
          )}
        </div>
      </div>

      <div>
        <Label htmlFor="currentAddress">Current Rental Address *</Label>
        <Input id="currentAddress" {...form.register('currentAddress')} />
        {form.formState.errors.currentAddress && (
          <p className="text-sm text-red-500 mt-1">{form.formState.errors.currentAddress.message as string}</p>
        )}
      </div>

      <div>
        <Label htmlFor="monthlyRent">Monthly Rent *</Label>
        <Input
          id="monthlyRent"
          type="number"
          min="0"
          step="0.01"
          {...form.register('monthlyRent', { valueAsNumber: true })}
        />
        {form.formState.errors.monthlyRent && (
          <p className="text-sm text-red-500 mt-1">{form.formState.errors.monthlyRent.message as string}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="leaseStartDate">Lease Start Date *</Label>
          <Input id="leaseStartDate" type="date" {...form.register('leaseStartDate')} />
          {form.formState.errors.leaseStartDate && (
            <p className="text-sm text-red-500 mt-1">{form.formState.errors.leaseStartDate.message as string}</p>
          )}
        </div>
        <div>
          <Label htmlFor="leaseEndDate">Lease End Date *</Label>
          <Input id="leaseEndDate" type="date" {...form.register('leaseEndDate')} />
          {form.formState.errors.leaseEndDate && (
            <p className="text-sm text-red-500 mt-1">{form.formState.errors.leaseEndDate.message as string}</p>
          )}
        </div>
      </div>

      <div>
        <Label htmlFor="reasonForMoving">Reason for Moving *</Label>
        <Textarea id="reasonForMoving" {...form.register('reasonForMoving')} />
        {form.formState.errors.reasonForMoving && (
          <p className="text-sm text-red-500 mt-1">{form.formState.errors.reasonForMoving.message as string}</p>
        )}
      </div>
    </div>
  );
}

function ReferencesStep({ form }: { form: ReturnType<typeof useForm> }) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Personal Reference 1</h3>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="reference1Name">Name *</Label>
              <Input id="reference1Name" {...form.register('reference1Name')} />
              {form.formState.errors.reference1Name && (
                <p className="text-sm text-red-500 mt-1">{form.formState.errors.reference1Name.message as string}</p>
              )}
            </div>
            <div>
              <Label htmlFor="reference1Relationship">Relationship *</Label>
              <Input id="reference1Relationship" {...form.register('reference1Relationship')} />
              {form.formState.errors.reference1Relationship && (
                <p className="text-sm text-red-500 mt-1">{form.formState.errors.reference1Relationship.message as string}</p>
              )}
            </div>
          </div>
          <div>
            <Label htmlFor="reference1Phone">Phone *</Label>
            <Input id="reference1Phone" placeholder="XXX-XXX-XXXX" {...form.register('reference1Phone')} />
            {form.formState.errors.reference1Phone && (
              <p className="text-sm text-red-500 mt-1">{form.formState.errors.reference1Phone.message as string}</p>
            )}
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4">Personal Reference 2</h3>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="reference2Name">Name *</Label>
              <Input id="reference2Name" {...form.register('reference2Name')} />
              {form.formState.errors.reference2Name && (
                <p className="text-sm text-red-500 mt-1">{form.formState.errors.reference2Name.message as string}</p>
              )}
            </div>
            <div>
              <Label htmlFor="reference2Relationship">Relationship *</Label>
              <Input id="reference2Relationship" {...form.register('reference2Relationship')} />
              {form.formState.errors.reference2Relationship && (
                <p className="text-sm text-red-500 mt-1">{form.formState.errors.reference2Relationship.message as string}</p>
              )}
            </div>
          </div>
          <div>
            <Label htmlFor="reference2Phone">Phone *</Label>
            <Input id="reference2Phone" placeholder="XXX-XXX-XXXX" {...form.register('reference2Phone')} />
            {form.formState.errors.reference2Phone && (
              <p className="text-sm text-red-500 mt-1">{form.formState.errors.reference2Phone.message as string}</p>
            )}
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4">Emergency Contact</h3>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="emergencyName">Name *</Label>
              <Input id="emergencyName" {...form.register('emergencyName')} />
              {form.formState.errors.emergencyName && (
                <p className="text-sm text-red-500 mt-1">{form.formState.errors.emergencyName.message as string}</p>
              )}
            </div>
            <div>
              <Label htmlFor="emergencyRelationship">Relationship *</Label>
              <Input id="emergencyRelationship" {...form.register('emergencyRelationship')} />
              {form.formState.errors.emergencyRelationship && (
                <p className="text-sm text-red-500 mt-1">{form.formState.errors.emergencyRelationship.message as string}</p>
              )}
            </div>
          </div>
          <div>
            <Label htmlFor="emergencyPhone">Phone *</Label>
            <Input id="emergencyPhone" placeholder="XXX-XXX-XXXX" {...form.register('emergencyPhone')} />
            {form.formState.errors.emergencyPhone && (
              <p className="text-sm text-red-500 mt-1">{form.formState.errors.emergencyPhone.message as string}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function AdditionalInfoStep({ form }: { form: ReturnType<typeof useForm> }) {
  const watchBankruptcy = form.watch('bankruptcyHistory');
  const watchEviction = form.watch('evictionHistory');
  const watchCriminal = form.watch('criminalHistory');

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center space-x-2 mb-2">
          <Checkbox id="bankruptcyHistory" {...form.register('bankruptcyHistory')} />
          <Label htmlFor="bankruptcyHistory">Have you ever filed for bankruptcy?</Label>
        </div>
        {watchBankruptcy && (
          <Textarea
            id="bankruptcyDetails"
            placeholder="Please provide details..."
            {...form.register('bankruptcyDetails')}
          />
        )}
      </div>

      <div>
        <div className="flex items-center space-x-2 mb-2">
          <Checkbox id="evictionHistory" {...form.register('evictionHistory')} />
          <Label htmlFor="evictionHistory">Have you ever been evicted?</Label>
        </div>
        {watchEviction && (
          <Textarea
            id="evictionDetails"
            placeholder="Please provide details..."
            {...form.register('evictionDetails')}
          />
        )}
      </div>

      <div>
        <div className="flex items-center space-x-2 mb-2">
          <Checkbox id="criminalHistory" {...form.register('criminalHistory')} />
          <Label htmlFor="criminalHistory">Do you have any criminal history?</Label>
        </div>
        {watchCriminal && (
          <Textarea
            id="criminalDetails"
            placeholder="Please provide details..."
            {...form.register('criminalDetails')}
          />
        )}
      </div>

      <div>
        <Label htmlFor="additionalComments">Additional Comments</Label>
        <Textarea
          id="additionalComments"
          placeholder="Any additional information you'd like to provide..."
          {...form.register('additionalComments')}
        />
      </div>
    </div>
  );
}

function DocumentsStep({
  uploadedDocuments,
  onFileUpload,
  onRemoveDocument,
}: {
  uploadedDocuments: TenantApplication['documents'];
  onFileUpload: (event: React.ChangeEvent<HTMLInputElement>, type: 'id' | 'pay_stub' | 'bank_statement' | 'other') => void;
  onRemoveDocument: (id: string) => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Required Documents</h3>
        <p className="text-sm text-gray-600 mb-4">
          Please upload the following documents to complete your application:
        </p>

        <div className="space-y-4">
          <div>
            <Label>Photo ID (Driver's License or Passport) *</Label>
            <div className="mt-2">
              <label className="flex items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-gray-50">
                <div className="text-center">
                  <Upload className="mx-auto h-8 w-8 text-gray-400" />
                  <p className="mt-2 text-sm text-gray-600">Click to upload</p>
                </div>
                <input
                  type="file"
                  className="hidden"
                  accept="image/*,.pdf"
                  onChange={(e) => onFileUpload(e, 'id')}
                />
              </label>
            </div>
          </div>

          <div>
            <Label>Recent Pay Stubs (Last 2 months) *</Label>
            <div className="mt-2">
              <label className="flex items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-gray-50">
                <div className="text-center">
                  <Upload className="mx-auto h-8 w-8 text-gray-400" />
                  <p className="mt-2 text-sm text-gray-600">Click to upload</p>
                </div>
                <input
                  type="file"
                  className="hidden"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => onFileUpload(e, 'pay_stub')}
                />
              </label>
            </div>
          </div>

          <div>
            <Label>Bank Statements (Last 2 months) *</Label>
            <div className="mt-2">
              <label className="flex items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-gray-50">
                <div className="text-center">
                  <Upload className="mx-auto h-8 w-8 text-gray-400" />
                  <p className="mt-2 text-sm text-gray-600">Click to upload</p>
                </div>
                <input
                  type="file"
                  className="hidden"
                  accept=".pdf"
                  onChange={(e) => onFileUpload(e, 'bank_statement')}
                />
              </label>
            </div>
          </div>
        </div>
      </div>

      {uploadedDocuments.length > 0 && (
        <div>
          <h4 className="font-semibold mb-2">Uploaded Documents</h4>
          <div className="space-y-2">
            {uploadedDocuments.map((doc) => (
              <div key={doc.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                <div>
                  <p className="font-medium">{doc.name}</p>
                  <p className="text-sm text-gray-600">{doc.type.replace('_', ' ').toUpperCase()}</p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onRemoveDocument(doc.id)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-blue-50 p-4 rounded-lg">
        <h4 className="font-semibold mb-2">Application Fee: $50</h4>
        <p className="text-sm text-gray-700">
          A non-refundable application fee of $50 will be charged upon submission to cover the cost of background checks and processing.
        </p>
      </div>
    </div>
  );
}