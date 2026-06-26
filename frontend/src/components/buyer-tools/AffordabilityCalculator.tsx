import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Calculator, DollarSign, TrendingUp, AlertCircle } from 'lucide-react';

export default function AffordabilityCalculator() {
  const [income, setIncome] = useState(120000);
  const [monthlyDebts, setMonthlyDebts] = useState(800);
  const [downPayment, setDownPayment] = useState(100000);
  const [interestRate, setInterestRate] = useState(7.5);
  const [results, setResults] = useState({
    maxLoanAmount: 0,
    maxHomePrice: 0,
    monthlyPayment: 0,
    debtToIncomeRatio: 0,
    recommended: false
  });

  const calculateAffordability = useCallback(() => {
    const monthlyIncome = income / 12;
    const maxMonthlyPayment = monthlyIncome * 0.28; // 28% rule
    const maxTotalDebt = monthlyIncome * 0.36; // 36% rule
    const availableForHousing = maxTotalDebt - monthlyDebts;
    
    const effectivePayment = Math.min(maxMonthlyPayment, availableForHousing);
    
    // Calculate max loan amount based on payment capacity
    const monthlyRate = interestRate / 100 / 12;
    const numPayments = 30 * 12;
    const maxLoanAmount = effectivePayment * (Math.pow(1 + monthlyRate, numPayments) - 1) / 
                         (monthlyRate * Math.pow(1 + monthlyRate, numPayments));
    
    const maxHomePrice = maxLoanAmount + downPayment;
    const debtToIncomeRatio = ((monthlyDebts + effectivePayment) / monthlyIncome) * 100;
    
    setResults({
      maxLoanAmount,
      maxHomePrice,
      monthlyPayment: effectivePayment,
      debtToIncomeRatio,
      recommended: debtToIncomeRatio <= 36
    });
  }, [income, monthlyDebts, downPayment, interestRate]);

  useEffect(() => {
    calculateAffordability();
  }, [calculateAffordability]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Calculator className="h-5 w-5" />
          <span>Home Affordability Calculator</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Input Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <Label htmlFor="annual-income">Annual Gross Income</Label>
              <Input
                id="annual-income"
                type="number"
                value={income}
                onChange={(e) => setIncome(Number(e.target.value))}
                placeholder="120000"
              />
            </div>
            
            <div>
              <Label htmlFor="monthly-debts">Monthly Debt Payments</Label>
              <Input
                id="monthly-debts"
                type="number"
                value={monthlyDebts}
                onChange={(e) => setMonthlyDebts(Number(e.target.value))}
                placeholder="800"
              />
              <p className="text-xs text-gray-500 mt-1">
                Credit cards, car loans, student loans, etc.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <Label htmlFor="down-payment">Down Payment</Label>
              <Input
                id="down-payment"
                type="number"
                value={downPayment}
                onChange={(e) => setDownPayment(Number(e.target.value))}
                placeholder="100000"
              />
            </div>
            
            <div>
              <Label htmlFor="interest-rate">Interest Rate (%)</Label>
              <Input
                id="interest-rate"
                type="number"
                step="0.1"
                value={interestRate}
                onChange={(e) => setInterestRate(Number(e.target.value))}
                placeholder="7.5"
              />
            </div>
          </div>
        </div>

        {/* Results Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Affordability Results</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-green-50 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-600">Max Home Price</p>
                  <p className="text-2xl font-bold text-green-900">
                    ${results.maxHomePrice.toLocaleString()}
                  </p>
                </div>
                <DollarSign className="h-8 w-8 text-green-600" />
              </div>
            </div>

            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-600">Max Loan Amount</p>
                  <p className="text-2xl font-bold text-blue-900">
                    ${results.maxLoanAmount.toLocaleString()}
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-blue-600" />
              </div>
            </div>

            <div className="p-4 bg-purple-50 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-purple-600">Monthly Payment</p>
                  <p className="text-2xl font-bold text-purple-900">
                    ${results.monthlyPayment.toLocaleString()}
                  </p>
                </div>
                <Calculator className="h-8 w-8 text-purple-600" />
              </div>
            </div>
          </div>

          {/* Debt-to-Income Ratio */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold text-gray-900">Debt-to-Income Ratio</h4>
              <span className={`font-bold ${
                results.debtToIncomeRatio <= 36 ? 'text-green-600' : 'text-red-600'
              }`}>
                {results.debtToIncomeRatio.toFixed(1)}%
              </span>
            </div>
            <Progress 
              value={Math.min(results.debtToIncomeRatio, 100)} 
              className="h-3 mb-2" 
            />
            <div className="flex items-center space-x-2 text-sm">
              {results.recommended ? (
                <div className="flex items-center space-x-1 text-green-600">
                  <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                  <span>Recommended (≤36%)</span>
                </div>
              ) : (
                <div className="flex items-center space-x-1 text-red-600">
                  <AlertCircle className="h-4 w-4" />
                  <span>Above recommended limit (36%)</span>
                </div>
              )}
            </div>
          </div>

          {/* Breakdown */}
          <div className="p-4 bg-blue-50 rounded-lg">
            <h4 className="font-semibold text-blue-900 mb-3">Monthly Budget Breakdown</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-blue-700">Gross Monthly Income</span>
                <span className="font-semibold text-blue-900">
                  ${(income / 12).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-blue-700">Existing Debt Payments</span>
                <span className="font-semibold text-blue-900">
                  ${monthlyDebts.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-blue-700">Recommended Housing Payment</span>
                <span className="font-semibold text-blue-900">
                  ${results.monthlyPayment.toLocaleString()}
                </span>
              </div>
              <div className="border-t border-blue-200 pt-2 mt-2">
                <div className="flex justify-between">
                  <span className="text-blue-700">Remaining Income</span>
                  <span className="font-semibold text-blue-900">
                    ${((income / 12) - monthlyDebts - results.monthlyPayment).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex space-x-3">
          <Button className="flex-1">
            Get Pre-approved
          </Button>
          <Button variant="outline" className="flex-1">
            Find Properties
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}