import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  UserPlus,
  Mail,
  FileText,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Send,
  Calendar,
  DollarSign
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface TenantInviteFormData {
  // Step 1: Tenant Information
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  
  // Step 2: Lease Details
  leaseStartDate: string;
  leaseEndDate: string;
  monthlyRent: number;
  securityDeposit: number;
  
  // Step 3: Welcome Packet
  includeWelcomePacket: boolean;
  welcomeMessage: string;
  documents: string[];
  
  // Step 4: Onboarding Checklist
  onboardingSteps: string[];
}

interface TenantInviteWizardProps {
  propertyId: string;
  propertyAddress: string;
  onComplete: (data: TenantInviteFormData) => void;
  onCancel: () => void;
}

const STEPS = [
  { id: 1, title: 'Tenant Info', icon: UserPlus },
  { id: 2, title: 'Lease Details', icon: FileText },
  { id: 3, title: 'Welcome Packet', icon: Mail },
  { id: 4, title: 'Review', icon: CheckCircle }
];

const DEFAULT_DOCUMENTS = [
  'Lease Agreement',
  'Move-in Checklist',
  'Property Rules',
  'Emergency Contacts',
  'Rent Payment Instructions'
];

const DEFAULT_ONBOARDING_STEPS = [
  'Complete tenant profile',
  'Set up rent payment method',
  'Review and sign lease',
  'Schedule move-in inspection',
  'Submit utility setup confirmation'
];

