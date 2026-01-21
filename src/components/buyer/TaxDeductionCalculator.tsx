import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import {
  Calculator,
  DollarSign,
  Home,
  TrendingUp,
  Info,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';

interface DeductionCalculation {
  mortgageInterest: number;
  propertyTaxes: number;
  points: number;
  pmi: number;
  homeOffice: number;
  energyCredits: number;
  totalDeductions: number;
  estimatedTaxSavings: number;
  effectiveRate: number;
}

export function TaxDeductionCalculator() {
  const [formData, setFormData] = useState({
    mortgageBalance: '400000',
    interestRate: '6.5',
    monthsPaid: '12',
    propertyTaxAnnual: '6000',
    pointsPaid: '4000',
    pmiMonthly: '125',
    homeOfficePercentage: '15',
    homeValue: '500000',
    energyImprovements: '0',
    filingStatus: 'married' as 'single' | 'married' | 'hoh',
    taxBracket: '24',
  });

  const [calculation, setCalculation] = useState<DeductionCalculation | null>(null);
  const [showResults, setShowResults] = useState(false);

  const calculateDeductions = () => {
    const mortgageBalance = parseFloat(formData.mortgageBalance);
    const interestRate = parseFloat(formData.interestRate);
    const monthsPaid = parseFloat(formData.monthsPaid);
    const propertyTaxAnnual = parseFloat(formData.propertyTaxAnnual);
    const pointsPaid = parseFloat(formData.pointsPaid);
    const pmiMonthly = parseFloat(formData.pmiMonthly);
    const homeOfficePercentage = parseFloat(formData.homeOfficePercentage);
    const homeValue = parseFloat(formData.homeValue);
    const energyImprovements = parseFloat(formData.energyImprovements);
    const taxBracket = parseFloat(formData.taxBracket);

    // Calculate mortgage interest
    const annualInterest = mortgageBalance * (interestRate / 100);
    const mortgageInterest = (annualInterest / 12) * monthsPaid;

    // Property taxes (capped at $10,000 for SALT deduction)
    const propertyTaxes = Math.min(propertyTaxAnnual, 10000);

    // Points (usually deductible in year paid for primary residence)
    const points = pointsPaid;

    // PMI (subject to income limitations)
    const pmi = pmiMonthly * monthsPaid;

    // Home office deduction (simplified method: $5 per sq ft, max 300 sq ft)
    // Or percentage of home expenses
    const homeOffice = (homeValue * 0.02 * (homeOfficePercentage / 100)); // Rough estimate

    // Energy credits (30% of cost, up to certain limits)
    const energyCredits = energyImprovements * 0.3;

    // Total deductions
    const totalDeductions = mortgageInterest + propertyTaxes + points + pmi + homeOffice;

    // Estimated tax savings
    const estimatedTaxSavings = (totalDeductions * (taxBracket / 100)) + energyCredits;

    // Effective rate
    const effectiveRate = (estimatedTaxSavings / totalDeductions) * 100;

    const result: DeductionCalculation = {
      mortgageInterest,
      propertyTaxes,
      points,
      pmi,
      homeOffice,
      energyCredits,
      totalDeductions,
      estimatedTaxSavings,
      effectiveRate,
    };

    setCalculation(result);
    setShowResults(true);
  };

  const standardDeduction = formData.filingStatus === 'married' ? 29200 : formData.filingStatus === 'hoh' ? 21900 : 14600;
  const shouldItemize = calculation && calculation.totalDeductions > standardDeduction;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="w-5 h-5" />
            Tax Deduction Calculator
          </CardTitle>
          <CardDescription>
            Estimate your homeowner tax deductions and potential savings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Input Form */}
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Home className="w-5 h-5 text-blue-600" />
                  Mortgage Information
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
                    <Label>Months Paid This Year</Label>
                    <Input
                      type="number"
                      value={formData.monthsPaid}
                      onChange={(e) =>
                        setFormData({ ...formData, monthsPaid: e.target.value })
                      }
                    />
                  </div>

                  <div>
                    <Label className="flex items-center gap-2">
                      Points Paid at Closing
                      <HelpCircle className="w-4 h-4 text-gray-400" />
                    </Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        type="number"
                        value={formData.pointsPaid}
                        onChange={(e) =>
                          setFormData({ ...formData, pointsPaid: e.target.value })
                        }
                        className="pl-10"
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Usually deductible in the year paid for primary residence
                    </p>
                  </div>

                  <div>
                    <Label className="flex items-center gap-2">
                      Monthly PMI
                      <HelpCircle className="w-4 h-4 text-gray-400" />
                    </Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        type="number"
                        value={formData.pmiMonthly}
                        onChange={(e) =>
                          setFormData({ ...formData, pmiMonthly: e.target.value })
                        }
                        className="pl-10"
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Subject to income limitations
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-blue-600" />
                  Property & Other Deductions
                </h3>
                <div className="space-y-4">
                  <div>
                    <Label>Annual Property Taxes</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        type="number"
                        value={formData.propertyTaxAnnual}
                        onChange={(e) =>
                          setFormData({ ...formData, propertyTaxAnnual: e.target.value })
                        }
                        className="pl-10"
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      SALT deduction capped at $10,000
                    </p>
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
                    <Label className="flex items-center gap-2">
                      Home Office Percentage
                      <HelpCircle className="w-4 h-4 text-gray-400" />
                    </Label>
                    <Input
                      type="number"
                      step="1"
                      value={formData.homeOfficePercentage}
                      onChange={(e) =>
                        setFormData({ ...formData, homeOfficePercentage: e.target.value })
                      }
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Percentage of home used exclusively for business
                    </p>
                  </div>

                  <div>
                    <Label className="flex items-center gap-2">
                      Energy Efficiency Improvements
                      <HelpCircle className="w-4 h-4 text-gray-400" />
                    </Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        type="number"
                        value={formData.energyImprovements}
                        onChange={(e) =>
                          setFormData({ ...formData, energyImprovements: e.target.value })
                        }
                        className="pl-10"
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Solar panels, heat pumps, etc. (30% credit)
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-blue-600" />
                  Tax Information
                </h3>
                <div className="space-y-4">
                  <div>
                    <Label>Filing Status</Label>
                    <select
                      className="w-full p-2 border rounded-md"
                      value={formData.filingStatus}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          filingStatus: e.target.value as 'single' | 'married' | 'hoh',
                        })
                      }
                    >
                      <option value="single">Single</option>
                      <option value="married">Married Filing Jointly</option>
                      <option value="hoh">Head of Household</option>
                    </select>
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
                    <p className="text-xs text-gray-500 mt-1">
                      Common brackets: 10%, 12%, 22%, 24%, 32%, 35%, 37%
                    </p>
                  </div>
                </div>
              </div>

              <Button
                onClick={calculateDeductions}
                className="w-full bg-blue-600 hover:bg-blue-700"
                size="lg"
              >
                <Calculator className="w-5 h-5 mr-2" />
                Calculate Deductions
              </Button>
            </div>

            {/* Results */}
            <div>
              {!showResults ? (
                <Card className="h-full flex items-center justify-center">
                  <CardContent className="text-center p-12">
                    <Calculator className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-600 mb-2">Enter your information to calculate</p>
                    <p className="text-sm text-gray-500">
                      Fill in the form and click "Calculate" to see your estimated deductions
                    </p>
                  </CardContent>
                </Card>
              ) : calculation ? (
                <div className="space-y-4">
                  {/* Summary Card */}
                  <Card className="bg-gradient-to-br from-blue-50 to-purple-50 border-2 border-blue-200">
                    <CardHeader>
                      <CardTitle className="text-lg">Estimated Tax Savings</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-center mb-4">
                        <p className="text-sm text-gray-600 mb-2">Total Annual Savings</p>
                        <p className="text-4xl font-bold text-blue-900">
                          ${calculation.estimatedTaxSavings.toLocaleString(undefined, {
                            maximumFractionDigits: 0,
                          })}
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-center">
                        <div className="p-3 bg-white rounded-lg">
                          <p className="text-xs text-gray-600 mb-1">Total Deductions</p>
                          <p className="text-lg font-bold text-blue-900">
                            ${calculation.totalDeductions.toLocaleString(undefined, {
                              maximumFractionDigits: 0,
                            })}
                          </p>
                        </div>
                        <div className="p-3 bg-white rounded-lg">
                          <p className="text-xs text-gray-600 mb-1">Effective Rate</p>
                          <p className="text-lg font-bold text-blue-900">
                            {calculation.effectiveRate.toFixed(1)}%
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Itemize vs Standard */}
                  <Card
                    className={
                      shouldItemize
                        ? 'bg-green-50 border-green-200'
                        : 'bg-yellow-50 border-yellow-200'
                    }
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        {shouldItemize ? (
                          <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
                        ) : (
                          <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                        )}
                        <div>
                          <p className="font-semibold text-sm mb-1">
                            {shouldItemize ? 'Itemize Your Deductions' : 'Consider Standard Deduction'}
                          </p>
                          <p className="text-sm text-gray-700">
                            {shouldItemize
                              ? `Your itemized deductions ($${calculation.totalDeductions.toLocaleString()}) exceed the standard deduction ($${standardDeduction.toLocaleString()}). You should itemize to maximize your tax savings.`
                              : `Your itemized deductions ($${calculation.totalDeductions.toLocaleString()}) are less than the standard deduction ($${standardDeduction.toLocaleString()}). The standard deduction may be better for you.`}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Deduction Breakdown */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Deduction Breakdown</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between items-center p-3 bg-blue-50 rounded">
                        <span className="text-sm font-semibold">Mortgage Interest</span>
                        <span className="font-bold text-blue-900">
                          ${calculation.mortgageInterest.toLocaleString(undefined, {
                            maximumFractionDigits: 0,
                          })}
                        </span>
                      </div>

                      <div className="flex justify-between items-center p-3 bg-blue-50 rounded">
                        <span className="text-sm font-semibold">Property Taxes</span>
                        <span className="font-bold text-blue-900">
                          ${calculation.propertyTaxes.toLocaleString(undefined, {
                            maximumFractionDigits: 0,
                          })}
                        </span>
                      </div>

                      {calculation.points > 0 && (
                        <div className="flex justify-between items-center p-3 bg-blue-50 rounded">
                          <span className="text-sm font-semibold">Points Paid</span>
                          <span className="font-bold text-blue-900">
                            ${calculation.points.toLocaleString(undefined, {
                              maximumFractionDigits: 0,
                            })}
                          </span>
                        </div>
                      )}

                      {calculation.pmi > 0 && (
                        <div className="flex justify-between items-center p-3 bg-blue-50 rounded">
                          <span className="text-sm font-semibold">PMI</span>
                          <span className="font-bold text-blue-900">
                            ${calculation.pmi.toLocaleString(undefined, {
                              maximumFractionDigits: 0,
                            })}
                          </span>
                        </div>
                      )}

                      {calculation.homeOffice > 0 && (
                        <div className="flex justify-between items-center p-3 bg-blue-50 rounded">
                          <span className="text-sm font-semibold">Home Office</span>
                          <span className="font-bold text-blue-900">
                            ${calculation.homeOffice.toLocaleString(undefined, {
                              maximumFractionDigits: 0,
                            })}
                          </span>
                        </div>
                      )}

                      {calculation.energyCredits > 0 && (
                        <div className="flex justify-between items-center p-3 bg-green-50 rounded border border-green-200">
                          <span className="text-sm font-semibold">Energy Tax Credits</span>
                          <span className="font-bold text-green-900">
                            ${calculation.energyCredits.toLocaleString(undefined, {
                              maximumFractionDigits: 0,
                            })}
                          </span>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Important Notes */}
                  <Card className="bg-gray-50">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <Info className="w-5 h-5 text-blue-600 mt-0.5" />
                        <div>
                          <p className="font-semibold text-sm mb-2">Important Notes</p>
                          <ul className="text-xs text-gray-600 space-y-1">
                            <li>• This is an estimate only. Consult a tax professional for accurate advice.</li>
                            <li>• Mortgage interest deduction limited to $750K of debt ($375K if married filing separately)</li>
                            <li>• SALT deduction (property taxes + state income tax) capped at $10,000</li>
                            <li>• PMI deduction subject to income phase-out (AGI over $100K)</li>
                            <li>• Home office deduction requires exclusive and regular business use</li>
                            <li>• Energy credits have specific requirements and may have annual limits</li>
                          </ul>
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