import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Calculator,
  BarChart3,
  PieChart,
  Home,
  MapPin
} from 'lucide-react';

export default function PropertyAnalysis() {
  const [analysisData, setAnalysisData] = useState({
    address: '123 Main Street, Norfolk, VA',
    purchasePrice: 250000,
    downPayment: 50000,
    loanAmount: 200000,
    interestRate: 6.5,
    loanTerm: 30,
    monthlyRent: 2200,
    expenses: {
      propertyTax: 2400,
      insurance: 1200,
      maintenance: 1800,
      vacancy: 1320,
      management: 2640
    }
  });

  const [results, setResults] = useState(null);

  const calculateAnalysis = () => {
    const monthlyPayment = calculateMortgagePayment(
      analysisData.loanAmount,
      analysisData.interestRate / 100 / 12,
      analysisData.loanTerm * 12
    );

    const annualIncome = analysisData.monthlyRent * 12;
    const totalExpenses = Object.values(analysisData.expenses).reduce((sum, expense) => sum + expense, 0);
    const annualDebtService = monthlyPayment * 12;
    const netOperatingIncome = annualIncome - totalExpenses;
    const cashFlow = netOperatingIncome - annualDebtService;
    const capRate = (netOperatingIncome / analysisData.purchasePrice) * 100;
    const cashOnCashReturn = (cashFlow / analysisData.downPayment) * 100;
    const totalReturn = cashOnCashReturn + 3; // Assuming 3% appreciation

    setResults({
      monthlyPayment,
      annualIncome,
      totalExpenses,
      netOperatingIncome,
      cashFlow,
      capRate,
      cashOnCashReturn,
      totalReturn,
      onePercentRule: (analysisData.monthlyRent / analysisData.purchasePrice) * 100,
      debtServiceCoverage: netOperatingIncome / annualDebtService
    });
  };

  const calculateMortgagePayment = (principal, monthlyRate, numPayments) => {
    if (monthlyRate === 0) return principal / numPayments;
    return principal * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / 
           (Math.pow(1 + monthlyRate, numPayments) - 1);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatPercentage = (value) => {
    return `${value.toFixed(2)}%`;
  };

  return (
    <section className="py-16 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Property Investment Analysis
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Analyze potential investment properties with comprehensive financial metrics and projections
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Input Form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Calculator className="h-5 w-5 mr-2" />
                Property Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="address">Property Address</Label>
                <Input
                  id="address"
                  value={analysisData.address}
                  onChange={(e) => setAnalysisData({...analysisData, address: e.target.value})}
                  placeholder="Enter property address"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="purchasePrice">Purchase Price</Label>
                  <Input
                    id="purchasePrice"
                    type="number"
                    value={analysisData.purchasePrice}
                    onChange={(e) => setAnalysisData({...analysisData, purchasePrice: Number(e.target.value)})}
                  />
                </div>
                <div>
                  <Label htmlFor="downPayment">Down Payment</Label>
                  <Input
                    id="downPayment"
                    type="number"
                    value={analysisData.downPayment}
                    onChange={(e) => setAnalysisData({...analysisData, downPayment: Number(e.target.value)})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="interestRate">Interest Rate (%)</Label>
                  <Input
                    id="interestRate"
                    type="number"
                    step="0.1"
                    value={analysisData.interestRate}
                    onChange={(e) => setAnalysisData({...analysisData, interestRate: Number(e.target.value)})}
                  />
                </div>
                <div>
                  <Label htmlFor="loanTerm">Loan Term (years)</Label>
                  <Input
                    id="loanTerm"
                    type="number"
                    value={analysisData.loanTerm}
                    onChange={(e) => setAnalysisData({...analysisData, loanTerm: Number(e.target.value)})}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="monthlyRent">Monthly Rent</Label>
                <Input
                  id="monthlyRent"
                  type="number"
                  value={analysisData.monthlyRent}
                  onChange={(e) => setAnalysisData({...analysisData, monthlyRent: Number(e.target.value)})}
                />
              </div>

              <div className="space-y-2">
                <Label>Annual Expenses</Label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label htmlFor="propertyTax" className="text-sm">Property Tax</Label>
                    <Input
                      id="propertyTax"
                      type="number"
                      value={analysisData.expenses.propertyTax}
                      onChange={(e) => setAnalysisData({
                        ...analysisData,
                        expenses: {...analysisData.expenses, propertyTax: Number(e.target.value)}
                      })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="insurance" className="text-sm">Insurance</Label>
                    <Input
                      id="insurance"
                      type="number"
                      value={analysisData.expenses.insurance}
                      onChange={(e) => setAnalysisData({
                        ...analysisData,
                        expenses: {...analysisData.expenses, insurance: Number(e.target.value)}
                      })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="maintenance" className="text-sm">Maintenance</Label>
                    <Input
                      id="maintenance"
                      type="number"
                      value={analysisData.expenses.maintenance}
                      onChange={(e) => setAnalysisData({
                        ...analysisData,
                        expenses: {...analysisData.expenses, maintenance: Number(e.target.value)}
                      })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="vacancy" className="text-sm">Vacancy</Label>
                    <Input
                      id="vacancy"
                      type="number"
                      value={analysisData.expenses.vacancy}
                      onChange={(e) => setAnalysisData({
                        ...analysisData,
                        expenses: {...analysisData.expenses, vacancy: Number(e.target.value)}
                      })}
                    />
                  </div>
                </div>
              </div>

              <Button onClick={calculateAnalysis} className="w-full">
                Calculate Analysis
              </Button>
            </CardContent>
          </Card>

          {/* Results */}
          <div className="space-y-6">
            {results ? (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <BarChart3 className="h-5 w-5 mr-2" />
                      Investment Metrics
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-4 bg-blue-50 rounded-lg">
                        <div className="text-2xl font-bold text-blue-600">
                          {formatPercentage(results.capRate)}
                        </div>
                        <div className="text-sm text-gray-600">Cap Rate</div>
                      </div>
                      <div className="text-center p-4 bg-green-50 rounded-lg">
                        <div className="text-2xl font-bold text-green-600">
                          {formatPercentage(results.cashOnCashReturn)}
                        </div>
                        <div className="text-sm text-gray-600">Cash-on-Cash Return</div>
                      </div>
                      <div className="text-center p-4 bg-purple-50 rounded-lg">
                        <div className="text-2xl font-bold text-purple-600">
                          {formatPercentage(results.totalReturn)}
                        </div>
                        <div className="text-sm text-gray-600">Total Return</div>
                      </div>
                      <div className="text-center p-4 bg-orange-50 rounded-lg">
                        <div className="text-2xl font-bold text-orange-600">
                          {formatPercentage(results.onePercentRule)}
                        </div>
                        <div className="text-sm text-gray-600">1% Rule</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <DollarSign className="h-5 w-5 mr-2" />
                      Cash Flow Analysis
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Annual Income</span>
                        <span className="font-semibold">{formatCurrency(results.annualIncome)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total Expenses</span>
                        <span className="font-semibold text-red-600">-{formatCurrency(results.totalExpenses)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Debt Service</span>
                        <span className="font-semibold text-red-600">-{formatCurrency(results.monthlyPayment * 12)}</span>
                      </div>
                      <hr />
                      <div className="flex justify-between text-lg font-bold">
                        <span>Monthly Cash Flow</span>
                        <span className={results.cashFlow > 0 ? 'text-green-600' : 'text-red-600'}>
                          {formatCurrency(results.cashFlow / 12)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Annual Cash Flow</span>
                        <span className={results.cashFlow > 0 ? 'text-green-600' : 'text-red-600'}>
                          {formatCurrency(results.cashFlow)}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Investment Quality</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span>Cap Rate</span>
                        <Badge className={results.capRate >= 8 ? 'bg-green-100 text-green-800' : results.capRate >= 6 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}>
                          {results.capRate >= 8 ? 'Excellent' : results.capRate >= 6 ? 'Good' : 'Poor'}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Cash Flow</span>
                        <Badge className={results.cashFlow > 200 ? 'bg-green-100 text-green-800' : results.cashFlow > 0 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}>
                          {results.cashFlow > 200 ? 'Strong' : results.cashFlow > 0 ? 'Positive' : 'Negative'}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>1% Rule</span>
                        <Badge className={results.onePercentRule >= 1 ? 'bg-green-100 text-green-800' : results.onePercentRule >= 0.8 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}>
                          {results.onePercentRule >= 1 ? 'Meets Rule' : results.onePercentRule >= 0.8 ? 'Close' : 'Below Rule'}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card>
                <CardContent className="text-center py-12">
                  <PieChart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Ready to Analyze
                  </h3>
                  <p className="text-gray-600">
                    Enter your property details and click "Calculate Analysis" to see comprehensive investment metrics
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Market Insights */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <TrendingUp className="h-8 w-8 text-green-500" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Market Trend</p>
                  <p className="text-2xl font-bold text-gray-900">+5.2%</p>
                  <p className="text-sm text-green-600">Year over year</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Home className="h-8 w-8 text-blue-500" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Avg. Cap Rate</p>
                  <p className="text-2xl font-bold text-gray-900">7.8%</p>
                  <p className="text-sm text-blue-600">Norfolk area</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <MapPin className="h-8 w-8 text-purple-500" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Rental Demand</p>
                  <p className="text-2xl font-bold text-gray-900">High</p>
                  <p className="text-sm text-purple-600">95% occupancy</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}