export default function TenantInviteWizard({
  propertyId,
  propertyAddress,
  onComplete,
  onCancel
}: TenantInviteWizardProps) {
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<TenantInviteFormData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    leaseStartDate: '',
    leaseEndDate: '',
    monthlyRent: 0,
    securityDeposit: 0,
    includeWelcomePacket: true,
    welcomeMessage: `Welcome to ${propertyAddress}! We're excited to have you as our tenant. This email contains important information to help you get started.`,
    documents: DEFAULT_DOCUMENTS,
    onboardingSteps: DEFAULT_ONBOARDING_STEPS
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const updateFormData = (field: string, value: unknown) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};

    switch (step) {
      case 1:
        if (!formData.firstName.trim()) {
          newErrors.firstName = 'First name is required';
        }
        if (!formData.lastName.trim()) {
          newErrors.lastName = 'Last name is required';
        }
        if (!formData.email.trim()) {
          newErrors.email = 'Email is required';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
          newErrors.email = 'Invalid email format';
        }
        if (!formData.phone.trim()) {
          newErrors.phone = 'Phone number is required';
        }
        break;

      case 2:
        if (!formData.leaseStartDate) {
          newErrors.leaseStartDate = 'Lease start date is required';
        }
        if (!formData.leaseEndDate) {
          newErrors.leaseEndDate = 'Lease end date is required';
        }
        if (formData.leaseStartDate && formData.leaseEndDate) {
          const startDate = new Date(formData.leaseStartDate);
          const endDate = new Date(formData.leaseEndDate);
          if (endDate <= startDate) {
            newErrors.leaseEndDate = 'End date must be after start date';
          }
        }
        if (formData.monthlyRent <= 0) {
          newErrors.monthlyRent = 'Monthly rent must be greater than 0';
        }
        if (formData.securityDeposit < 0) {
          newErrors.securityDeposit = 'Security deposit cannot be negative';
        }
        break;

      case 3:
        if (formData.includeWelcomePacket && !formData.welcomeMessage.trim()) {
          newErrors.welcomeMessage = 'Welcome message is required';
        }
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      if (currentStep < STEPS.length) {
        setCurrentStep(currentStep + 1);
      }
    } else {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields correctly',
        variant: 'destructive'
      });
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = () => {
    if (validateStep(2)) {
      onComplete(formData);
      toast({
        title: 'Invitation Sent',
        description: `Tenant invitation sent to ${formData.email}`
      });
    }
  };

  const toggleDocument = (doc: string) => {
    setFormData(prev => ({
      ...prev,
      documents: prev.documents.includes(doc)
        ? prev.documents.filter(d => d !== doc)
        : [...prev.documents, doc]
    }));
  };

  const calculateLeaseDuration = () => {
    if (formData.leaseStartDate && formData.leaseEndDate) {
      const start = new Date(formData.leaseStartDate);
      const end = new Date(formData.leaseEndDate);
      const months = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 30));
      return months;
    }
    return 0;
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {STEPS.map((step, index) => {
            const Icon = step.icon;
            const isActive = currentStep === step.id;
            const isCompleted = currentStep > step.id;
            
            return (
              <div key={step.id} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      isActive
                        ? 'bg-blue-600 text-white'
                        : isCompleted
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <span
                    className={`text-xs mt-2 ${
                      isActive ? 'text-blue-600 font-semibold' : 'text-gray-600'
                    }`}
                  >
                    {step.title}
                  </span>
                </div>
                {index < STEPS.length - 1 && (
                  <div
                    className={`h-1 flex-1 mx-2 ${
                      isCompleted ? 'bg-green-600' : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Property Info */}
      <Card className="mb-6 bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-white">Property</Badge>
            <span className="font-medium">{propertyAddress}</span>
          </div>
        </CardContent>
      </Card>

      {/* Step Content */}
      <Card>
        <CardHeader>
          <CardTitle>{STEPS[currentStep - 1].title}</CardTitle>
          <CardDescription>
            {currentStep === 1 && 'Enter the tenant\'s contact information'}
            {currentStep === 2 && 'Set up lease terms and payment details'}
            {currentStep === 3 && 'Customize the welcome email and documents'}
            {currentStep === 4 && 'Review and send the invitation'}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Step 1: Tenant Information */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) => updateFormData('firstName', e.target.value)}
                    placeholder="John"
                    className="mt-1"
                  />
                  {errors.firstName && (
                    <p className="text-sm text-red-600 mt-1">{errors.firstName}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="lastName">Last Name *</Label>
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) => updateFormData('lastName', e.target.value)}
                    placeholder="Doe"
                    className="mt-1"
                  />
                  {errors.lastName && (
                    <p className="text-sm text-red-600 mt-1">{errors.lastName}</p>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="email">Email Address *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => updateFormData('email', e.target.value)}
                  placeholder="john.doe@example.com"
                  className="mt-1"
                />
                {errors.email && (
                  <p className="text-sm text-red-600 mt-1">{errors.email}</p>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  Invitation will be sent to this email address
                </p>
              </div>

              <div>
                <Label htmlFor="phone">Phone Number *</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => updateFormData('phone', e.target.value)}
                  placeholder="(555) 123-4567"
                  className="mt-1"
                />
                {errors.phone && (
                  <p className="text-sm text-red-600 mt-1">{errors.phone}</p>
                )}
              </div>
            </div>
          )}

          {/* Step 2: Lease Details */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="leaseStartDate">Lease Start Date *</Label>
                  <Input
                    id="leaseStartDate"
                    type="date"
                    value={formData.leaseStartDate}
                    onChange={(e) => updateFormData('leaseStartDate', e.target.value)}
                    className="mt-1"
                  />
                  {errors.leaseStartDate && (
                    <p className="text-sm text-red-600 mt-1">{errors.leaseStartDate}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="leaseEndDate">Lease End Date *</Label>
                  <Input
                    id="leaseEndDate"
                    type="date"
                    value={formData.leaseEndDate}
                    onChange={(e) => updateFormData('leaseEndDate', e.target.value)}
                    className="mt-1"
                  />
                  {errors.leaseEndDate && (
                    <p className="text-sm text-red-600 mt-1">{errors.leaseEndDate}</p>
                  )}
                </div>
              </div>

              {calculateLeaseDuration() > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-900">
                      Lease Duration: {calculateLeaseDuration()} months
                    </span>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="monthlyRent">Monthly Rent *</Label>
                  <div className="relative mt-1">
                    <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="monthlyRent"
                      type="number"
                      min="0"
                      value={formData.monthlyRent}
                      onChange={(e) => updateFormData('monthlyRent', parseFloat(e.target.value) || 0)}
                      placeholder="2000"
                      className="pl-9"
                    />
                  </div>
                  {errors.monthlyRent && (
                    <p className="text-sm text-red-600 mt-1">{errors.monthlyRent}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="securityDeposit">Security Deposit</Label>
                  <div className="relative mt-1">
                    <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="securityDeposit"
                      type="number"
                      min="0"
                      value={formData.securityDeposit}
                      onChange={(e) => updateFormData('securityDeposit', parseFloat(e.target.value) || 0)}
                      placeholder="2000"
                      className="pl-9"
                    />
                  </div>
                  {errors.securityDeposit && (
                    <p className="text-sm text-red-600 mt-1">{errors.securityDeposit}</p>
                  )}
                </div>
              </div>

              {formData.monthlyRent > 0 && calculateLeaseDuration() > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h4 className="font-semibold text-green-900 mb-2">Lease Summary</h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-gray-600">Total Rent:</span>
                      <span className="ml-2 font-semibold text-green-900">
                        ${(formData.monthlyRent * calculateLeaseDuration()).toLocaleString()}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Security Deposit:</span>
                      <span className="ml-2 font-semibold text-green-900">
                        ${formData.securityDeposit.toLocaleString()}
                      </span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-gray-600">Move-in Cost:</span>
                      <span className="ml-2 font-bold text-green-900">
                        ${(formData.monthlyRent + formData.securityDeposit).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Welcome Packet */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includeWelcomePacket"
                  checked={formData.includeWelcomePacket}
                  onCheckedChange={(checked) => updateFormData('includeWelcomePacket', checked)}
                />
                <label
                  htmlFor="includeWelcomePacket"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Send welcome packet with invitation
                </label>
              </div>

              {formData.includeWelcomePacket && (
                <>
                  <div>
                    <Label htmlFor="welcomeMessage">Welcome Message</Label>
                    <Textarea
                      id="welcomeMessage"
                      value={formData.welcomeMessage}
                      onChange={(e) => updateFormData('welcomeMessage', e.target.value)}
                      rows={5}
                      className="mt-1"
                      placeholder="Write a personalized welcome message..."
                    />
                    {errors.welcomeMessage && (
                      <p className="text-sm text-red-600 mt-1">{errors.welcomeMessage}</p>
                    )}
                  </div>

                  <div>
                    <Label>Documents to Include</Label>
                    <div className="mt-2 space-y-2">
                      {DEFAULT_DOCUMENTS.map((doc) => (
                        <div key={doc} className="flex items-center space-x-2">
                          <Checkbox
                            id={`doc-${doc}`}
                            checked={formData.documents.includes(doc)}
                            onCheckedChange={() => toggleDocument(doc)}
                          />
                          <label
                            htmlFor={`doc-${doc}`}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                          >
                            {doc}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label>Onboarding Steps</Label>
                    <p className="text-xs text-gray-500 mt-1 mb-2">
                      These steps will guide the tenant through setup
                    </p>
                    <div className="space-y-2">
                      {formData.onboardingSteps.map((step, index) => (
                        <div key={index} className="flex items-center space-x-2 p-2 bg-gray-50 rounded">
                          <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-semibold">
                            {index + 1}
                          </div>
                          <span className="text-sm">{step}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Step 4: Review */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold mb-3">Tenant Information</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-600">Name:</span>
                    <span className="ml-2 font-medium">
                      {formData.firstName} {formData.lastName}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Email:</span>
                    <span className="ml-2 font-medium">{formData.email}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Phone:</span>
                    <span className="ml-2 font-medium">{formData.phone}</span>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold mb-3">Lease Details</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-600">Start Date:</span>
                    <span className="ml-2 font-medium">
                      {new Date(formData.leaseStartDate).toLocaleDateString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">End Date:</span>
                    <span className="ml-2 font-medium">
                      {new Date(formData.leaseEndDate).toLocaleDateString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Duration:</span>
                    <span className="ml-2 font-medium">{calculateLeaseDuration()} months</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Monthly Rent:</span>
                    <span className="ml-2 font-medium text-green-600">
                      ${formData.monthlyRent.toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Security Deposit:</span>
                    <span className="ml-2 font-medium">
                      ${formData.securityDeposit.toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Move-in Cost:</span>
                    <span className="ml-2 font-bold text-blue-600">
                      ${(formData.monthlyRent + formData.securityDeposit).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {formData.includeWelcomePacket && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold mb-3">Welcome Packet</h3>
                  <div className="space-y-3 text-sm">
                    <div>
                      <span className="text-gray-600">Documents:</span>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {formData.documents.map((doc) => (
                          <Badge key={doc} variant="secondary">
                            {doc}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-600">Onboarding Steps:</span>
                      <span className="ml-2 font-medium">{formData.onboardingSteps.length} steps</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <Send className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-blue-900">Ready to Send</p>
                    <p className="text-xs text-blue-700 mt-1">
                      The invitation email will be sent to {formData.email} with all selected documents and onboarding instructions.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation Buttons */}
      <div className="flex justify-between mt-6">
        <Button
          variant="outline"
          onClick={currentStep === 1 ? onCancel : handleBack}
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          {currentStep === 1 ? 'Cancel' : 'Back'}
        </Button>

        {currentStep < STEPS.length ? (
          <Button onClick={handleNext}>
            Next
            <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        ) : (
          <Button onClick={handleSubmit} className="bg-green-600 hover:bg-green-700">
            <Send className="h-4 w-4 mr-2" />
            Send Invitation
          </Button>
        )}
      </div>
    </div>
  );
}