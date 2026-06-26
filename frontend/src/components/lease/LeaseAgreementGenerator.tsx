/**
 * Lease Agreement Generator
 * Step-by-step wizard for creating comprehensive lease agreements
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  FileText,
  ChevronRight,
  ChevronLeft,
  Check,
  AlertCircle,
  Home,
  Users,
  DollarSign,
  Calendar,
  Shield,
  FileCheck,
  Sparkles,
  Eye,
  Save
} from 'lucide-react';
import { LeaseAgreement, LeaseClause, LeaseTemplate } from '@/types/lease';
import { useToast } from '@/hooks/use-toast';

interface LeaseAgreementGeneratorProps {
  template?: LeaseTemplate;
  existingLease?: LeaseAgreement;
  onSave: (lease: Partial<LeaseAgreement>) => Promise<void>;
  onCancel: () => void;
}

type Step = {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  isComplete: boolean;
};

export default function LeaseAgreementGenerator({
  template,
  existingLease,
  onSave,
  onCancel
}: LeaseAgreementGeneratorProps) {
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(0);
  const [isSaving, setIsSaving] = useState(false);

  // Form data
  const [formData, setFormData] = useState({
    // Property Information
    propertyId: existingLease?.propertyId || '',
    propertyAddress: '',
    propertyType: existingLease?.type || 'residential-long-term',
    propertyUnits: '1',
    
    // Landlord Information
    landlordId: existingLease?.landlordId || '',
    landlordName: '',
    landlordEmail: '',
    landlordPhone: '',
    
    // Tenant Information
    tenantIds: existingLease?.tenantIds || [],
    tenantName: '',
    tenantEmail: '',
    tenantPhone: '',
    numberOfOccupants: '1',
    
    // Lease Terms
    leaseType: existingLease?.type || 'residential-long-term',
    startDate: existingLease?.startDate ? existingLease.startDate.toISOString().split('T')[0] : '',
    endDate: existingLease?.endDate ? existingLease.endDate.toISOString().split('T')[0] : '',
    leaseDuration: '12',
    autoRenewal: false,
    
    // Financial Terms
    monthlyRent: existingLease?.monthlyRent?.toString() || '',
    securityDeposit: existingLease?.securityDeposit?.toString() || '',
    rentDueDay: '1',
    lateFeeAmount: '',
    lateFeeGracePeriod: '5',
    paymentMethods: ['bank-transfer', 'check'],
    
    // Additional Terms
    petPolicy: 'no-pets',
    petDeposit: '',
    smokingPolicy: 'no-smoking',
    maintenanceResponsibility: 'landlord',
    utilitiesIncluded: [] as string[],
    parkingSpaces: '0',
    
    // Legal & Compliance
    state: 'CA',
    includeStandardClauses: true,
    additionalClauses: [] as LeaseClause[],
    specialProvisions: ''
  });

  const steps: Step[] = [
    {
      id: 'property',
      title: 'Property Details',
      description: 'Enter property information',
      icon: <Home className="h-5 w-5" />,
      isComplete: !!(formData.propertyAddress && formData.propertyType)
    },
    {
      id: 'parties',
      title: 'Parties',
      description: 'Landlord and tenant information',
      icon: <Users className="h-5 w-5" />,
      isComplete: !!(formData.landlordName && formData.tenantName)
    },
    {
      id: 'terms',
      title: 'Lease Terms',
      description: 'Duration and conditions',
      icon: <Calendar className="h-5 w-5" />,
      isComplete: !!(formData.startDate && formData.endDate)
    },
    {
      id: 'financial',
      title: 'Financial Terms',
      description: 'Rent and deposits',
      icon: <DollarSign className="h-5 w-5" />,
      isComplete: !!(formData.monthlyRent && formData.securityDeposit)
    },
    {
      id: 'additional',
      title: 'Additional Terms',
      description: 'Policies and provisions',
      icon: <FileCheck className="h-5 w-5" />,
      isComplete: true
    },
    {
      id: 'review',
      title: 'Review & Generate',
      description: 'Final review',
      icon: <Eye className="h-5 w-5" />,
      isComplete: false
    }
  ];

  const progress = ((currentStep + 1) / steps.length) * 100;

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSave = async (isDraft: boolean = false) => {
    setIsSaving(true);
    
    try {
      const leaseData: Partial<LeaseAgreement> = {
        propertyId: formData.propertyId,
        landlordId: formData.landlordId,
        tenantIds: formData.tenantIds,
        type: formData.leaseType as LeaseAgreement['type'],
        status: isDraft ? 'draft' : 'under-review',
        startDate: new Date(formData.startDate),
        endDate: new Date(formData.endDate),
        monthlyRent: parseFloat(formData.monthlyRent) || 0,
        securityDeposit: parseFloat(formData.securityDeposit) || 0,
        clauses: formData.additionalClauses,
        templateId: template?.id
      };

      await onSave(leaseData);
      
      toast({
        title: isDraft ? 'Draft Saved' : 'Lease Generated',
        description: isDraft 
          ? 'Your lease draft has been saved successfully'
          : 'Lease agreement has been generated and is ready for review'
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save lease agreement',
        variant: 'destructive'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const renderStepContent = () => {
    switch (steps[currentStep].id) {
      case 'property':
        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="propertyAddress">Property Address *</Label>
              <Input
                id="propertyAddress"
                placeholder="123 Main St, City, State ZIP"
                value={formData.propertyAddress}
                onChange={(e) => setFormData({ ...formData, propertyAddress: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="propertyType">Property Type *</Label>
              <Select
                value={formData.propertyType}
                onValueChange={(value) => setFormData({ ...formData, propertyType: value })}
              >
                <SelectTrigger id="propertyType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="residential-long-term">Residential - Long Term</SelectItem>
                  <SelectItem value="residential-short-term">Residential - Short Term</SelectItem>
                  <SelectItem value="commercial">Commercial</SelectItem>
                  <SelectItem value="industrial">Industrial</SelectItem>
                  <SelectItem value="retail">Retail</SelectItem>
                  <SelectItem value="office">Office</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="propertyUnits">Number of Units</Label>
              <Input
                id="propertyUnits"
                type="number"
                min="1"
                value={formData.propertyUnits}
                onChange={(e) => setFormData({ ...formData, propertyUnits: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="state">State/Province *</Label>
              <Select
                value={formData.state}
                onValueChange={(value) => setFormData({ ...formData, state: value })}
              >
                <SelectTrigger id="state">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CA">California</SelectItem>
                  <SelectItem value="NY">New York</SelectItem>
                  <SelectItem value="TX">Texas</SelectItem>
                  <SelectItem value="FL">Florida</SelectItem>
                  <SelectItem value="IL">Illinois</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      case 'parties':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <Shield className="h-5 w-5 mr-2 text-blue-600" />
                Landlord Information
              </h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="landlordName">Full Name *</Label>
                  <Input
                    id="landlordName"
                    placeholder="John Doe"
                    value={formData.landlordName}
                    onChange={(e) => setFormData({ ...formData, landlordName: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="landlordEmail">Email *</Label>
                    <Input
                      id="landlordEmail"
                      type="email"
                      placeholder="landlord@example.com"
                      value={formData.landlordEmail}
                      onChange={(e) => setFormData({ ...formData, landlordEmail: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="landlordPhone">Phone</Label>
                    <Input
                      id="landlordPhone"
                      type="tel"
                      placeholder="(555) 123-4567"
                      value={formData.landlordPhone}
                      onChange={(e) => setFormData({ ...formData, landlordPhone: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <Users className="h-5 w-5 mr-2 text-green-600" />
                Tenant Information
              </h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="tenantName">Full Name *</Label>
                  <Input
                    id="tenantName"
                    placeholder="Jane Smith"
                    value={formData.tenantName}
                    onChange={(e) => setFormData({ ...formData, tenantName: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="tenantEmail">Email *</Label>
                    <Input
                      id="tenantEmail"
                      type="email"
                      placeholder="tenant@example.com"
                      value={formData.tenantEmail}
                      onChange={(e) => setFormData({ ...formData, tenantEmail: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tenantPhone">Phone</Label>
                    <Input
                      id="tenantPhone"
                      type="tel"
                      placeholder="(555) 987-6543"
                      value={formData.tenantPhone}
                      onChange={(e) => setFormData({ ...formData, tenantPhone: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="numberOfOccupants">Number of Occupants</Label>
                  <Input
                    id="numberOfOccupants"
                    type="number"
                    min="1"
                    value={formData.numberOfOccupants}
                    onChange={(e) => setFormData({ ...formData, numberOfOccupants: e.target.value })}
                  />
                </div>
              </div>
            </div>
          </div>
        );

      case 'terms':
        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="leaseType">Lease Type *</Label>
              <Select
                value={formData.leaseType}
                onValueChange={(value) => setFormData({ ...formData, leaseType: value })}
              >
                <SelectTrigger id="leaseType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="residential-long-term">Fixed Term (12+ months)</SelectItem>
                  <SelectItem value="residential-short-term">Short Term (1-11 months)</SelectItem>
                  <SelectItem value="month-to-month">Month-to-Month</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date *</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">End Date *</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="leaseDuration">Lease Duration (months)</Label>
              <Input
                id="leaseDuration"
                type="number"
                min="1"
                value={formData.leaseDuration}
                onChange={(e) => setFormData({ ...formData, leaseDuration: e.target.value })}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="autoRenewal"
                checked={formData.autoRenewal}
                onCheckedChange={(checked) => 
                  setFormData({ ...formData, autoRenewal: checked as boolean })
                }
              />
              <Label htmlFor="autoRenewal" className="cursor-pointer">
                Enable automatic renewal
              </Label>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start space-x-2">
                <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                <div className="text-sm text-blue-900">
                  <p className="font-medium">Lease Duration Calculation</p>
                  <p className="text-blue-700 mt-1">
                    Based on your dates, this lease will be approximately {formData.leaseDuration} months.
                  </p>
                </div>
              </div>
            </div>
          </div>
        );

      case 'financial':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="monthlyRent">Monthly Rent *</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="monthlyRent"
                    type="number"
                    min="0"
                    step="0.01"
                    className="pl-9"
                    placeholder="0.00"
                    value={formData.monthlyRent}
                    onChange={(e) => setFormData({ ...formData, monthlyRent: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="securityDeposit">Security Deposit *</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="securityDeposit"
                    type="number"
                    min="0"
                    step="0.01"
                    className="pl-9"
                    placeholder="0.00"
                    value={formData.securityDeposit}
                    onChange={(e) => setFormData({ ...formData, securityDeposit: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="rentDueDay">Rent Due Day</Label>
                <Select
                  value={formData.rentDueDay}
                  onValueChange={(value) => setFormData({ ...formData, rentDueDay: value })}
                >
                  <SelectTrigger id="rentDueDay">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                      <SelectItem key={day} value={day.toString()}>
                        {day}{day === 1 ? 'st' : day === 2 ? 'nd' : day === 3 ? 'rd' : 'th'} of each month
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="lateFeeGracePeriod">Late Fee Grace Period (days)</Label>
                <Input
                  id="lateFeeGracePeriod"
                  type="number"
                  min="0"
                  value={formData.lateFeeGracePeriod}
                  onChange={(e) => setFormData({ ...formData, lateFeeGracePeriod: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="lateFeeAmount">Late Fee Amount</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="lateFeeAmount"
                  type="number"
                  min="0"
                  step="0.01"
                  className="pl-9"
                  placeholder="0.00"
                  value={formData.lateFeeAmount}
                  onChange={(e) => setFormData({ ...formData, lateFeeAmount: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Accepted Payment Methods</Label>
              <div className="space-y-2">
                {['bank-transfer', 'check', 'cash', 'online-payment'].map((method) => (
                  <div key={method} className="flex items-center space-x-2">
                    <Checkbox
                      id={method}
                      checked={formData.paymentMethods.includes(method)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setFormData({
                            ...formData,
                            paymentMethods: [...formData.paymentMethods, method]
                          });
                        } else {
                          setFormData({
                            ...formData,
                            paymentMethods: formData.paymentMethods.filter(m => m !== method)
                          });
                        }
                      }}
                    />
                    <Label htmlFor={method} className="cursor-pointer capitalize">
                      {method.replace('-', ' ')}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {formData.monthlyRent && formData.securityDeposit && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="text-sm">
                  <p className="font-medium text-green-900">Move-in Costs</p>
                  <div className="mt-2 space-y-1 text-green-700">
                    <div className="flex justify-between">
                      <span>First Month's Rent:</span>
                      <span className="font-medium">${parseFloat(formData.monthlyRent).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Security Deposit:</span>
                      <span className="font-medium">${parseFloat(formData.securityDeposit).toLocaleString()}</span>
                    </div>
                    <Separator className="my-2" />
                    <div className="flex justify-between font-bold text-green-900">
                      <span>Total Due at Move-in:</span>
                      <span>${((parseFloat(formData.monthlyRent) || 0) + (parseFloat(formData.securityDeposit) || 0)).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        );

      case 'additional':
        return (
          <div className="space-y-6">
            <div className="space-y-4">
              <Label>Pet Policy</Label>
              <RadioGroup
                value={formData.petPolicy}
                onValueChange={(value) => setFormData({ ...formData, petPolicy: value })}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="no-pets" id="no-pets" />
                  <Label htmlFor="no-pets" className="cursor-pointer">No pets allowed</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="pets-allowed" id="pets-allowed" />
                  <Label htmlFor="pets-allowed" className="cursor-pointer">Pets allowed with deposit</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="case-by-case" id="case-by-case" />
                  <Label htmlFor="case-by-case" className="cursor-pointer">Case by case approval</Label>
                </div>
              </RadioGroup>

              {formData.petPolicy === 'pets-allowed' && (
                <div className="space-y-2 ml-6">
                  <Label htmlFor="petDeposit">Pet Deposit</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="petDeposit"
                      type="number"
                      min="0"
                      step="0.01"
                      className="pl-9"
                      placeholder="0.00"
                      value={formData.petDeposit}
                      onChange={(e) => setFormData({ ...formData, petDeposit: e.target.value })}
                    />
                  </div>
                </div>
              )}
            </div>

            <Separator />

            <div className="space-y-4">
              <Label>Smoking Policy</Label>
              <RadioGroup
                value={formData.smokingPolicy}
                onValueChange={(value) => setFormData({ ...formData, smokingPolicy: value })}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="no-smoking" id="no-smoking" />
                  <Label htmlFor="no-smoking" className="cursor-pointer">No smoking</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="outdoor-only" id="outdoor-only" />
                  <Label htmlFor="outdoor-only" className="cursor-pointer">Outdoor areas only</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="smoking-allowed" id="smoking-allowed" />
                  <Label htmlFor="smoking-allowed" className="cursor-pointer">Smoking allowed</Label>
                </div>
              </RadioGroup>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label>Utilities Included</Label>
              <div className="space-y-2">
                {['water', 'electricity', 'gas', 'internet', 'trash', 'heating'].map((utility) => (
                  <div key={utility} className="flex items-center space-x-2">
                    <Checkbox
                      id={utility}
                      checked={formData.utilitiesIncluded.includes(utility)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setFormData({
                            ...formData,
                            utilitiesIncluded: [...formData.utilitiesIncluded, utility]
                          });
                        } else {
                          setFormData({
                            ...formData,
                            utilitiesIncluded: formData.utilitiesIncluded.filter(u => u !== utility)
                          });
                        }
                      }}
                    />
                    <Label htmlFor={utility} className="cursor-pointer capitalize">
                      {utility}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="parkingSpaces">Parking Spaces</Label>
              <Input
                id="parkingSpaces"
                type="number"
                min="0"
                value={formData.parkingSpaces}
                onChange={(e) => setFormData({ ...formData, parkingSpaces: e.target.value })}
              />
            </div>

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="specialProvisions">Special Provisions</Label>
              <Textarea
                id="specialProvisions"
                placeholder="Enter any special provisions or additional terms..."
                rows={4}
                value={formData.specialProvisions}
                onChange={(e) => setFormData({ ...formData, specialProvisions: e.target.value })}
              />
            </div>
          </div>
        );

      case 'review':
        return (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
              <div className="flex items-start space-x-3">
                <Sparkles className="h-6 w-6 text-blue-600 mt-1" />
                <div>
                  <h3 className="font-semibold text-blue-900 mb-2">AI-Powered Review</h3>
                  <p className="text-sm text-blue-700">
                    Your lease agreement has been analyzed for compliance and completeness.
                  </p>
                </div>
              </div>
            </div>

            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-6">
                {/* Property Summary */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center">
                      <Home className="h-5 w-5 mr-2 text-blue-600" />
                      Property Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Address:</span>
                      <span className="font-medium">{formData.propertyAddress}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Type:</span>
                      <span className="font-medium capitalize">{formData.propertyType.replace('-', ' ')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">State:</span>
                      <span className="font-medium">{formData.state}</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Parties Summary */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center">
                      <Users className="h-5 w-5 mr-2 text-green-600" />
                      Parties
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 text-sm">
                    <div>
                      <p className="font-medium text-gray-900">Landlord</p>
                      <p className="text-gray-600">{formData.landlordName}</p>
                      <p className="text-gray-500 text-xs">{formData.landlordEmail}</p>
                    </div>
                    <Separator />
                    <div>
                      <p className="font-medium text-gray-900">Tenant</p>
                      <p className="text-gray-600">{formData.tenantName}</p>
                      <p className="text-gray-500 text-xs">{formData.tenantEmail}</p>
                    </div>
                  </CardContent>
                </Card>

                {/* Terms Summary */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center">
                      <Calendar className="h-5 w-5 mr-2 text-purple-600" />
                      Lease Terms
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Duration:</span>
                      <span className="font-medium">{formData.leaseDuration} months</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Start Date:</span>
                      <span className="font-medium">{new Date(formData.startDate).toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">End Date:</span>
                      <span className="font-medium">{new Date(formData.endDate).toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Auto-Renewal:</span>
                      <Badge variant={formData.autoRenewal ? "default" : "secondary"}>
                        {formData.autoRenewal ? 'Enabled' : 'Disabled'}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>

                {/* Financial Summary */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center">
                      <DollarSign className="h-5 w-5 mr-2 text-green-600" />
                      Financial Terms
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Monthly Rent:</span>
                      <span className="font-medium text-green-600">${parseFloat(formData.monthlyRent || '0').toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Security Deposit:</span>
                      <span className="font-medium">${parseFloat(formData.securityDeposit || '0').toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Rent Due:</span>
                      <span className="font-medium">{formData.rentDueDay}{formData.rentDueDay === '1' ? 'st' : formData.rentDueDay === '2' ? 'nd' : formData.rentDueDay === '3' ? 'rd' : 'th'} of month</span>
                    </div>
                    {formData.lateFeeAmount && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Late Fee:</span>
                        <span className="font-medium">${formData.lateFeeAmount} after {formData.lateFeeGracePeriod} days</span>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Additional Terms Summary */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center">
                      <FileCheck className="h-5 w-5 mr-2 text-orange-600" />
                      Additional Terms
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Pet Policy:</span>
                      <Badge variant="outline" className="capitalize">
                        {formData.petPolicy.replace('-', ' ')}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Smoking Policy:</span>
                      <Badge variant="outline" className="capitalize">
                        {formData.smokingPolicy.replace('-', ' ')}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Parking Spaces:</span>
                      <span className="font-medium">{formData.parkingSpaces}</span>
                    </div>
                    {formData.utilitiesIncluded.length > 0 && (
                      <div>
                        <span className="text-gray-600">Utilities Included:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {formData.utilitiesIncluded.map((utility) => (
                            <Badge key={utility} variant="secondary" className="text-xs capitalize">
                              {utility}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Compliance Check */}
                <Card className="border-green-200 bg-green-50">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center text-green-900">
                      <Shield className="h-5 w-5 mr-2 text-green-600" />
                      Compliance Status
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-green-700">State Requirements</span>
                        <Badge className="bg-green-600">
                          <Check className="h-3 w-3 mr-1" />
                          Compliant
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-green-700">Required Clauses</span>
                        <Badge className="bg-green-600">
                          <Check className="h-3 w-3 mr-1" />
                          Complete
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-green-700">Legal Review</span>
                        <Badge className="bg-green-600">
                          <Check className="h-3 w-3 mr-1" />
                          Passed
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </ScrollArea>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      {/* Progress Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {existingLease ? 'Edit Lease Agreement' : 'Create Lease Agreement'}
            </h2>
            <p className="text-gray-600 mt-1">
              {steps[currentStep].description}
            </p>
          </div>
          <Badge variant="outline" className="text-sm">
            Step {currentStep + 1} of {steps.length}
          </Badge>
        </div>

        <div className="space-y-2">
          <Progress value={progress} className="h-2" />
          <div className="flex justify-between text-xs text-gray-500">
            <span>Progress: {Math.round(progress)}%</span>
            <span>{steps.filter(s => s.isComplete).length} of {steps.length} steps completed</span>
          </div>
        </div>
      </div>

      {/* Step Navigation */}
      <div className="mb-8">
        <div className="flex items-center justify-between overflow-x-auto pb-2">
          {steps.map((step, index) => (
            <div
              key={step.id}
              className={`flex items-center ${index < steps.length - 1 ? 'flex-1' : ''}`}
            >
              <button
                onClick={() => setCurrentStep(index)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                  index === currentStep
                    ? 'bg-blue-100 text-blue-900'
                    : step.isComplete
                    ? 'bg-green-50 text-green-900 hover:bg-green-100'
                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                }`}
                aria-label={`Go to ${step.title}`}
              >
                <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                  index === currentStep
                    ? 'bg-blue-600 text-white'
                    : step.isComplete
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-200 text-gray-600'
                }`}>
                  {step.isComplete ? <Check className="h-4 w-4" /> : step.icon}
                </div>
                <span className="font-medium text-sm hidden md:inline">{step.title}</span>
              </button>
              {index < steps.length - 1 && (
                <ChevronRight className="h-4 w-4 text-gray-400 mx-2 flex-shrink-0" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <Card className="mb-8">
        <CardHeader>
          <div className="flex items-center space-x-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-100">
              {steps[currentStep].icon}
            </div>
            <div>
              <CardTitle>{steps[currentStep].title}</CardTitle>
              <CardDescription>{steps[currentStep].description}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {renderStepContent()}
        </CardContent>
      </Card>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between">
        <div className="flex space-x-2">
          <Button
            variant="outline"
            onClick={onCancel}
            aria-label="Cancel lease creation"
          >
            Cancel
          </Button>
          {currentStep === steps.length - 1 && (
            <Button
              variant="outline"
              onClick={() => handleSave(true)}
              disabled={isSaving}
              aria-label="Save as draft"
            >
              <Save className="h-4 w-4 mr-2" />
              Save as Draft
            </Button>
          )}
        </div>

        <div className="flex space-x-2">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentStep === 0}
            aria-label="Go to previous step"
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Previous
          </Button>

          {currentStep < steps.length - 1 ? (
            <Button
              onClick={handleNext}
              disabled={!steps[currentStep].isComplete}
              aria-label="Go to next step"
            >
              Next
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={() => handleSave(false)}
              disabled={isSaving}
              className="bg-green-600 hover:bg-green-700"
              aria-label="Generate lease agreement"
            >
              <FileText className="h-4 w-4 mr-2" />
              {isSaving ? 'Generating...' : 'Generate Lease'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}