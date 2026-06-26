import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Calendar, DollarSign, TrendingUp } from 'lucide-react';
import type { TaxEstimate } from '@/types/financial';
import { format } from 'date-fns';

interface TaxPlannerProps {
  taxEstimates: TaxEstimate[];
}

export default function TaxPlanner({ taxEstimates }: TaxPlannerProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Tax Due</p>
                <p className="text-2xl font-bold text-red-600">
                  ${taxEstimates.reduce((sum, t) => sum + t.total_estimated_tax, 0).toLocaleString()}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Tax Paid</p>
                <p className="text-2xl font-bold text-green-600">
                  ${taxEstimates.reduce((sum, t) => sum + t.tax_paid, 0).toLocaleString()}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Remaining</p>
                <p className="text-2xl font-bold text-orange-600">
                  ${taxEstimates.reduce((sum, t) => sum + t.tax_remaining, 0).toLocaleString()}
                </p>
              </div>
              <AlertCircle className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {taxEstimates.map((tax) => (
        <Card key={`${tax.year}-${tax.quarter}`}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{tax.year} {tax.quarter} Tax Estimate</CardTitle>
              <Badge variant="outline" className="text-orange-600">
                <Calendar className="h-3 w-3 mr-1" />
                Due: {format(new Date(tax.due_date), 'MMM d, yyyy')}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Gross Income</p>
                <p className="text-2xl font-bold">${tax.gross_income.toLocaleString()}</p>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Deductible Expenses</p>
                <p className="text-2xl font-bold text-green-600">-${tax.deductible_expenses.toLocaleString()}</p>
              </div>
              <div className="p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Taxable Income</p>
                <p className="text-2xl font-bold text-blue-600">${tax.taxable_income.toLocaleString()}</p>
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-3">Tax Breakdown</h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                  <span className="text-gray-700">Federal Income Tax</span>
                  <span className="font-semibold">${tax.estimated_federal_tax.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                  <span className="text-gray-700">State Income Tax</span>
                  <span className="font-semibold">${tax.estimated_state_tax.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                  <span className="text-gray-700">Self-Employment Tax</span>
                  <span className="font-semibold">${tax.estimated_self_employment_tax.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center p-4 bg-red-50 rounded border-2 border-red-200">
                  <span className="text-gray-900 font-bold text-lg">Total Tax Due</span>
                  <span className="font-bold text-red-600 text-2xl">${tax.total_estimated_tax.toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-3">Payment Status</h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-green-50 rounded">
                  <span className="text-gray-700">Tax Paid</span>
                  <span className="font-semibold text-green-600">${tax.tax_paid.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-orange-50 rounded">
                  <span className="text-gray-700 font-medium">Remaining Balance</span>
                  <span className="font-bold text-orange-600 text-lg">${tax.tax_remaining.toLocaleString()}</span>
                </div>
              </div>

              <div className="mt-4">
                <div className="w-full bg-gray-200 rounded-full h-4">
                  <div 
                    className="bg-gradient-to-r from-green-500 to-blue-600 h-4 rounded-full flex items-center justify-center text-xs text-white font-medium" 
                    style={{ width: `${(tax.tax_paid / tax.total_estimated_tax) * 100}%` }}
                  >
                    {((tax.tax_paid / tax.total_estimated_tax) * 100).toFixed(1)}% paid
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start space-x-2">
                <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <h5 className="font-semibold text-blue-900 mb-1">Tax Planning Tips</h5>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• Make quarterly estimated tax payments to avoid penalties</li>
                    <li>• Track all business expenses for maximum deductions</li>
                    <li>• Consider setting aside 25-30% of net income for taxes</li>
                    <li>• Consult with a tax professional for personalized advice</li>
                  </ul>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}