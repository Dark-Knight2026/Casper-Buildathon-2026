import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Calculator, DollarSign } from 'lucide-react';
import { useFinancialDashboard } from '@/hooks/useFinancialDashboard';

export default function CommissionCalculator() {
  const { calculateCommission } = useFinancialDashboard();
  const [salePrice, setSalePrice] = useState('500000');
  const [commissionRate, setCommissionRate] = useState('3.0');
  const [brokerSplit, setBrokerSplit] = useState('30');
  const [result, setResult] = useState(calculateCommission(500000, 3.0, 30));

  const handleCalculate = () => {
    const price = parseFloat(salePrice) || 0;
    const rate = parseFloat(commissionRate) || 0;
    const split = parseFloat(brokerSplit) || 0;
    setResult(calculateCommission(price, rate, split));
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Calculator className="h-5 w-5 mr-2" />
            Commission Calculator
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="salePrice">Sale Price</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                id="salePrice"
                type="number"
                value={salePrice}
                onChange={(e) => setSalePrice(e.target.value)}
                className="pl-9"
                placeholder="500000"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="commissionRate">Commission Rate (%)</Label>
            <Input
              id="commissionRate"
              type="number"
              step="0.1"
              value={commissionRate}
              onChange={(e) => setCommissionRate(e.target.value)}
              placeholder="3.0"
            />
          </div>

          <div>
            <Label htmlFor="brokerSplit">Broker Split (%)</Label>
            <Input
              id="brokerSplit"
              type="number"
              step="1"
              value={brokerSplit}
              onChange={(e) => setBrokerSplit(e.target.value)}
              placeholder="30"
            />
          </div>

          <Button onClick={handleCalculate} className="w-full">
            <Calculator className="h-4 w-4 mr-2" />
            Calculate Commission
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Commission Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
              <span className="text-gray-600">Sale Price</span>
              <span className="font-semibold text-lg">${result.sale_price.toLocaleString()}</span>
            </div>

            <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
              <span className="text-gray-600">Commission Rate</span>
              <span className="font-semibold">{result.commission_rate}%</span>
            </div>

            <div className="flex justify-between items-center p-3 bg-green-50 rounded border border-green-200">
              <span className="text-gray-700 font-medium">Gross Commission</span>
              <span className="font-bold text-green-600 text-lg">${result.gross_commission.toLocaleString()}</span>
            </div>

            <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
              <span className="text-gray-600">Broker Split ({result.broker_split_percentage}%)</span>
              <span className="font-semibold text-red-600">-${result.broker_split_amount.toLocaleString()}</span>
            </div>

            <div className="flex justify-between items-center p-4 bg-blue-50 rounded border-2 border-blue-200">
              <span className="text-gray-700 font-bold text-lg">Your Net Commission</span>
              <span className="font-bold text-blue-600 text-2xl">${result.net_commission.toLocaleString()}</span>
            </div>
          </div>

          <div className="pt-4 border-t">
            <h4 className="font-semibold mb-2">Quick Reference</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">At 2.5% commission:</span>
                <span className="font-medium">${((result.sale_price * 2.5) / 100).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">At 3.0% commission:</span>
                <span className="font-medium">${((result.sale_price * 3.0) / 100).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">At 3.5% commission:</span>
                <span className="font-medium">${((result.sale_price * 3.5) / 100).toLocaleString()}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}