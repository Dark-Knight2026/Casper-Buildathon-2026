import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TaxHistory } from '@/types/listing';
import { TrendingUp, TrendingDown, DollarSign, Home, Calculator } from 'lucide-react';

interface TaxHistoryAnalysisProps {
  taxHistory: TaxHistory[];
  currentPrice: number;
}

export default function TaxHistoryAnalysis({ taxHistory, currentPrice }: TaxHistoryAnalysisProps) {
  const sortedHistory = [...taxHistory].sort((a, b) => b.year - a.year);
  const latestYear = sortedHistory[0];
  const previousYear = sortedHistory[1];
  
  const taxRate = latestYear ? (latestYear.taxAmount / latestYear.assessedValue) * 100 : 0;
  const yearOverYearChange = previousYear 
    ? ((latestYear.taxAmount - previousYear.taxAmount) / previousYear.taxAmount) * 100 
    : 0;

  const estimatedTaxOnCurrentPrice = (currentPrice * taxRate) / 100;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Calculator className="h-5 w-5" />
          <span>Property Tax Analysis</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Tax Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="p-4 bg-blue-50 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600">Current Tax Rate</p>
                <p className="text-xl font-bold text-blue-900">{taxRate.toFixed(2)}%</p>
              </div>
              <DollarSign className="h-8 w-8 text-blue-600" />
            </div>
          </div>

          <div className="p-4 bg-green-50 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600">Latest Assessment</p>
                <p className="text-xl font-bold text-green-900">
                  ${latestYear?.assessedValue.toLocaleString()}
                </p>
              </div>
              <Home className="h-8 w-8 text-green-600" />
            </div>
          </div>

          <div className="p-4 bg-purple-50 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-600">Annual Tax</p>
                <p className="text-xl font-bold text-purple-900">
                  ${latestYear?.taxAmount.toLocaleString()}
                </p>
              </div>
              <Calculator className="h-8 w-8 text-purple-600" />
            </div>
          </div>

          <div className="p-4 bg-orange-50 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-orange-600">YoY Change</p>
                <p className={`text-xl font-bold ${yearOverYearChange >= 0 ? 'text-red-900' : 'text-green-900'}`}>
                  {yearOverYearChange >= 0 ? '+' : ''}{yearOverYearChange.toFixed(1)}%
                </p>
              </div>
              {yearOverYearChange >= 0 ? 
                <TrendingUp className="h-8 w-8 text-red-600" /> : 
                <TrendingDown className="h-8 w-8 text-green-600" />
              }
            </div>
          </div>
        </div>

        {/* Tax History Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-2">Year</th>
                <th className="text-right py-3 px-2">Assessed Value</th>
                <th className="text-right py-3 px-2">Land Value</th>
                <th className="text-right py-3 px-2">Improvement Value</th>
                <th className="text-right py-3 px-2">Tax Amount</th>
                <th className="text-right py-3 px-2">Change</th>
              </tr>
            </thead>
            <tbody>
              {sortedHistory.map((year, index) => {
                const previousYearData = sortedHistory[index + 1];
                const change = previousYearData 
                  ? ((year.taxAmount - previousYearData.taxAmount) / previousYearData.taxAmount) * 100 
                  : 0;

                return (
                  <tr key={year.year} className="border-b border-gray-100">
                    <td className="py-3 px-2 font-medium">{year.year}</td>
                    <td className="py-3 px-2 text-right">${year.assessedValue.toLocaleString()}</td>
                    <td className="py-3 px-2 text-right">${year.landValue.toLocaleString()}</td>
                    <td className="py-3 px-2 text-right">${year.improvementValue.toLocaleString()}</td>
                    <td className="py-3 px-2 text-right font-semibold">${year.taxAmount.toLocaleString()}</td>
                    <td className={`py-3 px-2 text-right font-medium ${
                      change > 0 ? 'text-red-600' : change < 0 ? 'text-green-600' : 'text-gray-600'
                    }`}>
                      {index < sortedHistory.length - 1 ? (
                        <>
                          {change >= 0 ? '+' : ''}{change.toFixed(1)}%
                        </>
                      ) : '-'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Tax Projection */}
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h4 className="font-semibold text-gray-900 mb-3">Tax Projection at Current Price</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-600">Current List Price</p>
              <p className="text-lg font-bold text-gray-900">${currentPrice.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Estimated Annual Tax</p>
              <p className="text-lg font-bold text-gray-900">${estimatedTaxOnCurrentPrice.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Monthly Tax</p>
              <p className="text-lg font-bold text-gray-900">${(estimatedTaxOnCurrentPrice / 12).toFixed(0)}</p>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            * Projection based on current tax rate of {taxRate.toFixed(2)}%. Actual taxes may vary based on new assessment.
          </p>
        </div>

        {/* Assessment vs Market Value */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h4 className="font-semibold text-blue-900 mb-3">Assessment vs Market Analysis</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-blue-700">Latest Assessment</p>
              <p className="text-lg font-bold text-blue-900">${latestYear?.assessedValue.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-blue-700">Current List Price</p>
              <p className="text-lg font-bold text-blue-900">${currentPrice.toLocaleString()}</p>
            </div>
          </div>
          <div className="mt-3">
            <p className="text-sm text-blue-700">Assessment Ratio</p>
            <p className="text-lg font-bold text-blue-900">
              {latestYear ? ((latestYear.assessedValue / currentPrice) * 100).toFixed(1) : 0}%
            </p>
            <p className="text-xs text-blue-600 mt-1">
              Assessment is {latestYear && currentPrice > latestYear.assessedValue ? 'below' : 'above'} current market price
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}