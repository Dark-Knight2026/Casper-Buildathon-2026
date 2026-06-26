import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import {
  FileText,
  Download,
  Eye,
  CheckCircle2,
  AlertCircle,
  FileCheck,
  Printer,
  Send,
  Sparkles,
  Calculator,
  RefreshCw,
} from 'lucide-react';

interface TaxForm {
  id: string;
  formNumber: string;
  formName: string;
  taxYear: number;
  status: 'draft' | 'ready' | 'filed';
  lastUpdated: string;
  fields: {
    lineNumber: string;
    description: string;
    amount: number;
    source: string;
  }[];
  totalDeduction?: number;
}

const mockTaxForms: TaxForm[] = [
  {
    id: 'form-001',
    formNumber: 'Schedule A',
    formName: 'Itemized Deductions',
    taxYear: 2024,
    status: 'ready',
    lastUpdated: '2024-01-15T10:30:00',
    fields: [
      {
        lineNumber: '8a',
        description: 'Home mortgage interest',
        amount: 18450,
        source: 'Form 1098',
      },
      {
        lineNumber: '8b',
        description: 'Points not reported on Form 1098',
        amount: 2500,
        source: 'Closing Statement',
      },
      {
        lineNumber: '5b',
        description: 'State and local real estate taxes',
        amount: 8200,
        source: 'Property Tax Statement',
      },
      {
        lineNumber: '5c',
        description: 'State and local personal property taxes',
        amount: 0,
        source: 'Manual Entry',
      },
    ],
    totalDeduction: 29150,
  },
  {
    id: 'form-002',
    formNumber: 'Form 8829',
    formName: 'Expenses for Business Use of Your Home',
    taxYear: 2024,
    status: 'draft',
    lastUpdated: '2024-01-14T14:20:00',
    fields: [
      {
        lineNumber: '1',
        description: 'Area used for business',
        amount: 200,
        source: 'Manual Entry',
      },
      {
        lineNumber: '2',
        description: 'Total area of home',
        amount: 2000,
        source: 'Manual Entry',
      },
      {
        lineNumber: '7',
        description: 'Business percentage',
        amount: 10,
        source: 'Calculated',
      },
    ],
  },
  {
    id: 'form-003',
    formNumber: 'Form 5695',
    formName: 'Residential Energy Credits',
    taxYear: 2024,
    status: 'ready',
    lastUpdated: '2024-01-13T09:15:00',
    fields: [
      {
        lineNumber: '1',
        description: 'Energy efficient improvements',
        amount: 15000,
        source: 'Receipts',
      },
      {
        lineNumber: '14',
        description: 'Credit (30% of line 1)',
        amount: 4500,
        source: 'Calculated',
      },
    ],
    totalDeduction: 4500,
  },
];

