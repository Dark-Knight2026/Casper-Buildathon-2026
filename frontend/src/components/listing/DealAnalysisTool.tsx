import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DetailedListing, DealAnalysis } from '@/types/listing';
import { Calculator, TrendingUp, DollarSign, Percent } from 'lucide-react';

interface DealAnalysisToolProps {
  listing: DetailedListing;
  isOpen: boolean;
  onClose: () => void;
}

export default function DealAnalysisTool({ listing, isOpen, onClose }: DealAnalysisToolProps) {
  const [analysis, setAnalysis] = useState<DealAnalysis>({
    purchasePrice: listing.price,
    downPayment: listing.price * 0.2,
    loanAmount: listing.price * 0.8,
    interestRate: 7.5,
    loanTerm: 30,
    monthlyPayment: 0,
    monthlyRent: 0,
    monthlyExpenses: 0,
    noi: 0,
    capRate: 0,
    dscr: 0,
    cashOnCashROI: 0,
    totalROI: 0
  });

  const calculateAnalysis = useCallback(() => {
    const principal = analysis.loanAmount;
    const monthlyRate = analysis.interestRate / 100 / 12;
    const numPayments = analysis.loanTerm * 12;
    
    let monthlyPayment = 0;
    if (monthlyRate === 0) {
      monthlyPayment = principal / numPayments;
    } else {
      monthlyPayment = (principal * monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / 
                     (Math.pow(1 + monthlyRate, numPayments) - 1);
    }

    const totalMonthlyExpenses = monthlyPayment + 
      (listing.financials.propertyTaxes / 12) + 
      ((listing.financials.insurance || 0) / 12) + 
      (listing.financials.hoaFees || 0) + 
      (analysis.monthlyExpenses || 0);

    const noi = (analysis.monthlyRent || 0) * 12 - totalMonthlyExpenses * 12;
    const capRate = analysis.purchasePrice > 0 ? (noi / analysis.purchasePrice) * 100 : 0;
    const dscr = totalMonthlyExpenses > 0 ? (analysis.monthlyRent || 0) / totalMonthlyExpenses : 0;
    const cashOnCashROI = analysis.downPayment > 0 ? (noi / analysis.downPayment) * 100 : 0;

    setAnalysis(prev => ({
      ...prev,
      monthlyPayment,
      noi,
      capRate,
      dscr,
      cashOnCashROI,
      totalROI: capRate
    }));
  }, [
    analysis.loanAmount, 
    analysis.interestRate, 
    analysis.loanTerm, 
    analysis.monthlyExpenses, 
    analysis.monthlyRent, 
    analysis.purchasePrice, 
    analysis.downPayment, 
    listing.financials.propertyTaxes, 
    listing.financials.insurance, 
    listing.financials.hoaFees
  ]);

  useEffect(() => {
    calculateAnalysis();
  }, [calculateAnalysis]);

  const updateField = (field: keyof DealAnalysis, value: number) => {
    setAnalysis(prev => {
      const updated = { ...prev, [field]: value };
      
      if (field === 'purchasePrice') {
        updated.loanAmount = value - updated.downPayment;
      } else if (field === 'downPayment') {
        updated.loanAmount = updated.purchasePrice - value;
      } else if (field === 'loanAmount') {
        updated.downPayment = updated.purchasePrice - value;
      }
      
      return updated;
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Calculator className="h-5 w-5" />
            <span>Deal Analysis - {listing.address}</span>
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="inputs" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="inputs">Inputs</TabsTrigger>
            <TabsTrigger value="analysis">Analysis</TabsTrigger>
            <TabsTrigger value="scenarios">Scenarios</TabsTrigger>
          </TabsList>

          <TabsContent value="inputs" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Purchase Details */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Purchase Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="purchase-price">Purchase Price</Label>
                    <Input
                      id="purchase-price"
                      type="number"
                      value={analysis.purchasePrice}
                      onChange={(e) => updateField('purchasePrice', Number(e.target.value))}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="down-payment">Down Payment</Label>
                    <Input
                      id="down-payment"
                      type="number"
                      value={analysis.downPayment}
                      onChange={(e) => updateField('downPayment', Number(e.target.value))}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="loan-amount">Loan Amount</Label>
                    <Input
                      id="loan-amount"
                      type="number"
                      value={analysis.loanAmount}
                      onChange={(e) => updateField('loanAmount', Number(e.target.value))}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Loan Details */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Loan Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="interest-rate">Interest Rate (%)</Label>
                    <Input
                      id="interest-rate"
                      type="number"
                      step="0.1"
                      value={analysis.interestRate}
                      onChange={(e) => updateField('interestRate', Number(e.target.value))}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="loan-term">Loan Term (years)</Label>
                    <Input
                      id="loan-term"
                      type="number"
                      value={analysis.loanTerm}
                      onChange={(e) => updateField('loanTerm', Number(e.target.value))}
                    />
                  </div>
                  
                  <div>
                    <Label>Monthly P&I Payment</Label>
                    <div className="text-lg font-semibold text-gray-900">
                      ${analysis.monthlyPayment.toFixed(0)}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Rental Income */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Rental Income</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="monthly-rent">Monthly Rent</Label>
                    <Input
                      id="monthly-rent"
                      type="number"
                      value={analysis.monthlyRent || ''}
                      onChange={(e) => updateField('monthlyRent', Number(e.target.value) || 0)}
                    />
                  </div>
                  
                  <div>
                    <Label>Annual Rental Income</Label>
                    <div className="text-lg font-semibold text-gray-900">
                      ${((analysis.monthlyRent || 0) * 12).toLocaleString()}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Operating Expenses */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Operating Expenses</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="monthly-expenses">Additional Monthly Expenses</Label>
                    <Input
                      id="monthly-expenses"
                      type="number"
                      value={analysis.monthlyExpenses || ''}
                      onChange={(e) => updateField('monthlyExpenses', Number(e.target.value) || 0)}
                      placeholder="Maintenance, vacancy, etc."
                    />
                  </div>
                  
                  <div className="text-sm text-gray-600 space-y-1">
                    <div>Property Taxes: ${(listing.financials.propertyTaxes / 12).toFixed(0)}/mo</div>
                    {listing.financials.insurance && (
                      <div>Insurance: ${(listing.financials.insurance / 12).toFixed(0)}/mo</div>
                    )}
                    {listing.financials.hoaFees && (
                      <div>HOA Fees: ${listing.financials.hoaFees}/mo</div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="analysis" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Net Operating Income</p>
                      <p className="text-2xl font-bold text-gray-900">
                        ${(analysis.noi || 0).toLocaleString()}
                      </p>
                      <p className="text-xs text-gray-500">Annual</p>
                    </div>
                    <DollarSign className="h-8 w-8 text-green-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Cap Rate</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {(analysis.capRate || 0).toFixed(2)}%
                      </p>
                      <p className="text-xs text-gray-500">Annual return</p>
                    </div>
                    <Percent className="h-8 w-8 text-blue-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">DSCR</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {(analysis.dscr || 0).toFixed(2)}
                      </p>
                      <p className="text-xs text-gray-500">Debt coverage</p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-purple-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Cash-on-Cash ROI</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {(analysis.cashOnCashROI || 0).toFixed(2)}%
                      </p>
                      <p className="text-xs text-gray-500">On down payment</p>
                    </div>
                    <Calculator className="h-8 w-8 text-orange-600" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Cash Flow Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>Monthly Cash Flow Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Rental Income</span>
                    <span className="font-semibold text-green-600">
                      +${(analysis.monthlyRent || 0).toLocaleString()}
                    </span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-gray-600">Principal & Interest</span>
                    <span className="font-semibold text-red-600">
                      -${analysis.monthlyPayment.toFixed(0)}
                    </span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-gray-600">Property Taxes</span>
                    <span className="font-semibold text-red-600">
                      -${(listing.financials.propertyTaxes / 12).toFixed(0)}
                    </span>
                  </div>
                  
                  {listing.financials.insurance && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Insurance</span>
                      <span className="font-semibold text-red-600">
                        -${(listing.financials.insurance / 12).toFixed(0)}
                      </span>
                    </div>
                  )}
                  
                  {listing.financials.hoaFees && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">HOA Fees</span>
                      <span className="font-semibold text-red-600">
                        -${listing.financials.hoaFees}
                      </span>
                    </div>
                  )}
                  
                  {analysis.monthlyExpenses && analysis.monthlyExpenses > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Other Expenses</span>
                      <span className="font-semibold text-red-600">
                        -${analysis.monthlyExpenses}
                      </span>
                    </div>
                  )}
                  
                  <div className="border-t border-gray-200 pt-3 mt-3">
                    <div className="flex justify-between text-lg font-bold">
                      <span>Net Monthly Cash Flow</span>
                      <span className={
                        (analysis.noi || 0) / 12 >= 0 ? 'text-green-600' : 'text-red-600'
                      }>
                        ${((analysis.noi || 0) / 12).toFixed(0)}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="scenarios" className="space-y-6">
            <div className="text-center text-gray-600">
              <Calculator className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p>Scenario analysis coming soon!</p>
              <p className="text-sm">Compare different purchase prices, rent amounts, and financing options.</p>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end space-x-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button>
            Save Analysis
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}