import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import {
  FileText,
  Download,
  Calendar,
  DollarSign,
  TrendingUp,
  Home,
  Receipt,
  CheckCircle2,
  BarChart3,
  PieChart,
  Share2,
} from 'lucide-react';

interface YearEndSummary {
  taxYear: number;
  propertyAddress: string;
  purchaseDate?: string;
  purchasePrice?: number;
  deductions: {
    mortgageInterest: number;
    propertyTaxes: number;
    points: number;
    pmi: number;
    homeOffice: number;
    total: number;
  };
  expenses: {
    closingCosts: number;
    homeImprovements: number;
    repairs: number;
    insurance: number;
    hoa: number;
    utilities: number;
    total: number;
  };
  credits: {
    energyEfficiency: number;
    firstTimeBuyer: number;
    total: number;
  };
  documents: {
    form1098Count: number;
    receiptsCount: number;
    statementsCount: number;
    total: number;
  };
}

const mockSummary: YearEndSummary = {
  taxYear: 2024,
  propertyAddress: '123 Main St, Los Angeles, CA 90001',
  purchaseDate: '2024-03-15',
  purchasePrice: 500000,
  deductions: {
    mortgageInterest: 18500,
    propertyTaxes: 6000,
    points: 4000,
    pmi: 1500,
    homeOffice: 2400,
    total: 32400,
  },
  expenses: {
    closingCosts: 8500,
    homeImprovements: 25000,
    repairs: 3200,
    insurance: 1800,
    hoa: 2400,
    utilities: 4800,
    total: 45700,
  },
  credits: {
    energyEfficiency: 3000,
    firstTimeBuyer: 0,
    total: 3000,
  },
  documents: {
    form1098Count: 1,
    receiptsCount: 24,
    statementsCount: 12,
    total: 37,
  },
};