export function TaxFormGenerator() {
  const [forms, setForms] = useState<TaxForm[]>(mockTaxForms);
  const [selectedForm, setSelectedForm] = useState<TaxForm | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerateForm = (formType: string) => {
    setIsGenerating(true);
    
    setTimeout(() => {
      const newForm: TaxForm = {
        id: `form-${Date.now()}`,
        formNumber: formType,
        formName: getFormName(formType),
        taxYear: 2024,
        status: 'draft',
        lastUpdated: new Date().toISOString(),
        fields: [],
      };
      
      setForms((prev) => [newForm, ...prev]);
      setSelectedForm(newForm);
      setIsGenerating(false);
    }, 2000);
  };

  const getFormName = (formNumber: string): string => {
    const formNames: Record<string, string> = {
      'Schedule A': 'Itemized Deductions',
      'Form 8829': 'Expenses for Business Use of Your Home',
      'Form 5695': 'Residential Energy Credits',
      'Schedule E': 'Supplemental Income and Loss',
      'Form 4562': 'Depreciation and Amortization',
    };
    return formNames[formNumber] || 'Tax Form';
  };

  const handleExportForm = (form: TaxForm) => {
    alert(`Exporting ${form.formNumber} as PDF...`);
  };

  const handleFileForm = (form: TaxForm) => {
    if (confirm(`Are you sure you want to mark ${form.formNumber} as filed?`)) {
      setForms((prev) =>
        prev.map((f) =>
          f.id === form.id ? { ...f, status: 'filed' as const } : f
        )
      );
    }
  };

  const readyForms = forms.filter((f) => f.status === 'ready').length;
  const draftForms = forms.filter((f) => f.status === 'draft').length;
  const filedForms = forms.filter((f) => f.status === 'filed').length;
  const totalDeductions = forms.reduce((sum, f) => sum + (f.totalDeduction || 0), 0);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Automated Tax Form Generation
          </CardTitle>
          <CardDescription>
            Generate IRS tax forms automatically from your tracked expenses and documents
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Stats */}
          <div className="grid md:grid-cols-4 gap-4 mb-6">
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-blue-600 mb-1">Total Forms</p>
                    <p className="text-2xl font-bold text-blue-900">{forms.length}</p>
                  </div>
                  <FileText className="w-8 h-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-green-50 border-green-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-green-600 mb-1">Ready to File</p>
                    <p className="text-2xl font-bold text-green-900">{readyForms}</p>
                  </div>
                  <CheckCircle2 className="w-8 h-8 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-orange-50 border-orange-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-orange-600 mb-1">Draft</p>
                    <p className="text-2xl font-bold text-orange-900">{draftForms}</p>
                  </div>
                  <FileCheck className="w-8 h-8 text-orange-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-purple-50 border-purple-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-purple-600 mb-1">Total Deductions</p>
                    <p className="text-xl font-bold text-purple-900">
                      ${totalDeductions.toLocaleString()}
                    </p>
                  </div>
                  <Calculator className="w-8 h-8 text-purple-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Generate New Form */}
          <Card className="mb-6 bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Sparkles className="w-5 h-5" />
                Generate New Tax Form
              </CardTitle>
              <CardDescription>
                Select a form type to automatically generate based on your data
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                <Button
                  variant="outline"
                  className="h-auto p-4 flex flex-col items-start gap-2 hover:bg-blue-50 hover:border-blue-300"
                  onClick={() => handleGenerateForm('Schedule A')}
                  disabled={isGenerating}
                >
                  <div className="flex items-center gap-2 w-full">
                    <FileText className="w-5 h-5 text-blue-600" />
                    <span className="font-semibold">Schedule A</span>
                  </div>
                  <p className="text-xs text-gray-600 text-left">
                    Itemized Deductions
                  </p>
                </Button>

                <Button
                  variant="outline"
                  className="h-auto p-4 flex flex-col items-start gap-2 hover:bg-green-50 hover:border-green-300"
                  onClick={() => handleGenerateForm('Form 8829')}
                  disabled={isGenerating}
                >
                  <div className="flex items-center gap-2 w-full">
                    <FileText className="w-5 h-5 text-green-600" />
                    <span className="font-semibold">Form 8829</span>
                  </div>
                  <p className="text-xs text-gray-600 text-left">
                    Business Use of Home
                  </p>
                </Button>

                <Button
                  variant="outline"
                  className="h-auto p-4 flex flex-col items-start gap-2 hover:bg-purple-50 hover:border-purple-300"
                  onClick={() => handleGenerateForm('Form 5695')}
                  disabled={isGenerating}
                >
                  <div className="flex items-center gap-2 w-full">
                    <FileText className="w-5 h-5 text-purple-600" />
                    <span className="font-semibold">Form 5695</span>
                  </div>
                  <p className="text-xs text-gray-600 text-left">
                    Energy Credits
                  </p>
                </Button>

                <Button
                  variant="outline"
                  className="h-auto p-4 flex flex-col items-start gap-2 hover:bg-orange-50 hover:border-orange-300"
                  onClick={() => handleGenerateForm('Schedule E')}
                  disabled={isGenerating}
                >
                  <div className="flex items-center gap-2 w-full">
                    <FileText className="w-5 h-5 text-orange-600" />
                    <span className="font-semibold">Schedule E</span>
                  </div>
                  <p className="text-xs text-gray-600 text-left">
                    Rental Income/Loss
                  </p>
                </Button>

                <Button
                  variant="outline"
                  className="h-auto p-4 flex flex-col items-start gap-2 hover:bg-pink-50 hover:border-pink-300"
                  onClick={() => handleGenerateForm('Form 4562')}
                  disabled={isGenerating}
                >
                  <div className="flex items-center gap-2 w-full">
                    <FileText className="w-5 h-5 text-pink-600" />
                    <span className="font-semibold">Form 4562</span>
                  </div>
                  <p className="text-xs text-gray-600 text-left">
                    Depreciation
                  </p>
                </Button>

                <Button
                  variant="outline"
                  className="h-auto p-4 flex flex-col items-start gap-2 hover:bg-indigo-50 hover:border-indigo-300"
                  onClick={() => handleGenerateForm('Custom Form')}
                  disabled={isGenerating}
                >
                  <div className="flex items-center gap-2 w-full">
                    <FileText className="w-5 h-5 text-indigo-600" />
                    <span className="font-semibold">Custom Form</span>
                  </div>
                  <p className="text-xs text-gray-600 text-left">
                    Other IRS Forms
                  </p>
                </Button>
              </div>

              {isGenerating && (
                <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center gap-3">
                    <RefreshCw className="w-5 h-5 text-blue-600 animate-spin" />
                    <div>
                      <p className="font-semibold text-sm text-blue-900">
                        Generating tax form...
                      </p>
                      <p className="text-xs text-blue-700">
                        Analyzing your data and populating form fields
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Forms List */}
          <div className="grid lg:grid-cols-2 gap-6">
            {/* List View */}
            <div>
              <h3 className="font-semibold mb-4">Generated Forms</h3>
              <div className="space-y-3">
                {forms.map((form) => (
                  <Card
                    key={form.id}
                    className={`cursor-pointer hover:shadow-md transition-shadow ${
                      selectedForm?.id === form.id ? 'border-blue-500 bg-blue-50' : ''
                    }`}
                    onClick={() => setSelectedForm(form)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-semibold">{form.formNumber}</p>
                          <p className="text-sm text-gray-600">{form.formName}</p>
                        </div>
                        {form.status === 'ready' && (
                          <Badge className="bg-green-600 text-white">Ready</Badge>
                        )}
                        {form.status === 'draft' && (
                          <Badge className="bg-orange-600 text-white">Draft</Badge>
                        )}
                        {form.status === 'filed' && (
                          <Badge className="bg-blue-600 text-white">Filed</Badge>
                        )}
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Tax Year: {form.taxYear}</span>
                        {form.totalDeduction && (
                          <span className="font-semibold text-green-900">
                            ${form.totalDeduction.toLocaleString()}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        Updated: {new Date(form.lastUpdated).toLocaleString()}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Detail View */}
            <div>
              {selectedForm ? (
                <Card>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{selectedForm.formNumber}</CardTitle>
                        <CardDescription>{selectedForm.formName}</CardDescription>
                      </div>
                      {selectedForm.status === 'ready' && (
                        <Badge className="bg-green-600 text-white">Ready to File</Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {selectedForm.fields.length > 0 ? (
                      <>
                        <div className="space-y-3">
                          <p className="font-semibold text-sm">Form Fields:</p>
                          {selectedForm.fields.map((field, index) => (
                            <div
                              key={index}
                              className="p-3 bg-gray-50 rounded-lg border"
                            >
                              <div className="flex items-start justify-between mb-1">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <Badge variant="outline" className="text-xs">
                                      Line {field.lineNumber}
                                    </Badge>
                                    <span className="text-xs text-gray-600">
                                      {field.source}
                                    </span>
                                  </div>
                                  <p className="text-sm font-medium">{field.description}</p>
                                </div>
                                <p className="font-bold text-blue-900">
                                  ${field.amount.toLocaleString()}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>

                        {selectedForm.totalDeduction && (
                          <div className="p-4 bg-green-50 rounded-lg border-2 border-green-200">
                            <div className="flex items-center justify-between">
                              <span className="font-semibold">Total Deduction/Credit:</span>
                              <span className="text-2xl font-bold text-green-900">
                                ${selectedForm.totalDeduction.toLocaleString()}
                              </span>
                            </div>
                          </div>
                        )}

                        <div className="grid grid-cols-2 gap-2 pt-4">
                          <Button
                            variant="outline"
                            onClick={() => handleExportForm(selectedForm)}
                          >
                            <Download className="w-4 h-4 mr-2" />
                            Export PDF
                          </Button>
                          <Button variant="outline">
                            <Printer className="w-4 h-4 mr-2" />
                            Print
                          </Button>
                          <Button variant="outline">
                            <Eye className="w-4 h-4 mr-2" />
                            Preview
                          </Button>
                          {selectedForm.status === 'ready' && (
                            <Button
                              className="bg-green-600 hover:bg-green-700"
                              onClick={() => handleFileForm(selectedForm)}
                            >
                              <Send className="w-4 h-4 mr-2" />
                              Mark Filed
                            </Button>
                          )}
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-12">
                        <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-600 mb-2">Form is empty</p>
                        <p className="text-sm text-gray-500">
                          Add data to populate this form
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <Card className="h-full flex items-center justify-center">
                  <CardContent className="text-center p-12">
                    <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-600 mb-2">Select a form to view details</p>
                    <p className="text-sm text-gray-500">
                      Click on any form to see fields and options
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          {/* Features */}
          <Card className="mt-6 bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-200">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Sparkles className="w-5 h-5" />
                Automated Form Generation Features
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-3 p-3 bg-white rounded-lg">
                <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
                <div>
                  <p className="font-semibold text-sm">Auto-Population from Data</p>
                  <p className="text-xs text-gray-600">
                    Forms are automatically filled using data from your expense tracker, document
                    vault, and scanned documents
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-white rounded-lg">
                <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
                <div>
                  <p className="font-semibold text-sm">IRS-Compliant Formatting</p>
                  <p className="text-xs text-gray-600">
                    All forms follow official IRS formats and include proper line numbers and
                    calculations
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-white rounded-lg">
                <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
                <div>
                  <p className="font-semibold text-sm">Automatic Calculations</p>
                  <p className="text-xs text-gray-600">
                    Totals, percentages, and credits are calculated automatically based on IRS
                    rules
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-white rounded-lg">
                <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
                <div>
                  <p className="font-semibold text-sm">Export to Tax Software</p>
                  <p className="text-xs text-gray-600">
                    Export forms as PDF or import directly into TurboTax, H&R Block, and other tax
                    software
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-white rounded-lg">
                <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
                <div>
                  <p className="font-semibold text-sm">Version Control</p>
                  <p className="text-xs text-gray-600">
                    Track changes and maintain multiple versions of forms as your data updates
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  );
}