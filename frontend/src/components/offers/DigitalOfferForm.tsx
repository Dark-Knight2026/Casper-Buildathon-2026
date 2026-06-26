import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  Home, 
  DollarSign, 
  Calendar, 
  FileText, 
  Users, 
  Shield, 
  AlertTriangle,
  CheckCircle,
  Calculator,
  Clock,
  Banknote,
  ArrowLeft,
  ArrowRight
} from 'lucide-react';
import { DigitalOfferFormData, SubmittedOffer, DraftOffer } from '@/types/digitalOffer';

interface DigitalOfferFormProps {
  propertyId: string;
  listPrice: number;
  propertyAddress: string;
  onSubmitOffer: (offerData: SubmittedOffer) => void;
  onSaveDraft: (offerData: DraftOffer) => void;
}

export default function DigitalOfferForm({ 
  propertyId, 
  listPrice, 
  propertyAddress, 
  onSubmitOffer, 
  onSaveDraft 
}: DigitalOfferFormProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<DigitalOfferFormData>({
    offerAmount: listPrice,
    emdAmount: Math.round(listPrice * 0.01),
    closingDate: '',
    possessionDate: '',
    offerExpiration: '',
    buyerName: '',
    buyerEmail: '',
    buyerPhone: '',
    buyerAddress: '',
    buyerCity: '',
    buyerState: '',
    buyerZip: '',
    agentName: '',
    agentEmail: '',
    agentPhone: '',
    agentLicense: '',
    brokerageName: '',
    financingType: 'conventional',
    downPayment: Math.round(listPrice * 0.2),
    loanAmount: Math.round(listPrice * 0.8),
    preApprovalAmount: 0,
    lenderName: '',
    loanOfficerName: '',
    loanOfficerPhone: '',
    inspectionContingency: true,
    inspectionPeriod: 10,
    financingContingency: true,
    financingPeriod: 21,
    appraisalContingency: true,
    appraisalShortfallHandling: 'renegotiate',
    saleOfPropertyContingency: false,
    salePropertyAddress: '',
    salePropertyDeadline: '',
    specialConditions: '',
    additionalTerms: ''
  });

  const totalSteps = 6;
  const progress = (currentStep / totalSteps) * 100;

  const updateFormData = <K extends keyof DigitalOfferFormData>(field: K, value: DigitalOfferFormData[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const calculateNetToSeller = () => {
    const commissionRate = 0.06;
    const commission = formData.offerAmount * commissionRate;
    const estimatedClosingCosts = formData.offerAmount * 0.02;
    return formData.offerAmount - commission - estimatedClosingCosts;
  };

  const validateCurrentStep = () => {
    switch (currentStep) {
      case 1:
        return formData.offerAmount > 0 && formData.emdAmount > 0 && formData.closingDate && formData.offerExpiration;
      case 2:
        return formData.buyerName && formData.buyerEmail && formData.buyerPhone;
      case 3:
        return formData.agentName && formData.agentEmail && formData.agentLicense;
      case 4:
        return formData.financingType && (formData.financingType === 'cash' || (formData.lenderName && formData.preApprovalAmount > 0));
      case 5:
        return true;
      case 6:
        return true;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (validateCurrentStep() && currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = () => {
    const offerData: SubmittedOffer = {
      ...formData,
      propertyId,
      propertyAddress,
      listPrice,
      netToSeller: calculateNetToSeller(),
      submittedAt: new Date().toISOString(),
      status: 'submitted'
    };
    onSubmitOffer(offerData);
  };

  const handleSaveDraft = () => {
    const draftData: DraftOffer = {
      ...formData,
      propertyId,
      propertyAddress,
      listPrice,
      savedAt: new Date().toISOString(),
      status: 'draft'
    };
    onSaveDraft(draftData);
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">Digital Offer Submission</h1>
          <Badge variant="outline">Step {currentStep} of {totalSteps}</Badge>
        </div>
        <Progress value={progress} className="h-2" />
        <p className="text-sm text-gray-600 mt-2">Complete all required fields to submit your offer</p>
      </div>

      <Card>
        <CardContent className="p-8">
          {/* Step 1: Property & Offer Details */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="flex items-center space-x-2 mb-4">
                <Home className="h-5 w-5 text-blue-600" />
                <h3 className="text-lg font-semibold">Property & Offer Details</h3>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg mb-6">
                <h4 className="font-medium mb-2">Property Information</h4>
                <p className="text-gray-700">{propertyAddress}</p>
                <p className="text-sm text-gray-600">List Price: ${listPrice.toLocaleString()}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="offerAmount">Offer Amount *</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="offerAmount"
                      type="number"
                      className="pl-10"
                      value={formData.offerAmount}
                      onChange={(e) => updateFormData('offerAmount', Number(e.target.value))}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="emdAmount">Earnest Money Deposit *</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="emdAmount"
                      type="number"
                      className="pl-10"
                      value={formData.emdAmount}
                      onChange={(e) => updateFormData('emdAmount', Number(e.target.value))}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="closingDate">Desired Closing Date *</Label>
                  <Input
                    id="closingDate"
                    type="date"
                    value={formData.closingDate}
                    onChange={(e) => updateFormData('closingDate', e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="offerExpiration">Offer Expiration *</Label>
                  <Input
                    id="offerExpiration"
                    type="datetime-local"
                    value={formData.offerExpiration}
                    onChange={(e) => updateFormData('offerExpiration', e.target.value)}
                  />
                </div>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <Calculator className="h-4 w-4 text-blue-600" />
                  <span className="font-medium text-blue-900">Estimated Net to Seller</span>
                </div>
                <p className="text-2xl font-bold text-blue-700">${calculateNetToSeller().toLocaleString()}</p>
              </div>
            </div>
          )}

          {/* Step 2: Buyer Information */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="flex items-center space-x-2 mb-4">
                <Users className="h-5 w-5 text-blue-600" />
                <h3 className="text-lg font-semibold">Buyer Information</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <Label htmlFor="buyerName">Full Name *</Label>
                  <Input
                    id="buyerName"
                    value={formData.buyerName}
                    onChange={(e) => updateFormData('buyerName', e.target.value)}
                    placeholder="John Doe"
                  />
                </div>

                <div>
                  <Label htmlFor="buyerEmail">Email Address *</Label>
                  <Input
                    id="buyerEmail"
                    type="email"
                    value={formData.buyerEmail}
                    onChange={(e) => updateFormData('buyerEmail', e.target.value)}
                    placeholder="john@example.com"
                  />
                </div>

                <div>
                  <Label htmlFor="buyerPhone">Phone Number *</Label>
                  <Input
                    id="buyerPhone"
                    type="tel"
                    value={formData.buyerPhone}
                    onChange={(e) => updateFormData('buyerPhone', e.target.value)}
                    placeholder="(555) 123-4567"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Agent Information */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="flex items-center space-x-2 mb-4">
                <FileText className="h-5 w-5 text-blue-600" />
                <h3 className="text-lg font-semibold">Agent Information</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="agentName">Agent Name *</Label>
                  <Input
                    id="agentName"
                    value={formData.agentName}
                    onChange={(e) => updateFormData('agentName', e.target.value)}
                    placeholder="Jane Smith"
                  />
                </div>

                <div>
                  <Label htmlFor="agentLicense">License Number *</Label>
                  <Input
                    id="agentLicense"
                    value={formData.agentLicense}
                    onChange={(e) => updateFormData('agentLicense', e.target.value)}
                    placeholder="RE123456"
                  />
                </div>

                <div>
                  <Label htmlFor="agentEmail">Email Address *</Label>
                  <Input
                    id="agentEmail"
                    type="email"
                    value={formData.agentEmail}
                    onChange={(e) => updateFormData('agentEmail', e.target.value)}
                    placeholder="jane@realty.com"
                  />
                </div>

                <div>
                  <Label htmlFor="agentPhone">Phone Number</Label>
                  <Input
                    id="agentPhone"
                    type="tel"
                    value={formData.agentPhone}
                    onChange={(e) => updateFormData('agentPhone', e.target.value)}
                    placeholder="(555) 987-6543"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Financing Details */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div className="flex items-center space-x-2 mb-4">
                <Banknote className="h-5 w-5 text-blue-600" />
                <h3 className="text-lg font-semibold">Financing Details</h3>
              </div>

              <div>
                <Label>Financing Type *</Label>
                <RadioGroup 
                  value={formData.financingType} 
                  onValueChange={(value) => updateFormData('financingType', value as DigitalOfferFormData['financingType'])}
                  className="mt-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="cash" id="cash" />
                    <Label htmlFor="cash">Cash Purchase</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="conventional" id="conventional" />
                    <Label htmlFor="conventional">Conventional Loan</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="fha" id="fha" />
                    <Label htmlFor="fha">FHA Loan</Label>
                  </div>
                </RadioGroup>
              </div>

              {formData.financingType !== 'cash' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="preApprovalAmount">Pre-approval Amount *</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="preApprovalAmount"
                        type="number"
                        className="pl-10"
                        value={formData.preApprovalAmount}
                        onChange={(e) => updateFormData('preApprovalAmount', Number(e.target.value))}
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="lenderName">Lender Name *</Label>
                    <Input
                      id="lenderName"
                      value={formData.lenderName}
                      onChange={(e) => updateFormData('lenderName', e.target.value)}
                      placeholder="ABC Mortgage Company"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 5: Contingencies */}
          {currentStep === 5 && (
            <div className="space-y-6">
              <div className="flex items-center space-x-2 mb-4">
                <Shield className="h-5 w-5 text-blue-600" />
                <h3 className="text-lg font-semibold">Contingencies</h3>
              </div>

              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="inspectionContingency"
                    checked={formData.inspectionContingency}
                    onCheckedChange={(checked) => updateFormData('inspectionContingency', Boolean(checked))}
                  />
                  <Label htmlFor="inspectionContingency">Inspection Contingency</Label>
                </div>

                {formData.financingType !== 'cash' && (
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="financingContingency"
                      checked={formData.financingContingency}
                      onCheckedChange={(checked) => updateFormData('financingContingency', Boolean(checked))}
                    />
                    <Label htmlFor="financingContingency">Financing Contingency</Label>
                  </div>
                )}

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="appraisalContingency"
                    checked={formData.appraisalContingency}
                    onCheckedChange={(checked) => updateFormData('appraisalContingency', Boolean(checked))}
                  />
                  <Label htmlFor="appraisalContingency">Appraisal Contingency</Label>
                </div>
              </div>

              <div>
                <Label htmlFor="specialConditions">Special Conditions</Label>
                <Textarea
                  id="specialConditions"
                  value={formData.specialConditions}
                  onChange={(e) => updateFormData('specialConditions', e.target.value)}
                  placeholder="Any special conditions or requests..."
                  rows={3}
                />
              </div>
            </div>
          )}

          {/* Step 6: Review & Submit */}
          {currentStep === 6 && (
            <div className="space-y-6">
              <div className="flex items-center space-x-2 mb-4">
                <CheckCircle className="h-5 w-5 text-blue-600" />
                <h3 className="text-lg font-semibold">Review & Submit</h3>
              </div>

              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Please review all information carefully before submitting.
                </AlertDescription>
              </Alert>

              <Card>
                <CardHeader>
                  <CardTitle>Offer Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-gray-600">Property:</span>
                      <p className="font-medium">{propertyAddress}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Offer Amount:</span>
                      <p className="font-medium text-green-600">${formData.offerAmount.toLocaleString()}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">EMD Amount:</span>
                      <p className="font-medium">${formData.emdAmount.toLocaleString()}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Financing:</span>
                      <p className="font-medium">{formData.financingType.toUpperCase()}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-8">
            <Button 
              variant="outline" 
              onClick={handlePrevious}
              disabled={currentStep === 1}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Previous
            </Button>

            <div className="flex space-x-2">
              <Button variant="outline" onClick={handleSaveDraft}>
                Save Draft
              </Button>
              
              {currentStep < totalSteps ? (
                <Button 
                  onClick={handleNext}
                  disabled={!validateCurrentStep()}
                >
                  Next
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              ) : (
                <Button 
                  onClick={handleSubmit}
                  disabled={!validateCurrentStep()}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Submit Offer
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}