export function TaxYearEndSummary() {
  const [selectedYear, setSelectedYear] = useState<string>('2024');
  const [summary] = useState<YearEndSummary>(mockSummary);

  const estimatedTaxSavings = (summary.deductions.total * 0.24) + summary.credits.total;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Year-End Tax Summary
              </CardTitle>
              <CardDescription>
                Comprehensive summary of your property-related tax information
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2024">2024</SelectItem>
                  <SelectItem value="2023">2023</SelectItem>
                  <SelectItem value="2022">2022</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Export PDF
              </Button>
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Share2 className="w-4 h-4 mr-2" />
                Share with CPA
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Property Info */}
          <Card className="mb-6 bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="bg-blue-600 p-3 rounded-lg">
                  <Home className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg mb-2">Property Information</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Address</p>
                      <p className="font-semibold">{summary.propertyAddress}</p>
                    </div>
                    {summary.purchaseDate && (
                      <div>
                        <p className="text-sm text-gray-600">Purchase Date</p>
                        <p className="font-semibold">
                          {new Date(summary.purchaseDate).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                    {summary.purchasePrice && (
                      <div>
                        <p className="text-sm text-gray-600">Purchase Price</p>
                        <p className="font-semibold">${summary.purchasePrice.toLocaleString()}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-sm text-gray-600">Tax Year</p>
                      <p className="font-semibold">{summary.taxYear}</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Key Metrics */}
          <div className="grid md:grid-cols-4 gap-4 mb-6">
            <Card className="bg-green-50 border-green-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-green-600 mb-1">Total Deductions</p>
                    <p className="text-2xl font-bold text-green-900">
                      ${(summary.deductions.total / 1000).toFixed(1)}K
                    </p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-blue-600 mb-1">Total Expenses</p>
                    <p className="text-2xl font-bold text-blue-900">
                      ${(summary.expenses.total / 1000).toFixed(1)}K
                    </p>
                  </div>
                  <Receipt className="w-8 h-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-purple-50 border-purple-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-purple-600 mb-1">Tax Credits</p>
                    <p className="text-2xl font-bold text-purple-900">
                      ${(summary.credits.total / 1000).toFixed(1)}K
                    </p>
                  </div>
                  <DollarSign className="w-8 h-8 text-purple-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-orange-50 border-orange-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-orange-600 mb-1">Est. Tax Savings</p>
                    <p className="text-2xl font-bold text-orange-900">
                      ${(estimatedTaxSavings / 1000).toFixed(1)}K
                    </p>
                  </div>
                  <CheckCircle2 className="w-8 h-8 text-orange-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            {/* Tax Deductions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Tax Deductions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-blue-50 rounded">
                  <span className="text-sm font-semibold">Mortgage Interest</span>
                  <span className="font-bold text-blue-900">
                    ${summary.deductions.mortgageInterest.toLocaleString()}
                  </span>
                </div>

                <div className="flex justify-between items-center p-3 bg-blue-50 rounded">
                  <span className="text-sm font-semibold">Property Taxes</span>
                  <span className="font-bold text-blue-900">
                    ${summary.deductions.propertyTaxes.toLocaleString()}
                  </span>
                </div>

                {summary.deductions.points > 0 && (
                  <div className="flex justify-between items-center p-3 bg-blue-50 rounded">
                    <span className="text-sm font-semibold">Points Paid</span>
                    <span className="font-bold text-blue-900">
                      ${summary.deductions.points.toLocaleString()}
                    </span>
                  </div>
                )}

                {summary.deductions.pmi > 0 && (
                  <div className="flex justify-between items-center p-3 bg-blue-50 rounded">
                    <span className="text-sm font-semibold">PMI</span>
                    <span className="font-bold text-blue-900">
                      ${summary.deductions.pmi.toLocaleString()}
                    </span>
                  </div>
                )}

                {summary.deductions.homeOffice > 0 && (
                  <div className="flex justify-between items-center p-3 bg-blue-50 rounded">
                    <span className="text-sm font-semibold">Home Office</span>
                    <span className="font-bold text-blue-900">
                      ${summary.deductions.homeOffice.toLocaleString()}
                    </span>
                  </div>
                )}

                <div className="flex justify-between items-center p-3 bg-green-100 rounded border-2 border-green-300">
                  <span className="font-bold">Total Deductions</span>
                  <span className="font-bold text-lg text-green-900">
                    ${summary.deductions.total.toLocaleString()}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Property Expenses */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Receipt className="w-5 h-5" />
                  Property Expenses
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                  <span className="text-sm font-semibold">Closing Costs</span>
                  <span className="font-bold text-gray-900">
                    ${summary.expenses.closingCosts.toLocaleString()}
                  </span>
                </div>

                <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                  <span className="text-sm font-semibold">Home Improvements</span>
                  <span className="font-bold text-gray-900">
                    ${summary.expenses.homeImprovements.toLocaleString()}
                  </span>
                </div>

                <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                  <span className="text-sm font-semibold">Repairs & Maintenance</span>
                  <span className="font-bold text-gray-900">
                    ${summary.expenses.repairs.toLocaleString()}
                  </span>
                </div>

                <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                  <span className="text-sm font-semibold">Insurance</span>
                  <span className="font-bold text-gray-900">
                    ${summary.expenses.insurance.toLocaleString()}
                  </span>
                </div>

                <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                  <span className="text-sm font-semibold">HOA Fees</span>
                  <span className="font-bold text-gray-900">
                    ${summary.expenses.hoa.toLocaleString()}
                  </span>
                </div>

                <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                  <span className="text-sm font-semibold">Utilities</span>
                  <span className="font-bold text-gray-900">
                    ${summary.expenses.utilities.toLocaleString()}
                  </span>
                </div>

                <div className="flex justify-between items-center p-3 bg-blue-100 rounded border-2 border-blue-300">
                  <span className="font-bold">Total Expenses</span>
                  <span className="font-bold text-lg text-blue-900">
                    ${summary.expenses.total.toLocaleString()}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tax Credits */}
          {summary.credits.total > 0 && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  Tax Credits
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {summary.credits.energyEfficiency > 0 && (
                  <div className="flex justify-between items-center p-3 bg-green-50 rounded">
                    <span className="text-sm font-semibold">Energy Efficiency Credits</span>
                    <span className="font-bold text-green-900">
                      ${summary.credits.energyEfficiency.toLocaleString()}
                    </span>
                  </div>
                )}

                {summary.credits.firstTimeBuyer > 0 && (
                  <div className="flex justify-between items-center p-3 bg-green-50 rounded">
                    <span className="text-sm font-semibold">First-Time Homebuyer Credit</span>
                    <span className="font-bold text-green-900">
                      ${summary.credits.firstTimeBuyer.toLocaleString()}
                    </span>
                  </div>
                )}

                <div className="flex justify-between items-center p-3 bg-green-100 rounded border-2 border-green-300">
                  <span className="font-bold">Total Credits</span>
                  <span className="font-bold text-lg text-green-900">
                    ${summary.credits.total.toLocaleString()}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Document Summary */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Document Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <p className="text-2xl font-bold text-blue-900">{summary.documents.form1098Count}</p>
                  <p className="text-sm text-gray-600 mt-1">Form 1098</p>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <p className="text-2xl font-bold text-green-900">{summary.documents.receiptsCount}</p>
                  <p className="text-sm text-gray-600 mt-1">Receipts</p>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <p className="text-2xl font-bold text-purple-900">{summary.documents.statementsCount}</p>
                  <p className="text-sm text-gray-600 mt-1">Statements</p>
                </div>
                <div className="text-center p-4 bg-orange-50 rounded-lg">
                  <p className="text-2xl font-bold text-orange-900">{summary.documents.total}</p>
                  <p className="text-sm text-gray-600 mt-1">Total Documents</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Export Options */}
          <Card className="mt-6 bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200">
            <CardContent className="p-6">
              <h3 className="font-semibold text-lg mb-4">Export & Integration Options</h3>
              <div className="grid md:grid-cols-3 gap-4">
                <Button variant="outline" className="h-auto p-4 flex flex-col items-center gap-2">
                  <Download className="w-6 h-6" />
                  <span className="font-semibold">Export PDF</span>
                  <span className="text-xs text-gray-600">Detailed tax summary</span>
                </Button>

                <Button variant="outline" className="h-auto p-4 flex flex-col items-center gap-2">
                  <FileText className="w-6 h-6" />
                  <span className="font-semibold">Export CSV</span>
                  <span className="text-xs text-gray-600">Spreadsheet format</span>
                </Button>

                <Button variant="outline" className="h-auto p-4 flex flex-col items-center gap-2">
                  <Share2 className="w-6 h-6" />
                  <span className="font-semibold">TurboTax</span>
                  <span className="text-xs text-gray-600">Direct import</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Disclaimer */}
          <Card className="mt-4 bg-yellow-50 border-yellow-200">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-yellow-600 mt-0.5" />
                <div>
                  <p className="font-semibold text-sm mb-1">Tax Professional Consultation Recommended</p>
                  <p className="text-xs text-gray-700">
                    This summary is provided for informational purposes only and should not be considered tax advice. 
                    Tax laws are complex and change frequently. Please consult with a qualified tax professional or CPA 
                    to ensure accurate filing and to maximize your deductions and credits based on your specific situation.
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