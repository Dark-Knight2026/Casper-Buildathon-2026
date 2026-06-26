import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Home, DollarSign, TrendingUp, Calculator, TrendingDown } from 'lucide-react';

export default function RentVsBuyCalculator() {
  const [rentPrice, setRentPrice] = useState(4500);
  const [homePrice, setHomePrice] = useState(1200000);
  const [downPayment, setDownPayment] = useState(240000);
  const [interestRate, setInterestRate] = useState(7.5);
  const [propertyTax, setPropertyTax] = useState(12000);
  const [insurance, setInsurance] = useState(2400);
  const [maintenance, setMaintenance] = useState(6000);
  const [appreciation, setAppreciation] = useState(3);
  const [rentIncrease, setRentIncrease] = useState(2.5);
  const [timeHorizon, setTimeHorizon] = useState(7);
  
  const [results, setResults] = useState({
    monthlyRent: 0,
    monthlyBuy: 0,
    breakEvenYear: 0,
    totalRentCost: 0,
    totalBuyCost: 0,
    homeEquity: 0,
    netWorthDifference: 0
  });

  const calculateComparison = useCallback(() => {
    // Monthly mortgage payment
    const loanAmount = homePrice - downPayment;
    const monthlyRate = interestRate / 100 / 12;
    const numPayments = 30 * 12;
    const monthlyMortgage = (loanAmount * monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / 
                           (Math.pow(1 + monthlyRate, numPayments) - 1);
    
    const monthlyTax = propertyTax / 12;
    const monthlyInsurance = insurance / 12;
    const monthlyMaintenance = maintenance / 12;
    const monthlyBuy = monthlyMortgage + monthlyTax + monthlyInsurance + monthlyMaintenance;

    // Calculate costs over time horizon
    let totalRentCost = 0;
    let totalBuyCost = downPayment; // Initial investment
    let currentRent = rentPrice;
    let homeValue = homePrice;
    let remainingBalance = loanAmount;
    let breakEvenYear = 0;

    for (let year = 1; year <= timeHorizon; year++) {
      // Rent costs (with annual increases)
      totalRentCost += currentRent * 12;
      currentRent *= (1 + rentIncrease / 100);

      // Buy costs
      totalBuyCost += monthlyBuy * 12;
      
      // Home appreciation
      homeValue *= (1 + appreciation / 100);
      
      // Mortgage balance reduction (simplified)
      const annualPrincipal = monthlyMortgage * 12 * 0.3; // Rough estimate
      remainingBalance = Math.max(0, remainingBalance - annualPrincipal);

      // Check break-even point
      const homeEquity = homeValue - remainingBalance;
      const netBuyCost = totalBuyCost - homeEquity;
      
      if (breakEvenYear === 0 && netBuyCost <= totalRentCost) {
        breakEvenYear = year;
      }
    }

    const finalHomeEquity = homeValue - remainingBalance;
    const netWorthDifference = finalHomeEquity - (totalBuyCost - downPayment);

    setResults({
      monthlyRent: rentPrice,
      monthlyBuy,
      breakEvenYear: breakEvenYear || timeHorizon,
      totalRentCost,
      totalBuyCost: totalBuyCost - finalHomeEquity, // Net cost after equity
      homeEquity: finalHomeEquity,
      netWorthDifference
    });
  }, [
    rentPrice, 
    homePrice, 
    downPayment, 
    interestRate, 
    propertyTax, 
    insurance, 
    maintenance, 
    appreciation, 
    rentIncrease, 
    timeHorizon
  ]);

  useEffect(() => {
    calculateComparison();
  }, [calculateComparison]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Calculator className="h-5 w-5" />
          <span>Rent vs Buy Calculator</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="inputs" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="inputs">Inputs</TabsTrigger>
            <TabsTrigger value="comparison">Comparison</TabsTrigger>
            <TabsTrigger value="analysis">Analysis</TabsTrigger>
          </TabsList>

          <TabsContent value="inputs" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Rent Scenario */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Rent Scenario</h3>
                <div>
                  <Label htmlFor="rent-price">Monthly Rent</Label>
                  <Input
                    id="rent-price"
                    type="number"
                    value={rentPrice}
                    onChange={(e) => setRentPrice(Number(e.target.value))}
                  />
                </div>
                <div>
                  <Label htmlFor="rent-increase">Annual Rent Increase (%)</Label>
                  <Input
                    id="rent-increase"
                    type="number"
                    step="0.1"
                    value={rentIncrease}
                    onChange={(e) => setRentIncrease(Number(e.target.value))}
                  />
                </div>
              </div>

              {/* Buy Scenario */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Buy Scenario</h3>
                <div>
                  <Label htmlFor="home-price">Home Price</Label>
                  <Input
                    id="home-price"
                    type="number"
                    value={homePrice}
                    onChange={(e) => setHomePrice(Number(e.target.value))}
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
                </div>
                <div>
                  <Label htmlFor="interest-rate">Interest Rate (%)</Label>
                  <Input
                    id="interest-rate"
                    type="number"
                    step="0.1"
                    value={interestRate}
                    onChange={(e) => setInterestRate(Number(e.target.value))}
                  />
                </div>
              </div>
            </div>

            {/* Additional Costs */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Annual Homeownership Costs</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="property-tax">Property Tax</Label>
                  <Input
                    id="property-tax"
                    type="number"
                    value={propertyTax}
                    onChange={(e) => setPropertyTax(Number(e.target.value))}
                  />
                </div>
                <div>
                  <Label htmlFor="insurance">Insurance</Label>
                  <Input
                    id="insurance"
                    type="number"
                    value={insurance}
                    onChange={(e) => setInsurance(Number(e.target.value))}
                  />
                </div>
                <div>
                  <Label htmlFor="maintenance">Maintenance</Label>
                  <Input
                    id="maintenance"
                    type="number"
                    value={maintenance}
                    onChange={(e) => setMaintenance(Number(e.target.value))}
                  />
                </div>
              </div>
            </div>

            {/* Market Assumptions */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Market Assumptions</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="appreciation">Home Appreciation (%/year)</Label>
                  <Input
                    id="appreciation"
                    type="number"
                    step="0.1"
                    value={appreciation}
                    onChange={(e) => setAppreciation(Number(e.target.value))}
                  />
                </div>
                <div>
                  <Label htmlFor="time-horizon">Time Horizon (years)</Label>
                  <Input
                    id="time-horizon"
                    type="number"
                    value={timeHorizon}
                    onChange={(e) => setTimeHorizon(Number(e.target.value))}
                  />
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="comparison" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Monthly Costs */}
              <div className="p-6 bg-blue-50 rounded-lg">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-blue-900">Monthly Rent</h3>
                  <Home className="h-6 w-6 text-blue-600" />
                </div>
                <div className="text-3xl font-bold text-blue-900 mb-2">
                  ${results.monthlyRent.toLocaleString()}
                </div>
                <div className="text-sm text-blue-700">
                  Includes: Rent only
                </div>
              </div>

              <div className="p-6 bg-green-50 rounded-lg">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-green-900">Monthly Buy</h3>
                  <DollarSign className="h-6 w-6 text-green-600" />
                </div>
                <div className="text-3xl font-bold text-green-900 mb-2">
                  ${Math.round(results.monthlyBuy).toLocaleString()}
                </div>
                <div className="text-sm text-green-700">
                  Includes: Mortgage, taxes, insurance, maintenance
                </div>
              </div>
            </div>

            {/* Break-even Analysis */}
            <div className="p-6 bg-purple-50 rounded-lg">
              <h3 className="text-lg font-semibold text-purple-900 mb-4">Break-even Analysis</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-900">{results.breakEvenYear}</div>
                  <div className="text-sm text-purple-700">Years to break even</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-900">
                    ${Math.round(results.homeEquity / 1000)}K
                  </div>
                  <div className="text-sm text-purple-700">Home equity after {timeHorizon} years</div>
                </div>
                <div className="text-center">
                  <div className={`text-2xl font-bold ${
                    results.netWorthDifference >= 0 ? 'text-green-900' : 'text-red-900'
                  }`}>
                    {results.netWorthDifference >= 0 ? '+' : ''}${Math.round(results.netWorthDifference / 1000)}K
                  </div>
                  <div className="text-sm text-purple-700">Net worth difference</div>
                </div>
              </div>
            </div>

            {/* Total Costs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="font-semibold text-gray-900 mb-3">Total Rent Cost ({timeHorizon} years)</h4>
                <div className="text-2xl font-bold text-gray-900">
                  ${Math.round(results.totalRentCost / 1000)}K
                </div>
                <Progress value={100} className="mt-2 h-2" />
              </div>
              
              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="font-semibold text-gray-900 mb-3">Net Buy Cost ({timeHorizon} years)</h4>
                <div className="text-2xl font-bold text-gray-900">
                  ${Math.round(results.totalBuyCost / 1000)}K
                </div>
                <Progress 
                  value={(results.totalBuyCost / results.totalRentCost) * 100} 
                  className="mt-2 h-2" 
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="analysis" className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Recommendation</h3>
              
              {results.breakEvenYear <= timeHorizon ? (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <TrendingUp className="h-5 w-5 text-green-600" />
                    <span className="font-semibold text-green-900">Consider Buying</span>
                  </div>
                  <p className="text-green-800">
                    Based on your inputs, buying becomes financially advantageous after {results.breakEvenYear} years. 
                    You'll build ${Math.round(results.homeEquity / 1000)}K in equity over {timeHorizon} years.
                  </p>
                </div>
              ) : (
                <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <TrendingDown className="h-5 w-5 text-orange-600" />
                    <span className="font-semibold text-orange-900">Consider Renting</span>
                  </div>
                  <p className="text-orange-800">
                    Renting appears more cost-effective for your {timeHorizon}-year timeline. 
                    The break-even point is beyond your planned timeframe.
                  </p>
                </div>
              )}
            </div>

            {/* Factors to Consider */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <h4 className="font-semibold text-gray-900">Advantages of Buying</h4>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li className="flex items-start space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                    <span>Build equity and net worth</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                    <span>Fixed monthly payments</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                    <span>Tax deductions available</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                    <span>Freedom to modify property</span>
                  </li>
                </ul>
              </div>

              <div className="space-y-3">
                <h4 className="font-semibold text-gray-900">Advantages of Renting</h4>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li className="flex items-start space-x-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                    <span>Lower upfront costs</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                    <span>Flexibility to move</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                    <span>No maintenance responsibilities</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                    <span>Predictable monthly costs</span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg">
              <h4 className="font-semibold text-gray-900 mb-2">Key Assumptions</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                <div>
                  <p>• Home appreciation: {appreciation}% annually</p>
                  <p>• Rent increases: {rentIncrease}% annually</p>
                  <p>• 30-year fixed mortgage</p>
                </div>
                <div>
                  <p>• Property tax: ${propertyTax.toLocaleString()} annually</p>
                  <p>• Insurance: ${insurance.toLocaleString()} annually</p>
                  <p>• Maintenance: ${maintenance.toLocaleString()} annually</p>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}