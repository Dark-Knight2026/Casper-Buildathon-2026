import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { FileText, DollarSign } from 'lucide-react';

export function ClosingCostEstimator() {
  const [homePrice, setHomePrice] = useState<string>('500000');
  const [downPaymentPercent, setDownPaymentPercent] = useState<string>('20');
  const [state, setState] = useState<string>('CA');

  const calculateClosingCosts = () => {
    const price = parseFloat(homePrice) || 0;
    const downPercent = parseFloat(downPaymentPercent) || 0;
    const downPayment = price * (downPercent / 100);
    const loanAmount = price - downPayment;

    // Typical closing costs (percentages and fixed amounts vary by state)
    const costs = {
      // Lender Fees
      loanOriginationFee: loanAmount * 0.01, // 1% of loan amount
      loanDiscountPoints: 0, // Optional
      appraisalFee: 500,
      creditReportFee: 50,
      floodCertification: 25,
      taxServiceFee: 75,

      // Title & Escrow
      titleInsurance: price * 0.005, // 0.5% of home price
      titleSearch: 200,
      escrowFee: price * 0.002, // 0.2% of home price
      notaryFees: 150,
      recordingFees: 125,

      // Prepaid Items
      homeownersInsurance: (price * 0.0035) / 12, // First month
      propertyTaxes: (price * 0.0125) / 12, // First month (varies by location)
      mortgageInterest: (loanAmount * 0.065) / 365 * 15, // ~15 days prepaid

      // Other
      homeInspection: 400,
      pestInspection: 150,
      surveyFee: 400,
      attorneyFees: state === 'NY' ? 2000 : 0, // Some states require attorney
    };

    const totalClosingCosts = Object.values(costs).reduce((sum, cost) => sum + cost, 0);
    const cashToClose = downPayment + totalClosingCosts;

    return {
      costs,
      totalClosingCosts,
      downPayment,
      loanAmount,
      cashToClose,
    };
  };

  const result = calculateClosingCosts();

  const costCategories = [
    {
      name: 'Lender Fees',
      items: [
        { label: 'Loan Origination Fee', amount: result.costs.loanOriginationFee },
        { label: 'Appraisal Fee', amount: result.costs.appraisalFee },
        { label: 'Credit Report', amount: result.costs.creditReportFee },
        { label: 'Flood Certification', amount: result.costs.floodCertification },
        { label: 'Tax Service Fee', amount: result.costs.taxServiceFee },
      ],
    },
    {
      name: 'Title & Escrow',
      items: [
        { label: 'Title Insurance', amount: result.costs.titleInsurance },
        { label: 'Title Search', amount: result.costs.titleSearch },
        { label: 'Escrow Fee', amount: result.costs.escrowFee },
        { label: 'Notary Fees', amount: result.costs.notaryFees },
        { label: 'Recording Fees', amount: result.costs.recordingFees },
      ],
    },
    {
      name: 'Prepaid Items',
      items: [
        { label: 'Homeowners Insurance (1 month)', amount: result.costs.homeownersInsurance },
        { label: 'Property Taxes (1 month)', amount: result.costs.propertyTaxes },
        { label: 'Mortgage Interest (prepaid)', amount: result.costs.mortgageInterest },
      ],
    },
    {
      name: 'Inspections & Other',
      items: [
        { label: 'Home Inspection', amount: result.costs.homeInspection },
        { label: 'Pest Inspection', amount: result.costs.pestInspection },
        { label: 'Survey Fee', amount: result.costs.surveyFee },
        ...(result.costs.attorneyFees > 0
          ? [{ label: 'Attorney Fees', amount: result.costs.attorneyFees }]
          : []),
      ],
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-purple-600" />
          Closing Cost Estimator
        </CardTitle>
        <CardDescription>
          Estimate all costs you'll need to pay at closing
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Input Fields */}
          <div className="grid md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="home-price">Home Price</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                  $
                </span>
                <Input
                  id="home-price"
                  type="number"
                  value={homePrice}
                  onChange={(e) => setHomePrice(e.target.value)}
                  className="pl-7"
                  placeholder="500000"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="down-payment-percent">Down Payment</Label>
              <div className="relative">
                <Input
                  id="down-payment-percent"
                  type="number"
                  value={downPaymentPercent}
                  onChange={(e) => setDownPaymentPercent(e.target.value)}
                  className="pr-7"
                  placeholder="20"
                />
                <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                  %
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="state">State</Label>
              <Input
                id="state"
                type="text"
                value={state}
                onChange={(e) => setState(e.target.value.toUpperCase())}
                placeholder="CA"
                maxLength={2}
              />
            </div>
          </div>

          {/* Summary */}
          <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg p-6 space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white rounded-lg p-4 text-center">
                <p className="text-xs text-gray-600 mb-1">Down Payment</p>
                <p className="text-lg font-bold text-purple-900">
                  ${result.downPayment.toLocaleString()}
                </p>
              </div>

              <div className="bg-white rounded-lg p-4 text-center">
                <p className="text-xs text-gray-600 mb-1">Closing Costs</p>
                <p className="text-lg font-bold text-purple-900">
                  ${Math.floor(result.totalClosingCosts).toLocaleString()}
                </p>
              </div>

              <div className="bg-white rounded-lg p-4 text-center">
                <p className="text-xs text-gray-600 mb-1">Loan Amount</p>
                <p className="text-lg font-bold text-purple-900">
                  ${result.loanAmount.toLocaleString()}
                </p>
              </div>
            </div>

            <div className="text-center p-4 bg-white rounded-lg">
              <p className="text-sm text-gray-600 mb-2">Total Cash Needed at Closing</p>
              <p className="text-3xl font-bold text-purple-900">
                ${Math.floor(result.cashToClose).toLocaleString()}
              </p>
            </div>
          </div>

          {/* Detailed Breakdown */}
          <div className="space-y-4">
            <h4 className="font-semibold text-lg flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Detailed Cost Breakdown
            </h4>

            {costCategories.map((category) => (
              <div key={category.name} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h5 className="font-semibold">{category.name}</h5>
                  <Badge variant="outline">
                    $
                    {Math.floor(
                      category.items.reduce((sum, item) => sum + item.amount, 0)
                    ).toLocaleString()}
                  </Badge>
                </div>
                <div className="space-y-2">
                  {category.items.map((item) => (
                    <div key={item.label} className="flex justify-between text-sm">
                      <span className="text-gray-600">{item.label}</span>
                      <span className="font-semibold">
                        ${Math.floor(item.amount).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Disclaimer */}
          <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded">
            <p className="font-semibold mb-1">Important Note:</p>
            <p>
              This is an estimate only. Actual closing costs vary by location, lender, and specific
              transaction details. Some costs may be negotiable with the seller. Always review your
              Loan Estimate and Closing Disclosure documents carefully.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}