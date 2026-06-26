import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import {
  TrendingUp,
  DollarSign,
  Home,
  Calculator,
  PieChart,
  BarChart3,
  TrendingDown,
  AlertCircle,
  CheckCircle2,
  Info,
} from 'lucide-react';

interface InvestmentCalculation {
  purchasePrice: number;
  downPayment: number;
  loanAmount: number;
  interestRate: number;
  loanTerm: number;
  monthlyMortgage: number;
  propertyTax: number;
  insurance: number;
  hoa: number;
  maintenance: number;
  totalMonthlyExpenses: number;
  rentalIncome: number;
  monthlyCashFlow: number;
  annualCashFlow: number;
  cashOnCashReturn: number;
  capRate: number;
  roi: number;
  breakEvenPoint: number;
  appreciationRate: number;
  futureValue5Year: number;
  futureValue10Year: number;
  totalReturn5Year: number;
  totalReturn10Year: number;
}

export function InvestmentAnalysis() {
  const [formData, setFormData] = useState({
    purchasePrice: '500000',
    downPaymentPercent: '20',
    interestRate: '6.5',
    loanTerm: '30',
    propertyTax: '6000',
    insurance: '1200',
    hoa: '200',
    maintenancePercent: '1',
    rentalIncome: '3000',
    appreciationRate: '3',
    vacancyRate: '5',
  });

  const [calculation, setCalculation] = useState<InvestmentCalculation | null>(null);
  const [showResults, setShowResults] = useState(false);

  const calculateInvestment = () => {
    const purchasePrice = parseFloat(formData.purchasePrice);
    const downPaymentPercent = parseFloat(formData.downPaymentPercent);
    const interestRate = parseFloat(formData.interestRate);
    const loanTerm = parseFloat(formData.loanTerm);
    const propertyTax = parseFloat(formData.propertyTax);
    const insurance = parseFloat(formData.insurance);
    const hoa = parseFloat(formData.hoa);
    const maintenancePercent = parseFloat(formData.maintenancePercent);
    const rentalIncome = parseFloat(formData.rentalIncome);
    const appreciationRate = parseFloat(formData.appreciationRate);
    const vacancyRate = parseFloat(formData.vacancyRate);

    // Calculate loan details
    const downPayment = purchasePrice * (downPaymentPercent / 100);
    const loanAmount = purchasePrice - downPayment;
    const monthlyRate = interestRate / 100 / 12;
    const numberOfPayments = loanTerm * 12;
    const monthlyMortgage =
      (loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, numberOfPayments))) /
      (Math.pow(1 + monthlyRate, numberOfPayments) - 1);

    // Calculate monthly expenses
    const monthlyPropertyTax = propertyTax / 12;
    const monthlyInsurance = insurance / 12;
    const monthlyMaintenance = (purchasePrice * (maintenancePercent / 100)) / 12;
    const totalMonthlyExpenses =
      monthlyMortgage + monthlyPropertyTax + monthlyInsurance + hoa + monthlyMaintenance;

    // Calculate rental income with vacancy
    const effectiveRentalIncome = rentalIncome * (1 - vacancyRate / 100);

    // Calculate cash flow
    const monthlyCashFlow = effectiveRentalIncome - totalMonthlyExpenses;
    const annualCashFlow = monthlyCashFlow * 12;

    // Calculate returns
    const totalCashInvested = downPayment + purchasePrice * 0.03; // Including closing costs
    const cashOnCashReturn = (annualCashFlow / totalCashInvested) * 100;
    const annualNetOperatingIncome =
      effectiveRentalIncome * 12 - (monthlyPropertyTax + monthlyInsurance + hoa + monthlyMaintenance) * 12;
    const capRate = (annualNetOperatingIncome / purchasePrice) * 100;

    // Calculate appreciation
    const futureValue5Year = purchasePrice * Math.pow(1 + appreciationRate / 100, 5);
    const futureValue10Year = purchasePrice * Math.pow(1 + appreciationRate / 100, 10);
    const equity5Year = futureValue5Year - loanAmount + annualCashFlow * 5;
    const equity10Year = futureValue10Year - loanAmount + annualCashFlow * 10;
    const totalReturn5Year = ((equity5Year - totalCashInvested) / totalCashInvested) * 100;
    const totalReturn10Year = ((equity10Year - totalCashInvested) / totalCashInvested) * 100;

    // Calculate break-even
    const breakEvenPoint = totalCashInvested / Math.abs(annualCashFlow);

    const result: InvestmentCalculation = {
      purchasePrice,
      downPayment,
      loanAmount,
      interestRate,
      loanTerm,
      monthlyMortgage,
      propertyTax: monthlyPropertyTax,
      insurance: monthlyInsurance,
      hoa,
      maintenance: monthlyMaintenance,
      totalMonthlyExpenses,
      rentalIncome: effectiveRentalIncome,
      monthlyCashFlow,
      annualCashFlow,
      cashOnCashReturn,
      capRate,
      roi: totalReturn5Year,
      breakEvenPoint,
      appreciationRate,
      futureValue5Year,
      futureValue10Year,
      totalReturn5Year,
      totalReturn10Year,
    };

    setCalculation(result);
    setShowResults(true);
  };

  const getReturnColor = (value: number) => {
    if (value >= 10) return 'text-green-600';
    if (value >= 5) return 'text-blue-600';
    if (value >= 0) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getReturnBadge = (value: number) => {
    if (value >= 10) return 'bg-green-600';
    if (value >= 5) return 'bg-blue-600';
    if (value >= 0) return 'bg-yellow-600';
    return 'bg-red-600';
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Investment Property Analysis
          </CardTitle>
          <CardDescription>
            Calculate ROI, cash flow, and long-term returns for investment properties
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Input Form */}
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Home className="w-5 h-5 text-blue-600" />
                  Property Details
                </h3>
                <div className="space-y-4">
                  <div>
                    <Label>Purchase Price</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        type="number"
                        value={formData.purchasePrice}
                        onChange={(e) =>
                          setFormData({ ...formData, purchasePrice: e.target.value })
                        }
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Down Payment (%)</Label>
                    <Input
                      type="number"
                      value={formData.downPaymentPercent}
                      onChange={(e) =>
                        setFormData({ ...formData, downPaymentPercent: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label>Interest Rate (%)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={formData.interestRate}
                      onChange={(e) =>
                        setFormData({ ...formData, interestRate: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label>Loan Term (years)</Label>
                    <Select
                      value={formData.loanTerm}
                      onValueChange={(value) => setFormData({ ...formData, loanTerm: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="15">15 years</SelectItem>
                        <SelectItem value="20">20 years</SelectItem>
                        <SelectItem value="30">30 years</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Calculator className="w-5 h-5 text-blue-600" />
                  Operating Expenses
                </h3>
                <div className="space-y-4">
                  <div>
                    <Label>Annual Property Tax</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        type="number"
                        value={formData.propertyTax}
                        onChange={(e) =>
                          setFormData({ ...formData, propertyTax: e.target.value })
                        }
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Annual Insurance</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        type="number"
                        value={formData.insurance}
                        onChange={(e) =>
                          setFormData({ ...formData, insurance: e.target.value })
                        }
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Monthly HOA Fees</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        type="number"
                        value={formData.hoa}
                        onChange={(e) => setFormData({ ...formData, hoa: e.target.value })}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Maintenance (% of property value)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={formData.maintenancePercent}
                      onChange={(e) =>
                        setFormData({ ...formData, maintenancePercent: e.target.value })
                      }
                    />
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-blue-600" />
                  Income & Growth
                </h3>
                <div className="space-y-4">
                  <div>
                    <Label>Monthly Rental Income</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        type="number"
                        value={formData.rentalIncome}
                        onChange={(e) =>
                          setFormData({ ...formData, rentalIncome: e.target.value })
                        }
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Vacancy Rate (%)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={formData.vacancyRate}
                      onChange={(e) =>
                        setFormData({ ...formData, vacancyRate: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label>Annual Appreciation Rate (%)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={formData.appreciationRate}
                      onChange={(e) =>
                        setFormData({ ...formData, appreciationRate: e.target.value })
                      }
                    />
                  </div>
                </div>
              </div>

              <Button
                onClick={calculateInvestment}
                className="w-full bg-blue-600 hover:bg-blue-700"
                size="lg"
              >
                <Calculator className="w-5 h-5 mr-2" />
                Calculate Investment Returns
              </Button>
            </div>

            {/* Results */}
            <div>
              {!showResults ? (
                <Card className="h-full flex items-center justify-center">
                  <CardContent className="text-center p-12">
                    <BarChart3 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-600 mb-2">Enter property details to calculate</p>
                    <p className="text-sm text-gray-500">
                      Fill in the form and click "Calculate" to see your investment analysis
                    </p>
                  </CardContent>
                </Card>
              ) : calculation ? (
                <div className="space-y-4">
                  {/* Key Metrics */}
                  <Card className="bg-gradient-to-br from-blue-50 to-purple-50 border-2 border-blue-200">
                    <CardHeader>
                      <CardTitle className="text-lg">Key Investment Metrics</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center p-4 bg-white rounded-lg">
                          <p className="text-sm text-gray-600 mb-1">Cash on Cash Return</p>
                          <p className={`text-3xl font-bold ${getReturnColor(calculation.cashOnCashReturn)}`}>
                            {calculation.cashOnCashReturn.toFixed(2)}%
                          </p>
                        </div>
                        <div className="text-center p-4 bg-white rounded-lg">
                          <p className="text-sm text-gray-600 mb-1">Cap Rate</p>
                          <p className={`text-3xl font-bold ${getReturnColor(calculation.capRate)}`}>
                            {calculation.capRate.toFixed(2)}%
                          </p>
                        </div>
                      </div>
                      <div className="text-center p-4 bg-white rounded-lg">
                        <p className="text-sm text-gray-600 mb-1">Monthly Cash Flow</p>
                        <p
                          className={`text-3xl font-bold ${
                            calculation.monthlyCashFlow >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}
                        >
                          ${calculation.monthlyCashFlow.toFixed(2)}
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Cash Flow Analysis */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <PieChart className="w-5 h-5" />
                        Monthly Cash Flow Breakdown
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between items-center p-2 bg-green-50 rounded">
                        <span className="text-sm text-gray-600">Rental Income</span>
                        <span className="font-semibold text-green-600">
                          +${calculation.rentalIncome.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center p-2 bg-red-50 rounded">
                        <span className="text-sm text-gray-600">Mortgage Payment</span>
                        <span className="font-semibold text-red-600">
                          -${calculation.monthlyMortgage.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center p-2 bg-red-50 rounded">
                        <span className="text-sm text-gray-600">Property Tax</span>
                        <span className="font-semibold text-red-600">
                          -${calculation.propertyTax.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center p-2 bg-red-50 rounded">
                        <span className="text-sm text-gray-600">Insurance</span>
                        <span className="font-semibold text-red-600">
                          -${calculation.insurance.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center p-2 bg-red-50 rounded">
                        <span className="text-sm text-gray-600">HOA Fees</span>
                        <span className="font-semibold text-red-600">
                          -${calculation.hoa.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center p-2 bg-red-50 rounded">
                        <span className="text-sm text-gray-600">Maintenance</span>
                        <span className="font-semibold text-red-600">
                          -${calculation.maintenance.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-blue-100 rounded border-2 border-blue-300">
                        <span className="font-semibold">Net Monthly Cash Flow</span>
                        <span
                          className={`font-bold text-lg ${
                            calculation.monthlyCashFlow >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}
                        >
                          ${calculation.monthlyCashFlow.toFixed(2)}
                        </span>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Long-term Projections */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <TrendingUp className="w-5 h-5" />
                        Long-term Projections
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-blue-50 rounded-lg">
                          <p className="text-sm text-gray-600 mb-2">5-Year Value</p>
                          <p className="text-xl font-bold text-blue-900">
                            ${(calculation.futureValue5Year / 1000).toFixed(0)}K
                          </p>
                          <Badge className={`mt-2 ${getReturnBadge(calculation.totalReturn5Year)}`}>
                            ROI: {calculation.totalReturn5Year.toFixed(1)}%
                          </Badge>
                        </div>
                        <div className="p-4 bg-purple-50 rounded-lg">
                          <p className="text-sm text-gray-600 mb-2">10-Year Value</p>
                          <p className="text-xl font-bold text-purple-900">
                            ${(calculation.futureValue10Year / 1000).toFixed(0)}K
                          </p>
                          <Badge className={`mt-2 ${getReturnBadge(calculation.totalReturn10Year)}`}>
                            ROI: {calculation.totalReturn10Year.toFixed(1)}%
                          </Badge>
                        </div>
                      </div>
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-600 mb-2">Annual Cash Flow</p>
                        <p
                          className={`text-2xl font-bold ${
                            calculation.annualCashFlow >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}
                        >
                          ${calculation.annualCashFlow.toFixed(2)}
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Investment Summary */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Info className="w-5 h-5" />
                        Investment Summary
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Purchase Price:</span>
                        <span className="font-semibold">
                          ${calculation.purchasePrice.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Down Payment:</span>
                        <span className="font-semibold">
                          ${calculation.downPayment.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Loan Amount:</span>
                        <span className="font-semibold">
                          ${calculation.loanAmount.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Interest Rate:</span>
                        <span className="font-semibold">{calculation.interestRate}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Loan Term:</span>
                        <span className="font-semibold">{calculation.loanTerm} years</span>
                      </div>
                      {calculation.breakEvenPoint > 0 && (
                        <div className="flex justify-between pt-3 border-t">
                          <span className="text-gray-600">Break-even Point:</span>
                          <span className="font-semibold">
                            {calculation.breakEvenPoint.toFixed(1)} years
                          </span>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Investment Advice */}
                  <Card
                    className={
                      calculation.cashOnCashReturn >= 8
                        ? 'bg-green-50 border-green-200'
                        : calculation.cashOnCashReturn >= 5
                        ? 'bg-blue-50 border-blue-200'
                        : 'bg-yellow-50 border-yellow-200'
                    }
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        {calculation.cashOnCashReturn >= 8 ? (
                          <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
                        ) : calculation.cashOnCashReturn >= 5 ? (
                          <Info className="w-5 h-5 text-blue-600 mt-0.5" />
                        ) : (
                          <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                        )}
                        <div>
                          <p className="font-semibold mb-1">
                            {calculation.cashOnCashReturn >= 8
                              ? 'Excellent Investment Opportunity'
                              : calculation.cashOnCashReturn >= 5
                              ? 'Good Investment Potential'
                              : 'Consider Your Options'}
                          </p>
                          <p className="text-sm text-gray-700">
                            {calculation.cashOnCashReturn >= 8
                              ? 'This property shows strong cash flow and return metrics. It could be a solid investment opportunity.'
                              : calculation.cashOnCashReturn >= 5
                              ? 'This property has decent returns. Consider market conditions and your investment goals.'
                              : 'The returns are modest. Evaluate if this aligns with your investment strategy and risk tolerance.'}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ) : null}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}