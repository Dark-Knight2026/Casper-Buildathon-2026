import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PropertyFinancials } from '@/types/listing';
import { Calculator, DollarSign, Home, Shield, Zap } from 'lucide-react';

interface ListingFinancialsProps {
  financials: PropertyFinancials;
  price: number;
}

export default function ListingFinancials({ financials, price }: ListingFinancialsProps) {
  const [loanAmount, setLoanAmount] = useState(price * 0.8);
  const [downPayment, setDownPayment] = useState(price * 0.2);
  const [interestRate, setInterestRate] = useState(7.5);
  const [loanTerm, setLoanTerm] = useState(30);

  const calculateMonthlyPayment = () => {
    const principal = loanAmount;
    const monthlyRate = interestRate / 100 / 12;
    const numPayments = loanTerm * 12;
    
    if (monthlyRate === 0) return principal / numPayments;
    
    return (principal * monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / 
           (Math.pow(1 + monthlyRate, numPayments) - 1);
  };

  const monthlyPayment = calculateMonthlyPayment();
  const totalMonthlyExpenses = monthlyPayment + 
    (financials.propertyTaxes / 12) + 
    ((financials.insurance || 0) / 12) + 
    (financials.hoaFees || 0);

  return (
    <div className="space-y-6">
      {/* Property Costs */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Property Costs</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-full">
              <Home className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Property Taxes</p>
              <p className="text-lg font-semibold">${financials.propertyTaxes.toLocaleString()}/year</p>
              <p className="text-xs text-gray-500">${(financials.propertyTaxes / 12).toFixed(0)}/month</p>
            </div>
          </div>

          {financials.hoaFees && (
            <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-center w-10 h-10 bg-green-100 rounded-full">
                <DollarSign className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">HOA Fees</p>
                <p className="text-lg font-semibold">${financials.hoaFees}/month</p>
                <p className="text-xs text-gray-500">${financials.hoaFees * 12}/year</p>
              </div>
            </div>
          )}

          {financials.insurance && (
            <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-center w-10 h-10 bg-purple-100 rounded-full">
                <Shield className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Insurance</p>
                <p className="text-lg font-semibold">${financials.insurance.toLocaleString()}/year</p>
                <p className="text-xs text-gray-500">${(financials.insurance / 12).toFixed(0)}/month</p>
              </div>
            </div>
          )}

          {financials.utilities && (
            <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-center w-10 h-10 bg-yellow-100 rounded-full">
                <Zap className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Utilities (Est.)</p>
                <p className="text-lg font-semibold">${financials.utilities.toLocaleString()}/year</p>
                <p className="text-xs text-gray-500">${(financials.utilities / 12).toFixed(0)}/month</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mortgage Calculator */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calculator className="h-5 w-5" />
            <span>Mortgage Calculator</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="purchase-price">Purchase Price</Label>
              <Input
                id="purchase-price"
                type="number"
                value={price}
                readOnly
                className="bg-gray-50"
              />
            </div>
            
            <div>
              <Label htmlFor="down-payment">Down Payment</Label>
              <Input
                id="down-payment"
                type="number"
                value={downPayment}
                onChange={(e) => {
                  const dp = Number(e.target.value);
                  setDownPayment(dp);
                  setLoanAmount(price - dp);
                }}
              />
            </div>
            
            <div>
              <Label htmlFor="loan-amount">Loan Amount</Label>
              <Input
                id="loan-amount"
                type="number"
                value={loanAmount}
                onChange={(e) => {
                  const la = Number(e.target.value);
                  setLoanAmount(la);
                  setDownPayment(price - la);
                }}
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
            
            <div>
              <Label htmlFor="loan-term">Loan Term</Label>
              <Select value={loanTerm.toString()} onValueChange={(value) => setLoanTerm(Number(value))}>
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

          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h4 className="font-semibold text-gray-900 mb-3">Monthly Payment Breakdown</h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Principal & Interest</span>
                <span className="font-semibold">${monthlyPayment.toFixed(0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Property Taxes</span>
                <span className="font-semibold">${(financials.propertyTaxes / 12).toFixed(0)}</span>
              </div>
              {financials.insurance && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Insurance</span>
                  <span className="font-semibold">${(financials.insurance / 12).toFixed(0)}</span>
                </div>
              )}
              {financials.hoaFees && (
                <div className="flex justify-between">
                  <span className="text-gray-600">HOA Fees</span>
                  <span className="font-semibold">${financials.hoaFees}</span>
                </div>
              )}
              <div className="border-t border-blue-200 pt-2 mt-2">
                <div className="flex justify-between text-lg font-bold">
                  <span>Total Monthly Payment</span>
                  <span>${totalMonthlyExpenses.toFixed(0)}</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}