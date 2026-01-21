import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Calculator,
  TrendingUp,
  DollarSign,
  Percent,
  Calendar,
  PieChart,
  BarChart3,
  Target,
  AlertCircle,
  CheckCircle,
  Info
} from 'lucide-react';

interface InvestmentCalculatorProps {
  propertyPrice: number;
  propertyType?: string;
  location?: string;
}

export default function InvestmentCalculator({ 
  propertyPrice, 
  propertyType = 'Single Family',
  location = 'Virginia Beach, VA'
}: InvestmentCalculatorProps) {
  // Investment Parameters
  const [purchasePrice, setPurchasePrice] = useState(propertyPrice);
  const [downPayment, setDownPayment] = useState(propertyPrice * 0.25);
  const [interestRate, setInterestRate] = useState(6.5);
  const [loanTerm, setLoanTerm] = useState(30);
  const [closingCosts, setClosingCosts] = useState(propertyPrice * 0.03);
  const [renovationCosts, setRenovationCosts] = useState(15000);
  
  // Rental Income & Expenses
  const [monthlyRent, setMonthlyRent] = useState(Math.round(propertyPrice * 0.001));
  const [vacancyRate, setVacancyRate] = useState(5);
  const [propertyTaxes, setPropertyTaxes] = useState(propertyPrice * 0.012 / 12);
  const [insurance, setInsurance] = useState(150);
  const [maintenance, setMaintenance] = useState(200);
  const [propertyManagement, setPropertyManagement] = useState(0);
  const [otherExpenses, setOtherExpenses] = useState(100);
  
  // Investment Goals
  const [holdingPeriod, setHoldingPeriod] = useState(10);
  const [appreciationRate, setAppreciationRate] = useState(3.5);
  const [rentGrowthRate, setRentGrowthRate] = useState(2.5);
  
  // Advanced Parameters
  const [capitalGainsTaxRate, setCapitalGainsTaxRate] = useState(15);
  const [depreciationPeriod, setDepreciationPeriod] = useState(27.5);
  const [marginalTaxRate, setMarginalTaxRate] = useState(24);

  // Calculations
  const loanAmount = purchasePrice - downPayment;
  const monthlyInterestRate = interestRate / 100 / 12;
  const numberOfPayments = loanTerm * 12;
  
  const monthlyMortgage = loanAmount > 0 
    ? loanAmount * (monthlyInterestRate * Math.pow(1 + monthlyInterestRate, numberOfPayments)) / 
      (Math.pow(1 + monthlyInterestRate, numberOfPayments) - 1)
    : 0;

  const effectiveMonthlyRent = monthlyRent * (1 - vacancyRate / 100);
  const totalMonthlyExpenses = monthlyMortgage + propertyTaxes + insurance + maintenance + 
                              propertyManagement + otherExpenses;
  const monthlyCashFlow = effectiveMonthlyRent - totalMonthlyExpenses;
  const annualCashFlow = monthlyCashFlow * 12;

  // Investment Metrics
  const totalCashInvested = downPayment + closingCosts + renovationCosts;
  const cashOnCashReturn = totalCashInvested > 0 ? (annualCashFlow / totalCashInvested) * 100 : 0;
  const capRate = ((effectiveMonthlyRent * 12) - (totalMonthlyExpenses - monthlyMortgage) * 12) / purchasePrice * 100;
  const onePercentRule = (monthlyRent / purchasePrice) * 100;
  
  // Future Value Calculations
  const futurePropertyValue = purchasePrice * Math.pow(1 + appreciationRate / 100, holdingPeriod);
  const totalAppreciation = futurePropertyValue - purchasePrice;
  const totalRentReceived = calculateTotalRentReceived();
  const totalMortgagePaid = monthlyMortgage * 12 * holdingPeriod;
  const remainingLoanBalance = calculateRemainingLoanBalance();
  const equity = futurePropertyValue - remainingLoanBalance;
  
  // Tax Benefits
  const annualDepreciation = (purchasePrice - (purchasePrice * 0.2)) / depreciationPeriod; // Assuming 20% land value
  const annualTaxSavings = annualDepreciation * (marginalTaxRate / 100);
  
  // Total Return Calculation
  const totalCashFlowReceived = calculateTotalCashFlow();
  const capitalGainsTax = totalAppreciation * (capitalGainsTaxRate / 100);
  const netProceeds = equity - capitalGainsTax;
  const totalReturn = netProceeds + totalCashFlowReceived - totalCashInvested;
  const totalReturnPercentage = (totalReturn / totalCashInvested) * 100;
  const annualizedReturn = Math.pow(1 + totalReturnPercentage / 100, 1 / holdingPeriod) - 1;

  function calculateTotalRentReceived() {
    let total = 0;
    let currentRent = monthlyRent;
    for (let year = 1; year <= holdingPeriod; year++) {
      total += currentRent * 12 * (1 - vacancyRate / 100);
      currentRent *= (1 + rentGrowthRate / 100);
    }
    return total;
  }

  function calculateRemainingLoanBalance() {
    if (loanAmount === 0) return 0;
    const paymentsRemaining = numberOfPayments - (holdingPeriod * 12);
    if (paymentsRemaining <= 0) return 0;
    
    return loanAmount * Math.pow(1 + monthlyInterestRate, holdingPeriod * 12) - 
           monthlyMortgage * ((Math.pow(1 + monthlyInterestRate, holdingPeriod * 12) - 1) / monthlyInterestRate);
  }

  function calculateTotalCashFlow() {
    let total = 0;
    let currentRent = monthlyRent;
    let currentExpenses = totalMonthlyExpenses - monthlyMortgage; // Excluding mortgage from growing expenses
    
    for (let year = 1; year <= holdingPeriod; year++) {
      const yearlyRent = currentRent * 12 * (1 - vacancyRate / 100);
      const yearlyExpenses = (currentExpenses * 12) + (monthlyMortgage * 12);
      total += yearlyRent - yearlyExpenses;
      
      currentRent *= (1 + rentGrowthRate / 100);
      currentExpenses *= (1 + 0.02); // Assuming 2% expense growth
    }
    return total;
  }

  const getRiskLevel = () => {
    if (cashOnCashReturn < 5) return { level: 'High Risk', color: 'bg-red-100 text-red-800', icon: AlertCircle };
    if (cashOnCashReturn < 8) return { level: 'Medium Risk', color: 'bg-yellow-100 text-yellow-800', icon: Info };
    return { level: 'Low Risk', color: 'bg-green-100 text-green-800', icon: CheckCircle };
  };

  const risk = getRiskLevel();

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Calculator className="h-5 w-5 mr-2 text-blue-600" />
          Investment Calculator
          <Badge className={`ml-auto ${risk.color}`}>
            <risk.icon className="h-3 w-3 mr-1" />
            {risk.level}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="basic">Basic</TabsTrigger>
            <TabsTrigger value="advanced">Advanced</TabsTrigger>
            <TabsTrigger value="projections">Projections</TabsTrigger>
            <TabsTrigger value="analysis">Analysis</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Purchase Details */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Purchase Details</h3>
                
                <div>
                  <Label htmlFor="purchase-price">Purchase Price</Label>
                  <Input
                    id="purchase-price"
                    type="number"
                    value={purchasePrice}
                    onChange={(e) => setPurchasePrice(Number(e.target.value))}
                  />
                </div>

                <div>
                  <Label htmlFor="down-payment">Down Payment</Label>
                  <Input
                    id="down-payment"
                    type="number"
                    value={downPayment}
                    onChange={(e) => setDownPayment(Number(e.target.value))}
                  />
                  <div className="text-sm text-gray-600 mt-1">
                    {((downPayment / purchasePrice) * 100).toFixed(1)}% of purchase price
                  </div>
                </div>

                <div>
                  <Label htmlFor="interest-rate">Interest Rate (%)</Label>
                  <div className="px-3">
                    <Slider
                      value={[interestRate]}
                      onValueChange={(value) => setInterestRate(value[0])}
                      max={12}
                      min={3}
                      step={0.1}
                      className="w-full"
                    />
                    <div className="flex justify-between text-sm text-gray-600 mt-1">
                      <span>3%</span>
                      <span>{interestRate}%</span>
                      <span>12%</span>
                    </div>
                  </div>
                </div>

                <div>
                  <Label htmlFor="closing-costs">Closing Costs</Label>
                  <Input
                    id="closing-costs"
                    type="number"
                    value={closingCosts}
                    onChange={(e) => setClosingCosts(Number(e.target.value))}
                  />
                </div>
              </div>

              {/* Rental Income */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Rental Income & Expenses</h3>
                
                <div>
                  <Label htmlFor="monthly-rent">Monthly Rent</Label>
                  <Input
                    id="monthly-rent"
                    type="number"
                    value={monthlyRent}
                    onChange={(e) => setMonthlyRent(Number(e.target.value))}
                  />
                </div>

                <div>
                  <Label htmlFor="vacancy-rate">Vacancy Rate (%)</Label>
                  <div className="px-3">
                    <Slider
                      value={[vacancyRate]}
                      onValueChange={(value) => setVacancyRate(value[0])}
                      max={20}
                      min={0}
                      step={1}
                      className="w-full"
                    />
                    <div className="flex justify-between text-sm text-gray-600 mt-1">
                      <span>0%</span>
                      <span>{vacancyRate}%</span>
                      <span>20%</span>
                    </div>
                  </div>
                </div>

                <div>
                  <Label htmlFor="property-taxes">Monthly Property Taxes</Label>
                  <Input
                    id="property-taxes"
                    type="number"
                    value={propertyTaxes}
                    onChange={(e) => setPropertyTaxes(Number(e.target.value))}
                  />
                </div>

                <div>
                  <Label htmlFor="insurance">Monthly Insurance</Label>
                  <Input
                    id="insurance"
                    type="number"
                    value={insurance}
                    onChange={(e) => setInsurance(Number(e.target.value))}
                  />
                </div>

                <div>
                  <Label htmlFor="maintenance">Monthly Maintenance</Label>
                  <Input
                    id="maintenance"
                    type="number"
                    value={maintenance}
                    onChange={(e) => setMaintenance(Number(e.target.value))}
                  />
                </div>
              </div>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-6 border-t">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <DollarSign className="h-6 w-6 mx-auto mb-2 text-blue-600" />
                <div className="text-2xl font-bold text-blue-600">
                  ${monthlyCashFlow.toLocaleString()}
                </div>
                <div className="text-sm text-gray-600">Monthly Cash Flow</div>
              </div>
              
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <Percent className="h-6 w-6 mx-auto mb-2 text-green-600" />
                <div className="text-2xl font-bold text-green-600">
                  {cashOnCashReturn.toFixed(1)}%
                </div>
                <div className="text-sm text-gray-600">Cash-on-Cash Return</div>
              </div>
              
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <Target className="h-6 w-6 mx-auto mb-2 text-purple-600" />
                <div className="text-2xl font-bold text-purple-600">
                  {capRate.toFixed(1)}%
                </div>
                <div className="text-sm text-gray-600">Cap Rate</div>
              </div>
              
              <div className="text-center p-4 bg-orange-50 rounded-lg">
                <TrendingUp className="h-6 w-6 mx-auto mb-2 text-orange-600" />
                <div className="text-2xl font-bold text-orange-600">
                  {onePercentRule.toFixed(2)}%
                </div>
                <div className="text-sm text-gray-600">1% Rule</div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="advanced" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Investment Parameters</h3>
                
                <div>
                  <Label htmlFor="holding-period">Holding Period (years)</Label>
                  <div className="px-3">
                    <Slider
                      value={[holdingPeriod]}
                      onValueChange={(value) => setHoldingPeriod(value[0])}
                      max={30}
                      min={1}
                      step={1}
                      className="w-full"
                    />
                    <div className="flex justify-between text-sm text-gray-600 mt-1">
                      <span>1 year</span>
                      <span>{holdingPeriod} years</span>
                      <span>30 years</span>
                    </div>
                  </div>
                </div>

                <div>
                  <Label htmlFor="appreciation-rate">Annual Appreciation Rate (%)</Label>
                  <div className="px-3">
                    <Slider
                      value={[appreciationRate]}
                      onValueChange={(value) => setAppreciationRate(value[0])}
                      max={8}
                      min={0}
                      step={0.1}
                      className="w-full"
                    />
                    <div className="flex justify-between text-sm text-gray-600 mt-1">
                      <span>0%</span>
                      <span>{appreciationRate}%</span>
                      <span>8%</span>
                    </div>
                  </div>
                </div>

                <div>
                  <Label htmlFor="rent-growth">Annual Rent Growth (%)</Label>
                  <div className="px-3">
                    <Slider
                      value={[rentGrowthRate]}
                      onValueChange={(value) => setRentGrowthRate(value[0])}
                      max={6}
                      min={0}
                      step={0.1}
                      className="w-full"
                    />
                    <div className="flex justify-between text-sm text-gray-600 mt-1">
                      <span>0%</span>
                      <span>{rentGrowthRate}%</span>
                      <span>6%</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Tax Considerations</h3>
                
                <div>
                  <Label htmlFor="capital-gains-tax">Capital Gains Tax Rate (%)</Label>
                  <div className="px-3">
                    <Slider
                      value={[capitalGainsTaxRate]}
                      onValueChange={(value) => setCapitalGainsTaxRate(value[0])}
                      max={30}
                      min={0}
                      step={1}
                      className="w-full"
                    />
                    <div className="flex justify-between text-sm text-gray-600 mt-1">
                      <span>0%</span>
                      <span>{capitalGainsTaxRate}%</span>
                      <span>30%</span>
                    </div>
                  </div>
                </div>

                <div>
                  <Label htmlFor="marginal-tax">Marginal Tax Rate (%)</Label>
                  <div className="px-3">
                    <Slider
                      value={[marginalTaxRate]}
                      onValueChange={(value) => setMarginalTaxRate(value[0])}
                      max={40}
                      min={10}
                      step={1}
                      className="w-full"
                    />
                    <div className="flex justify-between text-sm text-gray-600 mt-1">
                      <span>10%</span>
                      <span>{marginalTaxRate}%</span>
                      <span>40%</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-green-50 rounded-lg">
                  <div className="text-sm font-medium text-green-800 mb-1">Annual Tax Benefits</div>
                  <div className="text-lg font-bold text-green-600">
                    ${annualTaxSavings.toLocaleString()}
                  </div>
                  <div className="text-xs text-green-600">
                    From depreciation deduction
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="projections" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="font-semibold text-lg flex items-center">
                  <Calendar className="h-5 w-5 mr-2" />
                  {holdingPeriod}-Year Projections
                </h3>
                
                <div className="space-y-3">
                  <div className="flex justify-between p-3 bg-gray-50 rounded">
                    <span className="text-gray-600">Future Property Value</span>
                    <span className="font-semibold">${futurePropertyValue.toLocaleString()}</span>
                  </div>
                  
                  <div className="flex justify-between p-3 bg-gray-50 rounded">
                    <span className="text-gray-600">Total Appreciation</span>
                    <span className="font-semibold text-green-600">
                      ${totalAppreciation.toLocaleString()}
                    </span>
                  </div>
                  
                  <div className="flex justify-between p-3 bg-gray-50 rounded">
                    <span className="text-gray-600">Total Cash Flow</span>
                    <span className="font-semibold text-blue-600">
                      ${totalCashFlowReceived.toLocaleString()}
                    </span>
                  </div>
                  
                  <div className="flex justify-between p-3 bg-gray-50 rounded">
                    <span className="text-gray-600">Remaining Loan Balance</span>
                    <span className="font-semibold text-red-600">
                      ${remainingLoanBalance.toLocaleString()}
                    </span>
                  </div>
                  
                  <div className="flex justify-between p-3 bg-green-50 rounded border border-green-200">
                    <span className="text-green-800 font-medium">Total Equity</span>
                    <span className="font-bold text-green-600">
                      ${equity.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold text-lg flex items-center">
                  <BarChart3 className="h-5 w-5 mr-2" />
                  Return Analysis
                </h3>
                
                <div className="space-y-3">
                  <div className="flex justify-between p-3 bg-gray-50 rounded">
                    <span className="text-gray-600">Total Cash Invested</span>
                    <span className="font-semibold">${totalCashInvested.toLocaleString()}</span>
                  </div>
                  
                  <div className="flex justify-between p-3 bg-gray-50 rounded">
                    <span className="text-gray-600">Capital Gains Tax</span>
                    <span className="font-semibold text-red-600">
                      ${capitalGainsTax.toLocaleString()}
                    </span>
                  </div>
                  
                  <div className="flex justify-between p-3 bg-gray-50 rounded">
                    <span className="text-gray-600">Net Proceeds</span>
                    <span className="font-semibold">${netProceeds.toLocaleString()}</span>
                  </div>
                  
                  <div className="flex justify-between p-3 bg-blue-50 rounded border border-blue-200">
                    <span className="text-blue-800 font-medium">Total Return</span>
                    <span className="font-bold text-blue-600">
                      ${totalReturn.toLocaleString()}
                    </span>
                  </div>
                  
                  <div className="flex justify-between p-3 bg-purple-50 rounded border border-purple-200">
                    <span className="text-purple-800 font-medium">Annualized Return</span>
                    <span className="font-bold text-purple-600">
                      {(annualizedReturn * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="analysis" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="font-semibold text-lg flex items-center">
                  <PieChart className="h-5 w-5 mr-2" />
                  Investment Quality Score
                </h3>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                    <span>Cash Flow</span>
                    <Badge className={monthlyCashFlow > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                      {monthlyCashFlow > 0 ? 'Positive' : 'Negative'}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                    <span>1% Rule</span>
                    <Badge className={onePercentRule >= 1 ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                      {onePercentRule >= 1 ? 'Meets Rule' : 'Below Rule'}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                    <span>Cap Rate</span>
                    <Badge className={capRate >= 6 ? 'bg-green-100 text-green-800' : capRate >= 4 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}>
                      {capRate >= 6 ? 'Excellent' : capRate >= 4 ? 'Good' : 'Poor'}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                    <span>Cash-on-Cash Return</span>
                    <Badge className={cashOnCashReturn >= 8 ? 'bg-green-100 text-green-800' : cashOnCashReturn >= 5 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}>
                      {cashOnCashReturn >= 8 ? 'Excellent' : cashOnCashReturn >= 5 ? 'Good' : 'Poor'}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Key Insights</h3>
                
                <div className="space-y-3 text-sm">
                  {monthlyCashFlow > 0 ? (
                    <div className="p-3 bg-green-50 border border-green-200 rounded">
                      <CheckCircle className="h-4 w-4 text-green-600 inline mr-2" />
                      <span className="text-green-800">
                        Positive cash flow of ${monthlyCashFlow.toLocaleString()}/month
                      </span>
                    </div>
                  ) : (
                    <div className="p-3 bg-red-50 border border-red-200 rounded">
                      <AlertCircle className="h-4 w-4 text-red-600 inline mr-2" />
                      <span className="text-red-800">
                        Negative cash flow of ${Math.abs(monthlyCashFlow).toLocaleString()}/month
                      </span>
                    </div>
                  )}
                  
                  {onePercentRule >= 1 ? (
                    <div className="p-3 bg-green-50 border border-green-200 rounded">
                      <CheckCircle className="h-4 w-4 text-green-600 inline mr-2" />
                      <span className="text-green-800">
                        Meets the 1% rule for good cash flow potential
                      </span>
                    </div>
                  ) : (
                    <div className="p-3 bg-yellow-50 border border-yellow-200 rounded">
                      <Info className="h-4 w-4 text-yellow-600 inline mr-2" />
                      <span className="text-yellow-800">
                        Below 1% rule - consider higher rent or lower purchase price
                      </span>
                    </div>
                  )}
                  
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                    <Info className="h-4 w-4 text-blue-600 inline mr-2" />
                    <span className="text-blue-800">
                      Total return of {totalReturnPercentage.toFixed(1)}% over {holdingPeriod} years
                    </span>
                  </div>
                  
                  <div className="p-3 bg-purple-50 border border-purple-200 rounded">
                    <Info className="h-4 w-4 text-purple-600 inline mr-2" />
                    <span className="text-purple-800">
                      Annual tax savings of ${annualTaxSavings.toLocaleString()} from depreciation
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}