import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Button } from '../ui/button';
import { DollarSign, TrendingUp, AlertCircle } from 'lucide-react';

export function AffordabilityCalculator() {
  const [income, setIncome] = useState<string>('75000');
  const [monthlyDebts, setMonthlyDebts] = useState<string>('500');
  const [downPayment, setDownPayment] = useState<string>('50000');
  const [interestRate, setInterestRate] = useState<string>('6.5');

  const calculateAffordability = () => {
    const annualIncome = parseFloat(income) || 0;
    const monthlyDebt = parseFloat(monthlyDebts) || 0;
    const down = parseFloat(downPayment) || 0;
    const rate = parseFloat(interestRate) / 100 / 12;

    // 28/36 rule: Housing costs should not exceed 28% of gross monthly income
    const monthlyIncome = annualIncome / 12;
    const maxHousingPayment = monthlyIncome * 0.28;

    // Total debt (including housing) should not exceed 36% of gross monthly income
    const maxTotalDebt = monthlyIncome * 0.36;
    const availableForHousing = maxTotalDebt - monthlyDebt;

    // Use the lower of the two limits
    const maxMonthlyPayment = Math.min(maxHousingPayment, availableForHousing);

    // Calculate max loan amount based on monthly payment
    // P = M * [(1 - (1 + r)^-n) / r]
    const months = 360; // 30-year mortgage
    const maxLoanAmount =
      maxMonthlyPayment * ((1 - Math.pow(1 + rate, -months)) / rate);

    // Add down payment to get max home price
    const maxHomePrice = maxLoanAmount + down;

    return {
      maxHomePrice: Math.floor(maxHomePrice),
      maxMonthlyPayment: Math.floor(maxMonthlyPayment),
      maxLoanAmount: Math.floor(maxLoanAmount),
      downPayment: down,
      debtToIncomeRatio: ((monthlyDebt / monthlyIncome) * 100).toFixed(1),
    };
  };

  const result = calculateAffordability();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-green-600" />
          Affordability Calculator
        </CardTitle>
        <CardDescription>
          Discover how much home you can afford based on your income and debts
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Input Fields */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="annual-income">Annual Gross Income</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                  $
                </span>
                <Input
                  id="annual-income"
                  type="number"
                  value={income}
                  onChange={(e) => setIncome(e.target.value)}
                  className="pl-7"
                  placeholder="75000"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="monthly-debts">Monthly Debt Payments</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                  $
                </span>
                <Input
                  id="monthly-debts"
                  type="number"
                  value={monthlyDebts}
                  onChange={(e) => setMonthlyDebts(e.target.value)}
                  className="pl-7"
                  placeholder="500"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="down-payment">Down Payment</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                  $
                </span>
                <Input
                  id="down-payment"
                  type="number"
                  value={downPayment}
                  onChange={(e) => setDownPayment(e.target.value)}
                  className="pl-7"
                  placeholder="50000"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="interest-rate">Interest Rate</Label>
              <div className="relative">
                <Input
                  id="interest-rate"
                  type="number"
                  step="0.1"
                  value={interestRate}
                  onChange={(e) => setInterestRate(e.target.value)}
                  className="pr-7"
                  placeholder="6.5"
                />
                <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                  %
                </span>
              </div>
            </div>
          </div>

          {/* Results */}
          <div className="bg-gradient-to-br from-green-50 to-blue-50 rounded-lg p-6 space-y-4">
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-2">You Can Afford a Home Up To</p>
              <p className="text-4xl font-bold text-green-900">
                ${result.maxHomePrice.toLocaleString()}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white rounded-lg p-4 text-center">
                <p className="text-xs text-gray-600 mb-1">Max Monthly Payment</p>
                <p className="text-xl font-bold text-blue-900">
                  ${result.maxMonthlyPayment.toLocaleString()}
                </p>
              </div>

              <div className="bg-white rounded-lg p-4 text-center">
                <p className="text-xs text-gray-600 mb-1">Max Loan Amount</p>
                <p className="text-xl font-bold text-blue-900">
                  ${result.maxLoanAmount.toLocaleString()}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 p-3 bg-white rounded-lg">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              <div className="flex-1">
                <p className="text-sm font-semibold">Debt-to-Income Ratio</p>
                <p className="text-xs text-gray-600">
                  {result.debtToIncomeRatio}% (Recommended: Below 36%)
                </p>
              </div>
            </div>
          </div>

          {/* Tips */}
          <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg">
            <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
            <div className="text-sm">
              <p className="font-semibold text-blue-900 mb-1">Affordability Tips</p>
              <ul className="text-gray-700 space-y-1 list-disc list-inside">
                <li>This calculation uses the 28/36 rule for conservative estimates</li>
                <li>Consider additional costs: property taxes, insurance, HOA fees, maintenance</li>
                <li>A larger down payment reduces monthly payments and may eliminate PMI</li>
                <li>Pre-approval from a lender provides a more accurate affordability estimate</li>
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}