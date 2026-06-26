import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTaxPreparation } from '@/contexts/TaxPreparationContext';
import { useLandlordManagement } from '@/contexts/LandlordManagementContext';
import { SCHEDULE_E_CATEGORIES } from '@/types/landlordTax';
import { PDFGenerator } from '@/utils/pdfGenerator';
import { EmailService } from '@/utils/emailService';
import {
  FileText,
  Download,
  Eye,
  CheckCircle,
  AlertCircle,
  Printer,
  Mail,
  Send
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface TaxDocumentGeneratorProps {
  landlordId: string;
}

interface Form1099Data {
  recipientName: string;
  recipientTIN: string;
  recipientAddress: string;
  amount: number;
  formType: '1099-MISC' | '1099-NEC';
  boxNumber: string;
}

interface EmailDialogState {
  open: boolean;
  documentType: 'schedule-e' | '1099' | 'summary';
  recipientEmail: string;
  recipientName: string;
}

export default function TaxDocumentGenerator({ landlordId }: TaxDocumentGeneratorProps) {
  const { toast } = useToast();
  const {
    selectedTaxYear,
    taxYearSummary,
  } = useTaxPreparation();
  
  const { clients, properties } = useLandlordManagement();
  const currentLandlord = clients.find(c => c.id === landlordId);
  const landlordProperties = properties.filter(p => p.landlordId === landlordId);
  
  const [activeTab, setActiveTab] = useState<'schedule-e' | '1099' | 'summary'>('schedule-e');
  const [generatingDocument, setGeneratingDocument] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [show1099Dialog, setShow1099Dialog] = useState(false);
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [emailDialogState, setEmailDialogState] = useState<EmailDialogState>({
    open: false,
    documentType: 'schedule-e',
    recipientEmail: '',
    recipientName: ''
  });
  const [form1099Data, setForm1099Data] = useState<Form1099Data>({
    recipientName: '',
    recipientTIN: '',
    recipientAddress: '',
    amount: 0,
    formType: '1099-NEC',
    boxNumber: '1'
  });

  const landlordName = `${currentLandlord?.personalInfo.firstName} ${currentLandlord?.personalInfo.lastName}`;

  // Generate Schedule E PDF
  const handleGenerateScheduleE = async () => {
    if (!taxYearSummary) {
      toast({
        title: 'No Data Available',
        description: 'Please ensure you have income and expense data for the selected tax year.',
        variant: 'destructive',
      });
      return;
    }

    setGeneratingDocument(true);
    
    try {
      const scheduleEData = {
        taxYear: selectedTaxYear,
        taxpayerName: landlordName,
        taxpayerSSN: 'XXX-XX-XXXX', // Should be from landlord profile
        properties: taxYearSummary.propertySummaries.map(prop => ({
          address: prop.address,
          rentalIncome: prop.income,
          expenses: taxYearSummary.expensesByCategory
            .filter(cat => cat.amount > 0)
            .map(cat => ({
              category: SCHEDULE_E_CATEGORIES[cat.category].name,
              lineNumber: SCHEDULE_E_CATEGORIES[cat.category].lineNumber.toString(),
              amount: cat.amount
            })),
          depreciation: prop.depreciation,
          netIncome: prop.netIncome
        })),
        totalIncome: taxYearSummary.totalIncome,
        totalExpenses: taxYearSummary.totalExpenses,
        totalDepreciation: taxYearSummary.totalDepreciation,
        netRentalIncome: taxYearSummary.netRentalIncome
      };
      
      const pdf = PDFGenerator.generateScheduleE(scheduleEData);
      PDFGenerator.downloadPDF(pdf, `schedule-e-${selectedTaxYear}.pdf`);
      
      toast({
        title: 'Schedule E Generated',
        description: `Schedule E for tax year ${selectedTaxYear} has been generated and downloaded.`,
      });
      
    } catch (error) {
      console.error('Error generating Schedule E:', error);
      toast({
        title: 'Generation Failed',
        description: 'Failed to generate Schedule E. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setGeneratingDocument(false);
    }
  };

  // Generate Form 1099
  const handleGenerate1099 = async () => {
    if (!form1099Data.recipientName || !form1099Data.recipientTIN || form1099Data.amount <= 0) {
      toast({
        title: 'Missing Information',
        description: 'Please fill in all required fields.',
        variant: 'destructive',
      });
      return;
    }

    setGeneratingDocument(true);
    
    try {
      const form1099PDFData = {
        taxYear: selectedTaxYear,
        payerName: landlordName,
        payerTIN: 'XX-XXXXXXX', // Should be from landlord profile
        payerAddress: landlordProperties[0]?.details.address.street || 'Address not available',
        recipientName: form1099Data.recipientName,
        recipientTIN: form1099Data.recipientTIN,
        recipientAddress: form1099Data.recipientAddress,
        amount: form1099Data.amount,
        formType: form1099Data.formType,
        boxNumber: form1099Data.boxNumber
      };
      
      const pdf = PDFGenerator.generateForm1099(form1099PDFData);
      PDFGenerator.downloadPDF(pdf, `form-${form1099Data.formType}-${selectedTaxYear}.pdf`);
      
      toast({
        title: 'Form 1099 Generated',
        description: `Form ${form1099Data.formType} has been generated and downloaded.`,
      });
      
      setShow1099Dialog(false);
      setForm1099Data({
        recipientName: '',
        recipientTIN: '',
        recipientAddress: '',
        amount: 0,
        formType: '1099-NEC',
        boxNumber: '1'
      });
      
    } catch (error) {
      console.error('Error generating Form 1099:', error);
      toast({
        title: 'Generation Failed',
        description: 'Failed to generate Form 1099. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setGeneratingDocument(false);
    }
  };

  // Generate Tax Summary Report
  const handleGenerateSummary = async () => {
    if (!taxYearSummary) {
      toast({
        title: 'No Data Available',
        description: 'Please ensure you have income and expense data for the selected tax year.',
        variant: 'destructive',
      });
      return;
    }

    setGeneratingDocument(true);
    
    try {
      const pdf = PDFGenerator.generateTaxSummary(taxYearSummary, landlordName);
      PDFGenerator.downloadPDF(pdf, `tax-summary-${selectedTaxYear}.pdf`);
      
      toast({
        title: 'Summary Report Generated',
        description: `Tax summary report for ${selectedTaxYear} has been generated and downloaded.`,
      });
      
    } catch (error) {
      console.error('Error generating tax summary:', error);
      toast({
        title: 'Generation Failed',
        description: 'Failed to generate summary report. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setGeneratingDocument(false);
    }
  };

  // Open email dialog
  const handleOpenEmailDialog = (documentType: 'schedule-e' | '1099' | 'summary') => {
    setEmailDialogState({
      open: true,
      documentType,
      recipientEmail: '',
      recipientName: ''
    });
    setShowEmailDialog(true);
  };

  // Send email with PDF
  const handleSendEmail = async () => {
    // Validate email
    if (!EmailService.isValidEmail(emailDialogState.recipientEmail)) {
      toast({
        title: 'Invalid Email',
        description: 'Please enter a valid email address.',
        variant: 'destructive',
      });
      return;
    }

    if (!emailDialogState.recipientName.trim()) {
      toast({
        title: 'Missing Information',
        description: 'Please enter the recipient name.',
        variant: 'destructive',
      });
      return;
    }

    setSendingEmail(true);

    try {
      let pdf;
      
      // Generate the appropriate PDF
      if (emailDialogState.documentType === 'schedule-e') {
        if (!taxYearSummary) {
          throw new Error('No tax data available');
        }
        
        const scheduleEData = {
          taxYear: selectedTaxYear,
          taxpayerName: landlordName,
          taxpayerSSN: 'XXX-XX-XXXX',
          properties: taxYearSummary.propertySummaries.map(prop => ({
            address: prop.address,
            rentalIncome: prop.income,
            expenses: taxYearSummary.expensesByCategory
              .filter(cat => cat.amount > 0)
              .map(cat => ({
                category: SCHEDULE_E_CATEGORIES[cat.category].name,
                lineNumber: SCHEDULE_E_CATEGORIES[cat.category].lineNumber.toString(),
                amount: cat.amount
              })),
            depreciation: prop.depreciation,
            netIncome: prop.netIncome
          })),
          totalIncome: taxYearSummary.totalIncome,
          totalExpenses: taxYearSummary.totalExpenses,
          totalDepreciation: taxYearSummary.totalDepreciation,
          netRentalIncome: taxYearSummary.netRentalIncome
        };
        
        pdf = PDFGenerator.generateScheduleE(scheduleEData);
        await EmailService.sendScheduleE(
          pdf,
          emailDialogState.recipientEmail,
          selectedTaxYear,
          landlordName
        );
        
      } else if (emailDialogState.documentType === 'summary') {
        if (!taxYearSummary) {
          throw new Error('No tax data available');
        }
        
        pdf = PDFGenerator.generateTaxSummary(taxYearSummary, landlordName);
        await EmailService.sendTaxSummary(
          pdf,
          emailDialogState.recipientEmail,
          selectedTaxYear,
          landlordName
        );
      }

      toast({
        title: 'Email Prepared',
        description: 'Your email client will open with the document details. Note: You will need to attach the PDF manually as browsers do not support automatic attachments via mailto links.',
      });

      setShowEmailDialog(false);
      setEmailDialogState({
        open: false,
        documentType: 'schedule-e',
        recipientEmail: '',
        recipientName: ''
      });

    } catch (error) {
      console.error('Error sending email:', error);
      toast({
        title: 'Email Failed',
        description: 'Failed to prepare email. Please try again or download the PDF and attach it manually.',
        variant: 'destructive',
      });
    } finally {
      setSendingEmail(false);
    }
  };

  // Preview document
  const handlePreview = (documentType: string) => {
    toast({
      title: 'Preview',
      description: `Opening ${documentType} preview...`,
    });
  };

  // Print document
  const handlePrint = (documentType: string) => {
    toast({
      title: 'Print Document',
      description: `Print functionality for ${documentType} will be available soon.`,
    });
  };

  const completionPercentage = taxYearSummary?.completionPercentage || 0;
  const isReadyToGenerate = completionPercentage >= 80;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Tax Document Generator</h2>
        <p className="text-gray-600 mt-1">
          Generate IRS forms and tax reports for year {selectedTaxYear}
        </p>
      </div>

      {/* Readiness Alert */}
      {!isReadyToGenerate && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-orange-600 mt-0.5" />
              <div>
                <h3 className="font-semibold text-orange-900">Documents Not Ready</h3>
                <p className="text-sm text-orange-800 mt-1">
                  Your tax preparation is only {completionPercentage}% complete. Please categorize all expenses and upload receipts before generating documents.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {isReadyToGenerate && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <h3 className="font-semibold text-green-900">Ready to Generate</h3>
                <p className="text-sm text-green-800 mt-1">
                  Your tax data is {completionPercentage}% complete. You can now generate tax documents.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Document Tabs */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as typeof activeTab)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="schedule-e">Schedule E</TabsTrigger>
          <TabsTrigger value="1099">Form 1099</TabsTrigger>
          <TabsTrigger value="summary">Tax Summary</TabsTrigger>
        </TabsList>

        {/* Schedule E Tab */}
        <TabsContent value="schedule-e" className="space-y-4 mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>IRS Schedule E</CardTitle>
                  <p className="text-sm text-gray-600 mt-1">
                    Supplemental Income and Loss (From rental real estate)
                  </p>
                </div>
                <Badge variant={isReadyToGenerate ? 'default' : 'secondary'}>
                  {isReadyToGenerate ? 'Ready' : 'Not Ready'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600">Properties</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {taxYearSummary?.propertySummaries.length || 0}
                  </p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600">Total Income</p>
                  <p className="text-2xl font-bold text-green-600 mt-1">
                    ${(taxYearSummary?.totalIncome || 0).toLocaleString()}
                  </p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600">Total Expenses</p>
                  <p className="text-2xl font-bold text-red-600 mt-1">
                    ${(taxYearSummary?.totalExpenses || 0).toLocaleString()}
                  </p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600">Net Income</p>
                  <p className="text-2xl font-bold text-blue-600 mt-1">
                    ${(taxYearSummary?.netRentalIncome || 0).toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Expense Categories */}
              <div>
                <h3 className="font-semibold mb-3">Expense Categories</h3>
                <div className="space-y-2">
                  {taxYearSummary?.expensesByCategory
                    .filter(cat => cat.amount > 0)
                    .sort((a, b) => SCHEDULE_E_CATEGORIES[a.category].lineNumber - SCHEDULE_E_CATEGORIES[b.category].lineNumber)
                    .map(cat => (
                      <div key={cat.category} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <Badge variant="outline">
                            Line {SCHEDULE_E_CATEGORIES[cat.category].lineNumber}
                          </Badge>
                          <span className="font-medium">{SCHEDULE_E_CATEGORIES[cat.category].name}</span>
                        </div>
                        <span className="font-semibold">${cat.amount.toLocaleString()}</span>
                      </div>
                    ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t">
                <Button
                  onClick={handleGenerateScheduleE}
                  disabled={!isReadyToGenerate || generatingDocument}
                  className="flex-1"
                >
                  <Download className="h-4 w-4 mr-2" />
                  {generatingDocument ? 'Generating...' : 'Generate PDF'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handlePreview('Schedule E')}
                  disabled={!isReadyToGenerate}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Preview
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleOpenEmailDialog('schedule-e')}
                  disabled={!isReadyToGenerate}
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Email
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handlePrint('Schedule E')}
                  disabled={!isReadyToGenerate}
                >
                  <Printer className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Form 1099 Tab */}
        <TabsContent value="1099" className="space-y-4 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Form 1099</CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                Generate 1099-MISC or 1099-NEC for contractors and service providers
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-semibold text-blue-900 mb-2">When to Issue Form 1099</h4>
                <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                  <li>1099-NEC: Payments of $600 or more for services (contractors, property managers)</li>
                  <li>1099-MISC: Payments of $600 or more for rent to property owners</li>
                  <li>Deadline: January 31st for the previous tax year</li>
                </ul>
              </div>

              <Button onClick={() => setShow1099Dialog(true)} className="w-full">
                <FileText className="h-4 w-4 mr-2" />
                Create New Form 1099
              </Button>

              {/* Recent 1099s */}
              <div>
                <h3 className="font-semibold mb-3">Generated Forms</h3>
                <div className="text-center py-8 text-gray-500">
                  <FileText className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-sm">No Form 1099s generated yet</p>
                  <p className="text-xs text-gray-400 mt-1">Create your first form to get started</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tax Summary Tab */}
        <TabsContent value="summary" className="space-y-4 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Tax Summary Report</CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                Comprehensive report of all rental income and expenses
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="font-semibold mb-3">Report Includes:</h4>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    Property-by-property income and expense breakdown
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    Categorized expenses by IRS Schedule E categories
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    Depreciation schedules and calculations
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    Net rental income summary
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    Year-over-year comparison (if available)
                  </li>
                </ul>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={handleGenerateSummary}
                  disabled={!isReadyToGenerate || generatingDocument}
                  className="flex-1"
                >
                  <Download className="h-4 w-4 mr-2" />
                  {generatingDocument ? 'Generating...' : 'Generate Report'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handlePreview('Tax Summary')}
                  disabled={!isReadyToGenerate}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Preview
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleOpenEmailDialog('summary')}
                  disabled={!isReadyToGenerate}
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Email
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Form 1099 Dialog */}
      <Dialog open={show1099Dialog} onOpenChange={setShow1099Dialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Form 1099</DialogTitle>
            <DialogDescription>
              Enter the recipient information and payment details
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Form Type */}
            <div>
              <Label>Form Type</Label>
              <Select
                value={form1099Data.formType}
                onValueChange={(value) => setForm1099Data({ ...form1099Data, formType: value as '1099-MISC' | '1099-NEC' })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1099-NEC">1099-NEC (Nonemployee Compensation)</SelectItem>
                  <SelectItem value="1099-MISC">1099-MISC (Miscellaneous Income)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Recipient Name */}
            <div>
              <Label>Recipient Name *</Label>
              <Input
                value={form1099Data.recipientName}
                onChange={(e) => setForm1099Data({ ...form1099Data, recipientName: e.target.value })}
                placeholder="John Doe or ABC Services LLC"
              />
            </div>

            {/* Recipient TIN */}
            <div>
              <Label>Recipient TIN/SSN *</Label>
              <Input
                value={form1099Data.recipientTIN}
                onChange={(e) => setForm1099Data({ ...form1099Data, recipientTIN: e.target.value })}
                placeholder="XX-XXXXXXX or XXX-XX-XXXX"
              />
            </div>

            {/* Recipient Address */}
            <div>
              <Label>Recipient Address</Label>
              <Textarea
                value={form1099Data.recipientAddress}
                onChange={(e) => setForm1099Data({ ...form1099Data, recipientAddress: e.target.value })}
                placeholder="123 Main St, City, State ZIP"
                rows={3}
              />
            </div>

            {/* Amount */}
            <div>
              <Label>Amount Paid *</Label>
              <Input
                type="number"
                value={form1099Data.amount}
                onChange={(e) => setForm1099Data({ ...form1099Data, amount: parseFloat(e.target.value) || 0 })}
                placeholder="0.00"
                min="0"
                step="0.01"
              />
            </div>

            {/* Box Number */}
            <div>
              <Label>Box Number</Label>
              <Select
                value={form1099Data.boxNumber}
                onValueChange={(value) => setForm1099Data({ ...form1099Data, boxNumber: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {form1099Data.formType === '1099-NEC' ? (
                    <SelectItem value="1">Box 1 - Nonemployee compensation</SelectItem>
                  ) : (
                    <>
                      <SelectItem value="1">Box 1 - Rents</SelectItem>
                      <SelectItem value="3">Box 3 - Other income</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShow1099Dialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleGenerate1099} disabled={generatingDocument}>
              {generatingDocument ? 'Generating...' : 'Generate Form'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Email Dialog */}
      <Dialog open={showEmailDialog} onOpenChange={setShowEmailDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Email Tax Document</DialogTitle>
            <DialogDescription>
              Enter the recipient's email address to send the document
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Recipient Name *</Label>
              <Input
                value={emailDialogState.recipientName}
                onChange={(e) => setEmailDialogState({ ...emailDialogState, recipientName: e.target.value })}
                placeholder="Tax Professional Name"
              />
            </div>
            <div>
              <Label>Recipient Email *</Label>
              <Input
                type="email"
                value={emailDialogState.recipientEmail}
                onChange={(e) => setEmailDialogState({ ...emailDialogState, recipientEmail: e.target.value })}
                placeholder="taxpro@example.com"
              />
            </div>
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> Your default email client will open with a pre-filled message. 
                You'll need to manually attach the PDF file as browsers don't support automatic attachments.
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowEmailDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSendEmail} disabled={sendingEmail}>
              <Send className="h-4 w-4 mr-2" />
              {sendingEmail ? 'Preparing...' : 'Open Email Client'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}