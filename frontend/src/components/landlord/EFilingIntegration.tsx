import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useTaxPreparation } from '@/contexts/TaxPreparationContext';
import {
  FileText,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  Shield,
  Lock,
  UploadCloud,
  Download
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface EFilingIntegrationProps {
  landlordId: string;
}

export default function EFilingIntegration({ landlordId }: EFilingIntegrationProps) {
  const { toast } = useToast();
  const { selectedTaxYear, taxYearSummary } = useTaxPreparation();
  
  const [filingStep, setFilingStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [filingStatus, setFilingStatus] = useState<'not-started' | 'in-progress' | 'submitted' | 'accepted' | 'rejected'>('not-started');

  const completionPercentage = taxYearSummary?.completionPercentage || 0;
  const isReadyToFile = completionPercentage >= 100;

  const handleStartFiling = () => {
    if (!isReadyToFile) {
      toast({
        title: 'Not Ready to File',
        description: 'Please complete all tax preparation steps before starting e-filing.',
        variant: 'destructive',
      });
      return;
    }
    setFilingStep(2);
    setFilingStatus('in-progress');
  };

  const handleReviewComplete = () => {
    setFilingStep(3);
  };

  const handleSubmit = () => {
    if (!agreedToTerms) {
      toast({
        title: 'Terms Required',
        description: 'Please agree to the terms and conditions to proceed.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    
    // Simulate submission process
    setTimeout(() => {
      setIsSubmitting(false);
      setFilingStep(4);
      setFilingStatus('submitted');
      
      // Simulate acceptance after a delay
      setTimeout(() => {
        setFilingStatus('accepted');
        toast({
          title: 'Return Accepted',
          description: 'Your tax return has been accepted by the IRS.',
        });
      }, 5000);
    }, 3000);
  };

  const steps = [
    { number: 1, title: 'Preparation', description: 'Review and finalize data' },
    { number: 2, title: 'Review', description: 'Verify return details' },
    { number: 3, title: 'Sign & File', description: 'Electronic signature' },
    { number: 4, title: 'Status', description: 'Track acceptance' }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">E-Filing Center</h2>
        <p className="text-gray-600 mt-1">
          Securely file your taxes directly with the IRS
        </p>
      </div>

      {/* Progress Stepper */}
      <div className="relative">
        <div className="absolute top-1/2 left-0 w-full h-1 bg-gray-200 -z-10 transform -translate-y-1/2" />
        <div className="flex justify-between">
          {steps.map((step) => (
            <div key={step.number} className="flex flex-col items-center bg-white px-4">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 mb-2 ${
                filingStep >= step.number
                  ? 'bg-blue-600 border-blue-600 text-white'
                  : 'bg-white border-gray-300 text-gray-400'
              }`}>
                {filingStep > step.number ? <CheckCircle className="h-6 w-6" /> : step.number}
              </div>
              <span className={`text-sm font-medium ${
                filingStep >= step.number ? 'text-blue-900' : 'text-gray-500'
              }`}>
                {step.title}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Main Content Area */}
        <div className="md:col-span-2 space-y-6">
          
          {/* Step 1: Preparation */}
          {filingStep === 1 && (
            <Card>
              <CardHeader>
                <CardTitle>Step 1: Preparation Check</CardTitle>
                <CardDescription>Ensure all your data is ready for filing</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      {isReadyToFile ? (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      ) : (
                        <AlertCircle className="h-5 w-5 text-orange-500" />
                      )}
                      <div>
                        <p className="font-medium">Data Completeness</p>
                        <p className="text-sm text-gray-600">
                          {completionPercentage}% complete
                        </p>
                      </div>
                    </div>
                    <Badge variant={isReadyToFile ? 'default' : 'secondary'}>
                      {isReadyToFile ? 'Ready' : 'Action Needed'}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <div>
                        <p className="font-medium">Identity Verification</p>
                        <p className="text-sm text-gray-600">
                          Profile information verified
                        </p>
                      </div>
                    </div>
                    <Badge>Verified</Badge>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <div>
                        <p className="font-medium">Bank Account</p>
                        <p className="text-sm text-gray-600">
                          Connected for refund/payment
                        </p>
                      </div>
                    </div>
                    <Badge>Connected</Badge>
                  </div>
                </div>

                <Button 
                  className="w-full" 
                  size="lg"
                  onClick={handleStartFiling}
                  disabled={!isReadyToFile}
                >
                  Start Filing Process
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Step 2: Review */}
          {filingStep === 2 && (
            <Card>
              <CardHeader>
                <CardTitle>Step 2: Review Return</CardTitle>
                <CardDescription>Review your generated tax forms before signing</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="border rounded-lg overflow-hidden">
                  <div className="bg-gray-50 p-4 border-b flex justify-between items-center">
                    <h3 className="font-medium">Generated Forms</h3>
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-2" />
                      Download All
                    </Button>
                  </div>
                  <div className="divide-y">
                    {[
                      { name: 'Form 1040', desc: 'U.S. Individual Income Tax Return' },
                      { name: 'Schedule E', desc: 'Supplemental Income and Loss' },
                      { name: 'Form 4562', desc: 'Depreciation and Amortization' },
                      { name: 'Schedule 1', desc: 'Additional Income and Adjustments' }
                    ].map((form) => (
                      <div key={form.name} className="p-4 flex items-center justify-between hover:bg-gray-50">
                        <div className="flex items-center gap-3">
                          <FileText className="h-5 w-5 text-blue-600" />
                          <div>
                            <p className="font-medium">{form.name}</p>
                            <p className="text-sm text-gray-600">{form.desc}</p>
                          </div>
                        </div>
                        <Button variant="ghost" size="sm">View</Button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <div className="flex gap-3">
                    <Shield className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-blue-900">Accuracy Guarantee</h4>
                      <p className="text-sm text-blue-800 mt-1">
                        We've checked your return for common errors and missing information. 
                        Please review the forms carefully to ensure all details are correct.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-4">
                  <Button variant="outline" onClick={() => setFilingStep(1)}>
                    Back
                  </Button>
                  <Button className="flex-1" onClick={handleReviewComplete}>
                    Confirm & Continue
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 3: Sign & File */}
          {filingStep === 3 && (
            <Card>
              <CardHeader>
                <CardTitle>Step 3: Sign & File</CardTitle>
                <CardDescription>Electronically sign and submit your return</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium mb-2">Tax Summary</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600">Total Income</p>
                        <p className="font-semibold">${taxYearSummary?.totalIncome.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Total Tax</p>
                        <p className="font-semibold">$12,450.00</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Payments/Credits</p>
                        <p className="font-semibold">$14,200.00</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Refund Amount</p>
                        <p className="font-bold text-green-600">$1,750.00</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4 pt-4 border-t">
                    <div className="flex items-start space-x-2">
                      <Checkbox 
                        id="terms" 
                        checked={agreedToTerms}
                        onCheckedChange={(checked) => setAgreedToTerms(!!checked)}
                      />
                      <Label htmlFor="terms" className="text-sm leading-relaxed">
                        I declare under penalty of perjury that I have examined this return and accompanying schedules and statements, 
                        and to the best of my knowledge and belief, they are true, correct, and complete. I consent to sign this return electronically.
                      </Label>
                    </div>
                  </div>
                </div>

                <div className="flex gap-4">
                  <Button variant="outline" onClick={() => setFilingStep(2)} disabled={isSubmitting}>
                    Back
                  </Button>
                  <Button 
                    className="flex-1" 
                    onClick={handleSubmit}
                    disabled={!agreedToTerms || isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <UploadCloud className="h-4 w-4 mr-2 animate-bounce" />
                        Transmitting to IRS...
                      </>
                    ) : (
                      <>
                        <Lock className="h-4 w-4 mr-2" />
                        Sign & Submit Return
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 4: Status */}
          {filingStep === 4 && (
            <Card>
              <CardHeader>
                <CardTitle>Filing Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-8 text-center py-8">
                {filingStatus === 'submitted' && (
                  <div className="space-y-4">
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto animate-pulse">
                      <UploadCloud className="h-8 w-8 text-blue-600" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900">Return Submitted!</h3>
                    <p className="text-gray-600 max-w-md mx-auto">
                      Your return has been successfully transmitted to the IRS. We will notify you as soon as it is accepted, typically within 24-48 hours.
                    </p>
                  </div>
                )}

                {filingStatus === 'accepted' && (
                  <div className="space-y-4">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                      <CheckCircle className="h-8 w-8 text-green-600" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900">Return Accepted!</h3>
                    <p className="text-gray-600 max-w-md mx-auto">
                      Great news! The IRS has accepted your return for the {selectedTaxYear} tax year.
                    </p>
                    <div className="flex justify-center gap-4 mt-6">
                      <Button variant="outline">Download Receipt</Button>
                      <Button>View Dashboard</Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar Info */}
        <div className="space-y-6">
          <Card className="bg-blue-600 text-white">
            <CardContent className="p-6">
              <Shield className="h-8 w-8 mb-4" />
              <h3 className="font-bold text-lg mb-2">Secure Transmission</h3>
              <p className="text-blue-100 text-sm">
                Your data is encrypted using bank-level 256-bit SSL encryption. We are an IRS-authorized e-file provider.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Filing Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-600">Filing Deadline</span>
                <span className="font-medium">Apr 15, 2026</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-600">Federal Return</span>
                <span className="font-medium">$0.00 (Free)</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-600">State Return</span>
                <span className="font-medium">$39.99</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-gray-600">Audit Defense</span>
                <span className="font-medium">Included</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}