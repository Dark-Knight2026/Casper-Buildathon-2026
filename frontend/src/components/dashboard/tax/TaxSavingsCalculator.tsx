import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calculator, TrendingUp, Info } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';

interface TaxSavingsCalculatorProps {
  onCalculate?: (deductions: number, taxBracket: number) => Promise<number>;
}

export const TaxSavingsCalculator: React.FC<TaxSavingsCalculatorProps> = ({ onCalculate }) => {
  const [deductions, setDeductions] = useState('');
  const [taxBracket, setTaxBracket] = useState('22');
  const [savings, setSavings] = useState<number | null>(null);
  const [calculating, setCalculating] = useState(false);

  const handleCalculate = async () => {
    if (!deductions || parseFloat(deductions) <= 0) {
      toast.error('Please enter a valid deduction amount');
      return;
    }

    setCalculating(true);
    try {
      if (onCalculate) {
        const result = await onCalculate(parseFloat(deductions), parseFloat(taxBracket));
        setSavings(result);
        toast.success('Tax savings calculated');
      } else {
        // Fallback calculation
        const result = parseFloat(deductions) * (parseFloat(taxBracket) / 100);
        setSavings(Math.round(result));
      }
    } catch (error) {
      toast.error('Calculation failed');
    } finally {
      setCalculating(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-5 w-5 text-cyan-600" />
          Tax Savings Calculator
        </CardTitle>
        <CardDescription>Estimate your tax savings from deductions</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert className="bg-blue-50 border-blue-200">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-xs text-blue-700">
            Calculations for Mortgage Interest and Property Tax are estimates. Actual savings depend on your total tax situation and local laws.
          </AlertDescription>
        </Alert>

        <div className="space-y-2">
          <Label htmlFor="deductions">Total Deductions</Label>
          <Input
            id="deductions"
            type="number"
            placeholder="Enter amount"
            value={deductions}
            onChange={(e) => setDeductions(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="tax-bracket">Tax Bracket</Label>
          <Select value={taxBracket} onValueChange={setTaxBracket}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10% - Up to $11,000</SelectItem>
              <SelectItem value="12">12% - $11,001 to $44,725</SelectItem>
              <SelectItem value="22">22% - $44,726 to $95,375</SelectItem>
              <SelectItem value="24">24% - $95,376 to $182,100</SelectItem>
              <SelectItem value="32">32% - $182,101 to $231,250</SelectItem>
              <SelectItem value="35">35% - $231,251 to $578,125</SelectItem>
              <SelectItem value="37">37% - Over $578,125</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button 
          className="w-full" 
          onClick={handleCalculate}
          disabled={calculating}
        >
          {calculating ? 'Calculating...' : 'Calculate Savings'}
        </Button>

        {savings !== null && (
          <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-700 font-medium mb-1">Estimated Tax Savings</p>
                <p className="text-3xl font-bold text-green-900">${savings.toLocaleString()}</p>
              </div>
              <TrendingUp className="h-12 w-12 text-green-600 opacity-50" />
            </div>
            <p className="text-xs text-green-700 mt-3">
              Based on ${parseFloat(deductions).toLocaleString()} in deductions at {taxBracket}% tax bracket
            </p>
          </div>
        )}

        <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t">
          <p>• This is an estimate only</p>
          <p>• Actual savings may vary based on your complete tax situation</p>
          <p>• Consult a tax professional for personalized advice</p>
        </div>
      </CardContent>
    </Card>
  );
};