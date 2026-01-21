import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import {
  TrendingUp,
  Calendar,
  DollarSign,
  Target,
  AlertCircle,
  CheckCircle2,
  Info,
  Lightbulb,
  ArrowRight,
} from 'lucide-react';

interface TaxScenario {
  year: number;
  mortgageInterest: number;
  propertyTaxes: number;
  homeImprovements: number;
  energyCredits: number;
  totalDeductions: number;
  estimatedSavings: number;
}

export function TaxPlanning() {
  const [currentYear] = useState(2024);
  const [formData, setFormData] = useState({
    mortgageBalance: '400000',
    interestRate: '6.5',
    propertyTaxRate: '1.2',
    homeValue: '500000',
    plannedImprovements: '25000',
    energyUpgrades: '15000',
    taxBracket: '24',
  });

  const [scenarios, setScenarios] = useState<TaxScenario[]>([]);
  const [showProjections, setShowProjections] = useState(false);

  const calculateProjections = () => {
    const projections: TaxScenario[] = [];
    let balance = parseFloat(formData.mortgageBalance);
    const rate = parseFloat(formData.interestRate) / 100;
    const homeValue = parseFloat(formData.homeValue);
    const taxRate = parseFloat(formData.propertyTaxRate) / 100;
    const bracket = parseFloat(formData.taxBracket) / 100;

    for (let i = 0; i < 5; i++) {
      const year = currentYear + i;
      const mortgageInterest = balance * rate;
      const propertyTaxes = Math.min(homeValue * taxRate, 10000); // SALT cap
      const homeImprovements = i === 0 ? parseFloat(formData.plannedImprovements) : 0;
      const energyCredits = i === 0 ? parseFloat(formData.energyUpgrades) * 0.3 : 0;
      
      const totalDeductions = mortgageInterest + propertyTaxes;
      const estimatedSavings = (totalDeductions * bracket) + energyCredits;

      projections.push({
        year,
        mortgageInterest,
        propertyTaxes,
        homeImprovements,
        energyCredits,
        totalDeductions,
        estimatedSavings,
      });

      // Reduce balance by 3% annually (approximate principal payment)
      balance *= 0.97;
    }

    setScenarios(projections);
    setShowProjections(true);
  };

  const totalSavings = scenarios.reduce((sum, s) => sum + s.estimatedSavings, 0);
  const averageAnnualSavings = scenarios.length > 0 ? totalSavings / scenarios.length : 0;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5" />
            Multi-Year Tax Planning
          </CardTitle>
          <CardDescription>
            Project your tax deductions and savings over the next 5 years
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Input Form */}
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-blue-600" />
                  Current Financial Information
                </h3>
                <div className="space-y-4">
                  <div>
                    <Label>Current Mortgage Balance</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        type="number"
                        value={formData.mortgageBalance}
                        onChange={(e) =>
                          setFormData({ ...formData, mortgageBalance: e.target.value })
                        }
                        className="pl-10"
                      />
                    </div>
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
                    <Label>Home Value</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        type="number"
                        value={formData.homeValue}
                        onChange={(e) =>
                          setFormData({ ...formData, homeValue: e.target.value })
                        }
                        className="pl-10"
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Property Tax Rate (%)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={formData.propertyTaxRate}
                      onChange={(e) =>
                        setFormData({ ...formData, propertyTaxRate: e.target.value })
                      }
                    />
                  </div>

                  <div>
                    <Label>Your Tax Bracket (%)</Label>
                    <Input
                      type="number"
                      value={formData.taxBracket}
                      onChange={(e) =>
                        setFormData({ ...formData, taxBracket: e.target.value })
                      }
                    />
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-blue-600" />
                  Planned Improvements
                </h3>
                <div className="space-y-4">
                  <div>
                    <Label>Planned Home Improvements (This Year)</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        type="number"
                        value={formData.plannedImprovements}
                        onChange={(e) =>
                          setFormData({ ...formData, plannedImprovements: e.target.value })
                        }
                        className="pl-10"
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Capital improvements increase your cost basis
                    </p>
                  </div>

                  <div>
                    <Label>Energy Efficiency Upgrades (This Year)</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        type="number"
                        value={formData.energyUpgrades}
                        onChange={(e) =>
                          setFormData({ ...formData, energyUpgrades: e.target.value })
                        }
                        className="pl-10"
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Eligible for 30% tax credit
                    </p>
                  </div>
                </div>
              </div>

              <Button
                onClick={calculateProjections}
                className="w-full bg-blue-600 hover:bg-blue-700"
                size="lg"
              >
                <TrendingUp className="w-5 h-5 mr-2" />
                Calculate 5-Year Projections
              </Button>
            </div>

            {/* Results */}
            <div>
              {!showProjections ? (
                <Card className="h-full flex items-center justify-center">
                  <CardContent className="text-center p-12">
                    <Target className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-600 mb-2">Enter your information to see projections</p>
                    <p className="text-sm text-gray-500">
                      Calculate your potential tax savings over the next 5 years
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {/* Summary Card */}
                  <Card className="bg-gradient-to-br from-green-50 to-blue-50 border-2 border-green-200">
                    <CardHeader>
                      <CardTitle className="text-lg">5-Year Tax Savings Projection</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-center mb-4">
                        <p className="text-sm text-gray-600 mb-2">Total Projected Savings</p>
                        <p className="text-4xl font-bold text-green-900">
                          ${totalSavings.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-center">
                        <div className="p-3 bg-white rounded-lg">
                          <p className="text-xs text-gray-600 mb-1">Average Annual</p>
                          <p className="text-lg font-bold text-blue-900">
                            ${averageAnnualSavings.toLocaleString(undefined, {
                              maximumFractionDigits: 0,
                            })}
                          </p>
                        </div>
                        <div className="p-3 bg-white rounded-lg">
                          <p className="text-xs text-gray-600 mb-1">Years Projected</p>
                          <p className="text-lg font-bold text-blue-900">5</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Year-by-Year Breakdown */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Year-by-Year Breakdown</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {scenarios.map((scenario, index) => (
                        <Card
                          key={scenario.year}
                          className={index === 0 ? 'border-blue-200 bg-blue-50' : ''}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-blue-600" />
                                <span className="font-semibold">{scenario.year}</span>
                                {index === 0 && (
                                  <Badge className="bg-blue-600 text-white">Current Year</Badge>
                                )}
                              </div>
                              <span className="text-lg font-bold text-green-900">
                                ${scenario.estimatedSavings.toLocaleString(undefined, {
                                  maximumFractionDigits: 0,
                                })}
                              </span>
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-gray-600">Mortgage Interest:</span>
                                <span className="font-semibold">
                                  ${scenario.mortgageInterest.toLocaleString(undefined, {
                                    maximumFractionDigits: 0,
                                  })}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Property Taxes:</span>
                                <span className="font-semibold">
                                  ${scenario.propertyTaxes.toLocaleString(undefined, {
                                    maximumFractionDigits: 0,
                                  })}
                                </span>
                              </div>
                              {scenario.energyCredits > 0 && (
                                <div className="flex justify-between col-span-2">
                                  <span className="text-gray-600">Energy Credits:</span>
                                  <span className="font-semibold text-green-600">
                                    ${scenario.energyCredits.toLocaleString(undefined, {
                                      maximumFractionDigits: 0,
                                    })}
                                  </span>
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          </div>

          {/* Tax Planning Strategies */}
          <Card className="mt-6 bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-200">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Lightbulb className="w-5 h-5" />
                Tax Planning Strategies
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-3 p-3 bg-white rounded-lg">
                <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
                <div>
                  <p className="font-semibold text-sm">Maximize Energy Credits</p>
                  <p className="text-xs text-gray-600">
                    Install solar panels, heat pumps, or energy-efficient windows to claim up to 30%
                    tax credit. The credit has no annual limit and can be carried forward.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-white rounded-lg">
                <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
                <div>
                  <p className="font-semibold text-sm">Time Your Improvements</p>
                  <p className="text-xs text-gray-600">
                    Capital improvements increase your cost basis, reducing capital gains when you
                    sell. Keep detailed records and receipts for all improvements.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-white rounded-lg">
                <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
                <div>
                  <p className="font-semibold text-sm">Consider Refinancing</p>
                  <p className="text-xs text-gray-600">
                    If rates drop, refinancing can increase your mortgage interest deduction. Points
                    paid on a refinance must be amortized over the loan term.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-white rounded-lg">
                <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
                <div>
                  <p className="font-semibold text-sm">Home Office Deduction</p>
                  <p className="text-xs text-gray-600">
                    If you're self-employed and use part of your home exclusively for business, you
                    may qualify for the home office deduction. Use the simplified method ($5/sq ft)
                    or actual expense method.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-white rounded-lg">
                <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
                <div>
                  <p className="font-semibold text-sm">Track All Expenses</p>
                  <p className="text-xs text-gray-600">
                    Keep records of all property-related expenses. Even non-deductible expenses like
                    repairs can become important if you convert your home to a rental property.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Important Reminders */}
          <Card className="mt-4 bg-yellow-50 border-yellow-200">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                <div>
                  <p className="font-semibold text-sm mb-1">Important Reminders</p>
                  <ul className="text-xs text-gray-700 space-y-1">
                    <li>• These projections are estimates based on current tax laws and your inputs</li>
                    <li>• Tax laws may change; consult a tax professional for personalized advice</li>
                    <li>• Mortgage interest deduction is limited to debt up to $750,000</li>
                    <li>• SALT deduction (property taxes + state income tax) is capped at $10,000</li>
                    <li>• Keep all receipts and documentation for at least 7 years</li>
                    <li>• Consider working with a CPA for complex tax situations</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  );
}