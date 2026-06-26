import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Slider } from '../ui/slider';
import { calculateMortgage, MortgageInputs } from '../../lib/mortgageCalculator';
import { DollarSign, Percent, Calendar, TrendingUp } from 'lucide-react';

export const MortgageCalculator: React.FC = () => {
  const [inputs, setInputs] = useState<MortgageInputs>({
    homePrice: 500000,
    downPaymentPercent: 20,
    interestRate: 6.5,
    loanTerm: 30,
    propertyTaxRate: 1.2,
    homeInsuranceAnnual: 1200,
    hoaMonthly: 0,
    pmiRate: 0.5,
  });

  const [calculation, setCalculation] = useState(calculateMortgage(inputs));

  useEffect(() => {
    setCalculation(calculateMortgage(inputs));
  }, [inputs]);

  const handleInputChange = (field: keyof MortgageInputs, value: number) => {
    setInputs((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="w-5 h-5" />
          Mortgage Calculator
        </CardTitle>
        <CardDescription>
          Calculate your monthly payment and see how different factors affect your mortgage
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid md:grid-cols-2 gap-6">
          {/* Inputs Section */}
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="homePrice">Home Price</Label>
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-gray-500" />
                <Input
                  id="homePrice"
                  type="number"
                  value={inputs.homePrice}
                  onChange={(e) => handleInputChange('homePrice', Number(e.target.value))}
                  className="flex-1"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="downPayment">
                Down Payment: {inputs.downPaymentPercent}% ($
                {((inputs.homePrice * inputs.downPaymentPercent) / 100).toLocaleString()})
              </Label>
              <Slider
                id="downPayment"
                min={0}
                max={50}
                step={1}
                value={[inputs.downPaymentPercent]}
                onValueChange={(value) => handleInputChange('downPaymentPercent', value[0])}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="interestRate">Interest Rate (%)</Label>
              <div className="flex items-center gap-2">
                <Percent className="w-4 h-4 text-gray-500" />
                <Input
                  id="interestRate"
                  type="number"
                  step="0.1"
                  value={inputs.interestRate}
                  onChange={(e) => handleInputChange('interestRate', Number(e.target.value))}
                  className="flex-1"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="loanTerm">Loan Term (years)</Label>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-500" />
                <Input
                  id="loanTerm"
                  type="number"
                  value={inputs.loanTerm}
                  onChange={(e) => handleInputChange('loanTerm', Number(e.target.value))}
                  className="flex-1"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="propertyTax">Property Tax Rate (% annually)</Label>
              <Input
                id="propertyTax"
                type="number"
                step="0.1"
                value={inputs.propertyTaxRate}
                onChange={(e) => handleInputChange('propertyTaxRate', Number(e.target.value))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="homeInsurance">Home Insurance (annual)</Label>
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-gray-500" />
                <Input
                  id="homeInsurance"
                  type="number"
                  value={inputs.homeInsuranceAnnual}
                  onChange={(e) => handleInputChange('homeInsuranceAnnual', Number(e.target.value))}
                  className="flex-1"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="hoa">HOA Fees (monthly)</Label>
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-gray-500" />
                <Input
                  id="hoa"
                  type="number"
                  value={inputs.hoaMonthly}
                  onChange={(e) => handleInputChange('hoaMonthly', Number(e.target.value))}
                  className="flex-1"
                />
              </div>
            </div>
          </div>

          {/* Results Section */}
          <div className="space-y-4">
            <div className="bg-blue-50 p-6 rounded-lg border-2 border-blue-200">
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-1">Total Monthly Payment</p>
                <p className="text-4xl font-bold text-blue-900">
                  ${calculation.totalMonthlyPayment.toLocaleString()}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                <span className="text-sm text-gray-600">Principal & Interest</span>
                <span className="font-semibold">${calculation.monthlyPayment.toLocaleString()}</span>
              </div>

              <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                <span className="text-sm text-gray-600">Property Tax</span>
                <span className="font-semibold">${calculation.propertyTax?.toLocaleString()}</span>
              </div>

              <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                <span className="text-sm text-gray-600">Home Insurance</span>
                <span className="font-semibold">${calculation.homeInsurance?.toLocaleString()}</span>
              </div>

              {calculation.hoa && calculation.hoa > 0 && (
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                  <span className="text-sm text-gray-600">HOA Fees</span>
                  <span className="font-semibold">${calculation.hoa.toLocaleString()}</span>
                </div>
              )}

              {calculation.pmi && calculation.pmi > 0 && (
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                  <span className="text-sm text-gray-600">PMI</span>
                  <span className="font-semibold">${calculation.pmi.toLocaleString()}</span>
                </div>
              )}
            </div>

            <div className="border-t pt-4 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Loan Amount</span>
                <span className="font-semibold">${calculation.loanAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Down Payment</span>
                <span className="font-semibold">${calculation.downPayment.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Total Interest</span>
                <span className="font-semibold text-orange-600">
                  ${calculation.totalInterest.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Total Payment</span>
                <span className="font-semibold">${calculation.totalPayment.toLocaleString()}</span>
              </div>
            </div>

            {inputs.downPaymentPercent < 20 && (
              <div className="bg-yellow-50 border border-yellow-200 p-3 rounded">
                <div className="flex items-start gap-2">
                  <TrendingUp className="w-4 h-4 text-yellow-600 mt-0.5" />
                  <p className="text-xs text-yellow-800">
                    With less than 20% down payment, you'll need to pay PMI (Private Mortgage
                    Insurance) of ${calculation.pmi?.toLocaleString()}/month until you reach 20%
                    equity.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};